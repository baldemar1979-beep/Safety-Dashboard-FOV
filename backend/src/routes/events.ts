import { Router, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { Readable } from 'stream';
import db from '../database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel and CSV files are allowed'));
    }
  },
});

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/** Convert an ExcelJS cell value to a plain string/number/null */
function cellValue(val: ExcelJS.CellValue): string | number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object' && 'result' in val) {
    // Formula cell — use the cached result
    return cellValue((val as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue);
  }
  if (typeof val === 'object' && 'richText' in val) {
    // Rich text cell
    return (val as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('');
  }
  if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
    return String(val);
  }
  return String(val);
}

// Upload Excel file (admin only)
router.post('/upload', authenticateToken, requireAdmin, upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();

    // Read from buffer via a Readable stream
    const bufferStream = Readable.from(req.file.buffer);
    const isCSV = req.file.originalname.toLowerCase().endsWith('.csv') ||
                  req.file.mimetype === 'text/csv';

    if (isCSV) {
      await workbook.csv.read(bufferStream);
    } else {
      await workbook.xlsx.read(bufferStream);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      res.status(400).json({ error: 'No worksheet found in the uploaded file' });
      return;
    }

    // Read header row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(String(cellValue(cell.value) ?? '').trim());
    });

    if (headers.length === 0) {
      res.status(400).json({ error: 'No data found in the uploaded file' });
      return;
    }

    // Parse data rows into plain objects
    const rows: Record<string, string | number | null>[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const obj: Record<string, string | number | null> = {};
      headers.forEach((header, idx) => {
        obj[header] = cellValue(row.getCell(idx + 1).value);
      });
      rows.push(obj);
    });

    if (rows.length === 0) {
      res.status(400).json({ error: 'No data rows found in the uploaded file' });
      return;
    }

    // Determine week/year from detection_time of first event with a valid date
    const now = new Date();
    let weekNum = getWeekNumber(now).week;
    let yearNum = getWeekNumber(now).year;

    for (const row of rows) {
      const dt = row['detection_time'];
      if (dt) {
        const parsed = new Date(String(dt));
        if (!isNaN(parsed.getTime())) {
          const wk = getWeekNumber(parsed);
          weekNum = wk.week;
          yearNum = wk.year;
          break;
        }
      }
    }

    // Create upload record
    const uploadResult = db.prepare(`
      INSERT INTO uploads (filename, uploaded_by, event_count, week_number, year_number)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.file.originalname, req.user!.id, rows.length, weekNum, yearNum);

    const uploadId = uploadResult.lastInsertRowid;

    // Insert events in a single transaction
    const insertEvent = db.prepare(`
      INSERT INTO fov_events (
        event_id, vehicle_id, vehicle, driver, detection_time, utc_offset,
        event_type, detected_event_type, duration_seconds, speed_kph,
        travel_metres, latitude, longitude, audio_alert, vibration_alert,
        visual_alert, trip_distance_metres, trip_time_seconds, confirmation,
        confirmation_time, classification, fleet, timezone, account,
        service_provider, shift, crew, guardian_unit, software_version, tags,
        upload_id, week_number, year_number
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const insertMany = db.transaction((events: Record<string, string | number | null>[]) => {
      for (const row of events) {
        const detectionTime = row['detection_time'];
        let rowWeek = weekNum;
        let rowYear = yearNum;
        if (detectionTime) {
          const parsed = new Date(String(detectionTime));
          if (!isNaN(parsed.getTime())) {
            const wk = getWeekNumber(parsed);
            rowWeek = wk.week;
            rowYear = wk.year;
          }
        }

        insertEvent.run(
          row['event_id'] ?? null,
          row['vehicle_id'] ?? null,
          row['vehicle'] ?? null,
          row['driver'] ?? null,
          detectionTime ? String(detectionTime) : null,
          row['utc_offset'] ?? null,
          row['event_type'] ?? null,
          row['detected_event_type'] ?? null,
          row['duration_seconds'] ?? null,
          row['speed_kph'] ?? null,
          row['travel_metres'] ?? null,
          row['latitude'] ?? null,
          row['longitude'] ?? null,
          row['audio_alert'] ?? null,
          row['vibration_alert'] ?? null,
          row['visual_alert'] ?? null,
          row['trip_distance_metres'] ?? null,
          row['trip_time_seconds'] ?? null,
          row['confirmation'] ?? null,
          row['confirmation_time'] ? String(row['confirmation_time']) : null,
          row['classification'] ?? null,
          row['fleet'] ?? null,
          row['timezone'] ?? null,
          row['account'] ?? null,
          row['service_provider'] ?? null,
          row['shift'] ?? null,
          row['crew'] ?? null,
          row['guardian_unit'] ?? null,
          row['software_version'] ?? null,
          row['tags'] ?? null,
          uploadId,
          rowWeek,
          rowYear
        );
      }
    });

    insertMany(rows);

    res.json({
      message: `Successfully imported ${rows.length} events`,
      upload_id: uploadId,
      event_count: rows.length,
      week_number: weekNum,
      year_number: yearNum,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process file: ' + (err as Error).message });
  }
});

// Get events list with filtering
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const {
    driver,
    event_type,
    week,
    year,
    upload_id,
    page = '1',
    limit = '50',
    search,
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Employees can only see their own driver's events
  if (req.user!.role !== 'admin') {
    if (!req.user!.driver_name) {
      res.json({ events: [], total: 0, page: pageNum, limit: limitNum });
      return;
    }
    conditions.push('driver = ?');
    params.push(req.user!.driver_name);
  } else if (driver) {
    conditions.push('driver = ?');
    params.push(driver);
  }

  if (event_type) {
    conditions.push('event_type = ?');
    params.push(event_type);
  }

  if (week && year) {
    conditions.push('week_number = ? AND year_number = ?');
    params.push(parseInt(week), parseInt(year));
  }

  if (upload_id) {
    conditions.push('upload_id = ?');
    params.push(parseInt(upload_id));
  }

  if (search) {
    conditions.push('(driver LIKE ? OR vehicle LIKE ? OR event_type LIKE ? OR detected_event_type LIKE ? OR classification LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) as count FROM fov_events ${where}`).get(...params) as { count: number };
  const events = db.prepare(`SELECT * FROM fov_events ${where} ORDER BY detection_time DESC LIMIT ? OFFSET ?`).all(...params, limitNum, offset);

  res.json({
    events,
    total: countRow.count,
    page: pageNum,
    limit: limitNum,
  });
});

// Get single event
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const event = db.prepare('SELECT * FROM fov_events WHERE id = ?').get(req.params.id) as {
    driver: string;
    [key: string]: unknown;
  } | undefined;

  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  // Employees can only view their own events
  if (req.user!.role !== 'admin' && event.driver !== req.user!.driver_name) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(event);
});

