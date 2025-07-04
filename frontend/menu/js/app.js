const apiURL = "/api/products";
const menuContainer = document.getElementById("menu");

async function loadMenu() {
  const res = await fetch(apiURL);
  const products = await res.json();

  products.forEach((product) => {
    const item = document.createElement("div");
    item.className = "border p-3 rounded mb-2";

    item.innerHTML = `
      <p class="font-semibold">${product.name}</p>
      <p class="text-sm text-gray-500">${product.price} تومان</p>
    `;
    menuContainer.appendChild(item);
  });
}

loadMenu();
