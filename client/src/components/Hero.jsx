import { useClock, useWeather } from '../hooks/useWeather.js'

export default function Hero() {
  const weather = useWeather()
  const clock = useClock()
  const ok = weather.status === 'ok'
  const night = ok && !weather.isDay

  return (
    <section className="hero section-width">
      <div className="hero-copy">
        <div className="eyebrow"><span className="pulse" /> Идеи для прогулок по Астане</div>
        <h1>Твоя Астана.<br /><em>Твой маршрут.</em></h1>
        <p>Выбери время и интересы — CityWalk соберёт прогулку по городу именно для тебя.</p>
        <div className="hero-actions">
          <a className="primary-btn" href="#builder">Создать маршрут <span aria-hidden="true">→</span></a>
          <a className="text-btn" href="#popular">Смотреть места</a>
        </div>
      </div>

      <div className={`hero-art${night ? ' night' : ''}`}>
        <div className="sun" />
        <div className="cityline cityline-back" />
        <div className="cityline cityline-front" />
        <div className="hero-note note-one">
          <span aria-hidden="true">{ok ? weather.icon : '☀️'}</span>
          <b>{ok ? `${weather.temp}°` : '—°'}</b>
          <small>
            {weather.status === 'loading' && 'Загрузка погоды…'}
            {weather.status === 'error' && 'Погода временно недоступна'}
            {ok && weather.text}
          </small>
        </div>
        <div className="hero-note note-two">
          <span aria-hidden="true">💨</span>
          <b>{ok ? `${weather.wind} км/ч` : '— км/ч'}</b>
          <small>{ok ? `Рассвет ${weather.sunrise} · закат ${weather.sunset}` : 'Рассвет — · закат —'}</small>
        </div>
        <div className="weather-time">
          <span>Сейчас {clock}</span>
          <small>Астана</small>
        </div>
      </div>
    </section>
  )
}
