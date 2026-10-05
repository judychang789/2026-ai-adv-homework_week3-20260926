const path = require('path');
const { test, expect } = require('@playwright/test');

require('dotenv').config();

const e2eEmail = process.env.E2E_EMAIL;
const e2ePassword = process.env.E2E_PASSWORD;

if (!e2eEmail || !e2ePassword) {
  throw new Error(
    'E2E_EMAIL 和 E2E_PASSWORD 必須設定在環境變數或 .env 檔案中。'
  );
}

test('customer completes ECPay WebATM payment and returns with a paid order', async ({ page }) => {
  test.slow();
  await page.goto('/login');
  await page.locator('input[type="email"]').first().fill(e2eEmail);
  await page.locator('input[type="password"]').first().fill(e2ePassword);
  await page.locator('form').getByRole('button', { name: '登入', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);

  // Clear only this development account's cart, then exercise all user-facing steps.
  await page.evaluate(async () => {
    const token = localStorage.getItem('flower_token');
    const headers = { Authorization: 'Bearer ' + token, 'X-Session-Id': crypto.randomUUID() };
    const response = await fetch('/api/cart', { headers });
    const body = await response.json();
    for (const item of body.data.items) {
      await fetch('/api/cart/' + item.id, { method: 'DELETE', headers });
    }
  });
  await page.reload();

  await page.getByRole('button', { name: '加入購物車' }).first().click();
  await expect(page.getByText('已加入購物車')).toBeVisible();
  await page.getByRole('link', { name: /購物車/ }).click();
  await expect(page.getByRole('heading', { name: '購物車' })).toBeVisible();
  await page.getByRole('button', { name: '前往結帳' }).click();

  await page.locator('input[placeholder="請輸入收件人姓名"]').fill('E2E 測試收件人');
  await page.locator('input[placeholder="請輸入 Email"]').fill('e2e@example.com');
  await page.locator('input[placeholder="請輸入收件地址"]').fill('台北市測試路 123 號');
  await page.locator('select').selectOption('home_delivery');
  await page.getByText('偏遠地區（加收 NT$ 200）').click();
  await page.getByText('當日急件（加收 NT$ 250）').click();
  await page.getByRole('button', { name: '確認送出訂單' }).click();

  await page.waitForURL(/payment-stage\.ecpay\.com\.tw/i, { timeout: 60000 });
  await page.getByText(/網路\s*ATM/i).first().click();
  await page.locator('select').filter({
    has: page.locator('option[value="10001@2010@WebATM_LAND"]')
  }).selectOption('10001@2010@WebATM_LAND');

  await page.getByRole('link', { name: /前往付款/ }).click();
  await page.getByRole('button', { name: '關閉', exact: true }).click();

  const save = page.getByRole('button', { name: 'Save', exact: true })
    .or(page.locator('input[type="submit"][value="Save"]'));
  await expect(save).toBeVisible({ timeout: 60000 });
  await save.click();

  await expect(page.getByText(/付款成功/).first()).toBeVisible({ timeout: 60000 });
  await page.getByRole('link', { name: /返回商店/ })
    .or(page.getByRole('button', { name: /返回商店/ })).click();

  await page.waitForURL(/localhost:3001\/orders\//, { timeout: 60000 });
  const paidBadge = page.getByText('已付款', { exact: true });
  if (!(await paidBadge.isVisible().catch(() => false))) {
    const checkButton = page.getByRole('button', { name: '查詢付款狀態' });
    if (await checkButton.isVisible().catch(() => false)) await checkButton.click();
  }
  await expect(paidBadge).toBeVisible({ timeout: 60000 });

  const orderId = new URL(page.url()).pathname.split('/').pop();
  const persistedStatus = await page.evaluate(async (id) => {
    const response = await fetch('/api/orders/' + id, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('flower_token'),
        'X-Session-Id': localStorage.getItem('flower_session_id'),
      },
    });
    return (await response.json()).data.status;
  }, orderId);
  expect(persistedStatus).toBe('paid');

  await page.screenshot({
    path: path.join('docs', 'screenshots', 'ecpay-payment-success.png'),
    fullPage: true,
  });
});
