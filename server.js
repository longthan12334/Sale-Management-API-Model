
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const app = express();

app.use(express.json());

// Load file Swagger YAML
const swaggerDocument = YAML.load("./pos-api.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Fake database (demo)
let users = [];
let products = [];
let orders = [];
let shifts = [];

// ======================= AUTH =======================
// Đăng ký
app.post("/register", (req, res) => {
  const { username, password, role, name, phone, gmail } = req.body;
  // Kiểm tra trùng username
  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ message: "Tài khoản đã tồn tại" });
  }
  const newUser = { username, password, role, name, phone, gmail };
  users.push(newUser);
  res.status(201).json({ message: "Đăng ký thành công", user: newUser });
});

// Đăng nhập
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    res.status(200).json({ message: "Đăng nhập thành công", user });
  } else {
    res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu" });
  }
});

// ======================= USER MANAGEMENT =======================
// Cập nhật thông tin người dùng
app.put("/api/users/:username", (req, res) => {
  const { username } = req.params;
  const { name, dob, phone, gmail } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }
  // Cập nhật thông tin
  user.name = name ?? user.name;
  user.dob = dob ?? user.dob;
  user.phone = phone ?? user.phone;
  user.gmail = gmail ?? user.gmail;

  res.json({ message: "Đã cập nhật thông tin người dùng", user });
});

// Lấy danh sách tất cả người dùng
app.get("/api/users", (req, res) => {
  res.json(users);
});

// Tìm kiếm người dùng theo tên, số điện thoại hoặc gmail
app.get("/api/users/search", (req, res) => {
  const { name, phone, gmail } = req.query;
  let results = users;

  if (name)
    results = results.filter((u) => u.name?.toLowerCase().includes(name.toLowerCase()));
  if (phone) results = results.filter((u) => u.phone === phone);
  if (gmail) results = results.filter((u) => u.gmail?.toLowerCase() === gmail.toLowerCase());

  if (results.length === 0) {
    return res.status(404).json({ message: "Không tìm thấy người dùng phù hợp." });
  }
  res.json(results);
});

// Xoá người dùng theo username (sử dụng query hoặc body cho username)
app.delete("/api/users/delete", (req, res) => {
  const username = req.params.username || req.query.username || req.body.username;
  if (!username) {
    return res.status(400).json({ message: "Thiếu username để xoá" });
  }
  const index = users.findIndex((u) => u.username === username);
  if (index === -1) {
    return res.status(404).json({ message: "Không tìm thấy người dùng" });
  }
  users.splice(index, 1);
  res.json({ message: "Đã xoá người dùng" });
});

// ======================= PRODUCTS MANAGEMENT =======================
// Danh sách sản phẩm
app.get("/products", (req, res) => res.json(products));


// Thêm sản phẩm qua URL /apply/products
app.post("/apply/products", (req, res) => {
  const { name, code, quantity, price } = req.body;
  if (!name || !code || quantity == null || price == null) {
    return res.status(400).json({ message: "Thiếu thông tin sản phẩm" });
  }
  const newProduct = { name, code, quantity, price };
  products.push(newProduct);
  res.status(201).json({ message: "Đã thêm sản phẩm", product: newProduct });
});

// Xem chi tiết theo code
app.get("/products/:code", (req, res) => {
  const { code } = req.params;
  const product = products.find((p) => p.code === code);
  if (!product)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  res.json(product);
});

// Sửa sản phẩm theo code
app.put("/products/:code", (req, res) => {
  const { code } = req.params;
  const product = products.find((p) => p.code === code);
  if (!product)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  const { name, quantity, price } = req.body;
  product.name = name ?? product.name;
  product.quantity = quantity ?? product.quantity;
  product.price = price ?? product.price;
  res.json({ message: "Đã cập nhật sản phẩm", product });
});

// Xoá sản phẩm theo code
app.delete("/products/:code", (req, res) => {
  const { code } = req.params;
  const index = products.findIndex((p) => p.code === code);
  if (index === -1)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
  products.splice(index, 1);
  res.json({ message: "Đã xoá sản phẩm" });
});

// Tìm kiếm theo tên hoặc mã
app.get("/products/search", (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ message: "Thiếu từ khóa tìm kiếm (q)." });
  }
  const keyword = q.toLowerCase();
  const results = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(keyword) ||
      p.code?.toLowerCase().includes(keyword)
  );
  if (results.length === 0) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm phù hợp." });
  }
  res.json(results);
});

