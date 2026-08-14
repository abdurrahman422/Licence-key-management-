import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';

let dbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), 'data');
const PROOFS_DIR = path.join(DATA_DIR, 'proofs');
const DB_PATH = path.join(DATA_DIR, 'license_manager.db');

export function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROOFS_DIR)) {
    fs.mkdirSync(PROOFS_DIR, { recursive: true });
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  ensureDirectories();
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error('Failed to load existing database file, creating fresh instance', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  try {
    ensureDirectories();
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite database to disk:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_key TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      assigned_at TEXT,
      customer_id INTEGER,
      start_date TEXT,
      expiry_date TEXT,
      duration_days INTEGER,
      notes TEXT,
      is_demo INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      telegram_username TEXT NOT NULL,
      telegram_user_id TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_demo INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      proof_path TEXT NOT NULL,
      proof_original_name TEXT,
      proof_mime_type TEXT,
      status TEXT NOT NULL,
      amount REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      verified_at TEXT
    );

    CREATE TABLE IF NOT EXISTS license_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      license_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      assigned_at TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Default app settings if missing
  const stmt = db.prepare("SELECT value FROM app_settings WHERE key = 'initialized'");
  if (!stmt.step()) {
    stmt.free();
    db.run(`
      INSERT INTO app_settings (key, value) VALUES 
      ('initialized', 'true'),
      ('defaultDurationDays', '7'),
      ('dateFormat', 'YYYY-MM-DD HH:mm'),
      ('theme', 'dark'),
      ('companyName', 'License Manager');
    `);
  } else {
    stmt.free();
  }
}

export function queryAll<T = any>(sql: string, params: SqlValue[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: SqlValue[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function runStmt(sql: string, params: SqlValue[] = []): { lastInsertRowid: number; changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  
  const idRes = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  const lastInsertRowid = idRes ? idRes.id : 0;
  
  const changesRes = queryOne<{ changes: number }>('SELECT changes() as changes');
  const changes = changesRes ? changesRes.changes : 0;

  saveDb();
  return { lastInsertRowid, changes };
}

export function logAudit(action: string, entityType: string, entityId: number | null, description: string) {
  const now = new Date().toISOString();
  runStmt(
    'INSERT INTO audit_logs (action, entity_type, entity_id, description, created_at) VALUES (?, ?, ?, ?, ?)',
    [action, entityType, entityId, description, now]
  );
}

export function updateLicenseExpiryStates() {
  if (!dbInstance) return;
  const now = new Date().toISOString();
  // Automatically flag assigned licenses that have passed their expiry date as EXPIRED
  const expiredRows = queryAll<{ id: number; license_key: string }>(
    "SELECT id, license_key FROM licenses WHERE status = 'ASSIGNED' AND expiry_date IS NOT NULL AND expiry_date <= ?",
    [now]
  );

  for (const row of expiredRows) {
    dbInstance.run("UPDATE licenses SET status = 'EXPIRED' WHERE id = ?", [row.id]);
    logAudit('LICENSE_EXPIRED', 'LICENSE', row.id, `License key ${row.license_key} automatically marked as EXPIRED based on expiry datetime.`);
  }

  if (expiredRows.length > 0) {
    saveDb();
  }
}

export function getDatabaseBuffer(): Buffer {
  if (!dbInstance) throw new Error('Database not initialized');
  return Buffer.from(dbInstance.export());
}

export async function restoreDatabaseBuffer(buffer: Buffer): Promise<void> {
  const SQL = await initSqlJs();
  dbInstance = new SQL.Database(buffer);
  initSchema(dbInstance);
  saveDb();
  logAudit('BACKUP_RESTORED', 'SYSTEM', null, 'Database was successfully restored from backup buffer.');
}

export { DATA_DIR, PROOFS_DIR, DB_PATH };
