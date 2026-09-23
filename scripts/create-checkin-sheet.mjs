import fs from "node:fs/promises";
import { dirname } from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputPath = process.argv[2];
if (!outputPath) throw new Error("Pass an output .xlsx path.");

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Check-ins");
sheet.showGridLines = false;
sheet.tabColor = "#064b37";

sheet.getRange("A1:N1").merge();
sheet.getRange("A1").values = [["Northeast Basecamp · Guest Check-in Register"]];
sheet.getRange("A1").format = { fill: "#064b37", font: { bold: true, color: "#FFFFFF", size: 16 }, horizontalAlignment: "center", verticalAlignment: "center" };
sheet.getRange("A1").format.rowHeight = 30;
sheet.getRange("A2:N2").merge();
sheet.getRange("A2").values = [["Guest submissions from the Northeast Basecamp QR check-in form. Check-out details update the same guest record."]];
sheet.getRange("A2").format = { fill: "#E7F2EA", font: { color: "#325648", italic: true }, wrapText: true, verticalAlignment: "center" };
sheet.getRange("A2").format.rowHeight = 30;
const headers = [["Record ID", "Submitted at", "Guest name", "Mobile", "Email", "Booking reference", "Tent number", "ID type", "ID number", "ID file link", "Check-in", "Check-out", "Status", "Notes"]];
sheet.getRange("A4:N4").values = headers;
sheet.getRange("A4:N4").format = { fill: "#0B7A55", font: { bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true };
sheet.getRange("A4:N4").format.rowHeight = 32;
sheet.freezePanes.freezeRows(4);
sheet.getRange("A5:N5").values = [["Example — delete this row", "", "Example Guest", "+91 00000 00000", "", "NBC-EXAMPLE-0001", "D-01", "Government ID", "", "", "", "", "Example only", "Use this sheet as the live guest log."]];
sheet.getRange("A5:N5").format = { fill: "#FFF4DF", font: { color: "#6C6459", italic: true }, wrapText: true, verticalAlignment: "center" };
sheet.getRange("B:B").format.numberFormat = "yyyy-mm-dd hh:mm";
sheet.getRange("K:L").format.numberFormat = "yyyy-mm-dd hh:mm";
for (const [range, width] of [["A:A",18],["B:B",20],["C:C",24],["D:D",17],["E:E",27],["F:F",21],["G:G",15],["H:H",18],["I:I",20],["J:J",32],["K:L",20],["M:M",16],["N:N",34]]) sheet.getRange(range).format.columnWidth = width;
sheet.getRange("A:N").format.wrapText = true;
workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "Check-ins!A1:N5", include: "values,formulas", tableMaxRows: 6, tableMaxCols: 14 });
if (!check.ndjson.includes("Guest name") || !check.ndjson.includes("Check-out")) throw new Error("Check-in sheet verification failed.");
await fs.mkdir(dirname(outputPath), { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