// ======================= CART & CHECKOUT =======================
let cart = []; // đổi từ const -> let để có thể gán lại khi checkout

// Thêm sản phẩm vào giỏ hàng
app.post("/cart", (req, res) => {
  const { name, price, quantity } = req.body;
  if (!name || !price || !quantity) {
    return res.status(400).json({ message: "Thiếu thông tin sản phẩm" });
  }
  // Kiểm tra nếu sản phẩm đã có trong giỏ thì cộng thêm số lượng
  const existingItem = cart.find((item) => item.name === name && item.price === price);
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.subtotal = existingItem.price * existingItem.quantity;
  } else {
    cart.push({ name, price, quantity, subtotal: price * quantity });
  }
  res.status(201).json({ message: "Đã thêm sản phẩm vào giỏ hàng", cart });
});

// Xem giỏ hàng
app.get("/cart", (req, res) => {
  let total = 0;
  const cartDetails = cart.map((item) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    return {
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: itemTotal,
    };
  });
  res.json({ items: cartDetails, grandTotal: total });
});

// Xoá sản phẩm khỏi giỏ hàng theo tên
app.delete("/cart", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Thiếu tên sản phẩm để xoá" });
  }
  const index = cart.findIndex((item) => item.name === name);
  if (index === -1) {
    return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
  }
  cart.splice(index, 1);
  res.json({ message: `Đã xoá sản phẩm '${name}' khỏi giỏ hàng` });
});

// Thanh toán
app.post("/checkout", (req, res) => {
  const order = { id: orders.length + 1, items: [...cart] };
  orders.push(order);
  cart = []; // bây giờ hợp lệ vì cart là let
  res.json({ message: "Thanh toán thành công", order });
});

// ======================= SHIFTS =======================
// Mở ca
app.post("/shift/open", (req, res) => {
  const shift = { id: shifts.length + 1, ...req.body, openedAt: new Date() };
  shifts.push(shift);
  res.json({ message: "Ca làm việc đã mở", shift });
});

// Đóng ca
app.post("/shift/close", (req, res) => {
  const shift = shifts.find((s) => s.cashierId === req.body.cashierId && !s.closedAt);
  if (shift) {
    shift.closedAt = new Date();
    shift.closingCash = req.body.closingCash;
    shift.expectedCash = req.body.expectedCash;
    shift.explanation = req.body.explanation;
    res.json({ message: "Ca đã kết thúc", shift });
  } else res.status(404).json({ message: "Không tìm thấy ca đang mở" });
});

// Trạng thái ca
app.get("/shift/status", (req, res) => {
  const shift = shifts.find((s) => s.cashierId === req.query.cashierId && !s.closedAt);
  shift ? res.json({ status: "Đang mở", shift }) : res.json({ status: "Không có ca đang mở" });
});

// ======================= ORDERS =======================
app.post("/orders", (req, res) => {
  const order = { id: orders.length + 1, ...req.body, createdAt: new Date() };
  orders.push(order);
  res.status(201).json(order);
});

app.get("/orders/:id", (req, res) => {
  const order = orders.find((o) => o.id == req.params.id);
  order ? res.json(order) : res.status(404).json({ message: "Không tìm thấy đơn hàng" });
});

// ======================= ORDER ITEM =======================
app.post("/order-item", (req, res) => {
  const { productCode, quantity, note } = req.body;
  // Tìm sản phẩm theo mã vạch
  const product = products.find((p) => p.code === productCode);
  if (!product) {
    return res.status(404).json({ message: "Mã vạch không tồn tại. Vui lòng nhập thủ công." });
  }
  if (product.quantity < quantity) {
    return res.status(400).json({ message: "Tồn kho không đủ. Không thể thêm vào đơn." });
  }
  if (product.price === 0) {
    return res.status(400).json({ message: "Không được bán sản phẩm có giá bằng 0." });
  }
  // Trừ tồn kho
  product.quantity -= quantity;
  // Thêm vào giỏ hàng
  cart.push({
    productCode,
    name: product.name,
    price: product.price,
    quantity,
    note,
    subtotal: product.price * quantity,
  });
  // Tính tổng tiền tạm tính
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  res.json({
    message: "Đã thêm vào giỏ hàng",
    item: { productCode, name: product.name, quantity, note },
    total,
  });
});

