const state = { dashboard: null, bookingOperationsId: "" };
const bookingStatusLabels = { new: "New request", provisional: "Provisional", confirmed: "Confirmed", "part-paid": "Part paid", paid: "Paid in full", "checked-in": "Checked in", "checked-out": "Checked out", completed: "Completed", cancelled: "Cancelled" };
const elements = {
  connection: document.querySelector("#connectionStatus"), refresh: document.querySelector("#refreshButton"), bookingRows: document.querySelector("#bookingRows"), bookingCount: document.querySelector("#bookingCount"), metricBookings: document.querySelector("#metricBookings"), metricActiveBookings: document.querySelector("#metricActiveBookings"), metricBookingTotal: document.querySelector("#metricBookingTotal"), bookingOperationsForm: document.querySelector("#bookingOperationsForm"), bookingOperationsBooking: document.querySelector("#bookingOperationsBooking"), bookingOperationsFields: document.querySelector("#bookingOperationsFields"), bookingOperationsSummary: document.querySelector("#bookingOperationsSummary"), archiveList: document.querySelector("#archiveList"), archiveCount: document.querySelector("#archiveCount"), toast: document.querySelector("#toast")
};

function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
function dateOnly(value) { const date = String(value || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ""; }
function formatStayDate(value, fallback = "—") { const date = dateOnly(value); return date ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)) : fallback; }
function addDays(value, days) { const date = new Date(`${dateOnly(value)}T12:00:00Z`); if (Number.isNaN(date.getTime())) return ""; date.setUTCDate(date.getUTCDate() + Number(days || 0)); return date.toISOString().slice(0, 10); }
function inr(value) { return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value || 0))}`; }
function formObject(form) { const values = Object.fromEntries(new FormData(form).entries()); values.pickupRequired = form.elements.pickupRequired.checked; values.dropRequired = form.elements.dropRequired.checked; return values; }
function showToast(message, isError = false) { elements.toast.textContent = message; elements.toast.classList.toggle("error", isError); elements.toast.classList.add("show"); window.clearTimeout(showToast.timeout); showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("show"), 4000); }
async function api(path, options = {}) { const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) }, cache: "no-store" }); const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.ok) throw new Error(payload.message || "Request could not be completed."); return payload; }
function bookingById(id) { return state.dashboard?.bookings?.find((booking) => booking.id === id); }

function bookingOperationsValues(booking) {
  const saved = booking.operations || {};
  return {
    bookingStatus: booking.status || "new", paymentStatus: saved.paymentStatus || "unpaid", fullAddress: saved.fullAddress || "", email: saved.email || "", tentNumber: saved.tentNumber || "", assignedStaff: saved.assignedStaff || "", ratePerNight: saved.ratePerNight ?? (booking.nights ? Math.round(Number(booking.base_amount || 0) / Number(booking.nights)) : ""), stayAmount: saved.stayAmount ?? booking.base_amount ?? "", advancePaid: saved.advancePaid ?? 0, bookingSource: saved.bookingSource || booking.source || "website", pickupRequired: Boolean(saved.pickupRequired), pickupPoint: saved.pickupPoint || "", pickupDate: dateOnly(saved.pickupDate), pickupTime: String(saved.pickupTime || "").slice(0, 5), dropRequired: Boolean(saved.dropRequired), dropPoint: saved.dropPoint || "", dropDate: dateOnly(saved.dropDate), dropTime: String(saved.dropTime || "").slice(0, 5), transportAmount: saved.transportAmount ?? 0, mealPreference: saved.mealPreference || "", lunchQtyPerDay: saved.lunchQtyPerDay ?? 0, dinnerQtyPerDay: saved.dinnerQtyPerDay ?? 0, mealAmount: saved.mealAmount ?? 0, idProofStatus: saved.idProofStatus || "pending", specialRequests: saved.specialRequests || "", internalNotes: saved.internalNotes || ""
  };
}

function renderBookings(bookings) {
  elements.bookingCount.textContent = `${bookings.length} record${bookings.length === 1 ? "" : "s"}`;
  elements.bookingRows.innerHTML = bookings.length ? bookings.map((booking) => {
    const departure = booking.checkout_date ? formatStayDate(booking.checkout_date) : (booking.arrival_date && booking.nights ? formatStayDate(addDays(booking.arrival_date, booking.nights)) : "—");
    const invoice = booking.invoice_path ? `<a class="text-link" href="/${escapeHtml(String(booking.invoice_path).replace(/^\/+/, ""))}" target="_blank" rel="noopener">View PDF</a>` : "<span class=\"subtle\">Not available</span>";
    return `<tr><td><strong>${escapeHtml(booking.name)}</strong><span>${escapeHtml(booking.phone || "No phone")}</span><span class="status ${escapeHtml(booking.status || "new")}">${escapeHtml(bookingStatusLabels[booking.status] || booking.status || "New")}</span></td><td><strong>${escapeHtml(booking.festival || "Festival stay")}</strong><span>${escapeHtml(booking.plan || "Stay request")}${booking.tent_type ? ` · ${escapeHtml(booking.tent_type)}` : ""}</span></td><td>${escapeHtml(formatStayDate(booking.arrival_date))}<span>${departure} · ${Number(booking.nights || 0)} night${Number(booking.nights || 0) === 1 ? "" : "s"}</span></td><td>${escapeHtml(String(booking.guests || 0))}</td><td><strong>${escapeHtml(inr(booking.total_amount))}</strong></td><td>${invoice}</td><td><button class="button ghost small" type="button" data-manage-booking="${escapeHtml(booking.id)}">Manage</button><button class="icon-button danger" type="button" data-delete-booking="${escapeHtml(booking.id)}" aria-label="Archive booking ${escapeHtml(booking.id)}" title="Archive booking">×</button></td></tr>`;
  }).join("") : "<tr><td colspan=\"7\"><p class=\"empty-state\">No active bookings yet.</p></td></tr>";
}

function renderBookingOptions(bookings) {
  const selected = state.bookingOperationsId;
  elements.bookingOperationsBooking.innerHTML = `<option value="">Choose a booking</option>${bookings.map((booking) => `<option value="${escapeHtml(booking.id)}" ${booking.id === selected ? "selected" : ""}>${escapeHtml(booking.id)} · ${escapeHtml(booking.name)} · ${escapeHtml(booking.plan)}</option>`).join("")}`;
}

function renderArchive(bookings) {
  elements.archiveCount.textContent = String(bookings.length);
  elements.archiveList.innerHTML = bookings.length ? bookings.map((booking) => `<article class="archive-record"><div><strong>${escapeHtml(booking.name || booking.id)}</strong><span>${escapeHtml(booking.id)} · ${escapeHtml(booking.plan || "Booking")}</span></div><button class="button ghost small" type="button" data-restore-booking="${escapeHtml(booking.id)}">Restore booking</button></article>`).join("") : "<p class=\"empty-state\">No archived bookings.</p>";
}

function renderDashboard(dashboard) {
  const bookings = dashboard.bookings || [];
  state.dashboard = dashboard;
  elements.metricBookings.textContent = String(bookings.length);
  elements.metricActiveBookings.textContent = String(bookings.filter((booking) => !["completed", "cancelled", "checked-out"].includes(booking.status)).length);
  elements.metricBookingTotal.textContent = inr(bookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0));
  renderBookings(bookings);
  renderBookingOptions(bookings);
  renderArchive(dashboard.archivedBookings || []);
  if (state.bookingOperationsId) selectBookingForOperations(state.bookingOperationsId, false);
}

function selectBookingForOperations(id, shouldScroll = true) {
  const booking = bookingById(id);
  state.bookingOperationsId = booking ? booking.id : "";
  elements.bookingOperationsBooking.value = state.bookingOperationsId;
  elements.bookingOperationsFields.disabled = !booking;
  if (!booking) { elements.bookingOperationsSummary.textContent = "Choose a booking to prepare its operations record."; return; }
  const values = bookingOperationsValues(booking);
  for (const [name, value] of Object.entries(values)) {
    const field = elements.bookingOperationsForm.elements[name];
    if (!field) continue;
    if (field.type === "checkbox") field.checked = Boolean(value); else field.value = value ?? "";
  }
  elements.bookingOperationsSummary.textContent = `${booking.name} · ${booking.id} · ${booking.festival || "Festival stay"} · ${booking.plan || "Stay"} · ${formatStayDate(booking.arrival_date)}.`;
  if (shouldScroll) document.querySelector("#bookingOperationsPanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function refreshDashboard() {
  elements.connection.textContent = "Refreshing bookings…";
  elements.connection.classList.remove("error");
  elements.refresh.disabled = true;
  try { const dashboard = await api("/api/admin/dashboard"); renderDashboard(dashboard); elements.connection.textContent = "Booking records connected"; }
  catch (error) { elements.connection.textContent = error.message || "Bookings unavailable"; elements.connection.classList.add("error"); showToast(error.message || "Could not load bookings.", true); }
  finally { elements.refresh.disabled = false; }
}

elements.refresh.addEventListener("click", refreshDashboard);
elements.bookingOperationsBooking.addEventListener("change", (event) => selectBookingForOperations(event.target.value, false));
elements.bookingRows.addEventListener("click", async (event) => {
  const manage = event.target.closest("[data-manage-booking]");
  if (manage) { selectBookingForOperations(manage.dataset.manageBooking); return; }
  const remove = event.target.closest("[data-delete-booking]");
  if (!remove || !window.confirm("Archive this booking? Its invoice and booking details will remain protected and can be restored.")) return;
  try { await api(`/api/admin/bookings/${encodeURIComponent(remove.dataset.deleteBooking)}`, { method: "DELETE" }); showToast("Booking archived."); await refreshDashboard(); } catch (error) { showToast(error.message, true); }
});
elements.archiveList.addEventListener("click", async (event) => {
  const restore = event.target.closest("[data-restore-booking]"); if (!restore) return;
  try { await api(`/api/admin/bookings/${encodeURIComponent(restore.dataset.restoreBooking)}/restore`, { method: "POST", body: "{}" }); showToast("Booking restored."); await refreshDashboard(); } catch (error) { showToast(error.message, true); }
});
elements.bookingOperationsForm.addEventListener("submit", async (event) => {
  event.preventDefault(); const id = elements.bookingOperationsBooking.value; if (!id) return;
  const submit = event.currentTarget.querySelector("button[type=submit]"); submit.disabled = true;
  try { await api(`/api/admin/bookings/${encodeURIComponent(id)}/operations`, { method: "PATCH", body: JSON.stringify(formObject(event.currentTarget)) }); showToast("Booking operations saved."); await refreshDashboard(); selectBookingForOperations(id, false); } catch (error) { showToast(error.message, true); } finally { submit.disabled = false; }
});

refreshDashboard();
