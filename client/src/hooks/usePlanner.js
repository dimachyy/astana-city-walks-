import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchPlaces } from '../api'
import { useToast } from '../components/toast.jsx'
import {
  ASTANA_CENTER, CATEGORY_INFO, DEFAULT_QUERY, FALLBACK_LOCATIONS, MY_LOCATION, TIME_PRESETS, TRAVEL_MODES,
} from '../lib/constants.js'
import { distanceKm, estimateMinutes, fetchRoute, formatMinutes, geocode, orderStops, toPoint } from '../lib/geo.js'
import { normalizePlaces } from '../lib/places.js'

export const maxStopsFor = (minutes) => (minutes <= 60 ? 2 : minutes <= 120 ? 3 : 5)

const GEO_ERRORS = {
  1: 'Доступ к геопозиции запрещён. Разреши Location для этого сайта в настройках браузера.',
  2: 'Координаты сейчас недоступны. Проверь Wi-Fi или GPS.',
  3: 'Истекло время ожидания координат. Попробуй ещё раз на открытом месте.',
}

// Всё состояние конструктора маршрута: интересы, район, найденные места, выбор, построенный маршрут.
export function usePlanner() {
  const toast = useToast()

  // время и интересы
  const [preset, setPreset] = useState(120)
  const [customTime, setCustomTime] = useState('')
  const [categories, setCategories] = useState([]) // пусто = все категории
  const [customInterests, setCustomInterests] = useState([])

  // где искать
  const [areaQuery, setAreaQuery] = useState(DEFAULT_QUERY)
  const [center, setCenter] = useState(ASTANA_CENTER)
  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('Можно разрешить доступ к геопозиции, чтобы начать маршрут от себя')
  const [view, setView] = useState(null) // куда перелететь карте: { center, zoom }
  const searchedQuery = useRef(DEFAULT_QUERY)

  // места
  const [locations, setLocations] = useState(FALLBACK_LOCATIONS)
  const [placesStatus, setPlacesStatus] = useState('loading') // loading | ok | fallback
  const [searchId, setSearchId] = useState(0)
  const notifyNext = useRef(false)

  // выбор и маршрут
  const [selectedIds, setSelectedIds] = useState([])
  const [mode, setMode] = useState('foot')
  const [route, setRoute] = useState(null)
  const [routeText, setRouteText] = useState('После построения здесь появятся расстояние и время')
  const [building, setBuilding] = useState(false)

  const customN = Number(customTime)
  const minutes = customN > 0 ? Math.min(480, customN) : preset
  const catsKey = categories.join(',')

  // Загрузка мест при смене района или интересов
  useEffect(() => {
    const controller = new AbortController()
    setPlacesStatus('loading')
    fetchPlaces(center, catsKey, controller.signal)
      .then((data) => {
        const found = normalizePlaces(data)
        const empty = found.length === 0
        setLocations(empty ? FALLBACK_LOCATIONS : found)
        setPlacesStatus(empty ? 'fallback' : 'ok')
        if (notifyNext.current) toast(empty ? 'Показали базовые места: ничего не нашлось' : `Нашли ${found.length} мест рядом`)
        notifyNext.current = false
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setLocations(FALLBACK_LOCATIONS)
        setPlacesStatus('fallback')
        if (notifyNext.current) toast('Показали базовые места: сервис карт временно недоступен')
        notifyNext.current = false
      })
    return () => controller.abort()
  }, [center, catsKey, searchId, toast])

  // 80 ближайших мест
  const ranked = useMemo(
    () => [...locations].sort((a, b) => distanceKm(center, toPoint(a)) - distanceKm(center, toPoint(b))).slice(0, 80),
    [locations, center],
  )

  const matchesCategory = useCallback(
    (place) => !categories.length || categories.includes(place.category),
    [categories],
  )

  // 10 ближайших подходящих мест для списка
  const nearby = useMemo(
    () => ranked.filter(matchesCategory).slice(0, 10).map((place) => ({ ...place, km: distanceKm(center, toPoint(place)) })),
    [ranked, matchesCategory, center],
  )

  const selectedPlaces = useMemo(
    () => selectedIds.map((id) => locations.find((place) => place.id === id)).filter(Boolean),
    [selectedIds, locations],
  )

  // ---- интересы и время ----
  const toggleCategory = (id) =>
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))

  const addCustomInterest = (label) => {
    const text = label.trim()
    if (!text) {
      toast('Напиши свой интерес')
      return false
    }
    setCustomInterests((prev) => [...prev, { id: `custom-${Date.now()}`, label: text, active: true }])
    toast(`Интерес «${text}» добавлен`)
    return true
  }
  const toggleCustomInterest = (id) =>
    setCustomInterests((prev) => prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item)))

  const choosePreset = (value) => {
    setPreset(value)
    setCustomTime('')
  }

  // ---- район и геолокация ----
  const applyCenter = (point, query, zoom) => {
    setSelectedIds([])
    setRoute(null)
    searchedQuery.current = query
    notifyNext.current = true
    setCenter(point)
    setSearchId((n) => n + 1)
    setView({ center: point, zoom })
  }

  const searchArea = async () => {
    const query = areaQuery.trim()
    if (!query) return toast('Напиши район или точку')
    try {
      const point = query === MY_LOCATION && userLocation ? userLocation : await geocode(query, locations)
      applyCenter(point, query, 14)
    } catch (error) {
      toast(error.message || 'Точку не удалось найти')
    }
  }

  const locate = () => {
    if (!navigator.geolocation) return setLocationStatus('Этот браузер не поддерживает геолокацию.')
    if (!window.isSecureContext) return setLocationStatus('Геолокация работает только через http://localhost или HTTPS.')
    setLocationStatus('Определяем ваше местоположение…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = [position.coords.latitude, position.coords.longitude]
        setUserLocation(point)
        setAreaQuery(MY_LOCATION)
        applyCenter(point, MY_LOCATION, 15)
        setLocationStatus('Местоположение определено — маршрут начнётся отсюда')
        toast('Местоположение найдено — маршрут начнётся здесь')
      },
      (error) => {
        setLocationStatus(GEO_ERRORS[error.code] || 'Не удалось определить местоположение.')
        toast(error.code === 1 ? 'Разреши доступ к геопозиции в браузере' : 'Не удалось определить местоположение')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  // ---- выбор мест ----
  const toggleSelected = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const clearSelection = () => {
    setSelectedIds([])
    setRoute(null)
    setRouteText('Выбор очищен')
    toast('Выбор мест сброшен')
  }

  // ---- построение маршрута ----
  const buildRoute = async () => {
    const query = areaQuery.trim()
    if (!query && !userLocation) return toast('Разрешите геолокацию или укажите район')
    if (query !== searchedQuery.current) {
      // район поменяли, но не нажали «Найти рядом» — обновим места и попросим выбрать заново
      await searchArea()
      return toast('Район обновлён — выберите места и нажмите «Создать маршрут» ещё раз')
    }

    setBuilding(true)
    try {
      const maxStops = maxStopsFor(minutes)
      const radius = Math.max(2, (minutes / 60) * 3)
      const byDistance = (a, b) => distanceKm(center, toPoint(a)) - distanceKm(center, toPoint(b))

      let pool
      if (selectedPlaces.length) {
        pool = [...selectedPlaces].sort(byDistance).slice(0, maxStops)
        if (selectedPlaces.length > maxStops) toast(`Для этого времени взяли ближайшие ${maxStops} места`)
      } else {
        pool = ranked.filter((p) => matchesCategory(p) && distanceKm(center, toPoint(p)) < radius).slice(0, maxStops)
      }
      if (!pool.length) throw new Error('Выберите хотя бы одно место рядом')

      const stops = orderStops(center, pool)
      const waypoints = [center, ...stops.map(toPoint)]
      const routeData = await fetchRoute(waypoints)
      const geometry = routeData?.geometry ?? { type: 'LineString', coordinates: waypoints.map((p) => [p[1], p[0]]) }
      const km = routeData
        ? routeData.distance / 1000
        : waypoints.slice(1).reduce((sum, point, i) => sum + distanceKm(waypoints[i], point), 0)
      const total = estimateMinutes(mode, km, routeData)

      setRoute({ geometry, mode, straight: !routeData, stopIds: stops.map((s) => s.id) })
      const notes = [mode === 'bus' && 'ориентировочно', !routeData && 'по прямой'].filter(Boolean)
      setRouteText(`${TRAVEL_MODES[mode].label} · ${km.toFixed(1)} км · примерно ${total} мин${notes.length ? ` · ${notes.join(', ')}` : ''}`)

      const timeLabel = customN > 0 ? `${minutes} минут` : TIME_PRESETS.find((t) => t.minutes === preset)?.label
      const interests = [
        ...categories.map((id) => CATEGORY_INFO[id].chip),
        ...customInterests.filter((i) => i.active).map((i) => i.label),
      ].join(', ')
      toast(`Маршрут создан: ${TRAVEL_MODES[mode].label} · ${timeLabel} · ${interests || 'все места'}`)
    } catch (error) {
      toast(error.message || 'Не удалось построить маршрут')
      setRouteText('Проверьте названия мест')
    } finally {
      setBuilding(false)
    }
  }

  return {
    // время
    preset, customTime, setCustomTime, choosePreset, minutes,
    // интересы
    categories, toggleCategory, customInterests, addCustomInterest, toggleCustomInterest,
    // район
    areaQuery, setAreaQuery, searchArea, locate, locationStatus, userLocation, view,
    // места
    ranked, nearby, placesStatus, selectedIds, toggleSelected, clearSelection,
    // маршрут
    mode, setMode, route, routeText, building, buildRoute,
  }
}
