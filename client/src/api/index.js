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

const NOMINATIM_TERMS = {
  cafe: 'cafe',
  architecture: 'museum',
  park: 'park',
  photo: 'viewpoint',
}

// Ищем непосредственно вокруг координат пользователя. Это не зависит от
// зависшего/перегруженного Overpass-сервера и не подменяет результат точками
// из центра Астаны.
const fetchNearbyFromNominatim = async ([lat, lon], categories, signal) => {
  const active = Array.isArray(categories) && categories.length
    ? categories
    : Object.keys(NOMINATIM_TERMS)
  const delta = 0.035 // примерно 2–4 км вокруг пользователя
  const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`
  const responses = await Promise.all(active.map(async (category) => {
    const term = NOMINATIM_TERMS[category]
    if (!term) return []
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kz&limit=50&dedupe=1&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(term)}`
    const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!response.ok) return []
    const places = await response.json()
    return places.map((place) => ({
      type: 'nominatim',
      id: place.place_id,
      lat: Number(place.lat),
      lon: Number(place.lon),
      tags: {
        name: place.name || place.display_name?.split(',')[0],
        _category: category,
      },
    })).filter((place) => place.tags.name && Number.isFinite(place.lat) && Number.isFinite(place.lon))
  }))
  const unique = new Map()
  responses.flat().forEach((place) => unique.set(`${place.tags.name}|${place.lat.toFixed(4)}|${place.lon.toFixed(4)}`, place))
  return { elements: [...unique.values()] }
}

export const fetchPlaces = async ([lat, lon], categories, signal) => {
  const cats = Array.isArray(categories) ? categories : String(categories || '').split(',').filter(Boolean)
  try {
    const direct = await fetchNearbyFromNominatim([lat, lon], cats, signal)
    if (direct.elements.length) return direct
  } catch (error) {
    if (error.name === 'AbortError') throw error
  }
  // Запасной путь: серверный прокси может вернуть дополнительные OSM-точки.
  return getJson(`/api/places?lat=${lat}&lon=${lon}&categories=${encodeURIComponent(cats.join(','))}`, signal)
}

export const fetchAccount = () => getJson('/api/me')
export const loginAccount = (email, password) => sendJson('/api/auth/login', 'POST', { email, password })
export const registerAccount = (email, password) => sendJson('/api/auth/register', 'POST', { email, password })
export const logoutAccount = () => sendJson('/api/auth/logout', 'POST', {})
export const updateAccount = (values) => sendJson('/api/me', 'PATCH', values)
export const fetchReviews = (placeId, signal) => getJson(`/api/reviews?placeId=${encodeURIComponent(placeId)}`, signal)
export const saveReview = (placeId, rating, text) => sendJson(`/api/reviews?placeId=${encodeURIComponent(placeId)}`, 'POST', { rating, text })
