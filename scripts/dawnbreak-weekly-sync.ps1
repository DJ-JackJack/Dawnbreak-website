#Requires -Version 5.1
<#
.SYNOPSIS
    Weekly Dawnbreak City lore sync -- reads the Obsidian vault, converts
    articles, commits, and pushes, which rebuilds the site.

.DESCRIPTION
    Built for Windows Task Scheduler. Runs every Sunday at 21:15 -- fifteen
    minutes after the Ahvantir sync, so the two never push at the same moment
    and the logs stay readable one at a time.

      1. node scripts/obsidian-to-md.js   (vault -> src/articles/)
      2. reconcile with origin/main
      3. exit cleanly if nothing changed
      4. git add / commit / push

    The converter validates every article it writes and exits non-zero if any
    fails. Step 1 failing stops the run, so a malformed article never reaches
    the live site -- it sits in the working tree waiting to be fixed.

.NOTES
    Registration command for Task Scheduler is at the bottom of this file.
    Requires Node and Git on PATH, and Git Credential Manager already holding
    credentials (run `git push` by hand once if unsure).
#>

Set-StrictMode -Version Latest

# Keep this at "Continue", not "Stop". Every git call below is captured with
# `2>&1`, and git writes normal progress ("From https://...", "To https://...")
# to stderr. Under "Stop", PowerShell 5.1 turns those benign stderr lines into
# terminating errors and the run dies mid-sync. Control flow is driven by the
# explicit $LASTEXITCODE checks instead, and the outer try/catch still catches
# real exceptions.
$ErrorActionPreference = "Continue"

# --- Paths --------------------------------------------------------------------

$RepoPath   = "C:\Users\klfal\Desktop\Claude_Directory\Dawnbreak-website"
$SyncScript = Join-Path $RepoPath "scripts\obsidian-to-md.js"
$LogFile    = "C:\Users\klfal\Desktop\Claude_Directory\dawnbreak-sync-log.txt"

# --- Logging ------------------------------------------------------------------

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO","WARN","ERROR")][string]$Level = "INFO"
    )
    $ts   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] [$Level] $Message"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Write-LogBlock {
    param([string[]]$Lines, [string]$Prefix = "       ")
    foreach ($line in $Lines) {
        if ($null -ne $line -and $line.ToString().Trim() -ne "") {
            Write-Log "$Prefix$($line.ToString().Trim())"
        }
    }
}

# --- Entry point --------------------------------------------------------------

Add-Content -Path $LogFile -Value "" -Encoding UTF8
Add-Content -Path $LogFile -Value ("-" * 72) -Encoding UTF8
Write-Log "Dawnbreak weekly lore sync -- starting"

$exitCode = 0

