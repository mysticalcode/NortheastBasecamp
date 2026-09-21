import QRCode from "qrcode";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const outputDirectory = join(root, "assets", "creator-qr");
const menuOutputDirectory = join(root, "assets", "menu-qr");
const codes = ["NBC-CREATOR-01", "NBC-CREATOR-02", "NBC-CREATOR-03", "NBC-CREATOR-04", "NBC-CREATOR-05"];

await mkdir(outputDirectory, { recursive: true });
await mkdir(menuOutputDirectory, { recursive: true });
for (const code of codes) {
  const url = `https://northeastbasecamp.com/?ref=${encodeURIComponent(code)}#book`;
  await QRCode.toFile(join(outputDirectory, `${code.toLowerCase()}.png`), url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 720,
    color: { dark: "#034C3D", light: "#FFFDF7" }
  });
}

for (const [name, url] of Object.entries({
  "cafe-menu": "https://northeastbasecamp.com/cafe.html",
  "bar-menu": "https://northeastbasecamp.com/bar.html"
})) {
  await QRCode.toFile(join(menuOutputDirectory, `${name}.png`), url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 720,
    color: { dark: "#06254A", light: "#FFF7DD" }
  });
}
