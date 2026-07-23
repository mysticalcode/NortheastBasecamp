const revealItems = document.querySelectorAll(".reveal");
const header = document.querySelector("[data-header]");
const heroImage = document.querySelector("[data-parallax]");
const bookingForm = document.querySelector("#bookingForm");
const summary = document.querySelector("#bookingSummary");
const menuToggle = document.querySelector("[data-menu-toggle]");
const primaryNavigation = document.querySelector("#primary-navigation");
const dinnerRatePerGuestNight = 400;

function formatInr(amount) {
  return `INR ${new Intl.NumberFormat("en-IN").format(amount)}`;
}

function setMenuOpen(isOpen) {
  if (!menuToggle || !primaryNavigation) return;
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  header.classList.toggle("is-menu-open", isOpen);
}

if (menuToggle && primaryNavigation) {
  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  primaryNavigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });

  document.addEventListener("click", (event) => {
    if (header.classList.contains("is-menu-open") && !header.contains(event.target)) {
      setMenuOpen(false);
    }
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.16 }
);

revealItems.forEach((item) => observer.observe(item));

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 18);
}

function updateParallax() {
  if (!heroImage || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const offset = Math.min(window.scrollY * 0.04, 18);
  heroImage.style.transform = `scale(1.08) translateY(${offset}px)`;
}

function updateSummary() {
  const planSelect = document.querySelector("#plan");
  const arrivalDateInput = document.querySelector("#arrivalDate");
  const nightsInput = document.querySelector("#nights");
  const guestsInput = document.querySelector("#guests");
  const dinnerSelect = document.querySelector("#dinnerIncluded");
  if (!summary || !planSelect || !arrivalDateInput || !nightsInput || !guestsInput) return;

  const selectedPlan = planSelect.selectedOptions[0];
  if (!selectedPlan) return;
  const plan = planSelect.value;
  const arrivalDate = arrivalDateInput.value;
  const fixedNights = Number(selectedPlan.dataset.fixedNights || 0);
  if (fixedNights) nightsInput.value = String(fixedNights);
  nightsInput.disabled = Boolean(fixedNights);
  const nights = Number(nightsInput.value);
  const guests = guestsInput.value;
  const dinnerIncluded = dinnerSelect?.value === "true";
  const baseRate = Number(selectedPlan.dataset.rate);
  const baseAmount = baseRate * Number(guests) * (selectedPlan.dataset.rateType === "night" ? nights : 1);
  const dinnerAmount = dinnerIncluded ? dinnerRatePerGuestNight * Number(guests) * nights : 0;
  const formattedDate = arrivalDate
    ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${arrivalDate}T00:00:00`))
    : "arrival TBC";
  const dinnerLine = dinnerIncluded ? `Dinner ${formatInr(dinnerAmount)}` : "Dinner not included";
  summary.textContent = `${plan} | ${formattedDate} | ${nights} night${nights === 1 ? "" : "s"} | ${guests} guest${guests === "1" ? "" : "s"} | Base ${formatInr(baseAmount)} | ${dinnerLine} | Total ${formatInr(baseAmount + dinnerAmount)}`;
}

window.addEventListener("scroll", () => {
  updateHeader();
  updateParallax();
});

if (bookingForm) {
  document.querySelectorAll(".book-card").forEach((button) => {
    button.addEventListener("click", () => {
      const planSelect = document.querySelector("#plan");
      const guestsInput = document.querySelector("#guests");
      const nightsInput = document.querySelector("#nights");
      const bookingSection = document.querySelector("#book");
      if (!planSelect || !guestsInput || !nightsInput || !bookingSection) return;
      planSelect.value = button.dataset.plan;
      guestsInput.value = button.dataset.guests;
      nightsInput.value = button.dataset.nights || "4";
      updateSummary();
      bookingSection.scrollIntoView({ behavior: "smooth" });
    });
  });
}

if (bookingForm) {
  bookingForm.addEventListener("input", updateSummary);
  bookingForm.addEventListener("change", updateSummary);
  bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const note = document.querySelector("#bookingNote");
  if (window.location.protocol === "file:") {
    note.textContent = "Bookings need the website server. Open this site through its deployed URL or run it from http://localhost:3000 instead of opening index.html directly.";
    return;
  }
  const data = new FormData(event.currentTarget);
  const submitButton = event.currentTarget.querySelector(".submit");
  const booking = {
    plan: data.get("plan"),
    arrivalDate: data.get("arrivalDate"),
    nights: Number(data.get("nights")),
    guests: Number(data.get("guests")),
    dinnerIncluded: data.get("dinnerIncluded") === "true",
    name: data.get("name"),
    phone: data.get("phone")
  };

  submitButton.disabled = true;
  submitButton.textContent = "Saving request...";
  note.textContent = "Saving your booking request securely...";

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking)
    });

    const responseType = response.headers.get("content-type") || "";
    const result = responseType.includes("application/json") ? await response.json() : {};
    if (!response.ok) {
      throw new Error(result.message || `Booking service is unavailable (HTTP ${response.status}). Please try again shortly.`);
    }

    note.replaceChildren(`Booking request saved. Reference: ${result.reference}. `);
    const invoiceLink = document.createElement("a");
    invoiceLink.href = result.invoiceUrl;
    invoiceLink.textContent = "Download your invoice";
    invoiceLink.target = "_blank";
    invoiceLink.rel = "noopener";
    note.append(invoiceLink, ". Our team will contact you shortly to confirm availability.");
    event.currentTarget.reset();
    document.querySelector("#plan").value = booking.plan;
    document.querySelector("#guests").value = booking.guests;
    document.querySelector("#arrivalDate").value = booking.arrivalDate;
    document.querySelector("#nights").value = String(booking.nights);
    updateSummary();
  } catch (error) {
    note.textContent = error instanceof TypeError
      ? "The booking service is unavailable right now. Please try again in a few minutes."
      : error.message || "We could not save your booking request. Please try again after a moment.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send booking request";
  }
  });
}

updateHeader();
updateParallax();
if (bookingForm) updateSummary();

if (window.lucide) {
  window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
}
