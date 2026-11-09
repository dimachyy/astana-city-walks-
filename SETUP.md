# CityWalk: React-версия

## Куда класть
Распакуйте архив в корень проекта (рядом с `server.cjs`), заменяя файлы.
Перед этим в `client/src/` удалите старое содержимое (`App.jsx`, `App.css`, `index.css`, `assets/`), новые файлы заменят его.

- `server.cjs`, `start-citywalk.cmd`, `package.json` (корень)
- `client/index.html`, `client/vite.config.js` (если у вас другой React-плагин — оставьте свой, добавьте только `server.proxy`)
- `client/src/` — весь новый клиент

## Установка (один раз)
```
npm install
npm --prefix client install
npm --prefix client install leaflet react-leaflet
```
React 18 → `react-leaflet@4`, React 19 → `react-leaflet@5` (смотрите версию react в client/package.json).
Роутер не нужен: сайт одностраничный.

## Запуск
- Разработка: `npm run dev` → http://localhost:5173
- Как раньше, одним файлом: `start-citywalk.cmd` (соберёт клиент и запустит сервер на http://localhost:8000)

## Что можно удалить из корня после проверки
`app.js`, `index.html`, `avatar.css`, `extra.css`, `interactions.css`, `map.css`, `popular.css`, `style.css`, `theme.css`, `ux.css`
