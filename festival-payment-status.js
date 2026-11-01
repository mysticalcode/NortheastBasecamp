const title = document.getElementById("statusTitle");
const copy = document.getElementById("statusCopy");
const details = document.getElementById("statusDetails");
const orderId = new URLSearchParams(window.location.search).get("order");

if (!orderId) {
  title.textContent = "We could not verify that payment.";
  copy.textContent = "If money was deducted, please contact Northeast Basecamp with your PayU payment reference.";
} else {
  fetch(`/api/festival-payments/${encodeURIComponent(orderId)}`)
    .then(async (response) => ({ response, result: await response.json() }))
    .then(({ response, result }) => {
      if (!response.ok || !result.ok) throw new Error(result.message || "Payment status is unavailable.");
      const order = result.order;
      const paid = order.status === "paid";
      title.textContent = paid ? "Your festival payment is confirmed." : "Your payment was not completed.";
      copy.textContent = paid ? "Thank you. Northeast Basecamp will contact you shortly with your stay confirmation and next steps." : "No payment has been confirmed. You can return to the booking page and try again, or contact our team for help.";
      details.hidden = false;
      details.innerHTML = `<strong>${order.festival}</strong><span>Reference: ${order.id}</span><span>${order.guests} guest${Number(order.guests) === 1 ? "" : "s"} · ₹${new Intl.NumberFormat("en-IN").format(order.amount)}</span>`;
    })
    .catch((error) => { title.textContent = "We could not verify that payment."; copy.textContent = error.message; });
}
