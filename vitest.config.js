import { configDefaults, defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
setupFiles: ['./tests/setup-test-db.js'],
exclude: [...configDefaults.exclude, 'e2e/**'],
    fileParallelism: false,
    sequence: {
      files: [
        'src/test/shipping.test.js',
        'tests/auth.test.js',
        'tests/products.test.js',
        'tests/cart.test.js',
        'tests/orders.test.js',
        'tests/adminProducts.test.js',
        'tests/adminOrders.test.js',
      ],
    },
    hookTimeout: 10000,
  },
});
