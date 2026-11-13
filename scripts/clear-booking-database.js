import mysql from "mysql2/promise";

const confirmation = process.env.CONFIRM_CLEAR_BOOKINGS;
const requiredConfirmation = "ERASE_ALL_NORTHEAST_BASECAMP_DATA";
const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

if (confirmation !== requiredConfirmation) {
  throw new Error(`Refusing to clear data. Set CONFIRM_CLEAR_BOOKINGS=${requiredConfirmation} for one run.`);
}
if (!config.host || !config.user || !config.database) {
  throw new Error("DB_HOST, DB_USER and DB_NAME are required to clear the booking database.");
}

const connection = await mysql.createConnection(config);
try {
  await connection.beginTransaction();
  const tables = [
    "lead_activities", "leads", "enquiries", "contest_entries", "lucky_entries",
    "tent_allocations", "tent_units", "booking_operations", "guest_checkins",
    "festival_payment_orders", "bookings"
  ];
  for (const table of tables) {
    await connection.query(`DELETE FROM \`${table}\``);
  }
  await connection.query("INSERT IGNORE INTO storage_migrations (name) VALUES (?), (?)", ["legacy_bookings_json_v1", "legacy_invoice_files_v1"]);
  await connection.commit();
  console.log("Cleared Northeast Basecamp application records. Table structure and migration safeguards were retained.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
