const state = { dashboard: null, loading: false };
const statusLabels = { new: "New", contacted: "Contacted", qualified: "Qualified", proposal: "Proposal sent", won: "Won", lost: "Lost" };

const elements = {
  connection: document.querySelector("#connectionStatus"),
  refresh: document.querySelector("#refreshButton"),
  leadForm: document.querySelector("#leadForm"),
  leadList: document.querySelector("#leadList"),
  bookingRows: document.querySelector("#bookingRows"),
  enquiryList: document.querySelector("#enquiryList"),
  contestList: document.querySelector("#contestList"),
  luckyList: document.querySelector("#luckyList"),
  toast: document.querySelector("#toast")
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function formatDate(value, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function inr(value) {
  return `INR ${new Intl.NumberFormat("en-IN").format(Number(value || 0))}`;
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.classList.toggle("error", isError);
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("show"), 3600);
}

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) }, cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.message || "Request could not be completed.");
  return payload;
}

function leadStatusOptions(current) {
  return Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`).join("");
}

function leadSourceOptions(current) {
  const choices = [["manual", "Manual"], ["website-enquiry", "Website enquiry"], ["phone", "Phone"], ["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["referral", "Referral"], ["other", "Other"]];
  return choices.map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`).join("");
}

function activityMarkup(lead, activities) {
  const entries = activities.filter((activity) => activity.lead_id === lead.id).slice(0, 6);
  if (!entries.length) return "<li>No interactions logged yet.</li>";
  return entries.map((activity) => `<li><time>${escapeHtml(formatDate(activity.created_at))} · ${escapeHtml(activity.activity_type)}</time>${escapeHtml(activity.note)}</li>`).join("");
}

function renderLead(lead, activities) {
  const contact = [lead.phone, lead.email].filter(Boolean).join(" · ") || "No contact details";
  const followUp = lead.next_follow_up_at ? `Follow up ${formatDate(lead.next_follow_up_at)}` : "No follow-up scheduled";
  return `<details class="lead-card" data-lead-id="${escapeHtml(lead.id)}">
    <summary><div class="lead-title"><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.subject || contact)}</span></div><div class="lead-meta"><span class="status ${escapeHtml(lead.status)}">${escapeHtml(statusLabels[lead.status] || lead.status)}</span><span>${escapeHtml(followUp)}</span></div></summary>
    <form class="lead-edit" data-lead-update>
      <div class="form-row"><label>Name<input name="name" value="${escapeHtml(lead.name)}" required></label><label>Phone<input name="phone" value="${escapeHtml(lead.phone || "")}"></label></div>
      <div class="form-row"><label>Email<input name="email" type="email" value="${escapeHtml(lead.email || "")}"></label><label>Subject<input name="subject" value="${escapeHtml(lead.subject || "")}"></label></div>
      <div class="form-row"><label>Status<select name="status">${leadStatusOptions(lead.status)}</select></label><label>Source<select name="source">${leadSourceOptions(lead.source)}</select></label></div>
      <div class="form-row"><label>Booking reference<input name="bookingReference" value="${escapeHtml(lead.booking_reference || "")}"></label><label>Next follow-up<input name="nextFollowUpAt" type="datetime-local" value="${escapeHtml(toDateInput(lead.next_follow_up_at))}"></label></div>
      <label>Lead notes<textarea name="notes" rows="3">${escapeHtml(lead.notes || "")}</textarea></label>
      <div class="inline"><button class="button ghost small" type="submit">Save lead</button><span class="subtle">Last activity: ${escapeHtml(formatDate(lead.last_activity_at, "None"))}</span></div>
    </form>
    <form class="activity-form" data-activity-form><div class="activity-row"><label>Type<select name="activityType"><option value="note">Note</option><option value="call">Call</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="meeting">Meeting</option></select></label><label>Interaction note<input name="note" required maxlength="5000" placeholder="What happened? What is next?"></label><button class="button primary small" type="submit">Log</button></div></form>
    <ul class="activity-history">${activityMarkup(lead, activities)}</ul>
  </details>`;
}

