import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

const sql = process.argv.slice(2).join(" ");
const result = await client.execute(sql);
console.table(result.rows);
