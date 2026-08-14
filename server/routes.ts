import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import {
  getDb,
  queryAll,
  queryOne,
  runStmt,
  logAudit,
  updateLicenseExpiryStates,
  getDatabaseBuffer,
  restoreDatabaseBuffer,
  PROOFS_DIR,
  DB_PATH
} from './db';
import {
  License,
  Customer,
  Payment,
  LicenseAssignment,
  AuditLog,
  DashboardStats,
  ImportPreviewResult,
  CustomerDetailRecord
} from '../src/types';

const router = Router();

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PROOFS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `proof-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Middleware to keep license expiration statuses up-to-date
router.use((req, res, next) => {
  try {
    updateLicenseExpiryStates();
  } catch (e) {
    console.error('Error updating license expiry states:', e);
  }
  next();
});

// --- AUTH & SETUP ROUTES ---

router.get('/auth/status', async (req: Request, res: Response) => {
  try {
    await getDb();
    const pinSetting = queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'admin_pin_hash'");
    const companySetting = queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'companyName'");
    const defaultDurationSetting = queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'defaultDurationDays'");

    res.json({
      hasPin: !!pinSetting,
      companyName: companySetting ? companySetting.value : 'License Manager',
      defaultDurationDays: defaultDurationSetting ? parseInt(defaultDurationSetting.value, 10) : 7
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/setup-pin', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { pin } = req.body;
    if (!pin || pin.toString().length < 4) {
      return res.status(400).json({ error: 'PIN/Password must be at least 4 characters/digits.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pin.toString(), salt);

    const existing = queryOne("SELECT value FROM app_settings WHERE key = 'admin_pin_hash'");
    if (existing) {
      runStmt("UPDATE app_settings SET value = ? WHERE key = 'admin_pin_hash'", [hash]);
      logAudit('ADMIN_PIN_UPDATED', 'SECURITY', null, 'Admin PIN/Password was updated.');
    } else {
      runStmt("INSERT INTO app_settings (key, value) VALUES ('admin_pin_hash', ?)", [hash]);
      logAudit('ADMIN_PIN_CONFIGURED', 'SECURITY', null, 'Initial Admin PIN/Password was configured.');
    }

    res.json({ success: true, message: 'Admin PIN saved securely.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/verify-pin', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { pin } = req.body;
    const pinSetting = queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'admin_pin_hash'");

    if (!pinSetting) {
      // No PIN configured yet
      return res.json({ success: true, isDefault: true });
    }

    const isValid = bcrypt.compareSync(pin?.toString() || '', pinSetting.value);
    if (isValid) {
      return res.json({ success: true });
    } else {
      return res.status(401).json({ success: false, error: 'Incorrect Admin PIN/Password.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- DASHBOARD STATS ---

router.get('/dashboard/stats', async (req: Request, res: Response) => {
  try {
    await getDb();
    const now = new Date();
    const nowIso = now.toISOString();

    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfTodayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfTodayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const counts = queryOne<{
      total: number;
      available: number;
      assigned: number;
      expired: number;
      cancelled: number;
    }>(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
      FROM licenses
    `) || { total: 0, available: 0, assigned: 0, expired: 0, cancelled: 0 };

    const totalCustRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = totalCustRow ? totalCustRow.count : 0;

    const todayAssignmentsRow = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM license_assignments WHERE assigned_at >= ?',
      [startOfTodayIso]
    );
    const todayAssignments = todayAssignmentsRow ? todayAssignmentsRow.count : 0;

    const expiringTodayRow = queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM licenses WHERE status = 'ASSIGNED' AND expiry_date >= ? AND expiry_date <= ?",
      [startOfTodayIso, endOfTodayIso]
    );
    const expiringToday = expiringTodayRow ? expiringTodayRow.count : 0;

    const expiringIn3DaysRow = queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM licenses WHERE status = 'ASSIGNED' AND expiry_date >= ? AND expiry_date <= ?",
      [nowIso, in3Days]
    );
    const expiringIn3Days = expiringIn3DaysRow ? expiringIn3DaysRow.count : 0;

    const expiringIn7DaysRow = queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM licenses WHERE status = 'ASSIGNED' AND expiry_date >= ? AND expiry_date <= ?",
      [nowIso, in7Days]
    );
    const expiringIn7Days = expiringIn7DaysRow ? expiringIn7DaysRow.count : 0;

    const paymentsRow = queryOne<{ verified: number; pending: number }>(`
      SELECT 
        SUM(CASE WHEN status = 'VERIFIED' THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
      FROM payments
    `) || { verified: 0, pending: 0 };

    const stats: DashboardStats = {
      totalLicenses: counts.total || 0,
      availableLicenses: counts.available || 0,
      assignedLicenses: counts.assigned || 0,
      expiredLicenses: counts.expired || 0,
      cancelledLicenses: counts.cancelled || 0,
      totalCustomers,
      todayAssignments,
      expiringToday,
      expiringIn3Days,
      expiringIn7Days,
      verifiedPaymentsCount: paymentsRow.verified || 0,
      pendingPaymentsCount: paymentsRow.pending || 0
    };

    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- LICENSE IMPORT & INVENTORY ---