try {

    # -- 1. Sanity-check paths ------------------------------------------------

    if (-not (Test-Path $RepoPath -PathType Container)) {
        Write-Log "Repo path not found: $RepoPath" ERROR
        exit 1
    }
    if (-not (Test-Path $SyncScript -PathType Leaf)) {
        Write-Log "Sync script not found: $SyncScript" ERROR
        exit 1
    }

    Write-Log "Repo   : $RepoPath"
    Write-Log "Script : $SyncScript"
    Write-Log "Log    : $LogFile"

    # -- 2. Locate Node -------------------------------------------------------

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Log "Node not found on PATH -- install Node and ensure it is on PATH." ERROR
        exit 1
    }
    Write-Log "Node   : $(& node --version 2>&1)"

    # -- 2b. Read native output as UTF-8 --------------------------------------
    # PowerShell 5.1 decodes a native command's stdout using the console's
    # active codepage, which here is Windows-1252. Node writes UTF-8, so the
    # first test run logged "ΓåÉ" where the converter had printed "←" -- and a
    # note filed under a title with an em-dash or an accent would arrive in the
    # log just as unreadable. Set it before anything is captured.
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8

    # -- 3. Run the converter -------------------------------------------------

    Write-Log "Running obsidian-to-md.js ..."

    Push-Location $RepoPath
    try {
        $syncOutput = & node scripts\obsidian-to-md.js 2>&1
        $syncExit   = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    Write-LogBlock -Lines ($syncOutput | ForEach-Object { $_.ToString() }) -Prefix "  [node] "

    # A non-zero exit means an article failed validation. Stop here: the files
    # are written and visible in the working tree, but nothing is committed,
    # so a broken article cannot reach the live site.
    if ($syncExit -ne 0) {
        Write-Log "Converter reported problems (exit $syncExit) -- fix the vault notes above. Nothing committed." ERROR
        exit 1
    }

    Write-Log "Converter finished OK (exit 0)"

    # -- 4. Reconcile with origin ---------------------------------------------
    # This clone can fall behind origin/main -- a push from another machine, or
    # an edit made on GitHub. Without this a later push is rejected as
    # non-fast-forward. --autostash sets the converter's just-written changes
    # aside, fast-forwards, then reapplies them.

    Push-Location $RepoPath
    try {
        Write-Log "Reconciling local clone with origin/main ..."
        $pullOut  = & git pull --rebase --autostash origin main 2>&1
        $pullExit = $LASTEXITCODE
        Write-LogBlock -Lines ($pullOut | ForEach-Object { $_.ToString() }) -Prefix "  [git] "
        if ($pullExit -ne 0) {
            Write-Log "git pull --rebase failed (exit $pullExit) -- resolve by hand before the next run" ERROR
            exit 1
        }
        Write-Log "Reconciled with origin/main -- OK"
    }
    finally {
        Pop-Location
    }

    # -- 5. Commit and push ---------------------------------------------------

    Push-Location $RepoPath
    try {

        # ONLY src/articles. This job's output is converted articles and
        # nothing else, so that is all it may commit.
        #
        # It used to be `git status --porcelain` and `git add -A`, which meant
        # it committed whatever happened to be dirty. A test run proved the
        # point immediately by sweeping up an unrelated edit to this very file
        # and pushing it under the message "Weekly lore sync". Unattended on a
        # Sunday night, that is half-finished work published without anyone
        # present to notice.
        $Scope = "src/articles"

        $gitStatus     = & git status --porcelain -- $Scope 2>&1
        $gitStatusExit = $LASTEXITCODE

        if ($gitStatusExit -ne 0) {
            Write-Log "git status failed (exit $gitStatusExit): $gitStatus" ERROR
            exit 1
        }

        $changedLines = @($gitStatus | Where-Object { $_.ToString().Trim() -ne "" })

        # Anything dirty outside the scope is reported and left exactly alone,
        # so it is visible in the log rather than silently carried along.
        # Porcelain is "XY path", so anchor on the path rather than searching
        # the whole line -- otherwise a file like docs/src/articles-notes.md
        # would match and go unreported.
        $otherDirty = @(& git status --porcelain 2>&1 |
            Where-Object { $_.ToString().Trim() -ne "" -and $_.ToString() -notmatch '^..\s*src/articles/' })
        if ($otherDirty.Count -gt 0) {
            Write-Log "$($otherDirty.Count) file(s) dirty outside $Scope -- left untouched:" WARN
            Write-LogBlock -Lines ($otherDirty | ForEach-Object { $_.ToString() }) -Prefix "  [skip] "
        }

        if ($changedLines.Count -eq 0) {
            Add-Content -Path $LogFile -Value "=== Dawnbreak Lore Sync -- $(Get-Date -Format 'yyyy-MM-dd HH:mm') ===" -Encoding UTF8
            Add-Content -Path $LogFile -Value "No article changes -- nothing to commit." -Encoding UTF8
            Add-Content -Path $LogFile -Value "===" -Encoding UTF8
            Write-Log "Dawnbreak weekly lore sync -- complete (no article changes)"
            exit 0
        }

        $addOut  = & git add -- $Scope 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "git add $Scope failed: $addOut" ERROR
            exit 1
        }
        Write-Log "git add $Scope -- OK"

        # Summarise what changed, from the staged index.
        $diffOut  = & git diff --name-status --cached -- $Scope 2>&1
        $runStamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $newFiles = @()
        $modFiles = @()

        foreach ($entry in $diffOut) {
            $s = $entry.ToString().Trim()
            if ($s -match '^([AM])\s+(.+)$') {
                if ($Matches[1] -eq "A") { $newFiles += $Matches[2].Trim() }
                else                     { $modFiles += $Matches[2].Trim() }
            }
        }

        $totalChanged = $newFiles.Count + $modFiles.Count
        Add-Content -Path $LogFile -Value "=== Dawnbreak Lore Sync -- $runStamp ===" -Encoding UTF8
        Add-Content -Path $LogFile -Value "Articles updated ($totalChanged):" -Encoding UTF8
        foreach ($f in $newFiles) { Add-Content -Path $LogFile -Value "  + $f (new)"      -Encoding UTF8 }
        foreach ($f in $modFiles) { Add-Content -Path $LogFile -Value "  ~ $f (modified)" -Encoding UTF8 }

        $commitMsg  = "Weekly lore sync -- $(Get-Date -Format 'yyyy-MM-dd')"
        $commitOut  = & git commit -m $commitMsg 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Log "git commit failed: $commitOut" ERROR
            exit 1
        }
        Write-LogBlock -Lines ($commitOut | ForEach-Object { $_.ToString() }) -Prefix "  [git] "
        Write-Log "git commit -- OK"

        Write-Log "Pushing to origin/main ..."
        $pushOut  = & git push origin main 2>&1
        $pushExit = $LASTEXITCODE
        Write-LogBlock -Lines ($pushOut | ForEach-Object { $_.ToString() }) -Prefix "  [git] "

        if ($pushExit -ne 0) {
            Write-Log "git push failed (exit $pushExit)" ERROR
            exit 1
        }

        Write-Log "git push -- OK"
        Add-Content -Path $LogFile -Value "Committed and pushed. Build triggered." -Encoding UTF8
        Add-Content -Path $LogFile -Value "===" -Encoding UTF8
        Write-Log "Dawnbreak weekly lore sync -- complete ($totalChanged file(s) pushed, deploying dawnbreak.ahvantir.world)"

    }
    finally {
        Pop-Location
    }

}
catch {
    Write-Log "FATAL unhandled exception: $_" ERROR
    $exitCode = 1
}

