# Shipping 配送費用功能

## 狀態

✅ 已完成

## User Story

身為花卉電商的顧客，我希望在結帳時選擇配送方式與附加配送條件，並在建立訂單前清楚看到正確的運費及訂單總額。

身為開發者，我希望配送費用規則集中在可獨立測試的模組中，避免 API、前端或其他流程各自維護不同的計算邏輯。

## 配送規則

| 條件 | 費用 |
|------|------|
| 宅配基本運費 | NT$ 120 |
| 超商取貨 | NT$ 60 |
| 商品小計滿 NT$ 1,500 | 免除宅配基本運費 |
| 偏遠地區 | 加收 NT$ 200 |
| 當日急件 | 加收 NT$ 250 |

### 規則說明

- 滿額免運只免除宅配基本運費。
- 超商取貨 60 元是獨立配送費，不適用宅配滿額免運門檻。
- 偏遠地區與當日急件屬附加費，可同時累加。
- 即使商品小計達到免運門檻，附加費仍須收取。
- 訂單總額計算方式：`total_amount = subtotal_amount + shipping_fee`。

## 技術設計

### Shipping 模組

檔案：`src/utils/shipping.js`

Shipping 模組不依賴 Express 或資料庫，提供：

- `SHIPPING_METHODS`：配送方式常數。
- `SHIPPING_RATES`：基本運費、免運門檻及附加費常數。
- `calculateShipping(options)`：計算基本費、附加費、總運費及訂單總額。

輸入：

```javascript
{
  subtotal: 1499,
  shippingMethod: 'home_delivery',
  isRemoteArea: false,
  isSameDay: false
}
```

輸出：

```javascript
{
  shippingMethod: 'home_delivery',
  baseFee: 120,
  remoteAreaSurcharge: 0,
  sameDaySurcharge: 0,
  shippingFee: 120,
  totalAmount: 1619
}
```

## API 異動

### POST /api/orders

新增 Request Body 欄位：

| 欄位 | 型別 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `shippingMethod` | string | 否 | `home_delivery` | `home_delivery` 或 `convenience_store` |
| `isRemoteArea` | boolean | 否 | `false` | 是否為偏遠地區 |
| `isSameDay` | boolean | 否 | `false` | 是否為當日急件 |

新增 Response 欄位：

| 欄位 | 說明 |
|------|------|
| `subtotal_amount` | 商品小計 |
| `shipping_fee` | 基本配送費及附加費合計 |
| `shipping_method` | 配送方式 |
| `is_remote_area` | 是否為偏遠地區 |
| `is_same_day` | 是否為當日急件 |
| `total_amount` | 商品小計加運費的訂單總額 |

OpenAPI 規格已同步至 `openapi.json`。

## 資料庫異動

`orders` 新增以下欄位：

| 欄位 | 型別 | 預設值 |
|------|------|--------|
| `subtotal_amount` | INTEGER | 0 |
| `shipping_fee` | INTEGER | 0 |
| `shipping_method` | TEXT | `home_delivery` |
| `is_remote_area` | INTEGER | 0 |
| `is_same_day` | INTEGER | 0 |

既有訂單遷移時，原本的 `total_amount` 會回填至 `subtotal_amount`，`shipping_fee` 維持 0。

## 前端異動

- 結帳頁新增宅配／超商取貨選擇。
- 結帳頁新增偏遠地區及當日急件選項。
- 訂單摘要即時計算商品小計、運費及總額。
- 購物車、首頁及商品頁更新為 NT$ 1,500 的宅配免基本運費門檻。

## 測試

測試檔案：`src/test/shipping.test.js`

涵蓋：

1. 宅配基本運費。
2. 超商取貨費用。
3. 商品小計 NT$ 1,499。
4. 商品小計 NT$ 1,500 免宅配基本運費。
5. 偏遠地區附加費。
6. 當日急件附加費。
7. 多項附加費同時成立。
8. 滿額免運與附加費同時成立。

訂單 API 測試亦驗證：

- 回應包含商品小計、運費及配送方式。
- `total_amount` 等於 `subtotal_amount + shipping_fee`。

## 完成清單

- [x] 建立獨立 Shipping 模組
- [x] 整合建立訂單流程
- [x] 保存配送條件、商品小計及運費
- [x] API 回傳正確運費與訂單總額
- [x] 更新結帳及購物車介面
- [x] 新增 8 種 Shipping 單元測試
- [x] 更新 `docs` 文件
- [x] 更新 `openapi.json`
