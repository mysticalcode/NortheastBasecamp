const form = document.querySelector("#guestCheckinForm");
const statusBox = document.querySelector("#formStatus");
const submitButton = document.querySelector("#submitButton");
const checkinOnly = [...document.querySelectorAll(".checkin-only")];

function setActionState() {
  const action = new FormData(form).get("action");
  const isCheckin = action === "checkin";
  checkinOnly.forEach((element) => { element.hidden = !isCheckin; });
  form.elements.idType.required = isCheckin;
  form.elements.idNumber.required = isCheckin;
  form.elements.idDocument.required = isCheckin;
  submitButton.textContent = isCheckin ? "Submit check-in" : "Submit check-out";
}

form.addEventListener("change", setActionState);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.textContent = "";
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const idFile = form.elements.idDocument.files[0];
  delete data.idDocument;
  if (data.action === "checkin") {
    if (!idFile) { statusBox.className = "form-status error"; statusBox.textContent = "Please upload a government ID document."; return; }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(idFile.type) || idFile.size > 10 * 1024 * 1024) { statusBox.className = "form-status error"; statusBox.textContent = "Upload a PDF, JPG, PNG or WEBP file that is 10 MB or smaller."; return; }
    const encoded = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error("The ID document could not be read.")); reader.readAsDataURL(idFile); });
    data.idDocument = { name: idFile.name, type: idFile.type, data: encoded };
  }
  submitButton.disabled = true;
  submitButton.textContent = "Saving your details…";
  try {
    const response = await fetch("/api/guest-checkins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.message || "Your details could not be saved right now.");
    const syncText = result.sheetSync === "synced" ? " Your stay log has also been added to the Basecamp register." : "";
    statusBox.className = "form-status success";
    statusBox.textContent = `Thank you. Your ${result.status === "checked-out" ? "check-out" : "check-in"} has been recorded. Reference: ${result.reference}.${syncText}`;
    form.reset(); setActionState();
  } catch (error) {
    statusBox.className = "form-status error";
    statusBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    setActionState();
  }
});
setActionState();
