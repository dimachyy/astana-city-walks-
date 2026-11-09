const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
// Раздаём собранный React (npm run build в папке client)
const root = path.join(__dirname, 'client', 'dist');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const overpassFilters = {
  cafe: '["amenity"~"cafe|restaurant|fast_food|bar|bakery|ice_cream"]',
  architecture: '["tourism"~"museum|attraction|gallery|viewpoint|theme_park"]',
  park: '["leisure"~"park|garden|nature_reserve|playground"]',
  photo: '["tourism"~"attraction|viewpoint"]',
};
const overpassStatements = {
  cafe: (lat, lon) => `nwr(around:3500,${lat},${lon})["amenity"~"cafe|restaurant|fast_food|bar|bakery|ice_cream"];`,
  architecture: (lat, lon) => `nwr(around:3500,${lat},${lon})["tourism"~"museum|attraction|gallery|viewpoint|theme_park"];nwr(around:3500,${lat},${lon})["historic"];nwr(around:3500,${lat},${lon})["amenity"="theatre"];`,
  park: (lat, lon) => `nwr(around:3500,${lat},${lon})["leisure"~"park|garden|nature_reserve|playground"];`,
  photo: (lat, lon) => `nwr(around:3500,${lat},${lon})["tourism"~"attraction|viewpoint"];nwr(around:3500,${lat},${lon})["historic"];nwr(around:3500,${lat},${lon})["artwork_type"];`,
};

const featuredPlaces = [
  { id: 'featured-baiterek', name: 'Байтерек', wiki: 'Байтерек', lat: 51.1283, lon: 71.4304, icon: '🏛️', description: 'Главный символ Астаны и одна из самых узнаваемых точек города.' },
  { id: 'featured-museum', name: 'Национальный музей Казахстана', wiki: 'Национальный музей Республики Казахстан', lat: 51.1256, lon: 71.4681, icon: '🏺', description: 'Большой музейный комплекс с экспозициями об истории и культуре Казахстана.' },
  { id: 'featured-khan', name: 'Хан Шатыр', wiki: 'Хан-Шатыр', lat: 51.1326, lon: 71.4037, icon: '🏙️', description: 'Крупный торгово-развлекательный центр в необычном архитектурном здании.' },
  { id: 'featured-peace', name: 'Дворец мира и согласия', wiki: 'Дворец мира и согласия', lat: 51.1235, lon: 71.4694, icon: '🔺', description: 'Оригинальное здание в форме пирамиды рядом с важными достопримечательностями.' },
  { id: 'featured-expo', name: 'Территория EXPO', wiki: 'Астана Экспо', lat: 51.0907, lon: 71.4188, icon: '🌐', description: 'Современное пространство с необычной архитектурой и прогулочными зонами.' },
  { id: 'featured-garden', name: 'Ботанический сад', wiki: 'Ботанический сад (Астана)', lat: 51.0904, lon: 71.4171, icon: '🌳', description: 'Большая зелёная территория для спокойной прогулки и отдыха.' },
];

// ---------- простой кэш в памяти ----------
const cache = new Map();
const cached = async (key, ttlMs, load) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await load(); // если load бросит ошибку, в кэш ничего не попадёт
  cache.set(key, { at: Date.now(), value });
  return value;
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(payload));
};

// ---------- /api/popular ----------
const commonsImage = async (query) => {
  try {
    const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(`${query} Astana`)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*`;
    const response = await fetch(endpoint);
    const data = response.ok ? await response.json() : {};
    const page = Object.values(data.query?.pages || {})[0];
    return page?.imageinfo?.[0]?.thumburl || page?.imageinfo?.[0]?.url || '';
  } catch (error) { return ''; }
};

const loadPopular = () => Promise.all(featuredPlaces.map(async (place) => {
  try {
    const response = await fetch(`https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place.wiki)}`);
    const summary = response.ok ? await response.json() : {};
    const image = summary.thumbnail?.source || await commonsImage(place.name);
    return { ...place, description: summary.extract || place.description, image, article: summary.content_urls?.desktop?.page || `https://ru.wikipedia.org/wiki/${encodeURIComponent(place.wiki)}` };
  } catch (error) {
    return { ...place, description: place.description, image: '', article: `https://ru.wikipedia.org/wiki/${encodeURIComponent(place.wiki)}` };
  }
}));

const proxyPopular = async (res) => {
  const cards = await cached('popular', 60 * 60 * 1000, loadPopular);
  return sendJson(res, 200, cards);
};

// ---------- /api/places ----------
const activeCategories = (categories) => {
  const selected = categories.filter((category) => overpassFilters[category]);
  return selected.length ? selected : Object.keys(overpassFilters);
};

const placesQuery = (lat, lon, categories) => {
  const statements = activeCategories(categories).map((category) => overpassStatements[category](lat, lon)).join('');
  return `[out:json][timeout:25];(${statements});out center tags;`;
};

const fetchOverpass = async (query) => {
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(30000) });
      if (response.ok) return await response.json();
    } catch (error) { /* пробуем следующий публичный сервер Overpass */ }
  }
  throw new Error('Places service unavailable');
};

const proxyPlaces = async (req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const lat = Number(requestUrl.searchParams.get('lat'));
  const lon = Number(requestUrl.searchParams.get('lon'));
  const categories = (requestUrl.searchParams.get('categories') || '').split(',').filter(Boolean);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return sendJson(res, 400, { error: 'Invalid coordinates' });
  const key = `places:${lat.toFixed(3)},${lon.toFixed(3)}:${activeCategories(categories).sort().join(',')}`;
  try {
    const data = await cached(key, 10 * 60 * 1000, () => fetchOverpass(placesQuery(lat, lon, categories)));
    return sendJson(res, 200, data);
  } catch (error) {
    return sendJson(res, 502, { error: 'Places service unavailable' });
  }
};

// ---------- статика (React) ----------
const serveStatic = (req, res) => {
  let requested;
  try { requested = decodeURIComponent(req.url.split('?')[0]); } catch (error) { res.writeHead(400); return res.end('Bad request'); }
  let file = path.join(root, requested);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }

  const isFile = fs.existsSync(file) && fs.statSync(file).isFile();
  if (!isFile) {
    // Несуществующий файл с расширением (картинка, js) — честный 404.
    if (path.extname(requested)) { res.writeHead(404); return res.end('Not found'); }
    // Любой другой путь отдаёт index.html, дальше работает react-router.
    file = path.join(root, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Фронтенд не собран. Выполните: npm run build');
    }
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/popular')) return await proxyPopular(res);
    if (req.url.startsWith('/api/places')) return await proxyPlaces(req, res);
    if (req.url.startsWith('/api/')) return sendJson(res, 404, { error: 'Not found' });
    return serveStatic(req, res);
  } catch (error) {
    console.error('Ошибка запроса:', error.message);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`Порт ${PORT} уже занят. Закройте предыдущий CityWalk и запустите снова.`);
  else console.error('Ошибка сервера:', error.message);
  process.exitCode = 1;
});

server.listen(PORT, '127.0.0.1', () => console.log(`CityWalk: http://localhost:${PORT}`));
