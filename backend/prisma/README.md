# Database notes

Prisma owns the PostgreSQL schema in `schema.prisma`. The initial migration is in `migrations/20260919000000_init`, and `schema.sql` is a standalone DDL export.

- UUID primary keys avoid exposing sequential identifiers.
- User email is unique; appointment and chat timestamps use `timestamptz`.
- Appointments are indexed by user and start time for calendar/history queries, and by status and start time for operational views.
- Chat sessions are indexed by user and update time for recent history, and by status and last message time for active-session queries.
- Deleting a user cascades appointments but preserves chat records by setting their nullable `userId` to `NULL`.
- `ChatSession.history` stores ordered message objects; `metadata` stores extensible session attributes. Both are PostgreSQL `jsonb`.

With PostgreSQL available and `DATABASE_URL` set, run:

```bash
npm run db:migrate -- --name init
npm run db:seed
```