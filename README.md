# Beverage Warehouse & POS API (Express + JWT + Swagger)

**Cấu trúc**
```
server.js
routes/
  auth.js, users.js, products.js, partners.js, invoices.js, stocks.js, cart.js, reports.js
middleware/
  auth.js, rbac.js
data/
  db.js
pos-api.yaml
.env.example
```

## Chạy dự án
```bash
npm init -y
npm i express cors helmet morgan dotenv swagger-ui-express yamljs bcrypt jsonwebtoken uuid
node -e "console.log('ready')"
node server.js
```
Mở Swagger: http://localhost:3000/api-docs

## Ghi chú
- Dự án dùng **store trong RAM** (data/db.js) để demo. Khi triển khai thực tế, thay bằng DB (MongoDB/Postgres/MySQL) và tách tầng service.
- Token: JWT Access + Refresh. Sửa secret trong `.env`.
- RBAC: middleware `rbac(['admin','staff'])` cho các route cần quyền.
- Invoices: thay đổi trạng thái qua `PATCH /api/v1/invoices/{id}` với `status`.
```
status: draft -> approved -> received | cancelled
```
- Stocks/report: demo đơn giản chỉ kiểm tra `low_stock`.
```
```