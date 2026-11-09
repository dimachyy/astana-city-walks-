const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createUser, loginUser, getUser, profileData, saveUser, getReviews, saveReview } = require('./server/db.cjs');

// Выделенный порт CityWalk, чтобы не подключаться к старой копии сервера.
const PORT = Number(process.env.CITYWALK_PORT || 8010);
// Раздаём собранный React (npm run build в папке client)
const root = path.join(__dirname, 'client', 'dist');
const sessions = new Map();

const parseCookies = (header = '') => Object.fromEntries(header.split(';').map((item) => {
  const index = item.indexOf('=');
  return index < 0 ? [item.trim(), ''] : [item.slice(0, index).trim(), decodeURIComponent(item.slice(index + 1).trim())];
}).filter(([key]) => key));

const currentUser = (req) => {
  const token = parseCookies(req.headers.cookie).citywalk_session;
  const userId = token && sessions.get(token);
  return userId ? getUser(userId) : null;
};

const readBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1000000) req.destroy(new Error('Request too large'));
  });
  req.on('end', () => {
    try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid JSON')); }
  });
  req.on('error', reject);
});

const setSession = (res, userId) => {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, userId);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `citywalk_session=${token}; HttpOnly; SameSite=Lax; Path=/${secure}`);
};

const authError = (res) => sendJson(res, 401, { error: 'Требуется войти в аккаунт' });

const proxyAuth = async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/me') {
    const user = currentUser(req);
    return sendJson(res, 200, { user: user ? profileData(user) : null });
  }
  if (req.method === 'POST' && (req.url === '/api/auth/register' || req.url === '/api/auth/login')) {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return sendJson(res, 400, { error: 'Введите корректную почту' });
    if (password.length < 6) return sendJson(res, 400, { error: 'Пароль должен быть не короче 6 символов' });
    try {
      const user = req.url.endsWith('/register') ? createUser(email, password) : loginUser(email, password);
      if (!user) return sendJson(res, 401, { error: 'Неверная почта или пароль' });
      setSession(res, user.id);
      return sendJson(res, 200, { user });
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) return sendJson(res, 409, { error: 'Такая почта уже зарегистрирована' });
      throw error;
    }
  }
  if (req.method === 'POST' && req.url === '/api/auth/logout') {
    const token = parseCookies(req.headers.cookie).citywalk_session;
    if (token) sessions.delete(token);
    res.setHeader('Set-Cookie', 'citywalk_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'PATCH' && req.url === '/api/me') {
    const user = currentUser(req);
    if (!user) return authError(res);
    const body = await readBody(req);
    return sendJson(res, 200, { user: saveUser(user.id, body) });
  }
  return sendJson(res, 404, { error: 'Not found' });
};

const proxyReviews = async (req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const placeId = requestUrl.searchParams.get('placeId');
  if (!placeId) return sendJson(res, 400, { error: 'Не указано место' });
  if (req.method === 'GET') return sendJson(res, 200, getReviews(placeId));
  if (req.method === 'POST') {
    const user = currentUser(req);
    if (!user) return authError(res);
    const body = await readBody(req);
    return sendJson(res, 200, saveReview(user.id, placeId, body.rating, body.text));
  }
  return sendJson(res, 405, { error: 'Method not allowed' });
};

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
  cafe: (lat, lon) => `nwr(around:8000,${lat},${lon})["amenity"~"cafe|restaurant|fast_food|bar|bakery|ice_cream"];`,
  architecture: (lat, lon) => `nwr(around:8000,${lat},${lon})["tourism"~"museum|attraction|gallery|viewpoint|theme_park"];nwr(around:8000,${lat},${lon})["historic"];nwr(around:8000,${lat},${lon})["amenity"="theatre"];`,
  park: (lat, lon) => `nwr(around:8000,${lat},${lon})["leisure"~"park|garden|nature_reserve|playground"];`,
  photo: (lat, lon) => `nwr(around:8000,${lat},${lon})["tourism"~"attraction|viewpoint"];nwr(around:8000,${lat},${lon})["historic"];nwr(around:8000,${lat},${lon})["artwork_type"];`,
};

