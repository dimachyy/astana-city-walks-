const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'citywalk.sqlite'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '🐱',
    notes_json TEXT NOT NULL DEFAULT '[]',
    favorites_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    place_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(place_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id TEXT NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    icon TEXT NOT NULL DEFAULT '✦',
    type TEXT NOT NULL DEFAULT 'Место',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, place_id)
  );
  CREATE TABLE IF NOT EXISTS route_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Прогулка по Астане',
    mode TEXT NOT NULL DEFAULT 'foot',
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    distance_km REAL NOT NULL DEFAULT 0,
    available_minutes INTEGER NOT NULL DEFAULT 0,
    categories_json TEXT NOT NULL DEFAULT '[]',
    origin_lat REAL NOT NULL,
    origin_lng REAL NOT NULL,
    places_json TEXT NOT NULL DEFAULT '[]',
    geometry_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const [salt, expected] = String(stored).split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
};

const safeJson = (value, fallback) => {
  try { return JSON.parse(value || ''); } catch { return fallback; }
};
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  notes: safeJson(user.notes_json, []),
  favorites: safeJson(user.favorites_json, []),
});

const findById = db.prepare('SELECT * FROM users WHERE id = ?');
const findByEmail = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
const insertUser = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
const updateUser = db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?');
const listNotes = db.prepare('SELECT text FROM notes WHERE user_id = ? ORDER BY created_at DESC, id DESC');
const clearNotes = db.prepare('DELETE FROM notes WHERE user_id = ?');
const addNote = db.prepare('INSERT INTO notes (user_id, text) VALUES (?, ?)');
const listFavorites = db.prepare('SELECT place_id AS id, name, lat, lng, icon, type FROM favorites WHERE user_id = ? ORDER BY created_at DESC, id DESC');
const clearFavorites = db.prepare('DELETE FROM favorites WHERE user_id = ?');
const addFavorite = db.prepare('INSERT OR IGNORE INTO favorites (user_id, place_id, name, lat, lng, icon, type) VALUES (?, ?, ?, ?, ?, ?, ?)');
const listReviews = db.prepare(`SELECT reviews.id, reviews.place_id, reviews.rating, reviews.text, reviews.created_at,
  users.name, users.avatar FROM reviews JOIN users ON users.id = reviews.user_id
  WHERE reviews.place_id = ? ORDER BY reviews.created_at DESC LIMIT 30`);
const reviewSummary = db.prepare('SELECT COUNT(*) AS count, COALESCE(ROUND(AVG(rating), 1), 0) AS average FROM reviews WHERE place_id = ?');
const insertReview = db.prepare('INSERT INTO reviews (place_id, user_id, rating, text) VALUES (?, ?, ?, ?)');
const updateReview = db.prepare('UPDATE reviews SET rating = ?, text = ?, created_at = CURRENT_TIMESTAMP WHERE place_id = ? AND user_id = ?');
const listRoutes = db.prepare(`SELECT id, title, mode, duration_minutes, distance_km, available_minutes,
  categories_json, origin_lat, origin_lng, places_json, geometry_json, created_at
  FROM route_history WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50`);
