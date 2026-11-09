import express from 'express';
import cors from 'cors';
import apiRoutes from './routes.js';
import { getDbMetadata } from './db.js';

import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;

// Cau hinh middleware CORS va xu ly JSON body
app.use(cors());
app.use(express.json());

// Dang ky cac endpoint REST API
app.use('/api', apiRoutes);

// Kiem tra cong lang nghe va ket noi MotherDuck khi chay truc tiep
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  app.listen(PORT, () => {
    const meta = getDbMetadata();
    console.log(`Backend Express dang hoat dong tai http://localhost:${PORT}`);
    console.log(`Kho du lieu MotherDuck: ${meta.database} tren ${meta.host}`);
  });
}

export default app;
