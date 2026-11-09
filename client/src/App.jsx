import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import BuilderCard from './components/BuilderCard.jsx'
import MapSection from './components/MapSection.jsx'
import PopularSection from './components/PopularSection.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import Footer from './components/Footer.jsx'
import { usePlanner } from './hooks/usePlanner.js'
import { useStored } from './hooks/useStored.js'
import { useToast } from './components/toast.jsx'
import { AVATARS } from './lib/constants.js'

export default function App() {
  const toast = useToast()
  const planner = usePlanner()

  const [theme, setTheme] = useStored('citywalk-theme', 'light')
  const [name, setName] = useStored('citywalk-name', '')
  const [avatar, setAvatar] = useStored('citywalk-avatar', AVATARS[0][0])
  const [notes, setNotes] = useStored('citywalk-notes', [])
  const [favorites, setFavorites] = useStored('citywalk-favorites', [])
  const [profileOpen, setProfileOpen] = useState(false)
  const [focus, setFocus] = useState(null) // место, на которое нужно приблизить карту

  const dark = theme === 'dark'
  const safeAvatar = AVATARS.some(([icon]) => icon === avatar) ? avatar : AVATARS[0][0]

  useEffect(() => {
    document.body.classList.toggle('dark-theme', dark)
  }, [dark])

  const showOnMap = useCallback((place, { scroll = false } = {}) => {
    setFocus({ ...place, nonce: Date.now() })
    if (scroll) document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const toggleFavorite = useCallback(
    (place) => {
      setFavorites((prev) => {
        const exists = prev.some((item) => item.id === place.id)
        toast(exists ? `Убрали из сохранённых: ${place.name}` : `Сохранили: ${place.name}`)
        return exists
          ? prev.filter((item) => item.id !== place.id)
          : [...prev, { id: place.id, name: place.name, lat: place.lat, lng: place.lng, icon: place.icon, type: place.type }]
      })
    },
    [setFavorites, toast],
  )

  return (
    <div className="app-shell">
      <Header
        dark={dark}
        onToggleTheme={() => setTheme(dark ? 'light' : 'dark')}
        avatar={safeAvatar}
        onOpenProfile={() => setProfileOpen(true)}
      />
      <main id="top">
        <Hero />
        <section className="builder section-width" id="builder">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Быстрый старт</span>
              <h2>Соберите маршрут за 3 шага</h2>
              <p className="section-subtitle">Выберите время, интересы и район — остальное CityWalk сделает сам.</p>
            </div>
            <span className="step">1–3</span>
          </div>
          <BuilderCard planner={planner} />
        </section>
        <MapSection planner={planner} focus={focus} onShowPlace={showOnMap} favorites={favorites} onToggleFavorite={toggleFavorite} />
        <PopularSection onShowPlace={showOnMap} favorites={favorites} onToggleFavorite={toggleFavorite} />
      </main>
      <Footer />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={String(name)}
        setName={setName}
        avatar={safeAvatar}
        setAvatar={setAvatar}
        notes={Array.isArray(notes) ? notes : []}
        setNotes={setNotes}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onShowPlace={(place) => {
          setProfileOpen(false)
          showOnMap(place, { scroll: true })
        }}
      />
    </div>
  )
}
