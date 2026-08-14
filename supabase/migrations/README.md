# JIRANI SYSTEM — Database migrations

This Freebuff workspace is **not connected to your production Supabase
project**, so nothing here touches the database automatically. You must run
the SQL yourself in the Supabase SQL Editor (Dashboard → SQL Editor).

## Which files to run

### On the EXISTING v0 production database (the deployed JIRANI SYSTEM)

**Do NOT run `0001` or `0002`.** They are for fresh/empty projects. On the
existing database, `0001` would add new RLS policies that can widen access,
and `0002` would replace the working production functions/triggers
(`create_sale_atomic`, `handle_new_user`, `get_or_create_current_organization`,
`can_register_new_user`) with versions that have not been verified against the
live schema.

Run these instead, in order:

1. **`0003_jirani_safe_incremental.sql`** — the safe incremental migration:
   - adds only read-optimization indexes (`CREATE INDEX IF NOT EXISTS`, each
     skipped automatically if the base column is missing),
   - creates the duplicate-checkout unique index **only if** no duplicate
     `idempotency_key` rows exist,
   - replaces `can_register_new_user()` with the closed-by-default rule
     (registration is open only while Settings → Account registration is Open;
     existing accounts are unaffected),
   - includes the **optional** `auth.users` signup-gate trigger with a full
     explanation and an escape hatch — skip section 4 if you want only the
     app-level gate.
2. **`0004_jirani_create_sale_atomic_optional.sql`** — OPTIONAL upgrade of the
   checkout path (authoritative pricing, atomic stock, idempotency, credit
   limit + due date). **Only after** reviewing the verification queries at the
   top of that file. It is additive (`ALTER TABLE ... ADD COLUMN IF NOT
   EXISTS`) and replaces `create_sale_atomic` keeping the exact same
   app-facing contract.

### On a BRAND-NEW (empty) Supabase project

Run **`0001_jirani_schema.sql`** then **`0002_jirani_functions.sql`** in that
order. Both are idempotent.

## What each file does

| File | Audience | Purpose |
| --- | --- | --- |
| `0001_jirani_schema.sql` | Fresh projects only | Tables, indexes, RLS policies (all `IF NOT EXISTS`) |
| `0002_jirani_functions.sql` | Fresh projects only | RPCs (`get_or_create_current_organization`, `create_sale_atomic`, `can_register_new_user`), RLS helpers, signup-gate + profile-bootstrap triggers |
| `0003_jirani_safe_incremental.sql` | Existing v0 DB | Indexes only, idempotency backstop, signup-gate functions + optional trigger. No DDL changes to tables, no policy changes. |
| `0004_jirani_create_sale_atomic_optional.sql` | Existing v0 DB | Verification queries, additive columns, `create_sale_atomic` replacement. Run only after verifying the schema. |

## Signup-gate behavior (existing database)

- The app's sign-up page already calls `can_register_new_user()`; that RPC is
  replaced so the UI gate and the database gate agree.
- Rule: while **no shop exists** the first account may always register (that
  becomes the owner). Once a shop exists, new registrations only work while
  **Settings → Account registration** is **Open**.
- If your database has no `organization_settings` row yet, registrations are
  **closed by default** until the admin opens them — existing accounts are
  never affected.
- To add staff: admin opens registration in Settings → staff sign up → admin
  closes it again.
