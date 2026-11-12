const form = document.getElementById("festivalBookingForm");
const festivalSelect = document.getElementById("festivalSelect");
const categoryContainer = document.getElementById("stayCategories");
const pickerKicker = document.getElementById("tentPickerKicker");
const pickerSummary = document.getElementById("tentPickerSummary");
const selectedStay = document.getElementById("selectedStay");
const message = document.getElementById("bookingMessage");
const submitButton = form?.querySelector("button[type='submit']");
const invoiceDialog = document.getElementById("invoiceDialog");
const invoiceFrame = document.getElementById("invoiceFrame");
const invoiceDownload = document.getElementById("invoiceDownload");
const invoiceReference = document.getElementById("invoiceDialogReference");

const festivalCatalog = {
  hornbill: {
    label: "Hornbill Festival stays",
    summary: "Choose an early-bird, standard dome, alpine, premium tent or bring your own tent.",
    options: [
      ["dome-early-2", "Dome Tent", "Early bird · 2 sharing", 999, 2, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["dome-early-solo", "Dome Tent", "Early bird · Solo", 1499, 1, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["dome-early-3", "Dome Tent", "Early bird · 3 sharing", 899, 3, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["dome-weekday-2", "Standard Dome", "Weekday · 2 sharing", 1199, 2, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["dome-weekday-solo", "Standard Dome", "Weekday · Solo", 1799, 1, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["dome-weekday-3", "Standard Dome", "Weekday · 3 sharing", 999, 3, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["dome-weekend-2", "Standard Dome", "Weekend · 2 sharing", 1499, 2, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["dome-weekend-solo", "Standard Dome", "Weekend · Solo", 1999, 1, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["dome-weekend-3", "Standard Dome", "Weekend · 3 sharing", 1199, 3, "assets/hornbill-camp/hornbill-blue-dome-tents.jpeg"],
      ["alpine-weekday-4", "Alpine Tent", "Weekday · 4 sharing", 1199, 4, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-weekday-3", "Alpine Tent", "Weekday · 3 sharing", 1499, 3, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-weekday-2", "Alpine Tent", "Weekday · 2 sharing", 1999, 2, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-weekday-solo", "Alpine Tent", "Weekday · Solo", 3499, 1, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-weekend-4", "Alpine Tent", "Weekend · 4 sharing", 1499, 4, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-weekend-3", "Alpine Tent", "Weekend · 3 sharing", 1799, 3, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-weekend-2", "Alpine Tent", "Weekend · 2 sharing", 2299, 2, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-weekend-solo", "Alpine Tent", "Weekend · Solo", 3799, 1, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["premium-2", "Premium Tent", "2 sharing", 2499, 2, "assets/hornbill-camp/hornbill-white-tent-village.jpeg"],
      ["premium-solo", "Premium Tent", "Solo", 3799, 1, "assets/hornbill-camp/hornbill-white-tent-village.jpeg"],
      ["byot", "Bring Your Own Tent", "Pitch-only stay", 599, 1, "assets/hornbill-camp/hornbill-camp-lights.jpeg"]
    ]
  },
  "cherry-blossom": {
    label: "Shillong Cherry Blossom stays",
    summary: "Choose a quiet solo setup, a shared dome, an alpine tent or a premium safari stay.",
    options: [
      ["solo-dome", "Solo Dome Tent", "1 guest", 2799, 1, "assets/cherry-stays/solo-dome-blue.jpeg"],
      ["premium-dome-3", "Premium Dome", "3 sharing", 2200, 3, "assets/cherry-stays/premium-dome-white.jpeg"],
      ["premium-dome-2", "Premium Dome", "2 sharing", 2999, 2, "assets/cherry-stays/premium-dome-white.jpeg"],
      ["premium-couple-dome", "Premium Couple Dome", "2 sharing", 3999, 2, "assets/cherry-stays/premium-couple-dome-white.jpeg"],
      ["alpine-4", "Alpine Tent", "4 sharing", 2499, 4, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-3", "Alpine Tent", "3 sharing", 3199, 3, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["alpine-2", "Alpine Tent", "2 sharing", 4999, 2, "assets/cherry-stays/alpine-tent-red.jpeg"],
      ["premium-safari-4", "Premium Safari Tent", "4 sharing", 4999, 4, "assets/cherry-stays/premium-dome-white.jpeg"],
      ["premium-safari-3", "Premium Safari Tent", "3 sharing", 6999, 3, "assets/cherry-stays/premium-dome-white.jpeg"],
      ["premium-safari-2", "Premium Safari Tent", "2 sharing", 9999, 2, "assets/cherry-stays/premium-dome-white.jpeg"]
    ]
  }
};

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const requestedFestival = new URLSearchParams(window.location.search).get("festival");

function getFestival() {
  return festivalCatalog[festivalSelect?.value] || festivalCatalog.hornbill;
}

function getSelectedOption() {
  const selected = form?.querySelector("input[name='stayCategory']:checked");
  return getFestival().options.find(([code]) => code === selected?.value);
}

function updateSelection() {
  const option = getSelectedOption();
  if (!option || !selectedStay) return;
  const [, title, detail, rate, guests] = option;
  selectedStay.textContent = `${title} · ${detail} · ${money(rate)} per person · Request total ${money(rate * guests)}`;
}

function renderCategories() {
  const festival = getFestival();
  if (pickerKicker) pickerKicker.textContent = festival.label;
  if (pickerSummary) pickerSummary.textContent = festival.summary;
  if (!categoryContainer) return;
  categoryContainer.replaceChildren();
  festival.options.forEach(([code, title, detail, rate, guests, image], index) => {
    const label = document.createElement("label");
    label.className = "stay-category";
    label.innerHTML = `<input type="radio" name="stayCategory" value="${code}" ${index === 0 ? "checked" : ""}><span><img src="${image}" alt=""><i>${detail}</i><strong>${title}</strong><small>${money(rate)} <em>per person</em></small><b>${guests === 1 ? "1 guest" : `${guests} guests`} · Request total ${money(rate * guests)}</b></span>`;
    categoryContainer.append(label);
  });
  categoryContainer.querySelectorAll("input").forEach((input) => input.addEventListener("change", updateSelection));
  updateSelection();
}

function closeInvoice() {
  if (invoiceDialog?.open) invoiceDialog.close();
}

document.querySelectorAll("[data-close-invoice]").forEach((button) => button.addEventListener("click", closeInvoice));
invoiceDialog?.addEventListener("click", (event) => {
  if (event.target === invoiceDialog) closeInvoice();
});

if (requestedFestival && festivalCatalog[requestedFestival] && festivalSelect) festivalSelect.value = requestedFestival;
festivalSelect?.addEventListener("change", () => {
  message.textContent = "";
  renderCategories();
});
renderCategories();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  message.textContent = "Saving your festival booking request…";
  message.className = "payment-message";
  submitButton.disabled = true;
  try {
    const response = await fetch("/api/festival-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.invoiceUrl) throw new Error(result.message || "Your booking request could not be saved right now.");
    message.textContent = "Your booking request is confirmed. Your invoice is ready.";
    invoiceReference.textContent = result.reference || "";
    invoiceFrame.src = result.invoiceUrl;
    invoiceDownload.href = result.invoiceUrl;
    if (typeof invoiceDialog?.showModal === "function") invoiceDialog.showModal();
  } catch (error) {
    message.textContent = error.message || "Your booking request could not be saved right now.";
    message.className = "payment-message error";
  } finally {
    submitButton.disabled = false;
  }
});
