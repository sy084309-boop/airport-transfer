// TDX API Explorer v2 - find working APIs
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
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d.substring(0,300)); } });
    }).on('error', reject).end();
  });
}

(async () => {
  const auth = await post('/auth/realms/TDXConnect/protocol/openid-connect/token', {
    grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET
  });
  const token = auth.access_token;
  console.log('Roles:', JSON.stringify(auth.realm_access));

  // Try GIS, Map, GeoInfo APIs matching user's roles
  const tests = [
    '/api/basic/v2/Map/',
    '/api/basic/v2/GIS/',
    '/api/basic/v2/Network/Map/',
    '/api/basic/v2/Tourism/ScenicSpot/Taipei',
    '/api/basic/v2/Bus/Route/City/Taipei',
    '/api/advanced/v2/Map/',
  ];

  for (const p of tests) {
    try {
      const r = await get(p, token);
      console.log(`\n${p}:`);
      if (Array.isArray(r)) console.log(`  Array[${r.length}], first:`, JSON.stringify(r[0]||{}).substring(0,200));
      else if (typeof r === 'string') console.log(' ', r.substring(0,200));
      else console.log(' ', JSON.stringify(r).substring(0,300));
    } catch(e) {
      console.log(`${p}: ERROR ${e.message}`);
    }
  }
})();
