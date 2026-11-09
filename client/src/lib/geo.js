import { ASTANA_CENTER } from './constants.js'

export const toPoint = (place) => [Number(place.lat), Number(place.lng)]
export const distanceKm = (a, b) => Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 69)

export const formatMinutes = (minutes) => {
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}

export const estimateMinutes = (mode, km, routeData) => {
  if (mode === 'car' && routeData) return Math.max(1, Math.round(routeData.duration / 60))
  if (mode === 'bus') return Math.max(5, Math.round(km / 18 * 60) + 10)
  return Math.max(1, Math.round(km / 5 * 60))
}

export const geocode = async (query, locations = []) => {
  const known = locations.find((place) => query.toLowerCase().includes(place.name.toLowerCase()))
  if (known) return toPoint(known)
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kz&q=${encodeURIComponent(query)}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Поиск района временно недоступен')
  const places = await response.json()
  if (!places.length) throw new Error(`Не нашли: ${query}`)
  return [Number(places[0].lat), Number(places[0].lon)]
}

export const fetchRoute = async (waypoints) => {
  try {
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints.map((point) => `${point[1]},${point[0]}`).join(';')}?overview=full&geometries=geojson`)
    if (!response.ok) return null
    const data = await response.json()
    return data.routes?.[0] || null
  } catch {
    return null
  }
}

export const orderStops = (start, places) => {
  const remaining = [...places]
  const ordered = []
  let cursor = start
  while (remaining.length) {
    let nearestIndex = 0
    let nearestDistance = Infinity
    remaining.forEach((place, index) => {
      const current = distanceKm(cursor, toPoint(place))
      if (current < nearestDistance) { nearestDistance = current; nearestIndex = index }
    })
    const [next] = remaining.splice(nearestIndex, 1)
    ordered.push(next)
    cursor = toPoint(next)
  }
  return ordered
}

export { ASTANA_CENTER }
