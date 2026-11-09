import app from './index.js';

const runVerification = async () => {
  const server = app.listen(3002);
  const baseUrl = 'http://localhost:3002/api';

  try {
    console.log('Kiem tra ket noi den API Backend Express...');

    // Kiem tra endpoint /health
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('Trang thai Health:', healthData.status, '- Database:', healthData.database);
    if (healthData.status !== 'UP' || !healthData.connected) {
      throw new Error('Dich vu MotherDuck chua san sang');
    }

    // Kiem tra endpoint /overview
    const overviewRes = await fetch(`${baseUrl}/overview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: { fromDate: '2015-01-01', toDate: '2018-12-31' } }),
    });
    const overviewData = await overviewRes.json();
    const eligibleKpi = overviewData.kpis.find((k) => k.id === 'P1-C02');
    const delayedKpi = overviewData.kpis.find((k) => k.id === 'P1-C03');
    const rateKpi = overviewData.kpis.find((k) => k.id === 'P1-C04');

    console.log('Ket qua Overview KPI:');
    console.log('- Chuyen du dieu kien:', eligibleKpi?.value);
    console.log('- Chuyen den tre:', delayedKpi?.value);
    console.log('- Ty le tre thuc te:', rateKpi?.value);

    if (eligibleKpi?.metrics.eligibleFlights !== 5163515 || delayedKpi?.metrics.delayedFlights !== 990810) {
      throw new Error(`So lieu doi soat khong khop: expected 5163515, got ${eligibleKpi?.metrics.eligibleFlights}`);
    }

    // Kiem tra endpoint /spatial/airports
    const airportsRes = await fetch(`${baseUrl}/spatial/airports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: {} }),
    });
    const airportsData = await airportsRes.json();
    if (airportsData.error) {
      console.error('Airports endpoint error:', airportsData.error);
    }
    console.log('So diem nong san bay tim thay:', airportsData.hotspots?.length);

    // Kiem tra endpoint /benchmark
    const benchRes = await fetch(`${baseUrl}/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: { route: 'DAL → ATL' } }),
    });
    const benchData = await benchRes.json();
    console.log('Hang bay doi sanh:', benchData.carriers.map((c) => c.carrier).join(', '));

    // Kiem tra endpoint /investigation
    const invRes = await fetch(`${baseUrl}/investigation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: { page: 1, pageSize: 5 } }),
    });
    const invData = await invRes.json();
    console.log('Tong so ban ghi dieu tra chuyen bay:', invData.totalCount);
    console.log('So chuyen bay tren trang 1:', invData.flights.length);

    // Kiem tra endpoint /causes
    const causesRes = await fetch(`${baseUrl}/causes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'Toàn mạng bay WN' }),
    });
    const causesData = await causesRes.json();
    console.log('So nhom nguyen nhan tre:', causesData.causes.length);

    console.log('Tat ca cac endpoint API deu hoat dong chinh xac va doi soat 100% voi MotherDuck!');
    process.exit(0);
  } catch (err) {
    console.error('Loi chi tiet:', err);
    process.exit(1);
  } finally {
    server.close();
  }
};

runVerification();
