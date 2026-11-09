import { useEffect, useState } from 'react'

const CODES = {
  0: ['☀️', 'Ясно'], 1: ['🌤️', 'Преимущественно ясно'], 2: ['⛅', 'Переменная облачность'], 3: ['☁️', 'Облачно'],
  45: ['🌫️', 'Туман'], 48: ['🌫️', 'Изморозь'], 51: ['🌦️', 'Морось'], 53: ['🌦️', 'Морось'], 55: ['🌧️', 'Сильная морось'],
  61: ['🌧️', 'Небольшой дождь'], 63: ['🌧️', 'Дождь'], 65: ['🌧️', 'Сильный дождь'],
  71: ['🌨️', 'Небольшой снег'], 73: ['❄️', 'Снег'], 75: ['❄️', 'Сильный снег'],
  80: ['🌦️', 'Ливни'], 81: ['🌧️', 'Ливни'], 82: ['⛈️', 'Сильные ливни'],
  95: ['⛈️', 'Гроза'], 96: ['⛈️', 'Гроза с градом'], 99: ['⛈️', 'Гроза с градом'],
}

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=51.1694&longitude=71.4491&current=temperature_2m,wind_speed_10m,is_day,weather_code&daily=sunrise,sunset&timezone=Asia%2FAlmaty&forecast_days=1'

export function useWeather() {
  const [weather, setWeather] = useState({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetch(WEATHER_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('weather')
        return response.json()
      })
      .then((data) => {
        const current = data.current
        const [icon, text] = CODES[current.weather_code] ?? ['🌡️', 'Погода обновлена']
        const isDay = Boolean(current.is_day)
        setWeather({
          status: 'ok',
          isDay,
          icon: isDay ? icon : '🌙',
          text: isDay ? text : 'Сейчас ночь',
          temp: Math.round(current.temperature_2m),
          wind: Math.round(current.wind_speed_10m),
          sunrise: data.daily.sunrise[0].slice(11, 16),
          sunset: data.daily.sunset[0].slice(11, 16),
        })
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setWeather({ status: 'error' })
      })
    return () => controller.abort()
  }, [])

  return weather
}

const clockFormat = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Almaty', hour: '2-digit', minute: '2-digit' })

export function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return clockFormat.format(now)
}
