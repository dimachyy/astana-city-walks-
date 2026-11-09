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

module.exports = { createUser, loginUser, getUser, publicUser, saveUser };
