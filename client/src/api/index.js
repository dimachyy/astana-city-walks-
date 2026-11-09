async function getJson(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function sendJson(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}

export const fetchPopular = (signal) => getJson('/api/popular', signal)

export const fetchPlaces = ([lat, lon], categories, signal) => {
  const cats = Array.isArray(categories) ? categories.join(',') : categories
  return getJson(`/api/places?lat=${lat}&lon=${lon}&categories=${encodeURIComponent(cats)}`, signal)
}

export const fetchAccount = () => getJson('/api/me')
export const loginAccount = (email, password) => sendJson('/api/auth/login', 'POST', { email, password })
export const registerAccount = (email, password) => sendJson('/api/auth/register', 'POST', { email, password })
export const logoutAccount = () => sendJson('/api/auth/logout', 'POST', {})
export const updateAccount = (values) => sendJson('/api/me', 'PATCH', values)
