import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function getPort(value) {
  const parsed = Number.parseInt(value || "3000", 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : 3000;
}

const port = getPort(process.env.PORT);
const host = process.env.HOST || "0.0.0.0";
const bookingsFile = join(__dirname, "data", "bookings.json");
const enquiriesFile = join(__dirname, "data", "enquiries.json");
const contestEntriesFile = join(__dirname, "data", "contest-entries.json");
const luckyEntriesFile = join(__dirname, "data", "lucky-entries.json");
const invoicesDirectory = join(__dirname, "data", "invoices");
const ziroFestival = "Ziro Music Festival 2026";
const dinnerRatePerGuestNight = 400;
const planDetails = {
  "Dome Tent - 2 Sharing": { rate: 2200, rateType: "night" },
  "Dome Tent - 3 Sharing": { rate: 2000, rateType: "night" },
  "Dome Tent - Solo": { rate: 3000, rateType: "night" },
  "Alpine Tent - 4 Sharing": { rate: 2000, rateType: "night" },
  "Alpine Tent - 3 Sharing": { rate: 2600, rateType: "night" },
  "Alpine Tent - 2 Sharing": { rate: 3800, rateType: "night" },
  "Premium Tent": { rate: 4500, rateType: "night" },
  "5N/6D Ex Guwahati - Traveller": { rate: 18000, rateType: "package", nights: 5 },
  "5N/6D Ex Guwahati - Urbania": { rate: 22000, rateType: "package", nights: 5 },
  "5N/6D Ex Guwahati - Innova / Ertiga": { rate: 20000, rateType: "package", nights: 5 },
  "4N/5D Ex Naharlagun": { rate: 12000, rateType: "package", nights: 4 }
};
const databaseUrl = process.env.DATABASE_URL || "";
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "",
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
  user: process.env.DB_USER || process.env.MYSQL_USER || "",
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || ""
};
const hasDatabaseConfig = Boolean(databaseUrl || (dbConfig.host && dbConfig.user && dbConfig.password && dbConfig.database));
const databaseRequired = process.env.NODE_ENV === "production" || process.env.REQUIRE_DATABASE === "true";
let dbPoolPromise;