const featuredPlaces = [
  { id: 'featured-baiterek', name: 'Байтерек', wiki: 'Байтерек', imageQuery: 'Байтерек Астана', lat: 51.1283, lon: 71.4304, icon: '🏛️', shortDescription: 'Главная смотровая башня и символ Астаны. С верхнего уровня открывается вид на центр города.' },
  { id: 'featured-museum', name: 'Национальный музей Казахстана', wiki: 'Национальный музей Республики Казахстан', imageQuery: 'Национальный музей Казахстана Астана', lat: 51.1256, lon: 71.4681, icon: '🏺', shortDescription: 'Крупный музей об истории, культуре и искусстве Казахстана.' },
  { id: 'featured-khan', name: 'Хан Шатыр', wiki: 'Хан-Шатыр', imageQuery: 'Хан Шатыр Астана', lat: 51.1326, lon: 71.4037, icon: '🏙️', shortDescription: 'Большой торгово-развлекательный центр в форме шатра с магазинами и развлечениями.' },
  { id: 'featured-peace', name: 'Дворец мира и согласия', wiki: 'Дворец мира и согласия', imageQuery: 'Дворец мира и согласия Астана', lat: 51.1235, lon: 71.4694, icon: '🔺', shortDescription: 'Пирамида, посвящённая дружбе и согласию народов Казахстана.' },
  { id: 'featured-expo', name: 'Территория EXPO', wiki: 'Астана Экспо', imageQuery: 'EXPO Астана', lat: 51.0907, lon: 71.4188, icon: '🌐', shortDescription: 'Современный район с необычной архитектурой, музеями и прогулочными зонами.' },
  { id: 'featured-garden', name: 'Ботанический сад', wiki: 'Ботанический сад (Астана)', imageQuery: 'Ботанический сад Астана', lat: 51.0904, lon: 71.4171, icon: '🌳', shortDescription: 'Большая зелёная территория для прогулок, отдыха и фотографий.' },
  { id: 'featured-opera', name: 'Astana Opera', wiki: 'Astana Opera', imageQuery: 'Astana Opera', lat: 51.1286, lon: 71.4307, icon: '🎭', shortDescription: 'Один из крупнейших театров Астаны с концертами, операми и балетами.' },
  { id: 'featured-mosque', name: 'Мечеть Хазрет Султан', wiki: 'Мечеть Хазрет Султан', imageQuery: 'Мечеть Хазрет Султан Астана', lat: 51.1233, lon: 71.4697, icon: '🕌', shortDescription: 'Одна из крупнейших мечетей Центральной Азии с узнаваемой белой архитектурой.' },
  { id: 'featured-nuralem', name: 'Музей энергии будущего Нур-Алем', wiki: 'Нур-Алем', imageQuery: 'Нур Алем Астана', fallbackImage: 'https://commons.wikimedia.org/wiki/Special:FilePath/Expo%202017%20%22Nur%20Alem%22%20Pavilion%20Space%20Exhibition.jpg?width=900', lat: 51.0908, lon: 71.4179, icon: '🔵', shortDescription: 'Сферическое здание и музей технологий на территории EXPO.' },
  { id: 'featured-embankment', name: 'Набережная Ишима', wiki: 'Ишим (река)', imageQuery: 'Набережная Ишима Астана', lat: 51.1281, lon: 71.4358, icon: '🌊', shortDescription: 'Живописное место для спокойной прогулки, фото и отдыха у реки.' },
  { id: 'featured-lovers-park', name: 'Парк Влюблённых', wiki: 'Парк Влюблённых (Астана)', imageQuery: 'Парк Влюбленных Астана', lat: 51.1322, lon: 71.4237, icon: '🌳', shortDescription: 'Небольшой городской парк рядом с прогулочными маршрутами центра.' },
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
    const image = summary.thumbnail?.source || await commonsImage(place.imageQuery || place.name) || place.fallbackImage || '';
    return { ...place, description: place.shortDescription || summary.extract || 'Популярное место для прогулки по Астане.', image, article: summary.content_urls?.desktop?.page || `https://ru.wikipedia.org/wiki/${encodeURIComponent(place.wiki)}` };
  } catch (error) {
    return { ...place, description: place.shortDescription || 'Популярное место для прогулки по Астане.', image: place.fallbackImage || '', article: `https://ru.wikipedia.org/wiki/${encodeURIComponent(place.wiki)}` };
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
  const requests = endpoints.map(async (endpoint) => {
    const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(10000),
      headers: { Accept: 'application/json', 'User-Agent': 'CityWalk-Astana/1.0 educational project' },
    });
    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    return response.json();
  });
  return Promise.any(requests);
};

