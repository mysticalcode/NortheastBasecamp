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
const databaseUrl = process.env.DATABASE_URL || "";
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "",
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
  user: process.env.DB_USER || process.env.MYSQL_USER || "",
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || ""
};
const hasDatabaseConfig = Boolean(databaseUrl || (dbConfig.host && dbConfig.user && dbConfig.password && dbConfig.database));
let dbPoolPromise;

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
  ".webp": "image/webp"
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
      retail_rate VARCHAR(255) NOT NULL,
      arrival_date DATE NULL,
      nights INT NOT NULL,
      guests INT NOT NULL,
      food VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      notes TEXT NULL,
      source VARCHAR(64) NOT NULL DEFAULT 'website'
    )
  `);

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
      return pool;
    })();
  }

  return dbPoolPromise;
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
  const booking = {
    festival: String(input.festival || "").trim(),
    plan: String(input.plan || "").trim(),
    retailRate: String(input.retailRate || "").trim(),
    arrivalDate: String(input.arrivalDate || "").trim(),
    nights: Number(input.nights || 0),
    guests: Number(input.guests || 0),
    food: String(input.food || "").trim(),
    name: String(input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    notes: String(input.notes || "").trim()
  };

  if (!booking.festival || !booking.plan || !booking.retailRate || !booking.arrivalDate || !booking.food || !booking.name || !booking.phone) {
    throw new Error("Missing required booking fields");
  }

  if (!Number.isInteger(booking.nights) || booking.nights < 1 || booking.nights > 6) {
    throw new Error("Night count must be between 1 and 6");
  }

  if (!Number.isInteger(booking.guests) || booking.guests < 1 || booking.guests > 12) {
    throw new Error("Guest count must be between 1 and 12");
  }

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

function createReference(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function saveBooking(booking) {
  const record = {
    id: createReference("NBC"),
    createdAt: new Date().toISOString(),
    status: "new",
    ...booking
  };

  const pool = await getDbPool();
  if (pool) {
    await pool.execute(
      `INSERT INTO bookings
        (id, created_at, status, festival, plan, retail_rate, arrival_date, nights, guests, food, name, phone, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.createdAt.slice(0, 19).replace("T", " "),
        record.status,
        record.festival,
        record.plan,
        record.retailRate,
        record.arrivalDate || null,
        record.nights,
        record.guests,
        record.food,
        record.name,
        record.phone,
        record.notes || null,
        "website"
      ]
    );
    return record;
  }

  await mkdir(dirname(bookingsFile), { recursive: true });

  let bookings = [];
  try {
    bookings = JSON.parse(await readFile(bookingsFile, "utf8"));
  } catch {
    bookings = [];
  }

  bookings.push(record);
  await writeFile(bookingsFile, `${JSON.stringify(bookings, null, 2)}\n`);
  return record;
}

async function saveEnquiry(enquiry) {
  const record = {
    id: createReference("NBE"),
    createdAt: new Date().toISOString(),
    status: "new",
    ...enquiry
  };

  const pool = await getDbPool();
  if (pool) {
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
  }

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
    const payload = { ok: true, service: "northeast-basecamp-site", storage: hasDatabaseConfig ? "mysql" : "json" };

    if (requestUrl.searchParams.get("db") === "1") {
      try {
        const pool = await getDbPool();
        if (pool) {
          await pool.query("SELECT 1");
          payload.database = "ok";
        } else {
          payload.database = "not_configured";
        }
      } catch (error) {
        sendJson(res, 500, { ok: false, service: "northeast-basecamp-site", storage: "mysql", database: "error", message: error.message });
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
      sendJson(res, 201, { ok: true, reference: record.id });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/enquiries") {
    try {
      const enquiry = cleanEnquiry(await readJsonBody(req));
      const record = await saveEnquiry(enquiry);
      sendJson(res, 201, { ok: true, reference: record.id });
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message });
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