class StorageUnavailableError extends Error {
  constructor() {
    super("Your details could not be saved right now. Please try again in a few minutes.");
    this.name = "StorageUnavailableError";
    this.statusCode = 503;
  }
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function initializeDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(40) PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      festival VARCHAR(255) NOT NULL,
      plan VARCHAR(255) NOT NULL,
      arrival_date DATE NULL,
      nights INT NOT NULL,
      guests INT NOT NULL,
      dinner_included TINYINT(1) NOT NULL DEFAULT 0,
      base_amount INT NOT NULL,
      dinner_amount INT NOT NULL DEFAULT 0,
      total_amount INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      invoice_path VARCHAR(255) NOT NULL,
      source VARCHAR(64) NOT NULL DEFAULT 'website'
    )
  `);

  const [bookingColumns] = await pool.query("SHOW COLUMNS FROM bookings");
  const bookingColumnNames = new Set(bookingColumns.map((column) => column.Field));
  if (bookingColumnNames.has("retail_rate")) {
    await pool.query("ALTER TABLE bookings MODIFY retail_rate VARCHAR(255) NULL");
  }
  if (bookingColumnNames.has("food")) {
    await pool.query("ALTER TABLE bookings MODIFY food VARCHAR(255) NULL");
  }
  const requiredBookingColumns = [
    ["dinner_included", "TINYINT(1) NOT NULL DEFAULT 0"],
    ["base_amount", "INT NOT NULL DEFAULT 0"],
    ["dinner_amount", "INT NOT NULL DEFAULT 0"],
    ["total_amount", "INT NOT NULL DEFAULT 0"],
    ["invoice_path", "VARCHAR(255) NULL"]
  ];
  for (const [name, definition] of requiredBookingColumns) {
    if (!bookingColumnNames.has(name)) {
      await pool.query(`ALTER TABLE bookings ADD COLUMN ${name} ${definition}`);
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id VARCHAR(40) PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NULL,
      email VARCHAR(255) NULL,
      subject VARCHAR(255) NULL,
      message TEXT NOT NULL,
      source VARCHAR(64) NOT NULL DEFAULT 'website'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contest_entries (
      id VARCHAR(40) PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      instagram_url VARCHAR(1000) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      source VARCHAR(64) NOT NULL DEFAULT 'website'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lucky_entries (
      id VARCHAR(40) PRIMARY KEY,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(32) NOT NULL DEFAULT 'new',
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      booking_reference VARCHAR(40) NOT NULL,
      source VARCHAR(64) NOT NULL DEFAULT 'website'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS storage_migrations (
      name VARCHAR(128) PRIMARY KEY,
      completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function positiveInteger(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function mysqlDate(value) {
  const parsed = new Date(value);
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function migrateLegacyBookings(pool) {
  const migrationName = "legacy_bookings_json_v1";
  const [completed] = await pool.execute("SELECT name FROM storage_migrations WHERE name = ? LIMIT 1", [migrationName]);
  if (completed.length > 0) {
    return;
  }

  let bookings;
  try {
    bookings = JSON.parse(await readFile(bookingsFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (!Array.isArray(bookings)) {
    throw new Error("Legacy bookings.json is not a valid booking list");
  }

  for (const booking of bookings) {
    if (!booking || !booking.id || !booking.plan || !booking.name || !booking.phone) {
      continue;
    }

    const planDetail = planDetails[booking.plan];
    const guests = positiveInteger(booking.guests);
    const nights = positiveInteger(booking.nights, planDetail?.nights || 1);
    const dinnerIncluded = booking.dinnerIncluded === true || booking.dinnerIncluded === "true" || /dinner/i.test(String(booking.food || ""));
    const calculatedBaseAmount = planDetail ? planDetail.rate * guests * (planDetail.rateType === "night" ? nights : 1) : 0;
    const baseAmount = nonNegativeInteger(booking.baseAmount, calculatedBaseAmount);
    const dinnerAmount = nonNegativeInteger(booking.dinnerAmount, dinnerIncluded ? dinnerRatePerGuestNight * guests * nights : 0);
    const totalAmount = nonNegativeInteger(booking.totalAmount, baseAmount + dinnerAmount);

    await pool.execute(
      `INSERT IGNORE INTO bookings
        (id, created_at, status, festival, plan, arrival_date, nights, guests, dinner_included, base_amount, dinner_amount, total_amount, name, phone, invoice_path, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        booking.id,
        mysqlDate(booking.createdAt),
        booking.status || "new",
        booking.festival || ziroFestival,
        booking.plan,
        booking.arrivalDate || null,
        nights,
        guests,
        dinnerIncluded ? 1 : 0,
        baseAmount,
        dinnerAmount,
        totalAmount,
        booking.name,
        booking.phone,
        booking.invoicePath || "",
        "legacy-json-migration"
      ]
    );
  }

  await pool.execute("INSERT INTO storage_migrations (name) VALUES (?)", [migrationName]);
}

async function getDbPool() {
  if (!hasDatabaseConfig) {
    return null;
  }

  if (!dbPoolPromise) {
    dbPoolPromise = (async () => {
      const mysql = await import("mysql2/promise");
      const pool = databaseUrl
        ? mysql.createPool(databaseUrl)
        : mysql.createPool({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
          });

      await initializeDatabase(pool);
      await migrateLegacyBookings(pool);
      return pool;
    })();
  }

  try {
    return await dbPoolPromise;
  } catch (error) {
    dbPoolPromise = undefined;
    throw error;
  }
}

