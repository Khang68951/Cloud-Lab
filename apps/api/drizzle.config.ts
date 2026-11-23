import { defineConfig } from 'drizzle-kit';

// `npm run db:generate` diffs src/db/schema.ts against previous migrations and
// writes a new SQL file into ./drizzle. Migrations are applied automatically
// when the API starts (see src/db/client.ts).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './drizzle',
});
