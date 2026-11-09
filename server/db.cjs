const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'citywalk.sqlite'));

db.exec(`
  PRAGMA journal_mode = WAL;
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
const updateUser = db.prepare('UPDATE users SET name = ?, avatar = ?, notes_json = ?, favorites_json = ? WHERE id = ?');
const listReviews = db.prepare(`SELECT reviews.id, reviews.place_id, reviews.rating, reviews.text, reviews.created_at,
  users.name, users.avatar FROM reviews JOIN users ON users.id = reviews.user_id
  WHERE reviews.place_id = ? ORDER BY reviews.created_at DESC LIMIT 30`);
const reviewSummary = db.prepare('SELECT COUNT(*) AS count, COALESCE(ROUND(AVG(rating), 1), 0) AS average FROM reviews WHERE place_id = ?');
const insertReview = db.prepare('INSERT INTO reviews (place_id, user_id, rating, text) VALUES (?, ?, ?, ?)');
const updateReview = db.prepare('UPDATE reviews SET rating = ?, text = ?, created_at = CURRENT_TIMESTAMP WHERE place_id = ? AND user_id = ?');
const getUser = (id) => findById.get(id);

const createUser = (email, password) => {
  const result = insertUser.run(email.trim().toLowerCase(), hashPassword(password));
  return publicUser(getUser(result.lastInsertRowid));
};

const loginUser = (email, password) => {
  const user = findByEmail.get(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return publicUser(user);
};

const saveUser = (id, values) => {
  const user = getUser(id);
  if (!user) return null;
  const name = typeof values.name === 'string' ? values.name.slice(0, 40) : user.name;
  const avatar = typeof values.avatar === 'string' ? values.avatar.slice(0, 12) : user.avatar;
  const notes = Array.isArray(values.notes) ? values.notes.slice(0, 100) : safeJson(user.notes_json, []);
  const favorites = Array.isArray(values.favorites) ? values.favorites.slice(0, 200) : safeJson(user.favorites_json, []);
  updateUser.run(name, avatar, JSON.stringify(notes), JSON.stringify(favorites), id);
  return publicUser(getUser(id));
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

module.exports = { createUser, loginUser, getUser, publicUser, saveUser, getReviews, saveReview };
