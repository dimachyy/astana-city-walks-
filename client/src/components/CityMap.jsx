import { useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MAP_CENTER, TRAVEL_MODES } from '../lib/constants.js'

// Иконки кэшируем, чтобы Leaflet не пересоздавал их при каждом рендере
const iconCache = new Map()
function pinIcon(emoji, inRoute) {
  const key = `${emoji}|${inRoute}`
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: 'custom-pin-wrap',
        html: `<div class="custom-pin${inRoute ? ' in-route' : ''}"><span>${emoji}</span></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -30],
      }),
    )
  }
  return iconCache.get(key)
}

// Перелёт карты: в новый район и к выбранному месту
function MapController({ view, focus, markerRefs }) {
  const map = useMap()

  useEffect(() => {
    if (view) map.flyTo(view.center, view.zoom, { duration: 1 })
  }, [view, map])

  useEffect(() => {
    if (!focus) return undefined
    map.flyTo([focus.lat, focus.lng], 16, { duration: 0.8 })
    const timer = setTimeout(() => markerRefs.current.get(focus.id)?.openPopup(), 900)
    return () => clearTimeout(timer)
  }, [focus, map, markerRefs])

  return null
}

// Линия построенного маршрута
function RouteLayer({ route }) {
  const map = useMap()

  useEffect(() => {
    if (!route) return undefined
    const layer = L.geoJSON(route.geometry, {
      style: { color: TRAVEL_MODES[route.mode].color, weight: 6, opacity: 0.85, dashArray: route.straight ? '8 8' : null },
    }).addTo(map)
    map.fitBounds(layer.getBounds(), { padding: [35, 35] })
    return () => {
      layer.remove()
    }
  }, [route, map])

  return null
}

export default function CityMap({ places, focus, view, route, userLocation }) {
  const markerRefs = useRef(new Map())
  const routeIds = route?.stopIds ?? []
  // место из «Популярного» может не входить в найденные — рисуем для него отдельный маркер
  const shown = focus && !places.some((p) => p.id === focus.id) ? [...places, focus] : places

  return (
    <MapContainer center={MAP_CENTER} zoom={12.5} zoomControl={false} className="city-map">
      <ZoomControl position="bottomright" />
      <TileLayer
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController view={view} focus={focus} markerRefs={markerRefs} />
      <RouteLayer route={route} />
      {shown.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={pinIcon(place.icon, routeIds.includes(place.id))}
          ref={(marker) => {
            if (marker) markerRefs.current.set(place.id, marker)
            else markerRefs.current.delete(place.id)
          }}
        >
          <Popup>
            <b>{place.name}</b>
            <br />
            <span className="popup-type">{place.type}</span>
          </Popup>
        </Marker>
      ))}
      {userLocation && (
        <CircleMarker center={userLocation} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#e56f61', fillOpacity: 1 }}>
          <Popup>
            <b>Вы здесь</b>
            <br />
            <small>Начало маршрута</small>
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
