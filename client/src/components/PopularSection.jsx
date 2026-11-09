import { useEffect, useState } from 'react'
import { fetchPopular } from '../api'
import { FEATURED_FALLBACK } from '../lib/constants.js'

const SHORT = 210

export default function PopularSection({ onShowPlace, favorites, onToggleFavorite }) {
  const [places, setPlaces] = useState(null) // null = загружаем

  useEffect(() => {
    const controller = new AbortController()
    fetchPopular(controller.signal)
      .then(setPlaces)
      .catch((error) => {
        if (error.name !== 'AbortError') setPlaces(FEATURED_FALLBACK)
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="popular-section section-width" id="popular">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Выбор путешественников</span>
          <h2>Популярные места Астаны</h2>
          <p className="section-subtitle">Коротко рассказываем, что это за место, показываем фото сообщества и переносим его на карту.</p>
        </div>
      </div>

      <div className="popular-grid">
        {places === null && <p className="empty-map">Загружаем описания и фотографии…</p>}
        {places?.map((place) => {
          const description = place.description || 'Место для прогулки в Астане.'
          // единый вид места для карты и сохранённых
          const asPlace = { id: place.id, name: place.name, lat: place.lat, lng: place.lon, icon: place.icon || '✦', type: 'Популярное место' }
          const saved = favorites.some((f) => f.id === place.id)
          return (
            <article className="popular-card" key={place.id}>
              <div className="popular-photo">
                {place.image ? (
                  <img src={place.image} alt={place.name} loading="lazy" />
                ) : (
                  <div className="popular-photo-fallback" aria-hidden="true">{place.icon || '✦'}</div>
                )}
                <span className="popular-badge">Популярное место</span>
                <button
                  type="button"
                  className={`heart heart--card${saved ? ' on' : ''}`}
                  aria-pressed={saved}
                  aria-label={saved ? `Убрать из сохранённых: ${place.name}` : `Сохранить: ${place.name}`}
                  onClick={() => onToggleFavorite(asPlace)}
                >
                  {saved ? '♥' : '♡'}
                </button>
              </div>
              <div className="popular-body">
                <h3>{place.name}</h3>
                <p>{description.length > SHORT ? `${description.slice(0, SHORT)}…` : description}</p>
                <div className="popular-meta">
                  <span className="popular-source">{place.image ? 'Фото Wikimedia' : 'Место на карте'}</span>
                  <button type="button" className="popular-open" onClick={() => onShowPlace(asPlace, { scroll: true })}>
                    На карте →
                  </button>
                </div>
                {place.article && (
                  <div className="popular-credit">
                    Описание: <a href={place.article} target="_blank" rel="noreferrer">Wikipedia</a>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
