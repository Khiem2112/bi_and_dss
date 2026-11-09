import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultAirports = [
  { code: 'DAL', name: 'Dallas Love Field', city: 'Dallas', state: 'TX', x: 51, y: 67, lat: 32.8471, lng: -96.8518 },
  { code: 'ATL', name: 'Atlanta Hartsfield-Jackson', city: 'Atlanta', state: 'GA', x: 70, y: 66, lat: 33.6407, lng: -84.4277 },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', state: 'FL', x: 78, y: 73, lat: 28.4312, lng: -81.3081 },
  { code: 'DEN', name: 'Denver International', city: 'Denver', state: 'CO', x: 48, y: 42, lat: 39.8561, lng: -104.6737 },
  { code: 'LAS', name: 'Las Vegas McCarran', city: 'Las Vegas', state: 'NV', x: 30, y: 55, lat: 36.084, lng: -115.1537 },
  { code: 'BWI', name: 'Baltimore/Washington', city: 'Baltimore', state: 'MD', x: 79, y: 49, lat: 39.1754, lng: -76.6682 },
  { code: 'MDW', name: 'Chicago Midway', city: 'Chicago', state: 'IL', x: 62, y: 45, lat: 41.7868, lng: -87.7522 },
  { code: 'HOU', name: 'Houston Hobby', city: 'Houston', state: 'TX', x: 54, y: 73, lat: 29.6454, lng: -95.2789 },
  { code: 'PHX', name: 'Phoenix Sky Harbor', city: 'Phoenix', state: 'AZ', x: 32, y: 62, lat: 33.4342, lng: -112.008 },
];

let airportsList = defaultAirports;

try {
  const jsonPath = path.resolve(__dirname, '../public/mock-data/airports.json');
  if (fs.existsSync(jsonPath)) {
    const content = fs.readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(content);
    const loaded = Array.isArray(parsed) ? parsed : parsed.airports;
    if (Array.isArray(loaded) && loaded.length > 0) {
      airportsList = loaded;
    }
  }
} catch (err) {
  airportsList = defaultAirports;
}

export const airportMap = new Map(airportsList.map((a) => [a.code, a]));

export const getAirportLocation = (code) => {
  const existing = airportMap.get(code);
  if (existing) return existing;

  return {
    code,
    name: code,
    city: code,
    state: '',
    x: 50,
    y: 50,
    lat: 38.0,
    lng: -97.0,
  };
};

export default airportMap;
