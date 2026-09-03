-- ============================================================
-- APPLIED 2026-09-03. This file is a record, not a to-do.
--
-- Migration name in Supabase history: `add_campaign_scope`
-- Project: ahvantir-website (fbfqeijisvckwmkqzjtd)
--
-- Do not run it again. The columns and indexes are idempotent, but the two
-- primary-key swaps are not — they drop a constraint by name and would fail on
-- a second pass.
-- ============================================================

-- ── What the earlier draft of this file got wrong ───────────
--
-- Worth recording, because the mistake was trusting a schema file over the
-- database it claimed to describe:
--
--   * It covered SIX tables. The live database has TEN. `player_bookmarks`,
--     `player_notes`, `player_scratchpad` and `sessions` were added after that
--     file was written and never made it back into it. All four hold
--     campaign-scoped data; missing them would have shown Dawnbreak players
--     Ahvantir's session schedule, notes and bookmarks.
--
--   * It indexed `user_id`. The column is `player_id`. Those statements would
--     have failed partway through the migration.
--
--   * It treated `player_scratchpad` as needing only a new column. Its primary
--     key was `player_id` alone — one scratchpad per person, forever — so
--     sharing it required changing the key, not adding a field.
--
-- Inspect the database. Never the file that claims to describe it.

-- ── The snapshot ────────────────────────────────────────────
--
-- Migration `pre_campaign_snapshot` copied all ten tables into a
-- `pre_campaign_backup` schema first. That schema is NOT exposed by PostgREST
-- (verified — only `public` and `graphql_public` are), so it is unreachable
-- over the API despite holding player names, character backstories and private
-- messages.
--
-- Restore a single table with:
--     delete from public.<t>;
--     insert into public.<t> select * from pre_campaign_backup.<t>;
--   The snapshot predates the campaign column, so that INSERT leans on the
--   column default. Check the shapes still line up before trusting it.
--
-- Drop it once the player area has been live a while:
--     drop schema pre_campaign_backup cascade;

-- ============================================================
-- What actually ran
-- ============================================================

alter table public.characters        add column if not exists campaign text not null default 'ahvantir';
alter table public.character_secrets add column if not exists campaign text not null default 'ahvantir';
alter table public.character_images  add column if not exists campaign text not null default 'ahvantir';
alter table public.campaign_notes    add column if not exists campaign text not null default 'ahvantir';
alter table public.messages          add column if not exists campaign text not null default 'ahvantir';
alter table public.player_bookmarks  add column if not exists campaign text not null default 'ahvantir';
alter table public.player_notes      add column if not exists campaign text not null default 'ahvantir';
alter table public.player_scratchpad add column if not exists campaign text not null default 'ahvantir';
alter table public.sessions          add column if not exists campaign text not null default 'ahvantir';

-- `profiles` is deliberately untouched: one person, one account, one display
-- name, both settings. That is the whole reason for sharing a project.

alter table public.player_scratchpad drop constraint player_scratchpad_pkey;
alter table public.player_scratchpad add  constraint player_scratchpad_pkey
  primary key (player_id, campaign);

alter table public.player_bookmarks drop constraint player_bookmarks_pkey;
alter table public.player_bookmarks add  constraint player_bookmarks_pkey
  primary key (player_id, article_url, campaign);

create index if not exists characters_campaign_idx        on public.characters        (campaign, player_id);
create index if not exists character_secrets_campaign_idx on public.character_secrets (campaign, player_id);
create index if not exists character_images_campaign_idx  on public.character_images  (campaign, character_id);
create index if not exists campaign_notes_campaign_idx    on public.campaign_notes    (campaign, player_id);
create index if not exists messages_campaign_idx          on public.messages          (campaign, recipient_id);
create index if not exists player_notes_campaign_idx      on public.player_notes      (campaign, player_id);
create index if not exists sessions_campaign_idx          on public.sessions          (campaign, scheduled_at);

-- ============================================================
-- Verified after applying
-- ============================================================
--
--   * All nine tables carry `campaign`; `profiles` does not.
--   * Row counts identical to the snapshot, every existing row 'ahvantir'.
--   * A probe insert confirmed one player can now hold a scratchpad and a
--     bookmark in BOTH campaigns — the thing the key change existed for — and
--     the probe rows were removed, restoring the exact pre-migration counts.
--   * Security advisor: the same seven pre-existing warnings, no new ones, no
--     RLS gaps. Those seven are the deferred hardening items — see
--     supabase-hardening-todo.md on the Desktop.
--
-- Still needed, and only doable from the dashboard:
--   Auth → URL Configuration → Redirect URLs → add
--     https://dawnbreak.ahvantir.world/**
--   Without it, sign-in links bounce to the wrong site.
-- ============================================================
