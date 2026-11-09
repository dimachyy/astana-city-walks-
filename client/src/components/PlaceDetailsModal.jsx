import { useEffect, useRef } from 'react'
import Reviews from './Reviews.jsx'

export default function PlaceDetailsModal({ place, open, onClose, onShowOnMap, account, favorite, onToggleFavorite }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    closeRef.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!place) return null
  return (
    <div className={`place-modal${open ? ' open' : ''}`} aria-hidden={!open} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <article className="place-window" role="dialog" aria-modal="true" aria-labelledby="place-title">
        <button type="button" className="modal-close" ref={closeRef} onClick={onClose} aria-label="Закрыть">×</button>
        <div className="place-detail-grid">
          <div className="place-detail-photo">
            {place.image ? <img src={place.image} alt={place.name} /> : <span aria-hidden="true">{place.icon || '✦'}</span>}
          </div>
          <div className="place-detail-content">
            <span className="eyebrow">{place.type || 'Место для прогулки'}</span>
            <h2 id="place-title">{place.name}</h2>
            <p className="place-detail-description">{place.description || 'Интересное место для прогулки по Астане.'}</p>
            <div className="place-detail-actions">
              <button type="button" className="detail-primary" onClick={() => { onShowOnMap(place); onClose() }}>Показать на карте</button>
              <button type="button" className={`detail-save${favorite ? ' active' : ''}`} onClick={() => onToggleFavorite(place)}>{favorite ? '♥ Сохранено' : '♡ Сохранить'}</button>
            </div>
            {place.article && <a className="place-detail-link" href={place.article} target="_blank" rel="noreferrer">Подробнее в Wikipedia ↗</a>}
          </div>
        </div>
        <section className="place-reviews-section">
          <h3>Отзывы пользователей</h3>
          <p className="section-subtitle">Поделитесь впечатлением — отзыв сохранится в базе CityWalk.</p>
          <Reviews placeId={place.id} account={account} />
        </section>
      </article>
    </div>
  )
}