// ======================= INVOICES =======================
// Khởi tạo dữ liệu hoá đơn
let invoices = [];
let invoiceIdCounter = 1;

// Tạo hoá đơn nhập
app.post("/invoices/in", (req, res) => {
  const { partnerId, items, date, type = "in" } = req.body;
  if (!date) return res.status(400).json({ message: "Thiếu ngày xuất hoá đơn" });
  const newInvoice = {
    id: invoiceIdCounter++,
    partnerId,
    date,
    items: (items || []).map((item) => ({
      ...item,
      status: "pending",
      received: false,
    })),
    type,
    approved: false,
    canceled: false,
    received: false,
  };
  invoices.push(newInvoice);
  res.status(201).json({ message: "Đã tạo hoá đơn nhập", invoice: newInvoice });
});

// Tạo hoá đơn xuất
app.post("/invoices/out", (req, res) => {
  const { partnerId, items, date, type = "out" } = req.body;
  if (!date) return res.status(400).json({ message: "Thiếu ngày xuất hoá đơn" });
  const newInvoice = {
    id: invoiceIdCounter++,
    partnerId,
    date,
    items: (items || []).map((item) => ({
      ...item,
      status: "pending",
      received: false,
    })),
    type,
    approved: false,
    canceled: false,
    received: false,
  };
  invoices.push(newInvoice);
  res.status(201).json({ message: "Đã tạo hoá đơn xuất", invoice: newInvoice });
});

// Lấy danh sách tất cả hoá đơn
app.get("/invoices", (req, res) => {
  res.json(invoices);
});

// Lấy hoá đơn theo ID
app.get("/invoices/:id", (req, res) => {
  const invoice = invoices.find((inv) => inv.id == req.params.id);
  if (!invoice) return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
  res.json(invoice);
});

// Lọc hoá đơn theo loại
app.get("/invoices/type/:type", (req, res) => {
  const filtered = invoices.filter((inv) => inv.type === req.params.type);
  res.json(filtered);
});

// Lọc hoá đơn theo đối tác
app.get("/invoices/partner/:partnerId", (req, res) => {
  const filtered = invoices.filter((inv) => inv.partnerId === req.params.partnerId);
  res.json(filtered);
});

// Phê duyệt hoá đơn
app.post("/invoices/:id/approve", (req, res) => {
  const invoice = invoices.find((inv) => inv.id == req.params.id);
  if (!invoice) return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
  invoice.approved = true;
  res.json({ message: "Đã phê duyệt hoá đơn", invoice });
});

// Huỷ hoá đơn
app.post("/invoices/:id/cancel", (req, res) => {
  const invoice = invoices.find((inv) => inv.id == req.params.id);
  if (!invoice) return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
  invoice.canceled = true;
  res.json({ message: "Đã huỷ hoá đơn", invoice });
});

// Xác nhận hàng về cho toàn bộ hoá đơn
app.post("/invoices/:id/receive", (req, res) => {
  const invoice = invoices.find((inv) => inv.id == req.params.id);
  if (!invoice) return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
  invoice.items.forEach((item) => (item.received = true));
  invoice.received = true;
  res.json({ message: "Đã xác nhận hàng về cho hoá đơn", invoice });
});

// Cập nhật trạng thái từng sản phẩm trong hoá đơn
app.post("/invoices/items/:itemId/status", (req, res) => {
  const { status } = req.body;
  for (const invoice of invoices) {
    const item = invoice.items.find((i) => i.itemId == req.params.itemId);
    if (item) {
      item.status = status;
      return res.json({ message: "Đã cập nhật trạng thái sản phẩm", item });
    }
  }
  res.status(404).json({ message: "Không tìm thấy sản phẩm" });
});

// Xác nhận hàng về cho từng sản phẩm
app.post("/invoices/items/:itemId/receive", (req, res) => {
  for (const invoice of invoices) {
    const item = invoice.items.find((i) => i.itemId == req.params.itemId);
    if (item) {
      item.received = true;
      return res.json({ message: "Đã xác nhận hàng về cho sản phẩm", item });
    }
  }
  res.status(404).json({ message: "Không tìm thấy sản phẩm" });
});

