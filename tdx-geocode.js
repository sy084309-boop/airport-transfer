// TDX Geocoding Test
const https = require('https');
const CLIENT_ID = 'sy084309-4142a1e4-2abc-408e';
const CLIENT_SECRET = '8731edd6-de41-4b82-bbf8-106b0d6f0364';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(body).toString();
    const req = https.request({
      hostname: 'tdx.transportdata.tw',
      path, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': data.length }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    https.request({
      hostname: 'tdx.transportdata.tw',
      path, headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    }).on('error', reject).end();
  });
}

(async () => {
  const auth = await post('/auth/realms/TDXConnect/protocol/openid-connect/token', {
    grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET
  });
  const token = auth.access_token;
  console.log('Token OK\n');

  // Try TDX Locator API (address → coordinate)
  const tests = [
    { path: '/api/basic/v2/Locator/AddressToCoordinate?address=%E8%87%BA%E5%8C%97%E5%B8%82%E4%B8%AD%E6%AD%A3%E5%8D%80%E5%BF%A0%E5%AD%9D%E8%A5%BF%E8%B7%AF%E4%B8%80%E6%AE%B5118%E8%99%9F&$format=JSON', label: 'Address→Coord (UTF8 URL)' },
    { path: '/api/basic/v2/Locator/AddressToCoordinate?address=臺北市忠孝西路一段118號&$format=JSON', label: 'Address→Coord (raw)' },
    { path: '/api/basic/v2/Locator/CoordinateToAddress?latitude=25.0473&longitude=121.5119&$format=JSON', label: 'Coord→Address' },
    { path: '/api/basic/v2/Locator', label: 'Locator API list' },
  ];

  for (const t of tests) {
    try {
      const r = await get(t.path, token);
      console.log(`[${t.label}]`);
      console.log(JSON.stringify(r, null, 2).substring(0, 500));
      console.log('---');
    } catch(e) {
      console.log(`[${t.label}] ERROR: ${e.message}`);
    }
  }
})();
