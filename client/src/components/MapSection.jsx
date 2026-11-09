import CityMap from './CityMap.jsx'

export default function MapSection({ planner: p, focus, onShowPlace, favorites, onToggleFavorite }) {
  const legend = p.nearby.slice(0, 8)

  return (
    <section className="map-section section-width" id="map-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Карта маршрута</span>
          <h2>Места рядом с вами</h2>
          <p className="section-subtitle">Карта находится рядом с выбором мест — отмечайте точки и сразу проверяйте маршрут.</p>
        </div>
        <span className="map-status"><span aria-hidden="true" /> Астана, Казахстан</span>
      </div>

      <div className="map-layout">
        <CityMap places={p.ranked} focus={focus} view={p.view} route={p.route} userLocation={p.userLocation} />

        <aside className="map-legend">
          <h3>Места поблизости</h3>
          <p className="legend-hint">Нажмите на место, чтобы приблизить карту</p>
          {legend.length ? (
            legend.map((place) => {
              const saved = favorites.some((f) => f.id === place.id)
              return (
                <div className="map-place-row" key={place.id}>
                  <button type="button" className="map-place" onClick={() => onShowPlace(place)}>
                    <span className="legend-dot" aria-hidden="true">{place.icon}</span>
                    <span>
                      <b>{place.name}</b>
                      <small>{place.type} · {place.km.toFixed(1)} км</small>
                    </span>
                    <strong aria-hidden="true">›</strong>
                  </button>
                  <button
                    type="button"
                    className={`heart${saved ? ' on' : ''}`}
                    aria-pressed={saved}
                    aria-label={saved ? `Убрать из сохранённых: ${place.name}` : `Сохранить: ${place.name}`}
                    onClick={() => onToggleFavorite(place)}
                  >
                    {saved ? '♥' : '♡'}
                  </button>
                </div>
              )
            })
          ) : (
            <p className="empty-map">
              {p.placesStatus === 'loading' ? 'Загружаем места…' : 'Места появятся после поиска.'}
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}
