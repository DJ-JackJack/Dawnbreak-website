-- ============================================================
-- Share one Supabase project between Ahvantir and Dawnbreak City
--
-- RUN THIS ONCE, in the Supabase dashboard's SQL Editor, against the
-- `ahvantir-website` project — AFTER taking a backup.
--
-- What it does: adds a `campaign` column to the five campaign-scoped tables,
-- defaulting every existing row to 'ahvantir'. `profiles` is deliberately NOT
-- touched: one person keeps one account, one display name and one login across
-- both settings, which is the entire point.
--
-- What it does NOT do: drop anything, rename anything, or rewrite any existing
-- row's data. Every statement is additive and re-runnable.
-- ============================================================

begin;

-- ── The campaign column ─────────────────────────────────────
-- NOT NULL with a default, so existing rows are backfilled in place and
-- nothing can later be inserted without a campaign by accident.

alter table characters        add column if not exists campaign text not null default 'ahvantir';
alter table character_secrets add column if not exists campaign text not null default 'ahvantir';
alter table campaign_notes    add column if not exists campaign text not null default 'ahvantir';
alter table character_images  add column if not exists campaign text not null default 'ahvantir';
alter table messages          add column if not exists campaign text not null default 'ahvantir';

-- ── Indexes ─────────────────────────────────────────────────
-- Every query the player pages make will filter on campaign, and most also
-- filter on the owner. A composite index serves both.

create index if not exists characters_campaign_idx        on characters        (campaign, user_id);
create index if not exists character_secrets_campaign_idx on character_secrets (campaign);
create index if not exists campaign_notes_campaign_idx    on campaign_notes    (campaign, user_id);
create index if not exists character_images_campaign_idx  on character_images  (campaign);
create index if not exists messages_campaign_idx          on messages          (campaign);

commit;

-- ============================================================
-- Afterwards
--
-- 1. Re-run the security advisor and confirm nothing new appeared.
-- 2. Spot-check that existing rows all read campaign = 'ahvantir':
--
--      select campaign, count(*) from characters group by campaign;
--
-- 3. The existing RLS policies still apply unchanged — they scope by
--    `user_id = auth.uid()`, which is orthogonal to campaign, so a player
--    still sees only their own rows. The campaign column decides WHICH of
--    their own rows a given site shows them, not whether they may see them.
--
-- Deferred hardening (see supabase-hardening-todo.md on the Desktop) belongs
-- in the same session as this migration, while a backup is already taken.
-- ============================================================
