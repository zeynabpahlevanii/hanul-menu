const apiURL = "/api/products";
const productList = document.getElementById("product-list");
const addForm = document.getElementById("add-form");
const nameInput = document.getElementById("name");
const priceInput = document.getElementById("price");

// گرفتن لیست محصولات و نمایش
async function fetchProducts() {
  const res = await fetch(apiURL);
  const products = await res.json();

  productList.innerHTML = "";
  products.forEach((product) => {
    const item = document.createElement("div");
    item.className =
      "flex justify-between items-center border p-2 rounded-md mb-2";

    item.innerHTML = `
      <div>
        <p class="font-semibold">${product.name}</p>
        <p class="text-sm text-gray-500">${product.price} تومان</p>
      </div>
      <div class="flex gap-2">
        <button onclick="deleteProduct(${product.id})" class="bg-red-500 text-white px-2 py-1 rounded">حذف</button>
        <button onclick="editProduct(${product.id}, '${product.name}', '${product.price}')" class="bg-blue-500 text-white px-2 py-1 rounded">ویرایش</button>
      </div>
    `;
    productList.appendChild(item);
  });
}

// افزودن محصول جدید
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const price = priceInput.value.trim();

  if (name && price) {
    await fetch(apiURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price }),
    });
    nameInput.value = "";
    priceInput.value = "";
    fetchProducts();
  }
});

// حذف محصول
async function deleteProduct(id) {
  if (confirm("آیا مطمئنی که میخوای حذف کنی؟")) {
    await fetch(`${apiURL}/${id}`, { method: "DELETE" });
    fetchProducts();
  }
}

// ویرایش محصول
async function editProduct(id, currentName, currentPrice) {
  const name = prompt("نام جدید:", currentName);
  const price = prompt("قیمت جدید:", currentPrice);

  if (name && price) {
    await fetch(`${apiURL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price }),
    });
    fetchProducts();
  }
}

// شروع
fetchProducts();
