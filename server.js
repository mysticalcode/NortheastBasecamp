import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const bookingsFile = join(__dirname, "data", "bookings.json");

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

async function saveBooking(booking) {
  await mkdir(dirname(bookingsFile), { recursive: true });

  let bookings = [];
  try {
    bookings = JSON.parse(await readFile(bookingsFile, "utf8"));
  } catch {
    bookings = [];
  }

  const record = {
    id: `NBC-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: "new",
    ...booking
  };

  bookings.push(record);
  await writeFile(bookingsFile, `${JSON.stringify(bookings, null, 2)}\n`);
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
  if (req.method === "GET" && req.url === "/healthz") {
    sendJson(res, 200, { ok: true, service: "northeast-basecamp-site" });
    return;
  }

  if (req.method === "POST" && req.url === "/api/bookings") {
    try {
      const booking = cleanBooking(await readJsonBody(req));
      const record = await saveBooking(booking);
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

server.on("error", (error) => {
  console.error(`Northeast Basecamp server failed to start on ${host}:${port}`, error);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Northeast Basecamp site running at http://${host}:${port}`);
});