async function getStoragePool() {
  try {
    const pool = await getDbPool();
    if (pool) {
      return pool;
    }
  } catch (error) {
    console.error("MySQL storage is unavailable.", error.message);
    throw new StorageUnavailableError();
  }

  if (databaseRequired) {
    console.error("MySQL storage is required but database configuration is missing.");
    throw new StorageUnavailableError();
  }

  return null;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 20_000) {
      throw new Error("Payload too large");
    }
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function cleanBooking(input) {
  const plan = String(input.plan || "").trim();
  const planDetail = planDetails[plan];
  const booking = {
    festival: ziroFestival,
    plan,
    arrivalDate: String(input.arrivalDate || "").trim(),
    nights: Number(input.nights || 0),
    guests: Number(input.guests || 0),
    dinnerIncluded: input.dinnerIncluded === true || input.dinnerIncluded === "true",
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim()
  };

  if (!booking.plan || !booking.arrivalDate || !booking.name || !booking.phone) {
    throw new Error("Missing required booking fields");
  }

  if (!planDetail) {
    throw new Error("Please select a valid stay option");
  }

  if (!/^2026-09-(2[4-7])$/.test(booking.arrivalDate)) {
    throw new Error("Arrival date must be during Ziro Music Festival 2026");
  }

  if (!Number.isInteger(booking.nights) || booking.nights < 1 || booking.nights > 6) {
    throw new Error("Night count must be between 1 and 6");
  }

  if (!Number.isInteger(booking.guests) || booking.guests < 1 || booking.guests > 12) {
    throw new Error("Guest count must be between 1 and 12");
  }

  const phoneDigits = booking.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new Error("Please enter a valid phone number");
  }

  if (planDetail.nights) {
    booking.nights = planDetail.nights;
  }

  booking.baseAmount = planDetail.rate * booking.guests * (planDetail.rateType === "night" ? booking.nights : 1);
  booking.dinnerAmount = booking.dinnerIncluded ? dinnerRatePerGuestNight * booking.guests * booking.nights : 0;
  booking.totalAmount = booking.baseAmount + booking.dinnerAmount;

  return booking;
}

function cleanEnquiry(input) {
  const enquiry = {
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    email: String(input.email || "").trim(),
    subject: String(input.subject || "Website enquiry").trim(),
    message: String(input.message || input.notes || "").trim()
  };

  if (!enquiry.name || !enquiry.message) {
    throw new Error("Name and message are required");
  }

  if (!enquiry.phone && !enquiry.email) {
    throw new Error("Phone or email is required");
  }

  return enquiry;
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw new Error("Please enter a valid email address");
  }
  return email;
}

function cleanPhone(value) {
  const phone = String(value || "").trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    throw new Error("Please enter a valid phone number");
  }
  return phone;
}

function cleanContestEntry(input) {
  const instagramUrl = String(input.instagramUrl || "").trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(instagramUrl);
  } catch {
    throw new Error("Please enter a valid Instagram reel or post link");
  }

  if (!/^https?:$/.test(parsedUrl.protocol) || !/(^|\.)instagram\.com$/i.test(parsedUrl.hostname)) {
    throw new Error("Please submit a valid Instagram link");
  }

  if (input.confirmedSteps !== true && input.confirmedSteps !== "true") {
    throw new Error("Please confirm that you followed, posted and tagged Northeast Basecamp");
  }

  return {
    instagramUrl: parsedUrl.toString(),
    email: cleanEmail(input.email),
    phone: cleanPhone(input.phone)
  };
}

function cleanLuckyEntry(input) {
  const bookingReference = String(input.bookingReference || "").trim().toUpperCase();
  if (!/^NBC-[A-Z0-9]+-[A-Z0-9]+$/.test(bookingReference)) {
    throw new Error("Please enter the booking reference shown on your invoice");
  }

  return {
    email: cleanEmail(input.email),
    phone: cleanPhone(input.phone),
    bookingReference
  };
}

function createReference(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function formatInr(amount) {
  return `INR ${new Intl.NumberFormat("en-IN").format(amount)}`;
}

function pdfEscape(value) {
  return String(value).replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7E]/g, "?");
}