function renderDashboard(dashboard) {
  const { summary, bookings, enquiries, contestEntries, luckyEntries, leads, activities } = dashboard;
  document.querySelector("#metricBookings").textContent = summary.total_bookings;
  document.querySelector("#metricEnquiries").textContent = summary.new_enquiries;
  document.querySelector("#metricLeads").textContent = summary.open_leads;
  document.querySelector("#metricFollowUps").textContent = summary.follow_ups_due;
  document.querySelector("#leadCount").textContent = `${leads.length} leads`;
  document.querySelector("#bookingCount").textContent = `${bookings.length} records`;
  document.querySelector("#enquiryCount").textContent = `${enquiries.length} records`;
  document.querySelector("#contestCount").textContent = contestEntries.length;
  document.querySelector("#luckyCount").textContent = luckyEntries.length;
  elements.leadList.innerHTML = leads.length ? leads.map((lead) => renderLead(lead, activities)).join("") : "<p class=\"empty-state\">No leads yet. Add the first conversation on the left.</p>";
  elements.bookingRows.innerHTML = bookings.length ? bookings.map((booking) => `<tr><td><div class="person"><strong>${escapeHtml(booking.name)}</strong><span class="subtle">${escapeHtml(booking.phone)}</span></div></td><td>${escapeHtml(booking.plan)}</td><td>${escapeHtml(booking.arrival_date || "—")}<br><span class="subtle">${booking.guests} guests · ${booking.nights} nights</span></td><td>${inr(booking.total_amount)}</td><td>${booking.invoice_stored ? `<a class="invoice-link" target="_blank" rel="noopener" href="/${escapeHtml(booking.invoice_path)}">Open PDF</a>` : "<span class=\"invoice-missing\">Not stored</span>"}</td><td>${escapeHtml(formatDate(booking.created_at))}</td></tr>`).join("") : "<tr><td colspan=\"6\" class=\"empty-state\">No bookings yet.</td></tr>";
  elements.enquiryList.innerHTML = enquiries.length ? enquiries.map((entry) => `<article class="enquiry-card"><div class="enquiry-top"><div><h3>${escapeHtml(entry.name)} <span class="subtle">· ${escapeHtml(entry.subject || "General enquiry")}</span></h3><small>${escapeHtml([entry.phone, entry.email].filter(Boolean).join(" · "))} · ${escapeHtml(formatDate(entry.created_at))}</small></div><button class="button ghost small" type="button" data-convert-enquiry="${escapeHtml(entry.id)}">Add to CRM</button></div><p>${escapeHtml(entry.message)}</p></article>`).join("") : "<p class=\"empty-state\">No enquiries yet.</p>";
  elements.contestList.innerHTML = contestEntries.length ? contestEntries.map((entry) => `<article class="mini-card"><h3>${escapeHtml(entry.email)}</h3><small>${escapeHtml(entry.phone)} · ${escapeHtml(formatDate(entry.created_at))}</small><p><a href="${escapeHtml(entry.instagram_url)}" target="_blank" rel="noopener">Open Instagram entry</a></p></article>`).join("") : "<p class=\"empty-state\">No contest entries yet.</p>";
  elements.luckyList.innerHTML = luckyEntries.length ? luckyEntries.map((entry) => `<article class="mini-card"><h3>${escapeHtml(entry.booking_reference)}</h3><small>${escapeHtml(entry.email)} · ${escapeHtml(entry.phone)}</small><p>${escapeHtml(formatDate(entry.created_at))}</p></article>`).join("") : "<p class=\"empty-state\">No lucky-stay entries yet.</p>";
}

async function refreshDashboard() {
  if (state.loading) return;
  state.loading = true;
  elements.refresh.disabled = true;
  elements.connection.textContent = "Refreshing secure records…";
  elements.connection.className = "connection-status";
  try {
    state.dashboard = await api("/api/admin/dashboard");
    renderDashboard(state.dashboard);
    elements.connection.textContent = `Updated ${new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" }).format(new Date())}`;
    elements.connection.className = "connection-status ready";
  } catch (error) {
    elements.connection.textContent = "Records unavailable";
    elements.connection.className = "connection-status error";
    showToast(error.message, true);
  } finally {
    state.loading = false;
    elements.refresh.disabled = false;
  }
}

function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }

elements.refresh.addEventListener("click", refreshDashboard);
elements.leadForm.addEventListener("submit", async (event) => { event.preventDefault(); const button = event.submitter; button.disabled = true; try { await api("/api/admin/leads", { method: "POST", body: JSON.stringify(formObject(event.currentTarget)) }); event.currentTarget.reset(); showToast("Lead added to the CRM."); await refreshDashboard(); } catch (error) { showToast(error.message, true); } finally { button.disabled = false; } });

document.addEventListener("submit", async (event) => {
  const leadUpdate = event.target.closest("[data-lead-update]");
  const activityForm = event.target.closest("[data-activity-form]");
  if (!leadUpdate && !activityForm) return;
  event.preventDefault();
  const leadId = event.target.closest("[data-lead-id]").dataset.leadId;
  const button = event.submitter; button.disabled = true;
  try {
    if (leadUpdate) await api(`/api/admin/leads/${encodeURIComponent(leadId)}`, { method: "PATCH", body: JSON.stringify(formObject(leadUpdate)) });
    if (activityForm) await api(`/api/admin/leads/${encodeURIComponent(leadId)}/activities`, { method: "POST", body: JSON.stringify(formObject(activityForm)) });
    showToast(leadUpdate ? "Lead saved." : "Activity logged.");
    await refreshDashboard();
  } catch (error) { showToast(error.message, true); } finally { button.disabled = false; }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-convert-enquiry]");
  if (!button) return;
  button.disabled = true;
  try { const result = await api(`/api/admin/enquiries/${encodeURIComponent(button.dataset.convertEnquiry)}/convert-to-lead`, { method: "POST", body: "{}" }); showToast(result.lead.existing ? "This enquiry is already in the CRM." : "Enquiry added to the CRM."); await refreshDashboard(); } catch (error) { showToast(error.message, true); button.disabled = false; }
});

refreshDashboard();
