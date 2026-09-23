/**
 * Northeast Basecamp guest check-in sync for the Google Sheet:
 * https://docs.google.com/spreadsheets/d/1oe_J4XjaeFX74wr2ntMWPN_DvTcaGb4g5BKHjtzQU2I/edit
 *
 * 1. Paste this file into a new Apps Script project while signed in to the Sheet owner account.
 * 2. Set CHECKIN_SYNC_SECRET to a long random value.
 * 3. Deploy as a Web App, execute as yourself, and allow access only as appropriate for your setup.
 * 4. Add its deployment URL and the identical secret to the website host as
 *    GOOGLE_CHECKIN_SHEET_WEBHOOK_URL and GOOGLE_CHECKIN_SHEET_WEBHOOK_SECRET.
 */
const CHECKIN_SHEET_ID = "1oe_J4XjaeFX74wr2ntMWPN_DvTcaGb4g5BKHjtzQU2I";
const CHECKIN_TAB = "Check-ins";
const CHECKIN_SYNC_SECRET = "REPLACE_WITH_A_LONG_RANDOM_SECRET";

function doPost(event) {
  const body = JSON.parse(event.postData.contents || "{}");
  if (!CHECKIN_SYNC_SECRET || body.syncSecret !== CHECKIN_SYNC_SECRET) return json({ ok: false, message: "Unauthorized" });
  const sheet = SpreadsheetApp.openById(CHECKIN_SHEET_ID).getSheetByName(CHECKIN_TAB);
  const values = sheet.getDataRange().getValues();
  const rowValues = [body.id, body.createdAt || new Date().toISOString(), body.guestName, body.phone, body.email || "", body.bookingReference || "", body.tentNumber || "", body.idType || "", body.idNumber || "", "", body.checkInAt || "", body.checkOutAt || "", body.status || "", body.notes || ""];
  const existingIndex = values.findIndex((row, index) => index >= 4 && row[0] === body.id);
  if (existingIndex >= 0) sheet.getRange(existingIndex + 1, 1, 1, rowValues.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
  return json({ ok: true });
}

function json(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
