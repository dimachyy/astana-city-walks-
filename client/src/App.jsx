import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import BuilderCard from './components/BuilderCard.jsx'
import MapSection from './components/MapSection.jsx'
import PopularSection from './components/PopularSection.jsx'
import ProfileModal from './components/ProfileModal.jsx'
import Footer from './components/Footer.jsx'
import { usePlanner } from './hooks/usePlanner.js'
import { useAccount } from './hooks/useAccount.js'
import { useStored } from './hooks/useStored.js'
import { useToast } from './hooks/useToast.js'
import { AVATARS } from './lib/constants.js'

export default function App() {
  const toast = useToast()
  const planner = usePlanner()
  const accountApi = useAccount()

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

  useEffect(() => {
    if (!accountApi.account) return
    setName(accountApi.account.name || '')
    setAvatar(accountApi.account.avatar || AVATARS[0][0])
    setNotes(accountApi.account.notes || [])
    setFavorites(accountApi.account.favorites || [])
  }, [accountApi.account, setAvatar, setFavorites, setName, setNotes])

  const saveProfileField = useCallback((field, value) => {
    if (field === 'name') setName(value)
    if (field === 'avatar') setAvatar(value)
    if (accountApi.account) accountApi.update({ [field]: value }).catch((error) => toast(error.message))
  }, [accountApi, setAvatar, setName, toast])

  const saveNotes = useCallback((value) => {
    setNotes(value)
    if (accountApi.account) accountApi.update({ notes: value }).catch((error) => toast(error.message))
  }, [accountApi, setNotes, toast])

  const showOnMap = useCallback((place, { scroll = false } = {}) => {
    setFocus({ ...place, nonce: Date.now() })
    if (scroll) document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const toggleFavorite = useCallback((place) => {
    const exists = favorites.some((item) => item.id === place.id)
    const next = exists
      ? favorites.filter((item) => item.id !== place.id)
      : [...favorites, { id: place.id, name: place.name, lat: place.lat, lng: place.lng, icon: place.icon, type: place.type }]
    setFavorites(next)
    if (accountApi.account) accountApi.update({ favorites: next }).catch((error) => toast(error.message))
    toast(exists ? `Убрали из сохранённых: ${place.name}` : `Сохранили: ${place.name}`)
  }, [accountApi, favorites, setFavorites, toast])

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
        <PopularSection onShowPlace={showOnMap} favorites={favorites} onToggleFavorite={toggleFavorite} account={accountApi.account} />
      </main>
      <Footer />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        name={String(name)}
        setName={(value) => saveProfileField('name', value)}
        avatar={safeAvatar}
        setAvatar={(value) => saveProfileField('avatar', value)}
        notes={Array.isArray(notes) ? notes : []}
        setNotes={saveNotes}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onShowPlace={(place) => {
          setProfileOpen(false)
          showOnMap(place, { scroll: true })
        }}
        account={accountApi.account}
        accountLoading={accountApi.loading}
        authBusy={accountApi.busy}
        onLogin={accountApi.login}
        onRegister={accountApi.register}
        onLogout={accountApi.logout}
      />
    </div>
  )
}
