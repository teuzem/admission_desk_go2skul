import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { sql } from 'drizzle-orm'
import { db, pool } from './index.js'

async function main() {
  // Sequence must exist before the support_tickets default references it
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS support_ticket_number_seq START 1`)
  await migrate(db, { migrationsFolder: './drizzle' })

  await db.execute(sql.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `))

  const tables = await db.execute(sql.raw(`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
    GROUP BY table_name
  `))
  for (const row of tables.rows as { table_name: string }[]) {
    const t = row.table_name.replace(/[^a-z0-9_]/gi, '')
    await db.execute(sql.raw(`
      DROP TRIGGER IF EXISTS trg_set_updated_at ON "${t}";
      CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON "${t}"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `))
  }

  await db.execute(sql.raw(`
    CREATE OR REPLACE FUNCTION sync_kb_article_count() RETURNS trigger AS $$
    BEGIN
      UPDATE kb_categories c SET article_count = (
        SELECT count(*) FROM kb_articles a WHERE a.category_id = c.id
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS trg_sync_kb_article_count ON kb_articles;
    CREATE TRIGGER trg_sync_kb_article_count
    AFTER INSERT OR UPDATE OR DELETE ON kb_articles
    FOR EACH STATEMENT EXECUTE FUNCTION sync_kb_article_count();
  `))

  console.log('Migrations and triggers applied successfully.')
  await pool.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})