import { useState } from 'react'
import { CATEGORY_IDS, CATEGORY_INFO, TIME_PRESETS, TRAVEL_MODES } from '../lib/constants.js'
import { formatMinutes } from '../lib/geo.js'
import { maxStopsFor } from '../hooks/usePlanner.js'

export default function BuilderCard({ planner: p }) {
  const [interest, setInterest] = useState('')

  const addInterest = () => {
    if (p.addCustomInterest(interest)) setInterest('')
  }

  return (
    <div className="builder-card">
      {/* 1. Время */}
      <h3 className="builder-label">Сколько у тебя времени?</h3>
      <div className="time-list">
        {TIME_PRESETS.map((t) => (
          <button
            key={t.minutes}
            type="button"
            className={`time-option${p.preset === t.minutes && !p.customTime ? ' active' : ''}`}
            aria-pressed={p.preset === t.minutes && !p.customTime}
            onClick={() => p.choosePreset(t.minutes)}
          >
            {t.label}
          </button>
        ))}
        <label className="custom-time">
          <input
            type="number"
            min="15"
            max="480"
            placeholder="Своё время"
            aria-label="Своё время в минутах"
            value={p.customTime}
            onChange={(e) => p.setCustomTime(e.target.value)}
          />
          <span>мин</span>
        </label>
      </div>
      <small className="time-hint">За {formatMinutes(p.minutes)} рекомендуем выбрать до {maxStopsFor(p.minutes)} мест</small>

      {/* 2. Интересы */}
      <h3 className="builder-label">Что тебе интересно? Можно выбрать несколько</h3>
      <div className="mood-list">
        {CATEGORY_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`mood${p.categories.includes(id) ? ' active' : ''}`}
            aria-pressed={p.categories.includes(id)}
            onClick={() => p.toggleCategory(id)}
          >
            {CATEGORY_INFO[id].icon} <span>{CATEGORY_INFO[id].chip}</span>
          </button>
        ))}
        {p.customInterests.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mood${item.active ? ' active' : ''}`}
            aria-pressed={item.active}
            onClick={() => p.toggleCustomInterest(item.id)}
          >
            ✦ <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Район */}
      <div className="area-search">
        <h3 className="builder-label">Где искать места?</h3>
        <form
          className="area-row"
          onSubmit={(e) => {
            e.preventDefault()
            p.searchArea()
          }}
        >
          <label className="route-input">
            <span aria-hidden="true">⌖</span>
            <input
              value={p.areaQuery}
              onChange={(e) => p.setAreaQuery(e.target.value)}
              placeholder="Район или точка Астаны"
              aria-label="Район или точка Астаны"
            />
          </label>
          <button type="submit" className="secondary-btn">Найти рядом</button>
          <button type="button" className="location-btn" onClick={p.locate}>◎ Моё местоположение</button>
        </form>
        <div className="location-status">{p.locationStatus}</div>

        <div className="nearby-title">
          Ближайшие интересные места <span>({p.nearby.length})</span>
        </div>
        <div className="nearby-list">
          {p.nearby.length ? (
            p.nearby.map((place) => (
              <label className="nearby-place" key={place.id}>
                <input
                  type="checkbox"
                  checked={p.selectedIds.includes(place.id)}
                  onChange={() => p.toggleSelected(place.id)}
                />
                <span className="nearby-icon" aria-hidden="true">{place.icon}</span>
                <span>
                  <b>{place.name}</b>
                  <small>{place.type} · {place.km.toFixed(1)} км рядом</small>
                </span>
              </label>
            ))
          ) : (
            <p className="empty-map">{p.placesStatus === 'loading' ? 'Загружаем места…' : 'По этим фильтрам мест не найдено.'}</p>
          )}
        </div>

        <div className="custom-interest">
          <input
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
            placeholder="Добавить свой интерес, например: стрит-арт"
            aria-label="Свой интерес"
          />
          <button type="button" onClick={addInterest}>+ Добавить</button>
        </div>
      </div>

      {/* Способ передвижения */}
      <div className="travel-mode">
        <h3 className="builder-label plain">Как будем добираться?</h3>
        <div className="mode-list">
          {Object.entries(TRAVEL_MODES).map(([id, m]) => (
            <button
              key={id}
              type="button"
              className={`mode-option${p.mode === id ? ' active' : ''}`}
              aria-pressed={p.mode === id}
              onClick={() => p.setMode(id)}
            >
              {m.icon} {m.short}
            </button>
          ))}
        </div>
        <small className="mode-hint">{TRAVEL_MODES[p.mode].hint}</small>
      </div>

      <div className="route-actions">
        <button type="button" className="build-btn" onClick={p.buildRoute} disabled={p.building}>
          {p.building ? 'Ищем маршрут…' : <>Создать маршрут <span aria-hidden="true">→</span></>}
        </button>
        <button type="button" className="clear-btn" onClick={p.clearSelection}>Сбросить выбор</button>
      </div>
      <div className="route-result" role="status">{p.routeText}</div>
    </div>
  )
}