// Cập nhật thông tin hoá đơn
app.put("/invoices/:id", (req, res) => {
  const invoice = invoices.find((inv) => inv.id == req.params.id);
  if (!invoice) return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
  const { partnerId, items, type, date } = req.body;
  invoice.partnerId = partnerId ?? invoice.partnerId;
  invoice.items = items ?? invoice.items;
  invoice.type = type ?? invoice.type;
  invoice.date = date ?? invoice.date;
  res.json({ message: "Đã cập nhật hoá đơn", invoice });
});

// Xoá hoá đơn
app.delete("/invoices/:id", (req, res) => {
  const index = invoices.findIndex((inv) => inv.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Không tìm thấy hoá đơn" });
  invoices.splice(index, 1);
  res.json({ message: "Đã xoá hoá đơn" });
});

// ======================= PARTNERS =======================
let partners = [];
let partnerIdCounter = 1;

// Tạo đối tác
app.post("/api/partners", (req, res) => {
  const { name, email, phone, address, type } = req.body;
  if (!name || !email || !phone || !address || type == null) {
    return res.status(400).json({ message: "Thiếu thông tin đối tác" });
  }
  const newPartner = { id: partnerIdCounter++, name, email, phone, address, type };
  partners.push(newPartner);
  res.status(201).json({ message: "Đã tạo đối tác", partner: newPartner });
});

// Danh sách đối tác
app.get("/api/partners", (req, res) => {
  res.json(partners);
});

// Chi tiết đối tác
app.get("/api/partners/:id", (req, res) => {
  const partner = partners.find((p) => p.id == req.params.id);
  if (!partner) return res.status(404).json({ message: "Không tìm thấy đối tác" });
  res.json(partner);
});

// Lọc đối tác theo loại
app.get("/api/partners/type/:type", (req, res) => {
  const filtered = partners.filter((p) => p.type == req.params.type);
  res.json(filtered);
});

// Xoá đối tác
app.delete("/api/partners/:id", (req, res) => {
  const index = partners.findIndex((p) => p.id == req.params.id);
  if (index === -1) return res.status(404).json({ message: "Không tìm thấy đối tác" });
  partners.splice(index, 1);
  res.json({ message: "Đã xoá đối tác" });
});

// ======================= STOCKS =======================
// Giả sử dữ liệu tồn kho có thêm ngày hết hạn và số lượng bán ra
let stocks = [
  {
    productId: "SP001",
    name: "Sách",
    quantity: 120,
    expiryDate: "2026-12-31",
    soldCount: 500,
  },
  {
    productId: "SP002",
    name: "Bút",
    quantity: 20,
    expiryDate: "2025-01-15",
    soldCount: 50,
  },
  {
    productId: "SP003",
    name: "Vở",
    quantity: 5,
    expiryDate: "2025-01-05",
    soldCount: 10,
  },
];

// Lấy tồn kho tất cả sản phẩm
app.get("/api/stocks", (req, res) => {
  res.json(stocks);
});

// Lấy tồn kho theo sản phẩm
app.get("/api/stocks/product/:productId", (req, res) => {
  const stock = stocks.find((s) => s.productId === req.params.productId);
  if (!stock)
    return res.status(404).json({ message: "Không tìm thấy sản phẩm trong kho" });
  res.json(stock);
});

// Báo cáo tình trạng sản phẩm
app.get("/api/stocks/report", (req, res) => {
  const today = new Date();
  const report = stocks.map((s) => {
    let status = [];
    // Kiểm tra số lượng
    if (s.quantity > 100) status.push("Còn thừa nhiều");
    else if (s.quantity <= 10) status.push("Còn ít");
    // Kiểm tra hạn sử dụng
    const expiry = new Date(s.expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) status.push("Sắp hết hạn");
    else status.push("Còn hạn");
    // Kiểm tra độ ưa chuộng
    if (s.soldCount >= 100) status.push("Được ưa chuộng hơn");
    else status.push("Ít được ưa chuộng hơn");
    return {
      productId: s.productId,
      name: s.name,
      quantity: s.quantity,
      expiryDate: s.expiryDate,
      soldCount: s.soldCount,
      status,
    };
  });
  res.json(report);
});



// ======================= SERVER =======================
app.listen(3000, () => console.log("Server chạy tại http://localhost:3000"));