// Export events to Excel
router.get('/export/excel', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { driver, event_type, week, year } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.user!.role !== 'admin') {
    if (!req.user!.driver_name) {
      res.status(400).json({ error: 'No driver assigned to your account' });
      return;
    }
    conditions.push('driver = ?');
    params.push(req.user!.driver_name);
  } else if (driver) {
    conditions.push('driver = ?');
    params.push(driver);
  }

  if (event_type) {
    conditions.push('event_type = ?');
    params.push(event_type);
  }

  if (week && year) {
    conditions.push('week_number = ? AND year_number = ?');
    params.push(parseInt(week), parseInt(year));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const events = db.prepare(`
    SELECT event_id, vehicle_id, vehicle, driver, detection_time, utc_offset,
    event_type, detected_event_type, duration_seconds, speed_kph, travel_metres,
    latitude, longitude, audio_alert, vibration_alert, visual_alert,
    trip_distance_metres, trip_time_seconds, confirmation, confirmation_time,
    classification, fleet, timezone, account, service_provider, shift, crew,
    guardian_unit, software_version, tags
    FROM fov_events ${where} ORDER BY detection_time DESC
  `).all(...params) as Record<string, unknown>[];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('FOV Events');

  if (events.length > 0) {
    // Add header row from the first event's keys
    worksheet.columns = Object.keys(events[0]).map((key) => ({
      header: key,
      key,
      width: Math.max(key.length + 2, 14),
    }));
    // Add data rows
    worksheet.addRows(events);
    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1D4ED8' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="fov-events-export.xlsx"');

  await workbook.xlsx.write(res);
  res.end();
});

// Get upload history (admin only)
router.get('/uploads/history', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const uploads = db.prepare(`
    SELECT u.*, us.name as uploaded_by_name
    FROM uploads u
    LEFT JOIN users us ON u.uploaded_by = us.id
    ORDER BY u.created_at DESC
    LIMIT 50
  `).all();
  res.json(uploads);
});

export default router;
