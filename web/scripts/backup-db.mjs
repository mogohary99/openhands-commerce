// Consistent online copy of the SQLite database (safe while the app is running, WAL mode).
// Usage: node scripts/backup-db.mjs [destination]  — source is $DATABASE_PATH or .data/openhands.sqlite
import Database from "better-sqlite3";
import path from "node:path";

const src = process.env.DATABASE_PATH ?? path.join(process.cwd(), ".data", "openhands.sqlite");
const dest = process.argv[2] ?? `${src}.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
const db = new Database(src, { readonly: true, fileMustExist: true });
await db.backup(dest);
const copy = new Database(dest, { readonly: true });
const check = copy.pragma("integrity_check", { simple: true });
const orders = copy.prepare("SELECT count(*) AS n FROM orders").get().n;
copy.close();
db.close();
if (check !== "ok") {
  console.error(`backup written to ${dest} but integrity_check = ${check}`);
  process.exit(1);
}
console.log(`backup ok: ${dest} (${orders} orders, integrity ok)`);
