import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "DATABASE_URL_UNPOOLED/DATABASE_URL is not set. Skipping migrations.",
  );
  process.exit(0);
}

const migrationsDir = path.join(process.cwd(), "migrations");
const client = new Client({ connectionString });

async function migrate() {
  await client.connect();

  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const existing = await client.query(
      "select 1 from schema_migrations where filename = $1",
      [file],
    );

    if (existing.rowCount) {
      console.log(`Already applied ${file}`);
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");

    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [
        file,
      ]);
      await client.query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
