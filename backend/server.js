const apiURL = "https://api.menuchin-hanul.ir";
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const fs = require("fs").promises;
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/menu", express.static(path.join(__dirname, "menu")));
app.use("/admin", express.static(path.join(__dirname, "admin")));

// MongoDB connection
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://zeynabpahlevani81:zynb1234@cluster0.ipzpyfg.mongodb.net/hanul?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const categorySchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true }, // فارسی
  englishName: { type: String, unique: true, required: false, default: "" }, // انگلیسی (اختیاری)
  iconUrl: { type: String, default: "" }, // آیکون
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId, // آی‌دی دسته رو ذخیره کن
    ref: "Category",
    required: true,
  },
  active: { type: Boolean, default: true },
  image: { type: String, default: "" },
});

const Category = mongoose.model("Category", categorySchema);
const Product = mongoose.model("Product", productSchema);

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("فقط تصاویر JPEG و PNG مجاز هستند"));
  },
}).single("image");

// Multer error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ message: "خطا در آپلود فایل: " + err.message });
  }
  if (err.message === "فقط تصاویر JPEG و PNG مجاز هستند") {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// --- Routes ---
app.get("/", (req, res) => {
  res.redirect("/menu/index.html");
});

// تست سرور (optional)
app.get("/", (req, res) => {
  res.send("✅ Server is running and MongoDB connected.");
});

// دسته‌بندی‌ها
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res
      .status(500)
      .json({ message: "خطا در دریافت دسته‌بندی‌ها: " + err.message });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name, englishName } = req.body;
    if (!name || !englishName)
      return res.status(400).json({ message: "نام فارسی و انگلیسی لازم است" });

    const exists = await Category.findOne({ $or: [{ name }, { englishName }] });
    if (exists)
      return res
        .status(400)
        .json({ message: "دسته‌بندی با این نام یا نام انگلیسی وجود دارد" });

    const category = new Category({ name, englishName });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res
      .status(500)
      .json({ message: "خطا در افزودن دسته‌بندی: " + err.message });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "شناسه نامعتبر است" });

    const category = await Category.findByIdAndDelete(id);
    if (!category)
      return res.status(404).json({ message: "دسته‌بندی پیدا نشد" });

    // حذف محصولات مرتبط با این دسته
    await Product.deleteMany({ category: category._id });

    res.json({ message: "دسته‌بندی و محصولات مرتبط حذف شدند" });
  } catch (err) {
    res.status(500).json({ message: "خطا در حذف دسته‌بندی: " + err.message });
  }
});

// محصولات با صفحه‌بندی
app.get("/api/products", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000; // تعداد بالا برای پنل ادمین
    const skip = (page - 1) * limit;

    const products = await Product.find().skip(skip).limit(limit);
    const total = await Product.countDocuments();

    res.json({
      products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ message: "خطا در دریافت محصولات: " + err.message });
  }
});

// افزودن محصول جدید
app.post("/api/products", upload, async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    if (!name || !price || !category)
      return res.status(400).json({ message: "فیلدهای لازم را پر کنید" });

    if (isNaN(price) || Number(price) <= 0)
      return res.status(400).json({ message: "قیمت باید یک عدد مثبت باشد" });

    if (!mongoose.Types.ObjectId.isValid(category))
      return res.status(400).json({ message: "شناسه دسته نامعتبر است" });

    const categoryExists = await Category.findById(category);
    if (!categoryExists)
      return res.status(400).json({ message: "دسته‌بندی نامعتبر است" });

    const image = req.file ? `/uploads/${req.file.filename}` : "";

    const product = new Product({
      name,
      description: description || "",
      price: Number(price),
      category,
      image,
      active: true,
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "خطا در افزودن محصول: " + err.message });
  }
});

// ویرایش محصول
app.put("/api/products/:id", upload, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "شناسه محصول نامعتبر است" });

    const updates = req.body;

    if (updates.price && (isNaN(updates.price) || Number(updates.price) <= 0))
      return res.status(400).json({ message: "قیمت باید یک عدد مثبت باشد" });

    if (updates.category) {
      if (!mongoose.Types.ObjectId.isValid(updates.category))
        return res.status(400).json({ message: "شناسه دسته نامعتبر است" });

      const categoryExists = await Category.findById(updates.category);
      if (!categoryExists)
        return res.status(400).json({ message: "دسته‌بندی نامعتبر است" });
    }

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) return res.status(404).json({ message: "محصول پیدا نشد" });

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "خطا در ویرایش محصول: " + err.message });
  }
});

// حذف محصول
app.delete("/api/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "شناسه نامعتبر است" });

    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ message: "محصول پیدا نشد" });

    if (product.image) {
      await fs.unlink(path.join(__dirname, product.image)).catch(() => {});
    }

    res.json({ message: "محصول حذف شد" });
  } catch (err) {
    res.status(500).json({ message: "خطا در حذف محصول: " + err.message });
  }
});

// تغییر وضعیت فعال/غیرفعال محصول
app.patch("/api/products/:id/toggle-active", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "شناسه نامعتبر است" });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "محصول پیدا نشد" });

    product.active = !product.active;
    await product.save();

    res.json(product);
  } catch (err) {
    res
      .status(500)
      .json({ message: "خطا در تغییر وضعیت محصول: " + err.message });
  }
});

// سبد خرید (موقت، روی حافظه سرور)
let cart = {};

app.get("/api/cart", async (req, res) => {
  try {
    const items = Object.values(cart);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: "خطا در دریافت سبد خرید: " + err.message });
  }
});

app.post("/api/cart", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity || quantity <= 0)
      return res.status(400).json({ message: "فیلدهای نامعتبر" });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "محصول پیدا نشد" });

    if (cart[productId]) {
      cart[productId].quantity += quantity;
    } else {
      cart[productId] = { product, quantity };
    }

    res.json({ message: "به سبد خرید اضافه شد" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "خطا در افزودن به سبد خرید: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
