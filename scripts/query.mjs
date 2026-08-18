import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.DATABASE_URL ?? "file:./local.db" });
const sql = process.argv.slice(2).join(" ");
const r = await c.execute(sql);
console.table(r.rows);