async function createInvoicePdf(record) {
  const invoicePath = join(invoicesDirectory, `${record.id}.pdf`);
  const lines = [
    [20, "NORTHEAST BASECAMP"],
    [12, "BOOKING REQUEST INVOICE"],
    [10, ""],
    [10, `Invoice reference: ${record.id}`],
    [10, `Issued: ${new Date(record.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`],
    [10, `Guest: ${record.name}`],
    [10, `Phone: ${record.phone}`],
    [10, ""],
    [12, "Booking details"],
    [10, `Festival: ${record.festival}`],
    [10, `Package: ${record.plan}`],
    [10, `Arrival: ${record.arrivalDate}`],
    [10, `Guests: ${record.guests} | Nights: ${record.nights}`],
    [10, `Dinner: ${record.dinnerIncluded ? "Included" : "Not included"}`],
    [10, ""],
    [10, `Base package: ${formatInr(record.baseAmount)}`],
    [10, `Dinner (${record.dinnerIncluded ? `${record.guests} guests x ${record.nights} nights x INR ${dinnerRatePerGuestNight}` : "not selected"}): ${formatInr(record.dinnerAmount)}`],
    [14, `TOTAL: ${formatInr(record.totalAmount)}`],
    [10, ""],
    [9, "This is a booking request invoice, not a payment receipt."],
    [9, "Availability and payment instructions will be confirmed by Northeast Basecamp."]
  ];
  let cursorY = 800;
  const commands = ["BT", "/F1 10 Tf", "50 800 Td"];
  for (const [size, text] of lines) {
    commands.push(`/${size >= 14 ? "F2" : "F1"} ${size} Tf`);
    commands.push(`0 -${size + 7} Td`);
    commands.push(`(${pdfEscape(text)}) Tj`);
    cursorY -= size + 7;
  }
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  await mkdir(invoicesDirectory, { recursive: true });
  await writeFile(invoicePath, pdf, "binary");
  return `data/invoices/${record.id}.pdf`;
}

