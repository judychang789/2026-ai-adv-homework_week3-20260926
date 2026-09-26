const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const testDatabasePath = path.join(os.tmpdir(), `flower-shop-integration-${process.pid}-${Date.now()}.sqlite`);
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-test-secret';
process.env.DATABASE_PATH = testDatabasePath;

const request = require('supertest');
const app = require('../../app');
const db = require('../../src/database');
const PRODUCT = { id: 'integration-product', name: '整合測試花束', price: 700, stock: 10 };

function resetDatabase() {
  db.exec(`DELETE FROM order_items; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM products; DELETE FROM users;`);
  db.prepare(`INSERT INTO products (id, name, description, price, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?)`).run(PRODUCT.id, PRODUCT.name, 'Integration test product', PRODUCT.price, PRODUCT.stock, null);
}

async function register() {
  const response = await request(app).post('/api/auth/register').send({
    email: `integration-${uuidv4()}@example.com`, password: 'password123', name: '整合測試會員',
  });
  expect(response.status).toBe(201);
  expect(response.body).toMatchObject({
    error: null, message: expect.any(String),
    data: { token: expect.any(String), user: { email: expect.any(String), role: 'user' } },
  });
  return response.body.data;
}

describe('Order creation integration flow', () => {
  beforeEach(resetDatabase);
  afterAll(() => {
    db.close();
    for (const suffix of ['', '-shm', '-wal']) {
      const file = testDatabasePath + suffix;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it('writes a complete shipped order, deducts stock, and clears the cart', async () => {
    const { token, user } = await register();
    const auth = { Authorization: `Bearer ${token}` };
    const productsResponse = await request(app).get('/api/products');
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.body).toMatchObject({ error: null, data: { products: expect.any(Array) } });
    const product = productsResponse.body.data.products.find((item) => item.id === PRODUCT.id);
    expect(product).toMatchObject({ price: 700, stock: 10 });

    const addResponse = await request(app).post('/api/cart').set(auth).send({ productId: product.id, quantity: 2 });
    expect(addResponse.status).toBe(200);
    expect(addResponse.body).toMatchObject({ error: null, data: { product_id: PRODUCT.id, quantity: 2 } });

    const orderResponse = await request(app).post('/api/orders').set(auth).send({
      recipientName: '測試收件人', recipientEmail: 'recipient@example.com',
      recipientAddress: '台北市測試路 123 號', shippingMethod: 'home_delivery',
      isRemoteArea: true, isSameDay: true,
    });
    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body).toMatchObject({
      error: null, message: '訂單建立成功',
      data: {
        id: expect.any(String), subtotal_amount: 1400, shipping_fee: 570,
        shipping_method: 'home_delivery', is_remote_area: true, is_same_day: true,
        total_amount: 1970, status: 'pending',
      },
    });

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderResponse.body.data.id);
    expect(order).toMatchObject({
      user_id: user.id, subtotal_amount: 1400, shipping_fee: 570, total_amount: 1970,
      shipping_method: 'home_delivery', is_remote_area: 1, is_same_day: 1,
    });
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      product_id: PRODUCT.id, product_name: PRODUCT.name, product_price: 700, quantity: 2,
    });
    expect(db.prepare('SELECT stock FROM products WHERE id = ?').get(PRODUCT.id).stock).toBe(8);
    expect(db.prepare('SELECT COUNT(*) count FROM cart_items WHERE user_id = ?').get(user.id).count).toBe(0);
  });

  it('leaves no partial order and does not deduct stock when creation fails', async () => {
    const { token, user } = await register();
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).post('/api/cart').set(auth)
      .send({ productId: PRODUCT.id, quantity: 2 })).status).toBe(200);
    db.prepare('UPDATE products SET stock = 1 WHERE id = ?').run(PRODUCT.id);

    const response = await request(app).post('/api/orders').set(auth).send({
      recipientName: '測試收件人', recipientEmail: 'recipient@example.com',
      recipientAddress: '台北市測試路 123 號', shippingMethod: 'convenience_store',
      isRemoteArea: false, isSameDay: false,
    });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ data: null, error: 'STOCK_INSUFFICIENT', message: expect.any(String) });
    expect(db.prepare('SELECT COUNT(*) count FROM orders').get().count).toBe(0);
    expect(db.prepare('SELECT COUNT(*) count FROM order_items').get().count).toBe(0);
    expect(db.prepare('SELECT stock FROM products WHERE id = ?').get(PRODUCT.id).stock).toBe(1);
    expect(db.prepare('SELECT quantity FROM cart_items WHERE user_id = ?').get(user.id)).toEqual({ quantity: 2 });
  });
});
