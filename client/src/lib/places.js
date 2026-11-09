const categoryFromTags = (tags = {}) => {
  if (tags.amenity && /cafe|restaurant|fast_food|bar|bakery|ice_cream/.test(tags.amenity)) return 'cafe'
  if (tags.historic || tags.amenity === 'theatre') return 'architecture'
  if (tags.artwork_type) return 'photo'
  if (tags.leisure) return 'park'
  return tags.tourism ? 'architecture' : 'photo'
}

const categoryInfo = {
  cafe: ['☕', 'Кафе и еда'],
  architecture: ['🏛️', 'Архитектура и культура'],
  park: ['🌳', 'Парки и природа'],
  photo: ['📸', 'Места для фото'],
}

export const normalizePlaces = (payload) => {
  const unique = new Map()
  ;(payload?.elements || []).forEach((element) => {
    const tags = element.tags || {}
    const center = element.center || element
    const lat = Number(center.lat)
    const lng = Number(center.lon)
    const name = tags['name:ru'] || tags.name || tags['name:en']
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    const category = categoryFromTags(tags)
    const [icon, type] = categoryInfo[category]
    const place = { id: `${element.type}-${element.id}`, name, type, category, lat, lng, icon }
    if (!unique.has(name)) unique.set(name, place)
  })
  return [...unique.values()]
}
