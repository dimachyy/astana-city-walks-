import { TRAVEL_MODES, CATEGORY_INFO } from '../lib/constants.js'

const formatDate = (value) => {
  if (!value) return 'Недавно'
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return 'Недавно'
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date)
}

const categoryLabel = (category) => CATEGORY_INFO[category]?.chip || category

export default function RouteHistory({ account, routes, loading, onOpenRoute, onDeleteRoute, onOpenProfile }) {
  return (
    <section className="history-section section-width" id="history">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Твои прогулки</span>
          <h2>История маршрутов</h2>
          <p className="section-subtitle">Сохраняем готовые прогулки в профиле, чтобы вернуться к ним в любой момент.</p>
        </div>
        <span className="history-count">{account ? `${routes.length} сохранено` : 'Только для профиля'}</span>
      </div>

      {!account ? (
        <div className="history-guest">
          <div className="history-guest-icon" aria-hidden="true">↗</div>
          <div>
            <h3>Маршруты будут храниться в твоём профиле</h3>
            <p>Создай аккаунт или войди, чтобы история не пропадала после обновления страницы.</p>
          </div>
          <button type="button" className="history-primary" onClick={onOpenProfile}>Войти или зарегистрироваться</button>
        </div>
      ) : loading ? (
        <div className="history-empty">Загружаем историю маршрутов…</div>
      ) : routes.length === 0 ? (
        <div className="history-empty">
          <span className="history-empty-icon" aria-hidden="true">✦</span>
          <h3>Здесь появятся твои прогулки</h3>
          <p>Собери маршрут выше — после построения он автоматически сохранится в этом разделе.</p>
          <a href="#builder" className="history-link">Создать первый маршрут →</a>
        </div>
      ) : (
        <div className="history-grid">
          {routes.map((route) => {
            const mode = TRAVEL_MODES[route.mode] || TRAVEL_MODES.foot
            return (
              <article className="history-card" key={route.id}>
                <div className="history-card-top">
                  <div className="history-mode" style={{ '--mode-color': mode.color }}>
                    <span aria-hidden="true">{mode.icon}</span>
                    <span>{mode.label}</span>
                  </div>
                  <time>{formatDate(route.createdAt)}</time>
                </div>
                <h3>{route.title}</h3>
                <div className="history-metrics">
                  <span><b>{Number(route.distanceKm || 0).toFixed(1)} км</b><small>расстояние</small></span>
                  <span><b>{route.durationMinutes || 0} мин</b><small>в пути</small></span>
                  <span><b>{route.places?.length || 0}</b><small>места</small></span>
                </div>
                <div className="history-stops">
                  {(route.places || []).slice(0, 4).map((place) => <span key={place.id}>{place.icon || '✦'} {place.name}</span>)}
                  {(route.places || []).length > 4 && <span>+ ещё {(route.places || []).length - 4}</span>}
                </div>
                {route.categories?.length > 0 && (
                  <div className="history-tags">
                    {route.categories.slice(0, 3).map((category) => <span key={category}>{categoryLabel(category)}</span>)}
                  </div>
                )}
                <div className="history-actions">
                  <button type="button" className="history-primary" onClick={() => onOpenRoute(route)}>Открыть на карте →</button>
                  <button type="button" className="history-delete" onClick={() => onDeleteRoute(route.id)} aria-label={`Удалить маршрут ${route.title}`}>Удалить</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
