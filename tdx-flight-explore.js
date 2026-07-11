// Explore TDX Flight APIs
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
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
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
  console.log('Token OK, roles:', auth.realm_access?.roles?.join(', '));
  console.log('');

  const tests = [
    // Try known TDX v2 Air endpoints
    '/api/basic/v2/Air/FIDS/Airport/Departure/TPE?$top=1&$format=JSON',
    '/api/basic/v2/Air/FIDS/Airport/Arrival/TPE?$top=1&$format=JSON',
    '/api/basic/v2/Air/FIDS/Departure/TPE?$top=1&$format=JSON',
    '/api/basic/v2/Air/FIDS/TPE?$top=1&$format=JSON',
    '/api/basic/v2/Air/FIDS?$top=1&$format=JSON',
    '/api/basic/v2/Air?$top=1&$format=JSON',
    '/api/basic/v2/Aviation/FIDS/Airport/Departure/TPE?$top=1&$format=JSON',
    '/api/basic/v2/Aviation/FIDS/Airport/Arrival/TPE?$top=1&$format=JSON',
    '/api/basic/v2/Aviation/FIDS/TPE?$top=1&$format=JSON',
    // Try v3
    '/api/basic/v3/Air/FIDS/Airport/Departure/TPE?$top=1&$format=JSON',
    '/api/basic/v3/Air/FIDS/TPE?$top=1&$format=JSON',
  ];

  for (const ep of tests) {
    try {
      const r = await get(ep, token);
      const status = Array.isArray(r) ? `Array[${r.length}]` : typeof r === 'string' ? r.substring(0,80) : Object.keys(r).join(',');
      console.log(`${ep}`);
      console.log(`  → ${status}`);
      if (Array.isArray(r) && r.length > 0) console.log('  Sample:', JSON.stringify(r[0]).substring(0, 300));
    } catch(e) {
      console.log(`${ep}: ERROR`);
    }
  }
})();
