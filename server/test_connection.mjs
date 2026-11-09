import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const require = createRequire(import.meta.url);
const duckdb = require('duckdb');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tim va nap bien moi truong tu cac vi tri kha thi
const envPaths = [
  path.resolve(__dirname, '../../etl/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env')
];

let loaded = false;
for (const p of envPaths) {
  const result = dotenv.config({ path: p });
  if (!result.error && process.env.MOTHERDUCK_TOKEN) {
    console.log('Da nap cau hinh tu:', p);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.error('Khong tim thay file .env chua MOTHERDUCK_TOKEN');
  process.exit(1);
}

const token = process.env.MOTHERDUCK_TOKEN;
const rawConnStr = process.env.MOTHERDUCK_CONNECTION_STRING || 'md:my_db';
const connStr = rawConnStr.includes('motherduck_token=')
  ? rawConnStr
  : `${rawConnStr}${rawConnStr.includes('?') ? '&' : '?'}motherduck_token=${token}`;

console.log('Dang ket noi den MotherDuck...');
const db = new duckdb.Database(connStr, { read_only: 'true' });
const con = db.connect();

con.all('SELECT 1 AS test_val', (err, rows) => {
  if (err) {
    console.error('Loi ket noi MotherDuck:', err.message);
    process.exit(1);
  }
  console.log('Ket noi thanh cong den MotherDuck. Gia tri kiem tra:', rows[0].test_val);

  con.all(`
    SELECT
      COUNT(*) AS total_records,
      SUM(eligible_flights) AS total_eligible,
      SUM(delayed_flights) AS total_delayed
    FROM mart_base
  `, (err2, rows2) => {
    if (err2) {
      console.error('Loi truy van mart_base:', err2.message);
      process.exit(1);
    }
    console.log('Ket qua doi soat tren mart_base:');
    console.log('Tong so dong mart_base:', rows2[0].total_records);
    console.log('Tong chuyen du dieu kien:', rows2[0].total_eligible);
    console.log('Tong chuyen tre:', rows2[0].total_delayed);
    process.exit(0);
  });
});

