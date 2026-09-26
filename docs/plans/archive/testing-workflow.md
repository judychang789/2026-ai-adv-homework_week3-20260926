# 完整測試流程

## 狀態

✅ Unit、Integration、E2E 與 Postman 產生流程均已完成並驗證。

## 交付項目

- `vitest.unit.config.js`
- `vitest.integration.config.js`
- `tests/integration/order.integration.test.js`
- `playwright.config.js`
- `e2e/ecpay-payment.e2e.test.js`
- `scripts/generate-postman.js`
- `postman_collection.json`

## 資料庫隔離

`src/database.js` 支援 `DATABASE_PATH`。未設定時仍使用原有 `database.sqlite`；Integration Test 指定暫存 SQLite 並於結束後清除。

## 驗證範圍

Integration Test 驗證登入／註冊、商品、購物車、訂單與品項寫入、配送費、總額、庫存扣除、購物車清空，以及失敗時交易完整性。

E2E Test 驗證登入、加入購物車、配送結帳、綠界網路 ATM／台灣土地銀行測試付款、返回站點、UI 顯示「已付款」、API 狀態 `paid` 與成功截圖。

Postman Collection 驗證有效 JSON、三個 Collection 變數、登入自動保存 JWT，以及受保護 API 的 Bearer Token。

## E2E 執行結果

綠界 WebATM／台灣土地銀行付款成功，返回商店後 UI 顯示「已付款」，API 狀態為 `paid`。成功截圖：`docs/screenshots/ecpay-payment-success.png`。
