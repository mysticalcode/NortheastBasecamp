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
  submitButton.textContent = isCheckin ? "Submit check-in" : "Submit check-out";
}

form.addEventListener("change", setActionState);
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusBox.textContent = "";
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
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
