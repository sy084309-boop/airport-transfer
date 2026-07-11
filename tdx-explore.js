// TDX API Explorer
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
  console.log('Getting TDX token...');
  const auth = await post('/auth/realms/TDXConnect/protocol/openid-connect/token', {
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });
  const token = auth.access_token;
  console.log('Token OK, expires in', auth.expires_in, 's');
  console.log('Roles:', auth.realm_access?.roles?.join(', '));

  // Try various endpoints
  const endpoints = [
    '/api/basic/v2/Network/Geocoding',
    '/api/basic/v2/Geocoding',
    '/api/basic/v2/GeoInfo',
    '/api/basic/v2/Map/Geocoding',
    '/api/basic/v2/Address',
    '/api/basic/v2',
  ];

  for (const ep of endpoints) {
    try {
      const r = await get(ep, token);
      console.log(`\n${ep}:`);
      if (typeof r === 'string') console.log(r.substring(0, 300));
      else if (Array.isArray(r)) console.log(`Array[${r.length}], sample:`, JSON.stringify(r[0]||{}).substring(0, 200));
      else console.log(JSON.stringify(r).substring(0, 400));
    } catch (e) {
      console.log(`${ep}: ERROR - ${e.message}`);
    }
  }
})();