async function saveBooking(booking) {
  const record = {
    id: createReference("NBC"),
    createdAt: new Date().toISOString(),
    status: "new",
    ...booking
  };
  record.invoicePath = await createInvoicePdf(record);

  const pool = await getStoragePool();
  if (pool) {
    try {
      await pool.execute(
        `INSERT INTO bookings
          (id, created_at, status, festival, plan, arrival_date, nights, guests, dinner_included, base_amount, dinner_amount, total_amount, name, phone, invoice_path, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.createdAt.slice(0, 19).replace("T", " "),
          record.status,
          record.festival,
          record.plan,
          record.arrivalDate || null,
          record.nights,
          record.guests,
          record.dinnerIncluded ? 1 : 0,
          record.baseAmount,
          record.dinnerAmount,
          record.totalAmount,
          record.name,
          record.phone,
          record.invoicePath,
          "website"
        ]
      );
      return record;
    } catch (error) {
      console.error("MySQL booking insert failed.", error.message);
      throw new StorageUnavailableError();
    }
  }

  // JSON storage is available only for local development when no database is configured.
  await appendLocalRecord(bookingsFile, record);
  return record;
}

async function appendLocalRecord(filePath, record) {
  await mkdir(dirname(filePath), { recursive: true });
  let records = [];
  try {
    records = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    records = [];
  }
  records.push(record);
  await writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`);
}

async function saveContestEntry(entry) {
  const record = { id: createReference("NBCON"), createdAt: new Date().toISOString(), status: "new", ...entry };
  const pool = await getStoragePool();
  if (pool) {
    try {
      await pool.execute(
        `INSERT INTO contest_entries (id, created_at, status, instagram_url, email, phone, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [record.id, record.createdAt.slice(0, 19).replace("T", " "), record.status, record.instagramUrl, record.email, record.phone, "website-contest"]
      );
      return record;
    } catch (error) {
      console.error("MySQL contest entry insert failed.", error.message);
      throw new StorageUnavailableError();
    }
  }

  await appendLocalRecord(contestEntriesFile, record);
  return record;
}

async function bookingReferenceExists(bookingReference) {
  const pool = await getStoragePool();
  if (pool) {
    try {
      const [rows] = await pool.execute("SELECT id FROM bookings WHERE id = ? LIMIT 1", [bookingReference]);
      return rows.length > 0;
    } catch (error) {
      console.error("MySQL booking reference lookup failed.", error.message);
      throw new StorageUnavailableError();
    }
  }

  try {
    const bookings = JSON.parse(await readFile(bookingsFile, "utf8"));
    return bookings.some((booking) => booking.id === bookingReference);
  } catch {
    return false;
  }
}

async function saveLuckyEntry(entry) {
  if (!(await bookingReferenceExists(entry.bookingReference))) {
    throw new Error("That booking reference was not found. Please use the reference shown on your invoice.");
  }

  const record = { id: createReference("NBLUCK"), createdAt: new Date().toISOString(), status: "new", ...entry };
  const pool = await getStoragePool();
  if (pool) {
    try {
      await pool.execute(
        `INSERT INTO lucky_entries (id, created_at, status, email, phone, booking_reference, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [record.id, record.createdAt.slice(0, 19).replace("T", " "), record.status, record.email, record.phone, record.bookingReference, "website-lucky-entry"]
      );
      return record;
    } catch (error) {
      console.error("MySQL lucky entry insert failed.", error.message);
      throw new StorageUnavailableError();
    }
  }

  await appendLocalRecord(luckyEntriesFile, record);
  return record;
}

async function saveEnquiry(enquiry) {
  const record = {
    id: createReference("NBE"),
    createdAt: new Date().toISOString(),
    status: "new",
    ...enquiry
  };

  const pool = await getStoragePool();
  if (pool) {
    try {
      await pool.execute(
        `INSERT INTO enquiries
          (id, created_at, status, name, phone, email, subject, message, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.createdAt.slice(0, 19).replace("T", " "),
          record.status,
          record.name,
          record.phone || null,
          record.email || null,
          record.subject || null,
          record.message,
          "website"
        ]
      );
      return record;
    } catch (error) {
      console.error("MySQL enquiry insert failed.", error.message);
      throw new StorageUnavailableError();
    }
  }

  await appendLocalRecord(enquiriesFile, record);
  return record;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = normalize(join(__dirname, pathname));

  if (filePath !== __dirname && !filePath.startsWith(`${__dirname}${sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && (requestUrl.pathname === "/healthz" || requestUrl.pathname === "/health")) {
    const payload = { ok: true, service: "northeast-basecamp-site", storage: hasDatabaseConfig || databaseRequired ? "mysql" : "json" };
    const shouldCheckDatabase = hasDatabaseConfig || databaseRequired || requestUrl.searchParams.get("db") === "1";

    if (shouldCheckDatabase) {
      try {
        const pool = await getDbPool();
        if (pool) {
          await pool.query("SELECT 1");
          payload.database = "ok";
        } else if (databaseRequired) {
          sendJson(res, 503, { ok: false, service: "northeast-basecamp-site", storage: "mysql", database: "not_configured", message: "Database storage is not configured." });
          return;
        } else {
          payload.database = "not_configured";
        }
      } catch (error) {
        console.error("MySQL health check failed.", error.message);
        sendJson(res, 503, { ok: false, service: "northeast-basecamp-site", storage: "mysql", database: "error", message: "Database storage is unavailable." });
        return;
      }
    }

    sendJson(res, 200, payload);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/bookings") {
    try {
      const booking = cleanBooking(await readJsonBody(req));
      const record = await saveBooking(booking);
      sendJson(res, 201, { ok: true, reference: record.id, invoiceUrl: `/${record.invoicePath}`, totalAmount: record.totalAmount });
    } catch (error) {
      sendJson(res, error.statusCode || 400, { ok: false, message: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/enquiries") {
    try {
      const enquiry = cleanEnquiry(await readJsonBody(req));
      const record = await saveEnquiry(enquiry);
      sendJson(res, 201, { ok: true, reference: record.id });
    } catch (error) {
      sendJson(res, error.statusCode || 400, { ok: false, message: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/contest-entries") {
    try {
      const record = await saveContestEntry(cleanContestEntry(await readJsonBody(req)));
      sendJson(res, 201, { ok: true, reference: record.id });
    } catch (error) {
      sendJson(res, error.statusCode || 400, { ok: false, message: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/lucky-entries") {
    try {
      const record = await saveLuckyEntry(cleanLuckyEntry(await readJsonBody(req)));
      sendJson(res, 201, { ok: true, reference: record.id });
    } catch (error) {
      sendJson(res, error.statusCode || 400, { ok: false, message: error.message });
    }
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    await serveStatic(req, res);
    return;
  }

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method not allowed");
});

server.on("clientError", (error, socket) => {
  console.warn("Rejected malformed request", error.message);
  socket.end("HTTP/1.1 400 Bad Request\\r\\n\\r\\n");
});

server.on("error", (error) => {
  console.error(`Northeast Basecamp server failed to start on ${host}:${port}`, error);
  process.exit(1);
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.listen(port, host, () => {
  console.log(`Northeast Basecamp site listening on ${host}:${port}`);
});
