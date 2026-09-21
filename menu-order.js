const whatsappNumber = "918719962147";
const cafeMenu = [
  ["Fried rice", [["Veg fried rice",180],["Chicken fried rice",230],["Pork fried rice",250],["Mix fried rice",270],["Schezwan fried rice",230]]],
  ["Chowmein", [["Veg chowmein",170],["Chicken chowmein",220],["Pork chowmein",240],["Schezwan chowmein",210],["Mix chowmein",250]]],
  ["Rolls & momos", [["Veg roll",100],["Egg roll",120],["Chicken roll",150],["Pork roll",160],["Veg momo",140],["Chicken momo",180],["Pork momo",200],["Fried momo",200]]],
  ["Snacks & sides", [["French fries",120],["Peri peri fries",150],["Veg pakoda",120],["Paneer pakoda",180],["Chicken 65",260],["Chilli chicken dry",260],["Grilled chicken",320],["Pork dry fry",340]]],
  ["Mains", [["Chicken manchurian",260],["Chilli chicken gravy",260],["Hot garlic chicken gravy",270],["Chicken butter masala",300],["Veg combo",260],["Chicken or pork combo",320],["Plain dosa",120],["Masala dosa",160]]],
  ["Beverages", [["Red Bull",300],["Coke",80],["Pepsi",80],["Sprite",80],["Water bottle 500 ml",20]]]
];
const barMenu = [
  ["30 ml pours", [["Jameson — 30 ml",300],["Jamun — 30 ml",200],["Bacardi Limon — 30 ml",200],["Blenders Blue — 30 ml",200],["100 Pipers — 30 ml",250],["Bacardi Plain — 30 ml",200],["Jose Cuervo Silver — 30 ml",500],["Jägermeister — 30 ml",500]]],
  ["60 ml pours", [["Jameson — 60 ml",600],["Jamun — 60 ml",400],["Bacardi Limon — 60 ml",400],["Blenders Blue — 60 ml",400],["100 Pipers — 60 ml",500],["Bacardi Plain — 60 ml",400],["Jose Cuervo Silver — 60 ml",1000],["Jägermeister — 60 ml",1000]]],
  ["Bottles", [["Jameson bottle",7000],["Jamun bottle",4500],["Bacardi Limon bottle",4500],["Blenders Blue bottle",4500],["100 Pipers bottle",5700],["Bacardi Plain bottle",4500]]],
  ["Beer & mixers", [["Budweiser Premium can",300],["Kingfisher Ultra can",250],["Red Bull",300],["Water bottle 500 ml",20]]]
];

const page = document.body.dataset.menuKind;
const menu = page === "bar" ? barMenu : cafeMenu;
const storageKey = `nbc-${page}-cart`;
let cart = JSON.parse(localStorage.getItem(storageKey) || "[]");
const menuRoot = document.querySelector("#menuCategories");
const cartRoot = document.querySelector("#cartItems");
const totalRoot = document.querySelector("#cartTotal");
const shareButton = document.querySelector("#shareOrder");

const money = (amount) => `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
const productId = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const allProducts = menu.flatMap(([, items]) => items.map(([name, price]) => ({ id: productId(name), name, price })));

function saveCart() { localStorage.setItem(storageKey, JSON.stringify(cart)); }
function addItem(id) { const existing = cart.find((item) => item.id === id); if (existing) existing.quantity += 1; else { const product = allProducts.find((item) => item.id === id); cart.push({ ...product, quantity: 1 }); } saveCart(); renderCart(); }
function changeQuantity(id, delta) { const item = cart.find((entry) => entry.id === id); if (!item) return; item.quantity += delta; if (item.quantity <= 0) cart = cart.filter((entry) => entry.id !== id); saveCart(); renderCart(); }
function renderMenu() { menuRoot.innerHTML = menu.map(([category, items]) => `<section class="menu-category"><h2>${category}</h2><div class="menu-items">${items.map(([name, price]) => `<article class="menu-item"><div><strong>${name}</strong><small>Festival café price</small></div><div><span class="menu-price">${money(price)}</span><button class="add-item" type="button" data-add="${productId(name)}" aria-label="Add ${name} to cart">+</button></div></article>`).join("")}</div></section>`).join(""); }
function renderCart() { const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); cartRoot.innerHTML = cart.length ? cart.map((item) => `<div class="cart-row"><div><strong>${item.name}</strong><span>${money(item.price)} each</span></div><div class="quantity"><button type="button" data-change="${item.id}" data-delta="-1" aria-label="Remove one ${item.name}">−</button><b>${item.quantity}</b><button type="button" data-change="${item.id}" data-delta="1" aria-label="Add one ${item.name}">+</button></div><strong>${money(item.price * item.quantity)}</strong></div>`).join("") : '<p class="cart-empty">Your cart is empty. Add items to place an order.</p>'; totalRoot.textContent = money(total); shareButton.disabled = !cart.length; }
function shareOrder() { const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); const title = page === "bar" ? "Northeast Basecamp Bar" : "Northeast Basecamp Café"; const lines = cart.map((item) => `• ${item.name} × ${item.quantity} — ${money(item.price * item.quantity)}`); const message = encodeURIComponent(`Hello ${title}, I would like to place an order:\n\n${lines.join("\n")}\n\nFinal bill: ${money(total)}\n\nName: \nTent / table: \nPlease confirm availability.`); window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank", "noopener"); }

renderMenu(); renderCart();
menuRoot.addEventListener("click", (event) => { const button = event.target.closest("[data-add]"); if (button) addItem(button.dataset.add); });
cartRoot.addEventListener("click", (event) => { const button = event.target.closest("[data-change]"); if (button) changeQuantity(button.dataset.change, Number(button.dataset.delta)); });
shareButton.addEventListener("click", shareOrder);
document.querySelector("#clearCart").addEventListener("click", () => { cart = []; saveCart(); renderCart(); });
