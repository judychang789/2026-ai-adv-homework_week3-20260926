process.env.JWT_SECRET = 'flower-shop-test-only-secret-not-for-production';


 const fs = require('fs');
const os = require('os');
const path = require('path');

const testDatabasePath = path.join(
  os.tmpdir(),
  `flower-shop-api-test-${process.pid}.sqlite`
);

const databaseFiles = [
  testDatabasePath,
  `${testDatabasePath}-wal`,
  `${testDatabasePath}-shm`,
];

for (const file of databaseFiles) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

process.env.DATABASE_PATH = testDatabasePath;

afterAll(() => {
  for (const file of databaseFiles) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});