function parseImportContent(content: string, format?: string): string[] {
  const extractedKeys: string[] = [];

  if (!content) return [];

  // Try JSON first if detected
  const trimmed = content.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && item.trim()) {
            extractedKeys.push(item.trim());
          } else if (item && typeof item === 'object' && item.licenseKey) {
            extractedKeys.push(String(item.licenseKey).trim());
          }
        }
        return extractedKeys;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.licenses)) {
        for (const item of parsed.licenses) {
          if (typeof item === 'string' && item.trim()) {
            extractedKeys.push(item.trim());
          } else if (item && typeof item === 'object' && item.licenseKey) {
            extractedKeys.push(String(item.licenseKey).trim());
          }
        }
        return extractedKeys;
      }
    } catch {
      // Not valid JSON, fallback to line-by-line / CSV
    }
  }

  // Handle CSV / Line-by-line
  const lines = content.split(/\r?\n/);
  let licenseKeyColIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // Check if header row has licenseKey or license_key or key
    if (i === 0 && line.includes(',')) {
      const headers = line.split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
      const idx = headers.findIndex((h) => h === 'licensekey' || h === 'license_key' || h === 'license' || h === 'key');
      if (idx !== -1) {
        licenseKeyColIndex = idx;
        continue;
      }
    }

    if (licenseKeyColIndex !== -1 && line.includes(',')) {
      const parts = line.split(',');
      if (parts[licenseKeyColIndex]) {
        const val = parts[licenseKeyColIndex].trim().replace(/^["']|["']$/g, '');
        if (val) extractedKeys.push(val);
      }
    } else {
      // Plain line or CSV with 1 column
      const val = line.replace(/^["']|["']$/g, '').trim();
      if (val) extractedKeys.push(val);
    }
  }

  return extractedKeys;
}

router.post('/licenses/preview-import', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { content, format } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'No license content provided for import.' });
    }

    const rawKeys = parseImportContent(content, format);
    const existingDbLicenses = queryAll<{ license_key: string }>('SELECT license_key FROM licenses');
    const existingSet = new Set(existingDbLicenses.map((r) => r.license_key));

    const seenInBatch = new Set<string>();
    const newKeyList: string[] = [];
    const duplicateKeyList: string[] = [];
    let invalidCount = 0;

    for (const k of rawKeys) {
      if (!k || k.length < 3) {
        invalidCount++;
        continue;
      }

      if (existingSet.has(k) || seenInBatch.has(k)) {
        duplicateKeyList.push(k);
      } else {
        seenInBatch.add(k);
        newKeyList.push(k);
      }
    }

    const result: ImportPreviewResult = {
      totalFound: rawKeys.length,
      newKeys: newKeyList.length,
      duplicateKeys: duplicateKeyList.length,
      invalidKeys: invalidCount,
      newKeyList,
      duplicateKeyList
    };

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/licenses/import', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { keys, notes } = req.body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'No valid keys provided for import.' });
    }

    const now = new Date().toISOString();
    let importedCount = 0;
    const existingDbLicenses = queryAll<{ license_key: string }>('SELECT license_key FROM licenses');
    const existingSet = new Set(existingDbLicenses.map((r) => r.license_key));

    for (const rawKey of keys) {
      const key = String(rawKey).trim();
      if (!key || existingSet.has(key)) continue;

      try {
        db.run(
          "INSERT INTO licenses (license_key, status, imported_at, notes, is_demo) VALUES (?, 'AVAILABLE', ?, ?, 0)",
          [key, now, notes || null]
        );
        existingSet.add(key);
        importedCount++;
      } catch (e) {
        console.warn(`Duplicate or error importing key ${key}:`, e);
      }
    }

    logAudit('LICENSE_IMPORTED', 'LICENSE', null, `Imported ${importedCount} new license keys into inventory.`);

    res.json({
      success: true,
      importedCount,
      message: `Successfully imported ${importedCount} license keys.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/licenses', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { status, search, limit = 500, offset = 0 } = req.query;

    let sql = `
      SELECT 
        l.id,
        l.license_key as licenseKey,
        l.status,
        l.imported_at as importedAt,
        l.assigned_at as assignedAt,
        l.customer_id as customerId,
        c.name as customerName,
        c.telegram_username as telegramUsername,
        c.phone as phone,
        l.start_date as startDate,
        l.expiry_date as expiryDate,
        l.duration_days as durationDays,
        l.notes,
        l.is_demo as isDemo
      FROM licenses l
      LEFT JOIN customers c ON l.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (l.license_key LIKE ? OR c.name LIKE ? OR c.telegram_username LIKE ? OR c.phone LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const licenses = queryAll<License>(sql, params);
    res.json(licenses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROOF UPLOAD & SERVING ---

router.post('/upload-proof', upload.single('proof'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Payment proof file is required.' });
    }

    const proofPath = `/api/proofs/${req.file.filename}`;
    res.json({
      proofPath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/proofs/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(PROOFS_DIR, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Proof file not found' });
  }
});

// --- LICENSE ASSIGNMENT & TRANSACTION WORKFLOW ---

router.post('/licenses/preview-candidate', async (req: Request, res: Response) => {
  try {
    await getDb();
    const candidate = queryOne<{ id: number; license_key: string; imported_at: string }>(
      "SELECT id, license_key, imported_at FROM licenses WHERE status = 'AVAILABLE' ORDER BY imported_at ASC, id ASC LIMIT 1"
    );

    if (!candidate) {
      return res.status(404).json({
        error: 'NO LICENSE AVAILABLE',
        message: 'No available license keys in inventory. Please import keys first.'
      });
    }

    res.json({
      available: true,
      licenseId: candidate.id,
      licenseKey: candidate.license_key,
      importedAt: candidate.imported_at
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/licenses/assign', async (req: Request, res: Response) => {
  const db = await getDb();
  try {
    const {
      customerName,
      telegramUsername,
      phone,
      telegramUserId,
      email,
      address,
      customerNotes,
      paymentProofPath,
      paymentProofOriginalName,
      paymentProofMimeType,
      paymentAmount,
      paymentNotes,
      durationDays = 7,
      customStartDate
    } = req.body;

    // 1. Validation
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    if (!telegramUsername || !telegramUsername.trim()) {
      return res.status(400).json({ error: 'Telegram username is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }
    if (!paymentProofPath || !paymentProofPath.trim()) {
      return res.status(400).json({ error: 'Payment proof is required before assigning a license.' });
    }

    const duration = parseInt(durationDays, 10);
    if (isNaN(duration) || duration <= 0) {
      return res.status(400).json({ error: 'Invalid license duration.' });
    }

    // Time calculations
    const now = new Date();
    const startDateTime = customStartDate ? new Date(customStartDate) : now;
    if (isNaN(startDateTime.getTime())) {
      return res.status(400).json({ error: 'Invalid start date/time.' });
    }

    const expiryDateTime = new Date(startDateTime.getTime() + duration * 24 * 60 * 60 * 1000);
    const startDateIso = startDateTime.toISOString();
    const expiryDateIso = expiryDateTime.toISOString();
    const nowIso = now.toISOString();

    // 2. FIFO License Query
    const availableLicense = queryOne<{ id: number; license_key: string }>(
      "SELECT id, license_key FROM licenses WHERE status = 'AVAILABLE' ORDER BY imported_at ASC, id ASC LIMIT 1"
    );

    if (!availableLicense) {
      return res.status(400).json({
        error: 'NO LICENSE AVAILABLE',
        message: 'No available license keys in inventory. Cannot assign.'
      });
    }

    // 3. Database Transaction
    db.run('BEGIN TRANSACTION');
    let customerId = 0;

    try {
      // Re-verify the license is STILL available inside transaction
      const verifyLicense = queryOne<{ id: number; license_key: string }>(
        "SELECT id, license_key FROM licenses WHERE id = ? AND status = 'AVAILABLE'",
        [availableLicense.id]
      );

      if (!verifyLicense) {
        throw new Error('Selected license was already claimed or is no longer AVAILABLE.');
      }

      // Check if customer with same phone/telegram exists or create new customer
      const existingCustomer = queryOne<{ id: number }>(
        'SELECT id FROM customers WHERE telegram_username = ? OR phone = ? LIMIT 1',
        [telegramUsername.trim(), phone.trim()]
      );

      if (existingCustomer) {
        customerId = existingCustomer.id;
        db.run(
          'UPDATE customers SET name = ?, telegram_user_id = ?, email = ?, address = ?, notes = ?, updated_at = ? WHERE id = ?',
          [
            customerName.trim(),
            telegramUserId ? telegramUserId.trim() : null,
            email ? email.trim() : null,
            address ? address.trim() : null,
            customerNotes || null,
            nowIso,
            customerId
          ]
        );
      } else {
        db.run(
          `INSERT INTO customers (name, telegram_username, telegram_user_id, phone, email, address, notes, created_at, updated_at, is_demo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          [
            customerName.trim(),
            telegramUsername.trim(),
            telegramUserId ? telegramUserId.trim() : null,
            phone.trim(),
            email ? email.trim() : null,
            address ? address.trim() : null,
            customerNotes || null,
            nowIso,
            nowIso
          ]
        );
        const lastId = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
        customerId = lastId ? lastId.id : 0;
      }

      // Record Payment
      db.run(
        `INSERT INTO payments (customer_id, proof_path, proof_original_name, proof_mime_type, status, amount, notes, created_at, verified_at)
         VALUES (?, ?, ?, ?, 'VERIFIED', ?, ?, ?, ?)`,
        [
          customerId,
          paymentProofPath.trim(),
          paymentProofOriginalName || 'proof.png',
          paymentProofMimeType || 'image/png',
          paymentAmount ? parseFloat(paymentAmount) : null,
          paymentNotes || 'Verified during license assignment',
          nowIso,
          nowIso
        ]
      );

      // Update License Status to ASSIGNED
      db.run(
        `UPDATE licenses 
         SET status = 'ASSIGNED', 
             assigned_at = ?, 
             customer_id = ?, 
             start_date = ?, 
             expiry_date = ?, 
             duration_days = ?, 
             notes = ?
         WHERE id = ? AND status = 'AVAILABLE'`,
        [
          nowIso,
          customerId,
          startDateIso,
          expiryDateIso,
          duration,
          customerNotes || 'Assigned to ' + customerName.trim(),
          availableLicense.id
        ]
      );

      // Verify that exactly 1 license row was changed
      const changesRow = queryOne<{ changes: number }>('SELECT changes() as changes');
      if (!changesRow || changesRow.changes !== 1) {
        throw new Error('Failed to update license state. Possible concurrency conflict.');
      }

      // Record in license_assignments
      db.run(
        `INSERT INTO license_assignments (license_id, customer_id, start_date, expiry_date, duration_days, assigned_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          availableLicense.id,
          customerId,
          startDateIso,
          expiryDateIso,
          duration,
          nowIso,
          `Initial assignment (${duration} days)`
        ]
      );

      // Record in audit_logs
      db.run(
        `INSERT INTO audit_logs (action, entity_type, entity_id, description, created_at)
         VALUES ('LICENSE_ASSIGNED', 'LICENSE', ?, ?, ?)`,
        [
          availableLicense.id,
          `License ${availableLicense.license_key} assigned to customer ${customerName.trim()} (${telegramUsername.trim()}) for ${duration} days.`,
          nowIso
        ]
      );

      db.run('COMMIT');
    } catch (txErr) {
      db.run('ROLLBACK');
      throw txErr;
    }

    // Format start/expiry for user-friendly clipboard text
    const formatDt = (d: Date) => {
      const pad = (n: number) => (n < 10 ? `0${n}` : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const clipboardSummary = `Customer: ${customerName.trim()}
Telegram: ${telegramUsername.trim().startsWith('@') ? telegramUsername.trim() : '@' + telegramUsername.trim()}
Phone: ${phone.trim()}
License: ${availableLicense.license_key}
Start: ${formatDt(startDateTime)}
Expiry: ${formatDt(expiryDateTime)}`;

    res.json({
      success: true,
      message: 'License successfully assigned!',
      license: {
        id: availableLicense.id,
        licenseKey: availableLicense.license_key,
        status: 'ASSIGNED',
        startDate: startDateIso,
        expiryDate: expiryDateIso,
        durationDays: duration
      },
      customer: {
        id: customerId,
        name: customerName.trim(),
        telegramUsername: telegramUsername.trim(),
        phone: phone.trim()
      },
      clipboardSummary
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- LICENSE EXTEND & CANCEL ---

router.post('/licenses/extend', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { licenseId, additionalDays, notes } = req.body;

    const days = parseInt(additionalDays, 10);
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'Additional days must be greater than 0.' });
    }

    const license = queryOne<{
      id: number;
      license_key: string;
      status: string;
      customer_id: number;
      expiry_date: string;
      duration_days: number;
    }>('SELECT * FROM licenses WHERE id = ?', [licenseId]);

    if (!license) {
      return res.status(404).json({ error: 'License record not found.' });
    }

    if (license.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot extend a cancelled license.' });
    }

    const currentExpiry = license.expiry_date ? new Date(license.expiry_date) : new Date();
    // If license was expired, extend from now or current expiry
    const baseDate = currentExpiry.getTime() < Date.now() ? new Date() : currentExpiry;
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const newExpiryIso = newExpiry.toISOString();
    const nowIso = new Date().toISOString();

    db.run('BEGIN TRANSACTION');
    try {
      db.run(
        `UPDATE licenses 
         SET expiry_date = ?, 
             duration_days = duration_days + ?, 
             status = 'ASSIGNED' 
         WHERE id = ?`,
        [newExpiryIso, days, licenseId]
      );

      db.run(
        `INSERT INTO license_assignments (license_id, customer_id, start_date, expiry_date, duration_days, assigned_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          license.id,
          license.customer_id || 0,
          nowIso,
          newExpiryIso,
          days,
          nowIso,
          notes ? `Extension: ${notes}` : `Extended by +${days} days`
        ]
      );

      db.run(
        `INSERT INTO audit_logs (action, entity_type, entity_id, description, created_at)
         VALUES ('LICENSE_EXTENDED', 'LICENSE', ?, ?, ?)`,
        [
          license.id,
          `License ${license.license_key} extended by ${days} days until ${newExpiryIso}. Notes: ${notes || 'None'}`,
          nowIso
        ]
      );

      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }

    res.json({
      success: true,
      newExpiryDate: newExpiryIso,
      message: `License extended by ${days} days.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/licenses/cancel', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { licenseId, reason } = req.body;

    const license = queryOne<{ id: number; license_key: string; status: string }>(
      'SELECT id, license_key, status FROM licenses WHERE id = ?',
      [licenseId]
    );

    if (!license) {
      return res.status(404).json({ error: 'License not found.' });
    }

    const nowIso = new Date().toISOString();

    db.run('BEGIN TRANSACTION');
    try {
      db.run("UPDATE licenses SET status = 'CANCELLED' WHERE id = ?", [licenseId]);

      db.run(
        `INSERT INTO audit_logs (action, entity_type, entity_id, description, created_at)
         VALUES ('LICENSE_CANCELLED', 'LICENSE', ?, ?, ?)`,
        [license.id, `License ${license.license_key} cancelled. Reason: ${reason || 'Manual cancellation'}`, nowIso]
      );

      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }

    res.json({
      success: true,
      message: `License ${license.license_key} has been cancelled.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- CUSTOMERS & CRM ---

router.get('/customers', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { search, limit = 500, offset = 0 } = req.query;

    let sql = `
      SELECT 
        c.id,
        c.name,
        c.telegram_username as telegramUsername,
        c.telegram_user_id as telegramUserId,
        c.phone,
        c.email,
        c.address,
        c.notes,
        c.created_at as createdAt,
        c.updated_at as updatedAt,
        c.is_demo as isDemo,
        l.license_key as activeLicenseKey,
        l.expiry_date as activeLicenseExpiry,
        l.status as activeLicenseStatus,
        p.status as paymentStatus,
        p.proof_path as paymentProofPath
      FROM customers c
      LEFT JOIN licenses l ON l.customer_id = c.id AND l.status IN ('ASSIGNED', 'EXPIRED')
      LEFT JOIN (
        SELECT customer_id, status, proof_path, MAX(id) as max_id 
        FROM payments 
        GROUP BY customer_id
      ) p ON p.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (c.name LIKE ? OR c.telegram_username LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR l.license_key LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY c.id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const customers = queryAll<Customer>(sql, params);
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    await getDb();
    const customerId = parseInt(req.params.id, 10);

    const customer = queryOne<Customer>(
      `SELECT 
        id, name, telegram_username as telegramUsername, telegram_user_id as telegramUserId, 
        phone, email, address, notes, created_at as createdAt, updated_at as updatedAt, is_demo as isDemo
       FROM customers WHERE id = ?`,
      [customerId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const currentLicense = queryOne<License>(
      `SELECT 
        id, license_key as licenseKey, status, imported_at as importedAt, assigned_at as assignedAt,
        customer_id as customerId, start_date as startDate, expiry_date as expiryDate, duration_days as durationDays, notes
       FROM licenses WHERE customer_id = ? ORDER BY id DESC LIMIT 1`,
      [customerId]
    );

    const payments = queryAll<Payment>(
      `SELECT 
        id, customer_id as customerId, proof_path as proofPath, proof_original_name as proofOriginalName,
        proof_mime_type as proofMimeType, status, amount, notes, created_at as createdAt, verified_at as verifiedAt
       FROM payments WHERE customer_id = ? ORDER BY id DESC`,
      [customerId]
    );

    const assignments = queryAll<LicenseAssignment>(
      `SELECT 
        la.id, la.license_id as licenseId, l.license_key as licenseKey, la.customer_id as customerId,
        c.name as customerName, c.telegram_username as telegramUsername, la.start_date as startDate,
        la.expiry_date as expiryDate, la.duration_days as durationDays, la.assigned_at as assignedAt, la.notes
       FROM license_assignments la
       JOIN licenses l ON la.license_id = l.id
       JOIN customers c ON la.customer_id = c.id
       WHERE la.customer_id = ?
       ORDER BY la.id DESC`,
      [customerId]
    );

    const auditLogs = queryAll<AuditLog>(
      `SELECT id, action, entity_type as entityType, entity_id as entityId, description, created_at as createdAt
       FROM audit_logs
       WHERE (entity_type = 'CUSTOMER' AND entity_id = ?) 
          OR (entity_type = 'LICENSE' AND entity_id = ?)
          OR description LIKE ?
       ORDER BY id DESC`,
      [customerId, currentLicense ? currentLicense.id : -1, `%${customer.telegramUsername}%`]
    );

    const record: CustomerDetailRecord = {
      customer,
      currentLicense,
      payments,
      assignments,
      auditLogs
    };

    res.json(record);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/customers/:id', async (req: Request, res: Response) => {
  try {
    await getDb();
    const customerId = parseInt(req.params.id, 10);
    const { name, telegramUsername, telegramUserId, phone, email, address, notes } = req.body;

    if (!name || !telegramUsername || !phone) {
      return res.status(400).json({ error: 'Name, Telegram username, and Phone are required.' });
    }

    const nowIso = new Date().toISOString();
    runStmt(
      `UPDATE customers 
       SET name = ?, telegram_username = ?, telegram_user_id = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [
        name.trim(),
        telegramUsername.trim(),
        telegramUserId ? telegramUserId.trim() : null,
        phone.trim(),
        email ? email.trim() : null,
        address ? address.trim() : null,
        notes || null,
        nowIso,
        customerId
      ]
    );

    logAudit('CUSTOMER_UPDATED', 'CUSTOMER', customerId, `Customer ${name} (${telegramUsername}) profile was updated.`);

    res.json({ success: true, message: 'Customer updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PAYMENTS LIST & MANAGEMENT ---

router.get('/payments', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { status, search } = req.query;

    let sql = `
      SELECT 
        p.id,
        p.customer_id as customerId,
        c.name as customerName,
        c.telegram_username as telegramUsername,
        c.phone as phone,
        p.proof_path as proofPath,
        p.proof_original_name as proofOriginalName,
        p.proof_mime_type as proofMimeType,
        p.status,
        p.amount,
        p.notes,
        p.created_at as createdAt,
        p.verified_at as verifiedAt
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      sql += ' AND p.status = ?';
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (c.name LIKE ? OR c.telegram_username LIKE ? OR c.phone LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY p.id DESC';

    const payments = queryAll<Payment>(sql, params);
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/payments/:id/verify', async (req: Request, res: Response) => {
  try {
    await getDb();
    const paymentId = parseInt(req.params.id, 10);
    const nowIso = new Date().toISOString();

    runStmt("UPDATE payments SET status = 'VERIFIED', verified_at = ? WHERE id = ?", [nowIso, paymentId]);
    logAudit('PAYMENT_VERIFIED', 'PAYMENT', paymentId, `Payment #${paymentId} was marked as VERIFIED.`);

    res.json({ success: true, message: 'Payment verified.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/payments/:id/reject', async (req: Request, res: Response) => {
  try {
    await getDb();
    const paymentId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    runStmt("UPDATE payments SET status = 'REJECTED', notes = ? WHERE id = ?", [
      reason ? `Rejected: ${reason}` : 'Rejected',
      paymentId
    ]);
    logAudit('PAYMENT_REJECTED', 'PAYMENT', paymentId, `Payment #${paymentId} was rejected: ${reason || 'Unspecified'}`);

    res.json({ success: true, message: 'Payment marked as rejected.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUDIT LOGS ---

router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    await getDb();
    const { limit = 300, offset = 0, search } = req.query;

    let sql = `
      SELECT 
        id, 
        action, 
        entity_type as entityType, 
        entity_id as entityId, 
        description, 
        created_at as createdAt
      FROM audit_logs
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && typeof search === 'string' && search.trim()) {
      sql += ' AND (action LIKE ? OR description LIKE ? OR entity_type LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const logs = queryAll<AuditLog>(sql, params);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- REPORTS & CSV EXPORTS ---

router.get('/reports', async (req: Request, res: Response) => {
  try {
    await getDb();

    // Last 14 days assignments chart
    const dailyAssignments = queryAll<{ date: string; count: number }>(`
      SELECT substr(assigned_at, 1, 10) as date, COUNT(*) as count 
      FROM license_assignments 
      WHERE assigned_at >= datetime('now', '-30 days')
      GROUP BY substr(assigned_at, 1, 10)
      ORDER BY date ASC
    `);

    // Status breakdown
    const inventoryBreakdown = queryAll<{ status: string; count: number }>(`
      SELECT status, COUNT(*) as count 
      FROM licenses 
      GROUP BY status
    `);

    // Duration breakdown
    const durationBreakdown = queryAll<{ duration_days: number; count: number }>(`
      SELECT duration_days, COUNT(*) as count 
      FROM license_assignments 
      WHERE duration_days IS NOT NULL
      GROUP BY duration_days
      ORDER BY count DESC
    `);

    res.json({
      dailyAssignments,
      inventoryBreakdown,
      durationBreakdown
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export/:type', async (req: Request, res: Response) => {
  try {
    await getDb();
    const type = req.params.type.toLowerCase();
    let csv = '';
    let filename = `export-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'customers') {
      const rows = queryAll<any>(`
        SELECT 
          c.id, c.name, c.telegram_username, c.phone, c.email, c.address, 
          l.license_key, l.status as license_status, l.expiry_date, c.created_at
        FROM customers c
        LEFT JOIN licenses l ON l.customer_id = c.id
        ORDER BY c.id DESC
      `);
      csv = 'ID,Name,Telegram,Phone,Email,Address,License Key,License Status,Expiry Date,Created At\n';
      csv += rows
        .map((r) =>
          [
            r.id,
            `"${(r.name || '').replace(/"/g, '""')}"`,
            `"${(r.telegram_username || '').replace(/"/g, '""')}"`,
            `"${(r.phone || '').replace(/"/g, '""')}"`,
            `"${(r.email || '').replace(/"/g, '""')}"`,
            `"${(r.address || '').replace(/"/g, '""')}"`,
            `"${(r.license_key || '').replace(/"/g, '""')}"`,
            `"${r.license_status || 'N/A'}"`,
            `"${r.expiry_date || 'N/A'}"`,
            `"${r.created_at}"`
          ].join(',')
        )
        .join('\n');
    } else if (type === 'licenses') {
      const rows = queryAll<any>(`
        SELECT 
          l.id, l.license_key, l.status, l.imported_at, l.assigned_at, 
          c.name as customer_name, c.telegram_username, l.start_date, l.expiry_date, l.duration_days, l.notes
        FROM licenses l
        LEFT JOIN customers c ON l.customer_id = c.id
        ORDER BY l.id DESC
      `);
      csv = 'ID,License Key,Status,Imported At,Assigned At,Customer Name,Telegram Username,Start Date,Expiry Date,Duration Days,Notes\n';
      csv += rows
        .map((r) =>
          [
            r.id,
            `"${(r.license_key || '').replace(/"/g, '""')}"`,
            `"${r.status}"`,
            `"${r.imported_at}"`,
            `"${r.assigned_at || ''}"`,
            `"${(r.customer_name || '').replace(/"/g, '""')}"`,
            `"${(r.telegram_username || '').replace(/"/g, '""')}"`,
            `"${r.start_date || ''}"`,
            `"${r.expiry_date || ''}"`,
            `"${r.duration_days || ''}"`,
            `"${(r.notes || '').replace(/"/g, '""')}"`
          ].join(',')
        )
        .join('\n');
    } else if (type === 'assignments') {
      const rows = queryAll<any>(`
        SELECT 
          la.id, l.license_key, c.name as customer_name, c.telegram_username, c.phone,
          la.start_date, la.expiry_date, la.duration_days, la.assigned_at, la.notes
        FROM license_assignments la
        JOIN licenses l ON la.license_id = l.id
        JOIN customers c ON la.customer_id = c.id
        ORDER BY la.id DESC
      `);
      csv = 'ID,License Key,Customer Name,Telegram Username,Phone,Start Date,Expiry Date,Duration Days,Assigned At,Notes\n';
      csv += rows
        .map((r) =>
          [
            r.id,
            `"${(r.license_key || '').replace(/"/g, '""')}"`,
            `"${(r.customer_name || '').replace(/"/g, '""')}"`,
            `"${(r.telegram_username || '').replace(/"/g, '""')}"`,
            `"${(r.phone || '').replace(/"/g, '""')}"`,
            `"${r.start_date}"`,
            `"${r.expiry_date}"`,
            `"${r.duration_days}"`,
            `"${r.assigned_at}"`,
            `"${(r.notes || '').replace(/"/g, '""')}"`
          ].join(',')
        )
        .join('\n');
    } else if (type === 'audit-logs') {
      const rows = queryAll<any>('SELECT id, action, entity_type, entity_id, description, created_at FROM audit_logs ORDER BY id DESC');
      csv = 'ID,Action,Entity Type,Entity ID,Description,Created At\n';
      csv += rows
        .map((r) =>
          [
            r.id,
            `"${r.action}"`,
            `"${r.entity_type}"`,
            `"${r.entity_id || ''}"`,
            `"${(r.description || '').replace(/"/g, '""')}"`,
            `"${r.created_at}"`
          ].join(',')
        )
        .join('\n');
    } else {
      return res.status(400).json({ error: 'Invalid export type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- BACKUP & RESTORE ---

const handleBackupDownload = async (req: Request, res: Response) => {
  try {
    await getDb();
    const buffer = getDatabaseBuffer();
    const filename = `license-manager-backup-${new Date().toISOString().slice(0, 10)}.db`;

    logAudit('BACKUP_CREATED', 'SYSTEM', null, 'Database backup file exported.');

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/backup/download', handleBackupDownload);
router.get('/backup', handleBackupDownload);

router.post('/backup/restore', upload.single('backupFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded.' });
    }

    const buffer = fs.readFileSync(req.file.path);
    await restoreDatabaseBuffer(buffer);
    fs.unlinkSync(req.file.path); // remove temp uploaded file

    res.json({ success: true, message: 'Database restored successfully from backup!' });
  } catch (err: any) {
    res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
});

// --- SETTINGS ---

router.get('/settings', async (req: Request, res: Response) => {
  try {
    await getDb();
    const rows = queryAll<{ key: string; value: string }>('SELECT key, value FROM app_settings');
    const settingsMap: Record<string, string> = {};
    for (const r of rows) {
      if (r.key !== 'admin_pin_hash') {
        settingsMap[r.key] = r.value;
      }
    }
    res.json(settingsMap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const body = req.body || {};

    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        db.run("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", [key, String(value)]);
      }
    }

    logAudit('SETTINGS_UPDATED', 'SYSTEM', null, 'Application settings updated.');
    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings/pin', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { newPin, currentPin, pin } = req.body;
    const targetPin = newPin || pin;

    if (!targetPin || String(targetPin).length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 characters long.' });
    }

    const existingPinRow = queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = 'admin_pin_hash'");
    if (existingPinRow && existingPinRow.value && currentPin) {
      const match = await bcrypt.compare(String(currentPin), existingPinRow.value);
      if (!match) {
        return res.status(401).json({ error: 'Current PIN is incorrect.' });
      }
    }

    const hash = await bcrypt.hash(String(targetPin), 10);
    db.run("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('admin_pin_hash', ?)", [hash]);
    logAudit('PIN_CHANGED', 'SYSTEM', null, 'Admin security PIN has been updated.');

    res.json({ success: true, message: 'Admin security PIN successfully configured.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- SAMPLE / DEMO DATA (FOR DEV & TESTING) ---

const handleLoadDemo = async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const now = new Date();
    const nowIso = now.toISOString();

    const sampleKeys = [
      'PB-DEMO-A19F83C7E92B45108C73DA1F6E20',
      'PB-DEMO-B28C94D8F03C56219D84EB207F31',
      'PB-DEMO-C37D05E9A14D67320E95FC318A42',
      'PB-DEMO-D46E16FA025E78431FA60D429B53',
      'PB-DEMO-E55F270B136F895420B71E530C64',
      'PB-DEMO-F640381C2470906531C82F641D75',
      'PB-DEMO-G731492D3581017642D930752E86',
      'PB-DEMO-H822503E4692128753EA41863F97',
      'PB-DEMO-J913614F5703239864FB52974A08',
      'PB-DEMO-K004725068143409750C63085B19'
    ];

    let inserted = 0;
    for (const key of sampleKeys) {
      try {
        db.run(
          "INSERT INTO licenses (license_key, status, imported_at, notes, is_demo) VALUES (?, 'AVAILABLE', ?, 'Sample Demo License Key', 1)",
          [key, nowIso]
        );
        inserted++;
      } catch {
        // ignore duplicate
      }
    }

    logAudit('DEMO_DATA_LOADED', 'SYSTEM', null, `Loaded ${inserted} demo license keys.`);
    res.json({ success: true, count: inserted, message: `Loaded ${inserted} sample demo licenses.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.post('/demo/load', handleLoadDemo);
router.post('/demo/seed', handleLoadDemo);

router.post('/demo/clear', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM licenses WHERE is_demo = 1');
    db.run('DELETE FROM customers WHERE is_demo = 1');
    logAudit('DEMO_DATA_CLEARED', 'SYSTEM', null, 'Cleared all sample demo data.');
    res.json({ success: true, message: 'All demo licenses and demo customers have been cleared.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/data/clear', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM license_assignments');
    db.run('DELETE FROM payments');
    db.run('DELETE FROM licenses');
    db.run('DELETE FROM customers');
    db.run('DELETE FROM audit_logs');
    logAudit('DATA_CLEARED', 'SYSTEM', null, 'All license, customer, payment and audit records cleared.');
    res.json({ success: true, message: 'All data cleared successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