const insertRoute = db.prepare(`INSERT INTO route_history
  (user_id, title, mode, duration_minutes, distance_km, available_minutes, categories_json,
   origin_lat, origin_lng, places_json, geometry_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const deleteRoute = db.prepare('DELETE FROM route_history WHERE id = ? AND user_id = ?');
const getRouteById = db.prepare(`SELECT id, title, mode, duration_minutes, distance_km, available_minutes,
  categories_json, origin_lat, origin_lng, places_json, geometry_json, created_at
  FROM route_history WHERE id = ? AND user_id = ?`);
const getUser = (id) => findById.get(id);

const profileData = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  notes: listNotes.all(user.id).map((item) => item.text),
  favorites: listFavorites.all(user.id),
});

const routeData = (row) => ({
  id: row.id,
  title: row.title,
  mode: row.mode,
  durationMinutes: Number(row.duration_minutes) || 0,
  distanceKm: Number(row.distance_km) || 0,
  availableMinutes: Number(row.available_minutes) || 0,
  categories: safeJson(row.categories_json, []),
  origin: { lat: Number(row.origin_lat), lng: Number(row.origin_lng) },
  places: safeJson(row.places_json, []),
  geometry: safeJson(row.geometry_json, null),
  createdAt: row.created_at,
});

const getRoutes = (userId) => listRoutes.all(userId).map(routeData);

const addRoute = (userId, values) => {
  const origin = values?.origin || {};
  const places = Array.isArray(values?.places) ? values.places.slice(0, 12) : [];
  const categories = Array.isArray(values?.categories) ? values.categories.slice(0, 12) : [];
  const lat = Number(origin.lat);
  const lng = Number(origin.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !places.length) throw new Error('Маршрут должен содержать начало и хотя бы одно место');
  const mode = ['foot', 'car', 'bus'].includes(values.mode) ? values.mode : 'foot';
  const title = String(values.title || 'Прогулка по Астане').trim().slice(0, 80) || 'Прогулка по Астане';
  const duration = Math.max(0, Math.min(1440, Math.round(Number(values.durationMinutes) || 0)));
  const available = Math.max(0, Math.min(1440, Math.round(Number(values.availableMinutes) || 0)));
  const distance = Math.max(0, Math.min(1000, Number(values.distanceKm) || 0));
  const geometry = values.geometry && typeof values.geometry === 'object' ? JSON.stringify(values.geometry).slice(0, 1000000) : null;
  const result = insertRoute.run(
    userId,
    title,
    mode,
    duration,
    distance,
    available,
    JSON.stringify(categories),
    lat,
    lng,
    JSON.stringify(places),
    geometry,
  );
  return routeData(getRouteById.get(result.lastInsertRowid, userId));
};

const removeRoute = (userId, routeId) => Boolean(deleteRoute.run(Number(routeId), userId).changes);

const migrateJsonData = () => {
  const users = db.prepare('SELECT id, notes_json, favorites_json FROM users').all();
  for (const user of users) {
    if (listNotes.all(user.id).length === 0) {
      safeJson(user.notes_json, []).forEach((note) => {
        const text = typeof note === 'string' ? note : note?.text;
        if (text) addNote.run(user.id, String(text).slice(0, 500));
      });
    }
    if (listFavorites.all(user.id).length === 0) {
      safeJson(user.favorites_json, []).forEach((place) => {
        if (place?.id && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))) {
          addFavorite.run(user.id, String(place.id), String(place.name || 'Место'), Number(place.lat), Number(place.lng), String(place.icon || '✦'), String(place.type || 'Место'));
        }
      });
    }
  }
};

migrateJsonData();

const createUser = (email, password) => {
  const result = insertUser.run(email.trim().toLowerCase(), hashPassword(password));
  return profileData(getUser(result.lastInsertRowid));
};

const loginUser = (email, password) => {
  const user = findByEmail.get(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return profileData(user);
};

const saveUser = (id, values) => {
  const user = getUser(id);
  if (!user) return null;
  const name = typeof values.name === 'string' ? values.name.slice(0, 40) : user.name;
  const avatar = typeof values.avatar === 'string' ? values.avatar.slice(0, 12) : user.avatar;
  updateUser.run(name, avatar, id);
  if (Array.isArray(values.notes)) {
    clearNotes.run(id);
    values.notes.slice(0, 100).forEach((note) => {
      const text = typeof note === 'string' ? note : note?.text;
      if (text?.trim()) addNote.run(id, String(text).trim().slice(0, 500));
    });
  }
  if (Array.isArray(values.favorites)) {
    clearFavorites.run(id);
    values.favorites.slice(0, 200).forEach((place) => {
      if (place?.id && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))) {
        addFavorite.run(id, String(place.id), String(place.name || 'Место'), Number(place.lat), Number(place.lng), String(place.icon || '✦'), String(place.type || 'Место'));
      }
    });
  }
  return profileData(getUser(id));
};

const getReviews = (placeId) => ({
  summary: reviewSummary.get(placeId),
  reviews: listReviews.all(placeId),
});

const saveReview = (userId, placeId, rating, text) => {
  const cleanPlace = String(placeId || '').slice(0, 120);
  const cleanText = String(text || '').trim().slice(0, 500);
  const cleanRating = Math.max(1, Math.min(5, Number(rating) || 0));
  if (!cleanPlace || !cleanText || !cleanRating) throw new Error('Заполните оценку и текст отзыва');
  try { insertReview.run(cleanPlace, userId, cleanRating, cleanText); }
  catch (error) {
    if (!String(error.message).includes('UNIQUE')) throw error;
    updateReview.run(cleanRating, cleanText, cleanPlace, userId);
  }
  return getReviews(cleanPlace);
};

module.exports = { createUser, loginUser, getUser, publicUser, profileData, saveUser, getReviews, saveReview, getRoutes, addRoute, removeRoute };
