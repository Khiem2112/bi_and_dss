export const US_AIRPORTS = [
  // Northeast (Dong Bac)
  { code: 'BOS', name: 'Boston Logan International', city: 'Boston', state: 'MA', region: 'Northeast', x: 88, y: 34, lat: 42.3656, lng: -71.0096, isMajor: false },
  { code: 'BWI', name: 'Baltimore/Washington International', city: 'Baltimore', state: 'MD', region: 'Northeast', x: 80, y: 46, lat: 39.1754, lng: -76.6682, isMajor: true },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', state: 'DC', region: 'Northeast', x: 79, y: 47, lat: 38.8512, lng: -77.0402, isMajor: false },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Dulles', state: 'VA', region: 'Northeast', x: 78, y: 46, lat: 38.9531, lng: -77.4565, isMajor: false },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', state: 'NJ', region: 'Northeast', x: 83, y: 41, lat: 40.6895, lng: -74.1745, isMajor: false },
  { code: 'LGA', name: 'LaGuardia', city: 'New York', state: 'NY', region: 'Northeast', x: 84, y: 41, lat: 40.7769, lng: -73.8740, isMajor: false },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', state: 'NY', region: 'Northeast', x: 84, y: 42, lat: 40.6413, lng: -73.7781, isMajor: false },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', state: 'PA', region: 'Northeast', x: 82, y: 44, lat: 39.8744, lng: -75.2424, isMajor: false },
  { code: 'PIT', name: 'Pittsburgh International', city: 'Pittsburgh', state: 'PA', region: 'Northeast', x: 75, y: 44, lat: 40.4915, lng: -80.2329, isMajor: false },
  { code: 'ALB', name: 'Albany International', city: 'Albany', state: 'NY', region: 'Northeast', x: 83, y: 36, lat: 42.7483, lng: -73.8017, isMajor: false },
  { code: 'BDL', name: 'Bradley International', city: 'Hartford', state: 'CT', region: 'Northeast', x: 85, y: 38, lat: 41.9389, lng: -72.6832, isMajor: false },
  { code: 'BUF', name: 'Buffalo Niagara International', city: 'Buffalo', state: 'NY', region: 'Northeast', x: 76, y: 37, lat: 42.9405, lng: -78.7322, isMajor: false },
  { code: 'ISP', name: 'Long Island MacArthur', city: 'Islip', state: 'NY', region: 'Northeast', x: 85, y: 42, lat: 40.7952, lng: -73.1002, isMajor: false },
  { code: 'MHT', name: 'Manchester-Boston Regional', city: 'Manchester', state: 'NH', region: 'Northeast', x: 87, y: 33, lat: 42.9345, lng: -71.4371, isMajor: false },
  { code: 'PVD', name: 'Rhode Island T.F. Green', city: 'Providence', state: 'RI', region: 'Northeast', x: 87, y: 38, lat: 41.7240, lng: -71.4282, isMajor: false },
  { code: 'PWM', name: 'Portland International Jetport', city: 'Portland', state: 'ME', region: 'Northeast', x: 89, y: 30, lat: 43.6462, lng: -70.3087, isMajor: false },
  { code: 'ROC', name: 'Greater Rochester International', city: 'Rochester', state: 'NY', region: 'Northeast', x: 79, y: 37, lat: 43.1189, lng: -77.6724, isMajor: false },

  // Southeast (Dong Nam)
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta', city: 'Atlanta', state: 'GA', region: 'Southeast', x: 70, y: 66, lat: 33.6407, lng: -84.4277, isMajor: true },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', state: 'FL', region: 'Southeast', x: 78, y: 75, lat: 28.4312, lng: -81.3081, isMajor: true },
  { code: 'TPA', name: 'Tampa International', city: 'Tampa', state: 'FL', region: 'Southeast', x: 75, y: 76, lat: 27.9755, lng: -82.5332, isMajor: true },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood', city: 'Fort Lauderdale', state: 'FL', region: 'Southeast', x: 80, y: 81, lat: 26.0742, lng: -80.1506, isMajor: true },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', state: 'TN', region: 'Southeast', x: 67, y: 58, lat: 36.1263, lng: -86.6774, isMajor: true },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', state: 'NC', region: 'Southeast', x: 75, y: 59, lat: 35.2144, lng: -80.9473, isMajor: false },
  { code: 'RDU', name: 'Raleigh-Durham International', city: 'Raleigh', state: 'NC', region: 'Southeast', x: 78, y: 56, lat: 35.8801, lng: -78.7880, isMajor: false },
  { code: 'BHM', name: 'Birmingham-Shuttlesworth', city: 'Birmingham', state: 'AL', region: 'Southeast', x: 67, y: 65, lat: 33.5629, lng: -86.7535, isMajor: false },
  { code: 'CHS', name: 'Charleston International', city: 'Charleston', state: 'SC', region: 'Southeast', x: 77, y: 65, lat: 32.8986, lng: -80.0405, isMajor: false },
  { code: 'CVG', name: 'Cincinnati/Northern Kentucky', city: 'Cincinnati', state: 'KY', region: 'Southeast', x: 69, y: 51, lat: 39.0461, lng: -84.6622, isMajor: false },
  { code: 'ECP', name: 'Northwest Florida Beaches', city: 'Panama City', state: 'FL', region: 'Southeast', x: 69, y: 73, lat: 30.3571, lng: -85.7954, isMajor: false },
  { code: 'GSP', name: 'Greenville-Spartanburg', city: 'Greer', state: 'SC', region: 'Southeast', x: 72, y: 61, lat: 34.9456, lng: -82.2189, isMajor: false },
  { code: 'JAX', name: 'Jacksonville International', city: 'Jacksonville', state: 'FL', region: 'Southeast', x: 76, y: 71, lat: 30.4941, lng: -81.6879, isMajor: false },
  { code: 'MEM', name: 'Memphis International', city: 'Memphis', state: 'TN', region: 'Southeast', x: 62, y: 62, lat: 35.0424, lng: -89.9767, isMajor: false },
  { code: 'ORF', name: 'Norfolk International', city: 'Norfolk', state: 'VA', region: 'Southeast', x: 80, y: 53, lat: 36.8946, lng: -76.2012, isMajor: false },
  { code: 'PBI', name: 'Palm Beach International', city: 'West Palm Beach', state: 'FL', region: 'Southeast', x: 80, y: 79, lat: 26.6832, lng: -80.0956, isMajor: false },
  { code: 'PNS', name: 'Pensacola International', city: 'Pensacola', state: 'FL', region: 'Southeast', x: 67, y: 73, lat: 30.4733, lng: -87.1874, isMajor: false },
  { code: 'RIC', name: 'Richmond International', city: 'Richmond', state: 'VA', region: 'Southeast', x: 79, y: 51, lat: 37.5052, lng: -77.3197, isMajor: false },
  { code: 'RSW', name: 'Southwest Florida International', city: 'Fort Myers', state: 'FL', region: 'Southeast', x: 77, y: 79, lat: 26.5362, lng: -81.7552, isMajor: false },
  { code: 'SDF', name: 'Louisville Muhammad Ali', city: 'Louisville', state: 'KY', region: 'Southeast', x: 67, y: 53, lat: 38.1744, lng: -85.7360, isMajor: false },
  { code: 'SJU', name: 'Luis Munoz Marin International', city: 'San Juan', state: 'PR', region: 'Southeast', x: 86, y: 86, lat: 18.4394, lng: -66.0018, isMajor: false },

  // Midwest (Trung Tay)
  { code: 'MDW', name: 'Chicago Midway International', city: 'Chicago', state: 'IL', region: 'Midwest', x: 62, y: 44, lat: 41.7868, lng: -87.7522, isMajor: true },
  { code: 'STL', name: 'St. Louis Lambert International', city: 'St. Louis', state: 'MO', region: 'Midwest', x: 58, y: 52, lat: 38.7476, lng: -90.3599, isMajor: true },
  { code: 'MCI', name: 'Kansas City International', city: 'Kansas City', state: 'MO', region: 'Midwest', x: 52, y: 50, lat: 39.2976, lng: -94.7139, isMajor: true },
  { code: 'MSP', name: 'Minneapolis-Saint Paul', city: 'Minneapolis', state: 'MN', region: 'Midwest', x: 54, y: 34, lat: 44.8848, lng: -93.2223, isMajor: false },
  { code: 'DTW', name: 'Detroit Metropolitan', city: 'Detroit', state: 'MI', region: 'Midwest', x: 69, y: 42, lat: 42.2162, lng: -83.3554, isMajor: false },
  { code: 'IND', name: 'Indianapolis International', city: 'Indianapolis', state: 'IN', region: 'Midwest', x: 64, y: 49, lat: 39.7173, lng: -86.2944, isMajor: false },
  { code: 'CLE', name: 'Cleveland Hopkins International', city: 'Cleveland', state: 'OH', region: 'Midwest', x: 72, y: 43, lat: 41.4109, lng: -81.8494, isMajor: false },
  { code: 'CMH', name: 'John Glenn Columbus', city: 'Columbus', state: 'OH', region: 'Midwest', x: 70, y: 47, lat: 39.9980, lng: -82.8919, isMajor: false },
  { code: 'MKE', name: 'Milwaukee Mitchell International', city: 'Milwaukee', state: 'WI', region: 'Midwest', x: 62, y: 40, lat: 42.9475, lng: -87.8966, isMajor: false },
  { code: 'OMA', name: 'Eppley Airfield', city: 'Omaha', state: 'NE', region: 'Midwest', x: 50, y: 44, lat: 41.3025, lng: -95.8942, isMajor: false },
  { code: 'DSM', name: 'Des Moines International', city: 'Des Moines', state: 'IA', region: 'Midwest', x: 54, y: 44, lat: 41.5340, lng: -93.6631, isMajor: false },
  { code: 'GRR', name: 'Gerald R. Ford International', city: 'Grand Rapids', state: 'MI', region: 'Midwest', x: 65, y: 40, lat: 42.8808, lng: -85.5228, isMajor: false },
  { code: 'CAK', name: 'Akron-Canton', city: 'Akron', state: 'OH', region: 'Midwest', x: 73, y: 45, lat: 40.9161, lng: -81.4422, isMajor: false },
  { code: 'DAY', name: 'Dayton International', city: 'Dayton', state: 'OH', region: 'Midwest', x: 68, y: 48, lat: 39.9024, lng: -84.2194, isMajor: false },
  { code: 'FNT', name: 'Bishop International', city: 'Flint', state: 'MI', region: 'Midwest', x: 68, y: 39, lat: 42.9654, lng: -83.7436, isMajor: false },

  // South / Texas (Nam & Texas)
  { code: 'DAL', name: 'Dallas Love Field', city: 'Dallas', state: 'TX', region: 'South', x: 51, y: 67, lat: 32.8471, lng: -96.8518, isMajor: true },
  { code: 'HOU', name: 'Houston Hobby', city: 'Houston', state: 'TX', region: 'South', x: 54, y: 73, lat: 29.6454, lng: -95.2789, isMajor: true },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', state: 'TX', region: 'South', x: 50, y: 71, lat: 30.1975, lng: -97.6664, isMajor: true },
  { code: 'SAT', name: 'San Antonio International', city: 'San Antonio', state: 'TX', region: 'South', x: 48, y: 73, lat: 29.5337, lng: -98.4698, isMajor: false },
  { code: 'MSY', name: 'Louis Armstrong New Orleans', city: 'New Orleans', state: 'LA', region: 'South', x: 61, y: 73, lat: 29.9934, lng: -90.2580, isMajor: false },
  { code: 'OKC', name: 'Will Rogers World', city: 'Oklahoma City', state: 'OK', region: 'South', x: 49, y: 60, lat: 35.3931, lng: -97.6007, isMajor: false },
  { code: 'TUL', name: 'Tulsa International', city: 'Tulsa', state: 'OK', region: 'South', x: 51, y: 58, lat: 36.1984, lng: -95.8881, isMajor: false },
  { code: 'ELP', name: 'El Paso International', city: 'El Paso', state: 'TX', region: 'South', x: 38, y: 68, lat: 31.8072, lng: -106.3776, isMajor: false },
  { code: 'LIT', name: 'Bill and Hillary Clinton National', city: 'Little Rock', state: 'AR', region: 'South', x: 58, y: 63, lat: 34.7294, lng: -92.2243, isMajor: false },
  { code: 'AMA', name: 'Rick Husband Amarillo', city: 'Amarillo', state: 'TX', region: 'South', x: 44, y: 60, lat: 35.2194, lng: -101.7059, isMajor: false },
  { code: 'LBB', name: 'Lubbock Preston Smith', city: 'Lubbock', state: 'TX', region: 'South', x: 44, y: 64, lat: 33.6636, lng: -101.8228, isMajor: false },
  { code: 'MAF', name: 'Midland International', city: 'Midland', state: 'TX', region: 'South', x: 43, y: 67, lat: 31.9425, lng: -102.2019, isMajor: false },
  { code: 'CRP', name: 'Corpus Christi International', city: 'Corpus Christi', state: 'TX', region: 'South', x: 50, y: 77, lat: 27.7704, lng: -97.5012, isMajor: false },
  { code: 'HRL', name: 'Valley International', city: 'Harlingen', state: 'TX', region: 'South', x: 50, y: 81, lat: 26.2285, lng: -97.6544, isMajor: false },

  // Mountain West (Mien Tay & Nui)
  { code: 'DEN', name: 'Denver International', city: 'Denver', state: 'CO', region: 'Mountain', x: 44, y: 46, lat: 39.8561, lng: -104.6737, isMajor: true },
  { code: 'PHX', name: 'Phoenix Sky Harbor', city: 'Phoenix', state: 'AZ', region: 'Mountain', x: 32, y: 62, lat: 33.4342, lng: -112.008, isMajor: true },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', state: 'NV', region: 'Mountain', x: 29, y: 54, lat: 36.084, lng: -115.1537, isMajor: true },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', state: 'UT', region: 'Mountain', x: 34, y: 40, lat: 40.7899, lng: -111.9791, isMajor: false },
  { code: 'ABQ', name: 'Albuquerque International Sunport', city: 'Albuquerque', state: 'NM', region: 'Mountain', x: 40, y: 58, lat: 35.0402, lng: -106.6092, isMajor: false },
  { code: 'TUS', name: 'Tucson International', city: 'Tucson', state: 'AZ', region: 'Mountain', x: 33, y: 66, lat: 32.1161, lng: -110.9410, isMajor: false },
  { code: 'BOI', name: 'Boise Airport', city: 'Boise', state: 'ID', region: 'Mountain', x: 28, y: 32, lat: 43.5644, lng: -116.2228, isMajor: false },
  { code: 'RNO', name: 'Reno-Tahoe International', city: 'Reno', state: 'NV', region: 'Mountain', x: 23, y: 44, lat: 39.4991, lng: -119.7681, isMajor: false },
  { code: 'ICT', name: 'Wichita Dwight D. Eisenhower', city: 'Wichita', state: 'KS', region: 'Mountain', x: 48, y: 53, lat: 37.6499, lng: -97.4331, isMajor: false },

  // Pacific (Bo Tay Thai Binh Duong)
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', state: 'CA', region: 'Pacific', x: 21, y: 60, lat: 33.9416, lng: -118.4085, isMajor: true },
  { code: 'OAK', name: 'Oakland International', city: 'Oakland', state: 'CA', region: 'Pacific', x: 18, y: 46, lat: 37.7213, lng: -122.2207, isMajor: true },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', state: 'CA', region: 'Pacific', x: 23, y: 64, lat: 32.7338, lng: -117.1933, isMajor: true },
  { code: 'SJC', name: 'San Jose Mineta International', city: 'San Jose', state: 'CA', region: 'Pacific', x: 19, y: 48, lat: 37.3639, lng: -121.9289, isMajor: true },
  { code: 'SMF', name: 'Sacramento International', city: 'Sacramento', state: 'CA', region: 'Pacific', x: 19, y: 43, lat: 38.6951, lng: -121.5908, isMajor: true },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', state: 'WA', region: 'Pacific', x: 22, y: 20, lat: 47.4502, lng: -122.3088, isMajor: false },
  { code: 'PDX', name: 'Portland International', city: 'Portland', state: 'OR', region: 'Pacific', x: 21, y: 25, lat: 45.5898, lng: -122.5951, isMajor: false },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', state: 'CA', region: 'Pacific', x: 17, y: 47, lat: 37.6213, lng: -122.3790, isMajor: false },
  { code: 'SNA', name: 'John Wayne Airport', city: 'Santa Ana', state: 'CA', region: 'Pacific', x: 22, y: 61, lat: 33.6762, lng: -117.8674, isMajor: false },
  { code: 'BUR', name: 'Hollywood Burbank', city: 'Burbank', state: 'CA', region: 'Pacific', x: 21, y: 59, lat: 34.2007, lng: -118.3590, isMajor: false },
  { code: 'ONT', name: 'Ontario International', city: 'Ontario', state: 'CA', region: 'Pacific', x: 23, y: 60, lat: 34.0560, lng: -117.6012, isMajor: false },
  { code: 'LGB', name: 'Long Beach Airport', city: 'Long Beach', state: 'CA', region: 'Pacific', x: 22, y: 61, lat: 33.8177, lng: -118.1516, isMajor: false },
  { code: 'GEG', name: 'Spokane International', city: 'Spokane', state: 'WA', region: 'Pacific', x: 27, y: 22, lat: 47.6199, lng: -117.5338, isMajor: false },
];

export const airportMap = new Map(US_AIRPORTS.map((a) => [a.code, a]));

export const getAirportLocation = (code) => {
  const existing = airportMap.get(code);
  if (existing) return existing;

  return {
    code,
    name: code,
    city: code,
    state: '',
    region: 'Midwest',
    x: 50,
    y: 50,
    lat: 38.0,
    lng: -97.0,
    isMajor: false,
  };
};

export default airportMap;
