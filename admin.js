const state = { dashboard: null, loading: false, leadSearch: "", leadStatus: "", bookingOperationsId: "" };
const statusLabels = { new: "New", contacted: "Contacted", waiting: "Waiting for guest", qualified: "Qualified", proposal: "Proposal sent", "booking-requested": "Booking requested", "booking-confirmed": "Booking confirmed", "payment-pending": "Payment pending", paid: "Payment received", "checked-in": "Checked in", completed: "Completed stay", won: "Won", lost: "Lost" };
const tentStatusLabels = { available: "Available", maintenance: "Maintenance", retired: "Retired" };
const allocationStatusLabels = { reserved: "Reserved", "checked-in": "Checked in", "checked-out": "Checked out", cancelled: "Cancelled" };

const elements = {
  connection: document.querySelector("#connectionStatus"), refresh: document.querySelector("#refreshButton"), leadForm: document.querySelector("#leadForm"), leadList: document.querySelector("#leadList"), leadSearch: document.querySelector("#leadSearch"), leadStatusFilter: document.querySelector("#leadStatusFilter"), bookingRows: document.querySelector("#bookingRows"), bookingOperationsForm: document.querySelector("#bookingOperationsForm"), bookingOperationsBooking: document.querySelector("#bookingOperationsBooking"), bookingOperationsFields: document.querySelector("#bookingOperationsFields"), bookingOperationsSummary: document.querySelector("#bookingOperationsSummary"), enquiryList: document.querySelector("#enquiryList"), contestList: document.querySelector("#contestList"), luckyList: document.querySelector("#luckyList"), tentForm: document.querySelector("#tentForm"), tentInventory: document.querySelector("#tentInventory"), allocationForm: document.querySelector("#allocationForm"), allocationBooking: document.querySelector("#allocationBooking"), allocationTent: document.querySelector("#allocationTent"), allocationGuests: document.querySelector("#allocationGuests"), allocationArrival: document.querySelector("#allocationArrival"), allocationDeparture: document.querySelector("#allocationDeparture"), allocationList: document.querySelector("#allocationList"), archiveList: document.querySelector("#archiveList"), toast: document.querySelector("#toast")
};

