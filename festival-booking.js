const form = document.getElementById("festivalBookingForm");
const categoryContainer = document.getElementById("stayCategories");
const checkinDate = document.getElementById("checkinDate");
const checkoutDate = document.getElementById("checkoutDate");
const guestCount = document.getElementById("guestCount");
const selectedStay = document.getElementById("selectedStay");
const message = document.getElementById("bookingMessage");
const submitButton = form?.querySelector("button[type='submit']");
const invoiceDialog = document.getElementById("invoiceDialog");
const invoiceFrame = document.getElementById("invoiceFrame");
const invoiceDownload = document.getElementById("invoiceDownload");
const invoiceReference = document.getElementById("invoiceDialogReference");

const stayOptions = [
  ["dome-early-2", "Dome Tent", "Early bird · 2 sharing", 999, 2, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["dome-early-solo", "Dome Tent", "Early bird · Solo", 1499, 1, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["dome-early-3", "Dome Tent", "Early bird · 3 sharing", 899, 3, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["dome-weekday-2", "Standard Dome", "Weekday · 2 sharing", 1199, 2, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["dome-weekday-solo", "Standard Dome", "Weekday · Solo", 1799, 1, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["dome-weekday-3", "Standard Dome", "Weekday · 3 sharing", 999, 3, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["dome-weekend-2", "Standard Dome", "Weekend · 2 sharing", 1499, 2, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["dome-weekend-solo", "Standard Dome", "Weekend · Solo", 1999, 1, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["dome-weekend-3", "Standard Dome", "Weekend · 3 sharing", 1199, 3, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
  ["alpine-weekday-4", "Alpine Tent", "Weekday · 4 sharing", 1199, 4, "assets/festival-campaigns/alpine-tent.jpeg"],
  ["alpine-weekday-3", "Alpine Tent", "Weekday · 3 sharing", 1499, 3, "assets/festival-campaigns/alpine-tent.jpeg"],
  ["alpine-weekday-2", "Alpine Tent", "Weekday · 2 sharing", 1999, 2, "assets/festival-campaigns/alpine-tent.jpeg"],
  ["alpine-weekday-solo", "Alpine Tent", "Weekday · Solo", 3499, 1, "assets/festival-campaigns/alpine-tent.jpeg"],
  ["alpine-weekend-4", "Alpine Tent", "Weekend · 4 sharing", 1499, 4, "assets/festival-campaigns/alpine-tent.jpeg"],
  ["alpine-weekend-3", "Alpine Tent", "Weekend · 3 sharing", 1799, 3, "assets/festival-campaigns/alpine-tent.jpeg"],
  ["alpine-weekend-2", "Alpine Tent", "Weekend · 2 sharing", 2299, 2, "assets/festival-campaigns/alpine-tent.jpeg"],
  ["alpine-weekend-solo", "Alpine Tent", "Weekend · Solo", 3799, 1, "assets/festival-campaigns/alpine-tent.jpeg"],
  ["premium-2", "Premium Tent", "2 sharing", 2499, 2, "assets/hornbill-camp/hornbill-white-tent-village.jpeg"],
  ["premium-solo", "Premium Tent", "Solo", 3799, 1, "assets/hornbill-camp/hornbill-white-tent-village.jpeg"],
  ["byot", "Bring Your Own Tent", "Pitch-only stay", 599, 1, "assets/hornbill-camp/hornbill-camp-lights.jpeg"]
];
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

function selectedOption() { const selected = form?.querySelector("input[name='stayCategory']:checked"); return stayOptions.find(([code]) => code === selected?.value); }
function getNights() { if (!checkinDate?.value || !checkoutDate?.value) return 0; const start = new Date(`${checkinDate.value}T00:00:00Z`); const end = new Date(`${checkoutDate.value}T00:00:00Z`); return Math.round((end - start) / 86400000); }
function updateCheckoutMin() { if (!checkinDate?.value) return; const checkin = new Date(`${checkinDate.value}T00:00:00Z`); checkin.setUTCDate(checkin.getUTCDate() + 1); const minimum = checkin.toISOString().slice(0, 10); checkoutDate.min = minimum; if (checkoutDate.value && checkoutDate.value < minimum) checkoutDate.value = minimum; }
function updateGuestOptions() { const option = selectedOption(); if (!option || !guestCount) return; const [, , , , capacity] = option; const previous = Number(guestCount.value); guestCount.innerHTML = Array.from({ length: capacity }, (_, index) => `<option value="${index + 1}">${index + 1} guest${index ? "s" : ""}</option>`).join(""); guestCount.value = String(Math.min(Math.max(previous || capacity, 1), capacity)); }
function updateSummary() { const option = selectedOption(); if (!option || !selectedStay) return; const [, title, detail, rate, capacity] = option; const guests = Number(guestCount?.value || capacity); const nights = getNights(); if (!nights || nights < 1) { selectedStay.textContent = `${title} · ${detail} · ${money(rate)} per guest, per night. Select valid dates to see your total.`; return; } const total = rate * guests * nights; selectedStay.textContent = `${title} · ${detail} · ${guests} guest${guests === 1 ? "" : "s"} × ${nights} night${nights === 1 ? "" : "s"} · ${money(total)} total`; }
function renderCategories() { if (!categoryContainer) return; categoryContainer.innerHTML = stayOptions.map(([code, title, detail, rate, capacity, image], index) => `<label class="stay-category"><input type="radio" name="stayCategory" value="${code}" ${index === 0 ? "checked" : ""}><span><img src="${image}" alt=""><i>${detail}</i><strong>${title}</strong><small>${money(rate)} <em>per guest / night</em></small><b>Up to ${capacity} guest${capacity === 1 ? "" : "s"}</b></span></label>`).join(""); categoryContainer.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => { updateGuestOptions(); updateSummary(); })); updateGuestOptions(); updateSummary(); }
function closeInvoice() { if (invoiceDialog?.open) invoiceDialog.close(); }

document.querySelectorAll("[data-close-invoice]").forEach((button) => button.addEventListener("click", closeInvoice));
invoiceDialog?.addEventListener("click", (event) => { if (event.target === invoiceDialog) closeInvoice(); });
checkinDate?.addEventListener("change", () => { updateCheckoutMin(); updateSummary(); });
checkoutDate?.addEventListener("change", updateSummary);
guestCount?.addEventListener("change", updateSummary);
renderCategories();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  updateCheckoutMin();
  if (!form.reportValidity() || getNights() < 1) { message.textContent = "Please select a checkout date after your check-in date."; message.className = "payment-message error"; return; }
  const values = Object.fromEntries(new FormData(form));
  message.textContent = "Saving your Hornbill booking request…"; message.className = "payment-message"; submitButton.disabled = true;
  try {
    const response = await fetch("/api/festival-bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.invoiceUrl) throw new Error(result.message || "Your booking request could not be saved right now.");
    const bookingReference = result.reference || "";
    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", {
        send_to: "AW-18594650315/A1udCP2y6b8dEMuxz6JF",
        value: Number(result.totalAmount || 0),
        currency: "INR",
        transaction_id: bookingReference
      });
    }
    message.textContent = "Your booking request is confirmed. Your invoice is ready."; invoiceReference.textContent = bookingReference; invoiceFrame.src = result.invoiceUrl; invoiceDownload.href = result.invoiceUrl; if (typeof invoiceDialog?.showModal === "function") invoiceDialog.showModal();
  } catch (error) { message.textContent = error.message || "Your booking request could not be saved right now."; message.className = "payment-message error"; } finally { submitButton.disabled = false; }
});