exit $exitCode

<#
================================================================================
  WINDOWS TASK SCHEDULER -- REGISTRATION
  Run this once in an Administrator PowerShell.
================================================================================

schtasks --% /Create /TN "Dawnbreak Weekly Lore Sync" /TR "powershell.exe -NonInteractive -ExecutionPolicy Bypass -File \"C:\Users\klfal\Desktop\Claude_Directory\Dawnbreak-website\scripts\dawnbreak-weekly-sync.ps1\"" /SC WEEKLY /D SUN /ST 21:15 /RU klfal /F

  The --% is load-bearing. Without it PowerShell treats the \" inside /TR as
  an ordinary quote, /TR swallows the rest of the line, and schtasks reports
  "Mandatory option 'sc' is missing". --% passes the remainder verbatim.

  Verify:   schtasks /Query /TN "Dawnbreak Weekly Lore Sync" /FO LIST
            Status should be Ready, not Disabled, and Next Run Time should
            name a Sunday. A task can register and sit there disabled.
  Enable:   schtasks /Change /TN "Dawnbreak Weekly Lore Sync" /ENABLE
  Test run: schtasks /Run /TN "Dawnbreak Weekly Lore Sync"
  Remove:   schtasks /Delete /TN "Dawnbreak Weekly Lore Sync" /F

  21:15, not 21:00: the Ahvantir sync runs at 21:00 and the two would otherwise
  push within seconds of each other.
================================================================================
#>
