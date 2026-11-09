import { useEffect, useRef, useState } from 'react'
import { AVATARS } from '../lib/constants.js'
import { useToast } from './toast.jsx'

export default function ProfileModal({
  open, onClose, name, setName, avatar, setAvatar, notes, setNotes, favorites, onToggleFavorite, onShowPlace,
}) {
  const toast = useToast()
  const [nameDraft, setNameDraft] = useState(name)
  const [noteDraft, setNoteDraft] = useState('')
  const closeRef = useRef(null)

  // при открытии: подтянуть имя, поставить фокус; Escape закрывает окно
  useEffect(() => {
    if (!open) return undefined
    setNameDraft(name)
    closeRef.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const saveName = () => {
    setName(nameDraft.trim())
    toast('Имя сохранено')
  }

  const addNote = () => {
    const text = noteDraft.trim()
    if (!text) return toast('Напиши текст заметки')
    setNotes([text, ...notes])
    setNoteDraft('')
    toast('Заметка сохранена')
  }

  const pickAvatar = (icon) => {
    setAvatar(icon)
    toast('Аватар обновлён')
  }

  return (
    <div
      className={`profile-modal${open ? ' open' : ''}`}
      aria-hidden={!open}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="profile-window" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button type="button" className="modal-close" ref={closeRef} onClick={onClose} aria-label="Закрыть">×</button>

        <div className="profile-head">
          <div className="profile-avatar" aria-hidden="true">{avatar}</div>
          <div>
            <span className="eyebrow">Твой CityWalk</span>
            <h2 id="profile-title">{name ? `Привет, ${name}` : 'Мой профиль'}</h2>
            <p>Сохраняй идеи и заметки для будущих прогулок.</p>
          </div>
        </div>

        <div className="avatar-picker">
          <span>Путешественник:</span>
          {AVATARS.map(([icon, title]) => (
            <button
              key={icon}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={avatar === icon}
              className={avatar === icon ? 'active' : ''}
              onClick={() => pickAvatar(icon)}
            >
              {icon}
            </button>
          ))}
        </div>

        <form className="profile-name" onSubmit={(e) => (e.preventDefault(), saveName())}>
          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Твоё имя" maxLength={30} aria-label="Твоё имя" />
          <button type="submit">Сохранить</button>
        </form>

        <div className="profile-stats">
          <div><b>{favorites.length}</b><small>сохранённых мест</small></div>
          <div><b>{notes.length}</b><small>заметок</small></div>
          <div><b>Астана</b><small>любимый город</small></div>
        </div>

        <section className="saved-box">
          <div className="notes-title">
            <div><span className="eyebrow">Твои находки</span><h3>Сохранённые места</h3></div>
            <span aria-hidden="true">♡</span>
          </div>
          <div className="saved-list">
            {favorites.length ? (
              favorites.map((place) => (
                <div className="saved-row" key={place.id}>
                  <button type="button" className="saved-place" onClick={() => onShowPlace(place)}>
                    <span aria-hidden="true">{place.icon}</span>
                    <b>{place.name}</b>
                    <strong aria-hidden="true">›</strong>
                  </button>
                  <button type="button" className="note-remove" aria-label={`Убрать: ${place.name}`} onClick={() => onToggleFavorite(place)}>×</button>
                </div>
              ))
            ) : (
              <p className="empty-notes">Нажми ♡ на месте, чтобы сохранить его.</p>
            )}
          </div>
        </section>

        <section className="notes-box">
          <div className="notes-title">
            <div><span className="eyebrow">Личные записи</span><h3>Мои заметки</h3></div>
            <span aria-hidden="true">✎</span>
          </div>
          <form className="note-form" onSubmit={(e) => (e.preventDefault(), addNote())}>
            <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Например: сходить в музей в субботу" maxLength={120} aria-label="Новая заметка" />
            <button type="submit">Добавить</button>
          </form>
          <div className="notes-list">
            {notes.length ? (
              notes.map((note, index) => (
                <div className="note-item" key={`${index}-${note}`}>
                  <span aria-hidden="true">✦</span>
                  <p>{note}</p>
                  <button type="button" className="note-remove" aria-label="Удалить заметку" onClick={() => setNotes(notes.filter((_, i) => i !== index))}>×</button>
                </div>
              ))
            ) : (
              <p className="empty-notes">Пока нет заметок. Добавь первую идею прогулки.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
