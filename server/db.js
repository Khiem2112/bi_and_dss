import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nap bien moi truong tu file etl/.env hoac .env cuc bo
const envCandidates = [
  path.resolve(__dirname, '../../etl/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const p of envCandidates) {
  const result = dotenv.config({ path: p });
  if (!result.error && process.env.MOTHERDUCK_TOKEN) {
    break;
  }
}

const token = process.env.MOTHERDUCK_TOKEN || '';
const rawConnStr = process.env.MOTHERDUCK_CONNECTION_STRING || 'md:my_db';

// Trich xuat ten database tu chuoi ket noi md:my_db
let databaseName = 'my_db';
if (rawConnStr.startsWith('md:')) {
  const cleaned = rawConnStr.replace('md:', '').split('?')[0];
  if (cleaned.length > 0) {
    databaseName = cleaned;
  }
}

// Giai ma JWT token de xac dinh dung region cua MotherDuck
let regionHost = 'pg.ap-northeast-1-aws.motherduck.com';
if (token && token.includes('.')) {
  try {
    const parts = token.split('.');
    const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    if (payload.mdRegion) {
      let reg = payload.mdRegion;
      if (reg.startsWith('aws-')) {
        reg = reg.replace('aws-', '');
      }
      regionHost = `pg.${reg}-aws.motherduck.com`;
    }
  } catch (err) {
    // Giu nguyen region mac dinh neu loi giai ma
  }
}

const pool = new Pool({
  host: regionHost,
  database: databaseName,
  user: 'motherduck',
  password: token,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

export const query = async (text, params = []) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
};

export const getDbMetadata = () => ({
  host: regionHost,
  database: databaseName,
  hasToken: Boolean(token),
});

export default pool;

