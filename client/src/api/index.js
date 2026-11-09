async function getJson(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export const fetchPopular = (signal) => getJson('/api/popular', signal)

export const fetchPlaces = ([lat, lon], categories, signal) => {
  const cats = Array.isArray(categories) ? categories.join(',') : categories
  return getJson(`/api/places?lat=${lat}&lon=${lon}&categories=${encodeURIComponent(cats)}`, signal)
}
