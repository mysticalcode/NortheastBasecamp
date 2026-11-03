const form = document.getElementById("festivalPaymentForm");
const message = document.getElementById("paymentMessage");
const submitButton = form?.querySelector("button[type='submit']");
const requestedFestival = new URLSearchParams(window.location.search).get("festival");
const cherryCategories = document.getElementById("cherryCategories");
const festivalOptions = form?.querySelectorAll("input[name='productCode']") || [];
const categoryOptions = form?.querySelectorAll("input[name='stayCategory']") || [];

function updateFestivalFields() {
  const isCherryBlossom = form?.querySelector("input[name='productCode']:checked")?.value === "cherry-blossom";
  if (cherryCategories) cherryCategories.hidden = !isCherryBlossom;
  categoryOptions.forEach((option) => {
    option.required = Boolean(isCherryBlossom);
  });
}

if (["hornbill", "cherry-blossom"].includes(requestedFestival)) {
  const option = form?.querySelector(`input[name="productCode"][value="${requestedFestival}"]`);
  if (option) option.checked = true;
}

festivalOptions.forEach((option) => option.addEventListener("change", updateFestivalFields));
updateFestivalFields();

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  message.textContent = "Preparing your secure PayU checkout…";
  message.className = "payment-message";
  submitButton.disabled = true;
  try {
    const response = await fetch("/api/festival-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.action || !result.fields) throw new Error(result.message || "The payment service is unavailable.");

    const checkout = document.createElement("form");
    checkout.method = "post";
    checkout.action = result.action;
    Object.entries(result.fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      checkout.append(input);
    });
    document.body.append(checkout);
    checkout.submit();
  } catch (error) {
    message.textContent = error.message || "The payment service is unavailable.";
    message.className = "payment-message error";
    submitButton.disabled = false;
  }
});
