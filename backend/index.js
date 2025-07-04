const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// File DB
const DB_FILE = "./data/db.json";

// Read DB
function readDB() {
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data);
}

// Write DB
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Multer config for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------------- Routes ----------------

// ✅ Get all products
app.get("/api/products", (req, res) => {
  const db = readDB();
  res.json(db.products);
});

// ✅ Add product
app.post("/api/products", upload.single("image"), (req, res) => {
  const db = readDB();
  const { name, price, category } = req.body;
  const id = db.products.length
    ? Math.max(...db.products.map((p) => p.id)) + 1
    : 1;
  const image = req.file ? `/uploads/${req.file.filename}` : "";

  const newProduct = {
    id,
    name,
    price: Number(price),
    category,
    active: true,
    image,
  };
  db.products.push(newProduct);
  writeDB(db);
  res.json(newProduct);
});

// ✅ Update product
app.put("/api/products/:id", upload.single("image"), (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const product = db.products.find((p) => p.id === id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const { name, price, category, active } = req.body;
  if (name) product.name = name;
  if (price) product.price = Number(price);
  if (category) product.category = category;
  if (active !== undefined)
    product.active = active === "true" || active === true;
  if (req.file) product.image = `/uploads/${req.file.filename}`;

  writeDB(db);
  res.json(product);
});

// ✅ Delete product
app.delete("/api/products/:id", (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  db.products = db.products.filter((p) => p.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// ✅ Get categories
app.get("/api/categories", (req, res) => {
  const db = readDB();
  res.json(db.categories);
});

// ✅ Add category
app.post("/api/categories", (req, res) => {
  const db = readDB();
  const { name } = req.body;
  if (db.categories.includes(name)) {
    return res.status(400).json({ message: "Category already exists" });
  }
  db.categories.push(name);
  writeDB(db);
  res.json({ success: true, categories: db.categories });
});

// ✅ Delete category
app.delete("/api/categories/:name", (req, res) => {
  const db = readDB();
  const name = req.params.name;
  db.categories = db.categories.filter((c) => c !== name);
  db.products = db.products.filter((p) => p.category !== name);
  writeDB(db);
  res.json({ success: true });
});

// ✅ Server start
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