const nominatimTerms = {
  cafe: ['cafe', 'coffee', 'restaurant'],
  architecture: ['museum', 'theatre', 'mosque', 'attraction'],
  park: ['park', 'garden'],
  photo: ['attraction', 'viewpoint', 'embankment'],
};

const fetchNominatimPlaces = async (lat, lon, categories) => {
  const delta = 0.07;
  const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
  const selected = activeCategories(categories);
  const queries = selected.map((category) => ({ category, term: nominatimTerms[category][0] }));
  const responses = await Promise.all(queries.map(async ({ category, term }) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kz&limit=20&dedupe=1&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(`${term}, Astana`)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json', 'User-Agent': 'CityWalk-Astana/1.0 educational project' } });
      if (!response.ok) return [];
      const places = await response.json();
      return places.map((place) => ({
        type: 'nominatim',
        id: place.place_id,
        lat: Number(place.lat),
        lon: Number(place.lon),
        tags: { name: place.name || place.display_name?.split(',')[0], _category: category, amenity: category === 'cafe' ? 'cafe' : undefined, tourism: category === 'architecture' || category === 'photo' ? 'attraction' : undefined, leisure: category === 'park' ? 'park' : undefined },
      })).filter((place) => place.tags.name && Number.isFinite(place.lat) && Number.isFinite(place.lon));
    } catch { return []; }
  }));
  const unique = new Map();
  responses.flat().forEach((place) => unique.set(`${place.tags.name}|${place.lat.toFixed(4)}|${place.lon.toFixed(4)}`, place));
  return { elements: [...unique.values()] };
};

const fetchPlacesWithFallback = async (lat, lon, categories) => {
  let primary = { elements: [] };
  try {
    primary = await fetchOverpass(placesQuery(lat, lon, categories));
  } catch { /* пробуем Nominatim ниже */ }
  if ((primary.elements || []).length >= 8) return primary;
  const backup = await fetchNominatimPlaces(lat, lon, categories);
  return { elements: [...(primary.elements || []), ...(backup.elements || [])] };
};

const proxyPlaces = async (req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${PORT}`);
  const lat = Number(requestUrl.searchParams.get('lat'));
  const lon = Number(requestUrl.searchParams.get('lon'));
  const categories = (requestUrl.searchParams.get('categories') || '').split(',').filter(Boolean);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return sendJson(res, 400, { error: 'Invalid coordinates' });
  const key = `places:${lat.toFixed(3)},${lon.toFixed(3)}:${activeCategories(categories).sort().join(',')}`;
  try {
    const data = await cached(key, 10 * 60 * 1000, () => fetchPlacesWithFallback(lat, lon, categories));
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
    if (req.url === '/api/me' || req.url.startsWith('/api/auth/')) return await proxyAuth(req, res);
    if (req.url.startsWith('/api/reviews')) return await proxyReviews(req, res);
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
