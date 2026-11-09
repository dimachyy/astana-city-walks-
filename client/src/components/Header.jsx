export default function Header({ dark, onToggleTheme, avatar, onOpenProfile }) {
  return (
    <header className="topbar">
      <a className="brand" href="#top">
        <span className="brand-mark" aria-hidden="true">✦</span>
        <span>City<span>Walk</span></span>
      </a>
      <nav className="desktop-nav" aria-label="Разделы сайта">
        <a href="#builder">Создать маршрут</a>
        <a href="#popular">Популярные места</a>
        <a href="#map-section">Карта</a>
        <a href="#about">О сервисе</a>
      </nav>
      <div className="top-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={dark ? 'Включить светлую тему' : 'Включить тёмную тему'}
        >
          {dark ? '☀️' : '☾'}
        </button>
        <button type="button" className="profile-btn" onClick={onOpenProfile} aria-label="Открыть профиль">
          {avatar}
        </button>
      </div>
    </header>
  )
}
