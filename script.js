const revealItems = document.querySelectorAll(".reveal");
const header = document.querySelector("[data-header]");
const heroImage = document.querySelector("[data-parallax]");
const bookingForm = document.querySelector("#bookingForm");
const summary = document.querySelector("#bookingSummary");
const menuToggle = document.querySelector("[data-menu-toggle]");
const primaryNavigation = document.querySelector("#primary-navigation");

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
  const festival = document.querySelector("#festival").value.split(" - ")[0];
  const planSelect = document.querySelector("#plan");
  const plan = planSelect.value;
  const rate = planSelect.selectedOptions[0]?.dataset.rate || "Rate on request";
  const arrivalDate = document.querySelector("#arrivalDate").value;
  const nights = document.querySelector("#nights").value;
  const guests = document.querySelector("#guests").value;
  const food = document.querySelector("#food").value;
  summary.textContent = `${festival} - ${arrivalDate || "arrival TBC"} - ${nights} night${nights === "1" ? "" : "s"} - ${guests} guest${guests === "1" ? "" : "s"} - ${plan} - ${rate} - ${food}`;
}

window.addEventListener("scroll", () => {
  updateHeader();
  updateParallax();
});

document.querySelectorAll(".book-card").forEach((button) => {
  button.addEventListener("click", () => {
    const planSelect = document.querySelector("#plan");
    planSelect.value = button.dataset.plan;
    document.querySelector("#guests").value = button.dataset.guests;
    document.querySelector("#nights").value = button.dataset.nights || "4";
    updateSummary();
    document.querySelector("#book").scrollIntoView({ behavior: "smooth" });
  });
});

bookingForm.addEventListener("input", updateSummary);
bookingForm.addEventListener("change", updateSummary);
bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const submitButton = event.currentTarget.querySelector(".submit");
  const note = document.querySelector("#bookingNote");
  const booking = {
    festival: data.get("festival"),
    plan: data.get("plan"),
    retailRate: document.querySelector("#plan").selectedOptions[0]?.dataset.rate || "Rate on request",
    arrivalDate: data.get("arrivalDate"),
    nights: Number(data.get("nights")),
    guests: Number(data.get("guests")),
    food: data.get("food"),
    name: data.get("name"),
    phone: data.get("phone"),
    notes: data.get("notes") || ""
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

    if (!response.ok) {
      throw new Error("Booking API request failed");
    }

    const result = await response.json();
    note.textContent = `Request saved. Reference: ${result.reference}. Our team will contact you from sales@northeastbasecamp.com or +91 96789 80213 / +91 87199 62147 / +91 88229 14698.`;
    event.currentTarget.reset();
    document.querySelector("#plan").value = booking.plan;
    document.querySelector("#guests").value = booking.guests;
    document.querySelector("#arrivalDate").value = booking.arrivalDate;
    document.querySelector("#nights").value = String(booking.nights);
    updateSummary();
  } catch (error) {
    note.textContent = "We could not reach the booking backend. Please try again after a moment.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send booking request";
  }
});

updateHeader();
updateParallax();
updateSummary();

if (window.lucide) {
  window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
}