function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
function formatDate(value, fallback = "—") { if (!value) return fallback; const date = new Date(value); return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatStayDate(value, fallback = "—") { const dateValue = String(value || "").slice(0, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return fallback; return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${dateValue}T12:00:00Z`)); }
function toDateInput(value) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; const pad = (number) => String(number).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function dateOnly(value) { const date = String(value || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : ""; }
function addDays(dateValue, days) { const date = new Date(`${dateOnly(dateValue)}T12:00:00Z`); if (Number.isNaN(date.getTime())) return ""; date.setUTCDate(date.getUTCDate() + Number(days || 0)); return date.toISOString().slice(0, 10); }
function inr(value) { return `INR ${new Intl.NumberFormat("en-IN").format(Number(value || 0))}`; }
function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }

function showToast(message, isError = false) { elements.toast.textContent = message; elements.toast.classList.toggle("error", isError); elements.toast.classList.add("show"); window.clearTimeout(showToast.timeout); showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("show"), 3600); }
async function api(path, options = {}) { const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) }, cache: "no-store" }); const payload = await response.json().catch(() => ({})); if (!response.ok || !payload.ok) throw new Error(payload.message || "Request could not be completed."); return payload; }
function optionList(labels, current) { return Object.entries(labels).map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`).join(""); }
function leadSourceOptions(current) { const choices = [["manual", "Manual"], ["website-enquiry", "Website enquiry"], ["phone", "Phone"], ["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["referral", "Referral"], ["other", "Other"]]; return choices.map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`).join(""); }
function deleteIconButton(recordType, id, name = "") { const attribute = recordType === "lead" ? "data-delete-lead" : "data-delete-booking"; const label = `Move this ${recordType}${name ? ` for ${name}` : ""} to the recycle bin`; const manage = recordType === "booking" ? `<button class="button ghost small" type="button" data-manage-booking="${escapeHtml(id)}">Manage</button>` : ""; return `${manage}<button class="icon-button danger" type="button" ${attribute}="${escapeHtml(id)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span class="trash-glyph" aria-hidden="true"></span><span class="visually-hidden">${escapeHtml(label)}</span></button>`; }

function activityMarkup(lead, activities) { const entries = activities.filter((activity) => activity.lead_id === lead.id).slice(0, 6); return entries.length ? entries.map((activity) => `<li><time>${escapeHtml(formatDate(activity.created_at))} · ${escapeHtml(activity.activity_type)}</time>${escapeHtml(activity.note)}</li>`).join("") : "<li>No interactions logged yet.</li>"; }
function renderLead(lead, activities) {
  const contact = [lead.phone, lead.email].filter(Boolean).join(" · ") || "No contact details";
  const followUp = lead.next_follow_up_at ? `Follow up ${formatDate(lead.next_follow_up_at)}` : "No follow-up scheduled";
  const summary = [lead.subject || contact, lead.quoted_price !== null && lead.quoted_price !== undefined ? `Quote ${inr(lead.quoted_price)}` : ""].filter(Boolean).join(" · ");
  return `<article class="lead-record"><details class="lead-card" data-lead-id="${escapeHtml(lead.id)}"><summary><div class="lead-title"><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(summary)}</span></div><div class="lead-meta"><span class="status ${escapeHtml(lead.status)}">${escapeHtml(statusLabels[lead.status] || lead.status)}</span><span>${escapeHtml(followUp)}</span></div></summary><form class="lead-edit" data-lead-update><div class="form-row"><label>Name<input name="name" value="${escapeHtml(lead.name)}"></label><label>Phone<input name="phone" value="${escapeHtml(lead.phone || "")}"></label></div><div class="form-row"><label>Email<input name="email" type="email" value="${escapeHtml(lead.email || "")}"></label><label>Subject<input name="subject" value="${escapeHtml(lead.subject || "")}"></label></div><div class="form-row"><label>Status<select name="status">${optionList(statusLabels, lead.status)}</select></label><label>Source<select name="source">${leadSourceOptions(lead.source)}</select></label></div><div class="form-row"><label>Booking reference<input name="bookingReference" value="${escapeHtml(lead.booking_reference || "")}"></label><label>Quoted price (INR)<input name="quotedPrice" type="number" min="0" max="10000000" step="1" inputmode="numeric" value="${escapeHtml(lead.quoted_price ?? "")}"></label></div><label>Next follow-up<input name="nextFollowUpAt" type="datetime-local" value="${escapeHtml(toDateInput(lead.next_follow_up_at))}"></label><label>Lead notes<textarea name="notes" rows="3">${escapeHtml(lead.notes || "")}</textarea></label><div class="inline"><button class="button ghost small" type="submit">Save lead</button><span class="subtle">Last activity: ${escapeHtml(formatDate(lead.last_activity_at, "None"))}</span></div></form><form class="activity-form" data-activity-form><div class="activity-row"><label>Type<select name="activityType"><option value="note">Note</option><option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">Meeting</option></select></label><label>Interaction note<input name="note" required maxlength="5000" placeholder="What happened? What is next?"></label><button class="button primary small" type="submit">Log</button></div></form><ul class="activity-history">${activityMarkup(lead, activities)}</ul></details>${deleteIconButton("lead", lead.id, lead.name)}</article>`;
}
function filteredLeads(leads) { const needle = state.leadSearch.trim().toLowerCase(); return leads.filter((lead) => (!state.leadStatus || lead.status === state.leadStatus) && (!needle || [lead.name, lead.phone, lead.email, lead.subject, lead.booking_reference, lead.source].filter(Boolean).join(" ").toLowerCase().includes(needle))); }
function bookingByReference(reference) { return state.dashboard?.bookings.find((booking) => booking.id === reference); }
function activeAllocationsFor(reference) { return state.dashboard.tentAllocations.filter((allocation) => allocation.booking_reference === reference && ["reserved", "checked-in"].includes(allocation.allocation_status)); }

function renderTentInventory(tents) {
  elements.tentInventory.innerHTML = tents.length ? tents.map((tent) => `<article class="tent-card" data-tent-id="${escapeHtml(tent.id)}"><div class="tent-card-top"><div><span class="tent-code">${escapeHtml(tent.tent_code)}</span><h3>${escapeHtml(tent.tent_type)}</h3><p>${tent.capacity} guest capacity · ${Number(tent.occupied_today || 0) ? "Occupied today" : "Not occupied today"}</p></div><span class="status ${escapeHtml(tent.operational_status)}">${escapeHtml(tentStatusLabels[tent.operational_status])}</span></div><form class="tent-edit" data-tent-update><input type="hidden" name="tentCode" value="${escapeHtml(tent.tent_code)}"><input type="hidden" name="tentType" value="${escapeHtml(tent.tent_type)}"><input type="hidden" name="capacity" value="${escapeHtml(tent.capacity)}"><div class="tent-actions"><label>Status<select name="operationalStatus">${optionList(tentStatusLabels, tent.operational_status)}</select></label><label>Note<input name="notes" value="${escapeHtml(tent.notes || "")}" maxlength="5000" placeholder="Tent condition"></label><button class="button ghost small" type="submit">Update</button></div></form></article>`).join("") : "<p class=\"empty-state\">No tent inventory yet. Add each physical tent before allotting stays.</p>";
}
function renderAllocationOptions() {
  if (!state.dashboard) return;
  const selectedBooking = elements.allocationBooking.value;
  const selectedTent = elements.allocationTent.value;
  elements.allocationBooking.innerHTML = `<option value="">Choose a booking</option>${state.dashboard.bookings.map((booking) => `<option value="${escapeHtml(booking.id)}" ${booking.id === selectedBooking ? "selected" : ""}>${escapeHtml(booking.id)} · ${escapeHtml(booking.name)} · ${escapeHtml(booking.plan)}</option>`).join("")}`;
  const booking = bookingByReference(elements.allocationBooking.value);
  const compatibleTents = state.dashboard.tentUnits.filter((tent) => tent.operational_status === "available" && (!booking?.tent_type || tent.tent_type === booking.tent_type));
  elements.allocationTent.innerHTML = `<option value="">Choose a tent</option>${compatibleTents.map((tent) => `<option value="${escapeHtml(tent.id)}" ${tent.id === selectedTent ? "selected" : ""}>${escapeHtml(tent.tent_code)} · ${escapeHtml(tent.tent_type)} · ${tent.capacity} guests</option>`).join("")}`;
}
function renderAllocations(allocations) {
  elements.allocationList.innerHTML = allocations.length ? allocations.map((allocation) => `<article class="allocation-card" data-allocation-id="${escapeHtml(allocation.id)}"><div class="allocation-top"><div><span class="tent-code">${escapeHtml(allocation.tent_code)}</span><h3>${escapeHtml(allocation.guest_name || allocation.booking_reference)}</h3><p>${escapeHtml(allocation.booking_reference)} · ${escapeHtml(allocation.plan || "Booking")}</p></div><span class="status ${escapeHtml(allocation.allocation_status)}">${escapeHtml(allocationStatusLabels[allocation.allocation_status])}</span></div><p class="allocation-dates">${escapeHtml(formatStayDate(allocation.arrival_date))} → ${escapeHtml(formatStayDate(allocation.departure_date))} · ${allocation.guest_count} guest${Number(allocation.guest_count) === 1 ? "" : "s"}</p><form class="allocation-edit" data-allocation-update><input type="hidden" name="bookingReference" value="${escapeHtml(allocation.booking_reference)}"><input type="hidden" name="tentId" value="${escapeHtml(allocation.tent_id)}"><input type="hidden" name="guestCount" value="${escapeHtml(allocation.guest_count)}"><input type="hidden" name="arrivalDate" value="${escapeHtml(dateOnly(allocation.arrival_date))}"><input type="hidden" name="departureDate" value="${escapeHtml(dateOnly(allocation.departure_date))}"><div class="tent-actions"><label>Status<select name="allocationStatus">${optionList(allocationStatusLabels, allocation.allocation_status)}</select></label><label>Note<input name="notes" value="${escapeHtml(allocation.notes || "")}" maxlength="5000" placeholder="Arrival or rooming note"></label><button class="button ghost small" type="submit">Update</button></div></form></article>`).join("") : "<p class=\"empty-state\">No tent allotments yet. Select a booking above to reserve its tent.</p>";
}
function selectBookingForAllocation(reference) {
  const booking = bookingByReference(reference); if (!booking) return;
  elements.allocationBooking.value = booking.id;
  elements.allocationGuests.value = Math.max(1, Math.min(Number(booking.guests || 1), Number(booking.tent_sharing || 2)));
  elements.allocationArrival.value = dateOnly(booking.arrival_date);
  elements.allocationDeparture.value = addDays(booking.arrival_date, booking.nights);
  renderAllocationOptions(); elements.allocationBooking.value = booking.id;
}

function bookingOperationsValues(booking) {
  const saved = booking.operations || {};
  return {
    bookingStatus: booking.status || "new",
    fullAddress: saved.fullAddress || "",
    email: saved.email || "",
    tentNumber: saved.tentNumber || "",
    ratePerNight: saved.ratePerNight ?? (booking.nights ? Math.round(Number(booking.base_amount || 0) / Number(booking.nights)) : ""),
    stayAmount: saved.stayAmount ?? booking.base_amount ?? "",
    pickupRequired: Boolean(saved.pickupRequired),
    pickupPoint: saved.pickupPoint || "",
    pickupDate: dateOnly(saved.pickupDate),
    pickupTime: String(saved.pickupTime || "").slice(0, 5),
    dropRequired: Boolean(saved.dropRequired),
    dropPoint: saved.dropPoint || "",
    dropDate: dateOnly(saved.dropDate),
    dropTime: String(saved.dropTime || "").slice(0, 5),
    transportAmount: saved.transportAmount || 0,
    mealPreference: saved.mealPreference || "",
    lunchQtyPerDay: saved.lunchQtyPerDay || 0,
    dinnerQtyPerDay: saved.dinnerQtyPerDay || 0,
    mealAmount: saved.mealAmount ?? booking.dinner_amount ?? 0,
    advancePaid: saved.advancePaid || 0,
    paymentStatus: saved.paymentStatus || "unpaid",
    bookingSource: saved.bookingSource || booking.source || "",
    idProofStatus: saved.idProofStatus || "pending",
    specialRequests: saved.specialRequests || "",
    assignedStaff: saved.assignedStaff || "",
    internalNotes: saved.internalNotes || ""
  };
}

function selectBookingForOperations(reference) {
  const booking = bookingByReference(reference);
  state.bookingOperationsId = booking?.id || "";
  elements.bookingOperationsFields.disabled = !booking;
  if (!booking) {
    elements.bookingOperationsSummary.textContent = "Choose a booking to prepare its operations record.";
    return;
  }
  const values = bookingOperationsValues(booking);
  for (const [name, value] of Object.entries(values)) {
    const field = elements.bookingOperationsForm.elements[name];
    if (!field) continue;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  }
  const total = Number(values.stayAmount || 0) + Number(values.mealAmount || 0) + Number(values.transportAmount || 0);
  const balance = Math.max(0, total - Number(values.advancePaid || 0));
  const departure = addDays(booking.arrival_date, booking.nights);
  elements.bookingOperationsSummary.innerHTML = `<strong>${escapeHtml(booking.id)} · ${escapeHtml(booking.name)}</strong><br>${escapeHtml(formatStayDate(booking.arrival_date))} → ${escapeHtml(formatStayDate(departure))} · ${escapeHtml(booking.guests)} guest${Number(booking.guests) === 1 ? "" : "s"} · ${escapeHtml(booking.nights)} night${Number(booking.nights) === 1 ? "" : "s"}<br>Stay ${inr(values.stayAmount)} · Meals ${inr(values.mealAmount)} · Transport ${inr(values.transportAmount)} · Operations total ${inr(total)} · Balance ${inr(balance)}`;
}

function renderBookingOperations() {
  const selected = state.bookingOperationsId || elements.bookingOperationsBooking.value;
  elements.bookingOperationsBooking.innerHTML = `<option value="">Choose a booking</option>${state.dashboard.bookings.map((booking) => `<option value="${escapeHtml(booking.id)}" ${booking.id === selected ? "selected" : ""}>${escapeHtml(booking.id)} · ${escapeHtml(booking.name)} · ${escapeHtml(booking.plan)}</option>`).join("")}`;
  selectBookingForOperations(elements.bookingOperationsBooking.value);
}

function renderDashboard(dashboard) {
  const { summary, bookings, enquiries, contestEntries, luckyEntries, leads, activities, tentUnits, tentAllocations, archivedLeads = [], archivedBookings = [] } = dashboard;
  document.querySelector("#metricBookings").textContent = summary.total_bookings; document.querySelector("#metricEnquiries").textContent = summary.new_enquiries; document.querySelector("#metricLeads").textContent = summary.open_leads; document.querySelector("#metricFollowUps").textContent = summary.follow_ups_due; document.querySelector("#metricAllocations").textContent = `${summary.active_allocations || 0} / ${summary.total_tents || 0}`;
  const visibleLeads = filteredLeads(leads);
  document.querySelector("#leadCount").textContent = `${visibleLeads.length} of ${leads.length} leads`; document.querySelector("#bookingCount").textContent = `${bookings.length} records`; document.querySelector("#enquiryCount").textContent = `${enquiries.length} records`; document.querySelector("#contestCount").textContent = contestEntries.length; document.querySelector("#luckyCount").textContent = luckyEntries.length; document.querySelector("#archiveCount").textContent = archivedLeads.length + archivedBookings.length;
  elements.leadList.innerHTML = visibleLeads.length ? visibleLeads.map((lead) => renderLead(lead, activities)).join("") : "<p class=\"empty-state\">No leads match this view.</p>";
  elements.bookingRows.innerHTML = bookings.length ? bookings.map((booking) => { const allocations = activeAllocationsFor(booking.id); return `<tr><td><div class="person"><strong>${escapeHtml(booking.name)}</strong><span class="subtle">${escapeHtml(booking.phone)}</span></div></td><td>${escapeHtml(booking.plan)}<br><span class="subtle">${escapeHtml(booking.tent_type || "Tent type pending")}</span></td><td>${escapeHtml(formatStayDate(booking.arrival_date))}<br><span class="subtle">${booking.guests} guests · ${booking.nights} nights</span></td><td>${inr(booking.total_amount)}</td><td>${booking.invoice_stored ? `<a class="invoice-link" target="_blank" rel="noopener" href="/${escapeHtml(booking.invoice_path)}">Open PDF</a>` : "<span class=\"invoice-missing\">Not stored</span>"}</td><td><span class="allocation-summary">${escapeHtml(allocations.length ? allocations.map((allocation) => allocation.tent_code).join(", ") : "Not allotted")}</span><button class="button ghost small" type="button" data-allot-booking="${escapeHtml(booking.id)}">${allocations.length ? "Add another" : "Allot tent"}</button></td><td>${escapeHtml(formatDate(booking.created_at))}</td><td>${deleteIconButton("booking", booking.id, booking.name)}</td></tr>`; }).join("") : "<tr><td colspan=\"8\" class=\"empty-state\">No bookings yet.</td></tr>";
  elements.enquiryList.innerHTML = enquiries.length ? enquiries.map((entry) => `<article class="enquiry-card"><div class="enquiry-top"><div><h3>${escapeHtml(entry.name)} <span class="subtle">· ${escapeHtml(entry.subject || "General enquiry")}</span></h3><small>${escapeHtml([entry.phone, entry.email].filter(Boolean).join(" · "))} · ${escapeHtml(formatDate(entry.created_at))}</small></div>${entry.status === "converted" ? "<span class=\"status contacted\">In CRM</span>" : `<button class="button ghost small" type="button" data-convert-enquiry="${escapeHtml(entry.id)}">Add to CRM</button>`}</div><p>${escapeHtml(entry.message)}</p></article>`).join("") : "<p class=\"empty-state\">No enquiries yet.</p>";
  elements.contestList.innerHTML = contestEntries.length ? contestEntries.map((entry) => `<article class="mini-card"><h3>${escapeHtml(entry.email)}</h3><small>${escapeHtml(entry.phone)} · ${escapeHtml(formatDate(entry.created_at))}</small><p><a href="${escapeHtml(entry.instagram_url)}" target="_blank" rel="noopener">Open Instagram entry</a></p></article>`).join("") : "<p class=\"empty-state\">No contest entries yet.</p>";
  elements.luckyList.innerHTML = luckyEntries.length ? luckyEntries.map((entry) => `<article class="mini-card"><h3>${escapeHtml(entry.booking_reference)}</h3><small>${escapeHtml(entry.email)} · ${escapeHtml(entry.phone)}</small><p>${escapeHtml(formatDate(entry.created_at))}</p></article>`).join("") : "<p class=\"empty-state\">No lucky-stay entries yet.</p>";
  const archivedRecords = [
    ...archivedLeads.map((lead) => `<article class="archive-card"><div><span class="tent-code">Lead</span><h3>${escapeHtml(lead.name)}</h3><p>${escapeHtml(lead.subject || lead.id)} · Deleted ${escapeHtml(formatDate(lead.deleted_at))}</p></div><div class="archive-actions"><button class="button ghost small" type="button" data-restore-lead="${escapeHtml(lead.id)}">Restore</button><button class="button danger small" type="button" data-permanent-delete-lead="${escapeHtml(lead.id)}">Delete permanently</button></div></article>`),
    ...archivedBookings.map((booking) => `<article class="archive-card"><div><span class="tent-code">Booking</span><h3>${escapeHtml(booking.name)}</h3><p>${escapeHtml(booking.id)} · ${escapeHtml(booking.plan)} · Deleted ${escapeHtml(formatDate(booking.deleted_at))}</p></div><button class="button ghost small" type="button" data-restore-booking="${escapeHtml(booking.id)}">Restore</button></article>`)
  ];
  elements.archiveList.innerHTML = archivedRecords.length ? archivedRecords.join("") : "<p class=\"empty-state\">No deleted records. Deleted leads and bookings can be restored here.</p>";
  renderBookingOperations(); renderTentInventory(tentUnits); renderAllocationOptions(); renderAllocations(tentAllocations);
}

async function refreshDashboard() { if (state.loading) return; state.loading = true; elements.refresh.disabled = true; elements.connection.textContent = "Refreshing secure records…"; elements.connection.className = "connection-status"; try { state.dashboard = await api("/api/admin/dashboard"); renderDashboard(state.dashboard); elements.connection.textContent = `Updated ${new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" }).format(new Date())}`; elements.connection.className = "connection-status ready"; } catch (error) { elements.connection.textContent = "Records unavailable"; elements.connection.className = "connection-status error"; showToast(error.message, true); } finally { state.loading = false; elements.refresh.disabled = false; } }
async function submitForm(event, path, successMessage, reset = false) { event.preventDefault(); const button = event.submitter; button.disabled = true; try { await api(path, { method: "POST", body: JSON.stringify(formObject(event.currentTarget)) }); if (reset) event.currentTarget.reset(); showToast(successMessage); await refreshDashboard(); } catch (error) { showToast(error.message, true); } finally { button.disabled = false; } }

elements.refresh.addEventListener("click", refreshDashboard);
elements.leadForm.addEventListener("submit", (event) => submitForm(event, "/api/admin/leads", "Lead added to the CRM.", true));
elements.tentForm.addEventListener("submit", (event) => submitForm(event, "/api/admin/tents", "Tent added to inventory.", true));
elements.allocationForm.addEventListener("submit", (event) => submitForm(event, "/api/admin/tent-allocations", "Tent allotment saved."));
elements.leadSearch.addEventListener("input", (event) => { state.leadSearch = event.target.value; if (state.dashboard) renderDashboard(state.dashboard); });
elements.leadStatusFilter.addEventListener("change", (event) => { state.leadStatus = event.target.value; if (state.dashboard) renderDashboard(state.dashboard); });
elements.allocationBooking.addEventListener("change", (event) => selectBookingForAllocation(event.target.value));
elements.bookingOperationsBooking.addEventListener("change", (event) => selectBookingForOperations(event.target.value));
elements.bookingOperationsForm.addEventListener("submit", async (event) => { event.preventDefault(); const bookingId = elements.bookingOperationsBooking.value; if (!bookingId) return; const button = event.submitter; button.disabled = true; try { await api(`/api/admin/bookings/${encodeURIComponent(bookingId)}/operations`, { method: "PATCH", body: JSON.stringify(formObject(event.currentTarget)) }); showToast("Booking operations saved."); await refreshDashboard(); } catch (error) { showToast(error.message, true); } finally { button.disabled = false; } });

document.addEventListener("submit", async (event) => {
  const leadUpdate = event.target.closest("[data-lead-update]"), activityForm = event.target.closest("[data-activity-form]"), tentUpdate = event.target.closest("[data-tent-update]"), allocationUpdate = event.target.closest("[data-allocation-update]");
  if (!leadUpdate && !activityForm && !tentUpdate && !allocationUpdate) return;
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  try {
    if (leadUpdate) { const leadId = event.target.closest("[data-lead-id]").dataset.leadId; await api(`/api/admin/leads/${encodeURIComponent(leadId)}`, { method: "PATCH", body: JSON.stringify(formObject(leadUpdate)) }); }
    if (activityForm) { const leadId = event.target.closest("[data-lead-id]").dataset.leadId; await api(`/api/admin/leads/${encodeURIComponent(leadId)}/activities`, { method: "POST", body: JSON.stringify(formObject(activityForm)) }); }
    if (tentUpdate) { const tentId = event.target.closest("[data-tent-id]").dataset.tentId; await api(`/api/admin/tents/${encodeURIComponent(tentId)}`, { method: "PATCH", body: JSON.stringify(formObject(tentUpdate)) }); }
    if (allocationUpdate) { const allocationId = event.target.closest("[data-allocation-id]").dataset.allocationId; await api(`/api/admin/tent-allocations/${encodeURIComponent(allocationId)}`, { method: "PATCH", body: JSON.stringify(formObject(allocationUpdate)) }); }
    showToast(leadUpdate ? "Lead saved." : activityForm ? "Interaction logged." : tentUpdate ? "Tent updated." : "Allotment updated."); await refreshDashboard();
  } catch (error) { showToast(error.message, true); } finally { button.disabled = false; }
});
document.addEventListener("click", async (event) => {
  const convertButton = event.target.closest("[data-convert-enquiry]"), allotButton = event.target.closest("[data-allot-booking]"), manageBookingButton = event.target.closest("[data-manage-booking]"), deleteLeadButton = event.target.closest("[data-delete-lead]"), deleteBookingButton = event.target.closest("[data-delete-booking]"), restoreLeadButton = event.target.closest("[data-restore-lead]"), restoreBookingButton = event.target.closest("[data-restore-booking]"), permanentDeleteLeadButton = event.target.closest("[data-permanent-delete-lead]");
  if (allotButton) { selectBookingForAllocation(allotButton.dataset.allotBooking); document.querySelector("#allocationPanel").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (manageBookingButton) { elements.bookingOperationsBooking.value = manageBookingButton.dataset.manageBooking; selectBookingForOperations(manageBookingButton.dataset.manageBooking); document.querySelector("#bookingOperationsPanel").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const isDelete = Boolean(deleteLeadButton || deleteBookingButton);
  const actionButton = convertButton || deleteLeadButton || deleteBookingButton || restoreLeadButton || restoreBookingButton || permanentDeleteLeadButton;
  if (!actionButton) return;
  if (isDelete && !window.confirm("Delete this record from the active workspace? It will remain in the recycle bin and can be restored.")) return;
  if (permanentDeleteLeadButton && !window.confirm("Permanently delete this lead and all of its interaction history? This cannot be undone.")) return;
  actionButton.disabled = true;
  try {
    if (convertButton) {
      const result = await api(`/api/admin/enquiries/${encodeURIComponent(convertButton.dataset.convertEnquiry)}/convert-to-lead`, { method: "POST", body: "{}" });
      showToast(result.lead.restored ? "Archived lead restored to the CRM." : result.lead.existing ? "This enquiry is already in the CRM." : "Enquiry added to the CRM.");
    } else if (deleteLeadButton) {
      await api(`/api/admin/leads/${encodeURIComponent(deleteLeadButton.dataset.deleteLead)}`, { method: "DELETE" });
      showToast("Lead moved to the recycle bin.");
    } else if (deleteBookingButton) {
      await api(`/api/admin/bookings/${encodeURIComponent(deleteBookingButton.dataset.deleteBooking)}`, { method: "DELETE" });
      showToast("Booking moved to the recycle bin. Its active tent allotments were cancelled.");
    } else if (restoreLeadButton) {
      await api(`/api/admin/leads/${encodeURIComponent(restoreLeadButton.dataset.restoreLead)}/restore`, { method: "POST", body: "{}" });
      showToast("Lead restored to the active CRM.");
    } else if (restoreBookingButton) {
      await api(`/api/admin/bookings/${encodeURIComponent(restoreBookingButton.dataset.restoreBooking)}/restore`, { method: "POST", body: "{}" });
      showToast("Booking restored. Re-allot a tent if needed.");
    } else if (permanentDeleteLeadButton) {
      await api(`/api/admin/leads/${encodeURIComponent(permanentDeleteLeadButton.dataset.permanentDeleteLead)}/permanent`, { method: "DELETE" });
      showToast("Lead and its interaction history were permanently deleted.");
    }
    await refreshDashboard();
  } catch (error) { showToast(error.message, true); actionButton.disabled = false; }
});
refreshDashboard();
