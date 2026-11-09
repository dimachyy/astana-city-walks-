export const ASTANA_CENTER = [51.1283, 71.4304]
export const MAP_CENTER = ASTANA_CENTER
export const DEFAULT_QUERY = 'Байтерек, Астана'
export const MY_LOCATION = 'Моё местоположение'

export const CATEGORY_INFO = {
  cafe: { icon: '☕', chip: 'Кофейни' },
  architecture: { icon: '🏛️', chip: 'Архитектура' },
  park: { icon: '🌳', chip: 'Парки' },
  photo: { icon: '📸', chip: 'Фотографии' },
}
export const CATEGORY_IDS = Object.keys(CATEGORY_INFO)

export const TIME_PRESETS = [
  { minutes: 60, label: '1 час' },
  { minutes: 120, label: '2 часа' },
  { minutes: 180, label: '3 часа' },
]

export const TRAVEL_MODES = {
  foot: { label: 'Пешком', short: 'Пешком', icon: '🚶', color: '#146b68', hint: 'Расстояние и время прогулки будут рассчитаны автоматически' },
  car: { label: 'На машине', short: 'Машина', icon: '🚗', color: '#d7833c', hint: 'Время рассчитывается по дорожному маршруту' },
  bus: { label: 'На автобусе', short: 'Автобус', icon: '🚌', color: '#5b68c8', hint: 'Покажем примерное время с учётом ожидания автобуса' },
}

export const FALLBACK_LOCATIONS = [
  { id: 'fallback-baiterek', name: 'Байтерек', type: 'Архитектура и культура', category: 'architecture', lat: 51.1283, lng: 71.4304, icon: '🏛️' },
  { id: 'fallback-museum', name: 'Национальный музей', type: 'Архитектура и культура', category: 'architecture', lat: 51.1256, lng: 71.4681, icon: '🏛️' },
  { id: 'fallback-garden', name: 'Ботанический сад', type: 'Парки и природа', category: 'park', lat: 51.0904, lng: 71.4171, icon: '🌳' },
  { id: 'fallback-expo', name: 'Территория EXPO', type: 'Архитектура и культура', category: 'architecture', lat: 51.0907, lng: 71.4188, icon: '🏛️' },
  { id: 'fallback-park', name: 'Парк Влюблённых', type: 'Парки и природа', category: 'park', lat: 51.1322, lng: 71.4237, icon: '🌳' },
  { id: 'fallback-cafe', name: 'Кофейни на Нуржол', type: 'Кафе и еда', category: 'cafe', lat: 51.1288, lng: 71.4318, icon: '☕' },
  { id: 'fallback-photo-embankment', name: 'Набережная Ишима', type: 'Места для фото', category: 'photo', lat: 51.1281, lng: 71.4358, icon: '📸' },
  { id: 'fallback-photo-arbat', name: 'Арбат Астаны', type: 'Места для фото', category: 'photo', lat: 51.1343, lng: 71.4314, icon: '📸' },
  { id: 'fallback-photo-baiterek', name: 'Площадь у Байтерека', type: 'Места для фото', category: 'photo', lat: 51.1283, lng: 71.4304, icon: '📸' },
]

export const FEATURED_FALLBACK = [
  { id: 'featured-baiterek', name: 'Байтерек', lon: 71.4304, lat: 51.1283, icon: '🏛️', description: 'Главная смотровая башня и символ Астаны. С верхнего уровня открывается вид на центр города.', article: 'https://ru.wikipedia.org/wiki/Байтерек' },
  { id: 'featured-museum', name: 'Национальный музей Казахстана', lon: 71.4681, lat: 51.1256, icon: '🏺', description: 'Крупный музей об истории, культуре и искусстве Казахстана.', article: 'https://ru.wikipedia.org/wiki/Национальный_музей_Республики_Казахстан' },
  { id: 'featured-khan', name: 'Хан Шатыр', lon: 71.4037, lat: 51.1326, icon: '🏙️', description: 'Большой торгово-развлекательный центр в форме шатра с магазинами и развлечениями.', article: 'https://ru.wikipedia.org/wiki/Хан-Шатыр' },
  { id: 'featured-peace', name: 'Дворец мира и согласия', lon: 71.4694, lat: 51.1235, icon: '🔺', description: 'Пирамида, посвящённая дружбе и согласию народов Казахстана.', article: 'https://ru.wikipedia.org/wiki/Дворец_мира_и_согласия' },
  { id: 'featured-expo', name: 'Территория EXPO', lon: 71.4188, lat: 51.0907, icon: '🌐', description: 'Современный район с необычной архитектурой, музеями и прогулочными зонами.', article: 'https://ru.wikipedia.org/wiki/Астана_Экспо' },
  { id: 'featured-garden', name: 'Ботанический сад', lon: 71.4171, lat: 51.0904, icon: '🌳', description: 'Большая зелёная территория для прогулок, отдыха и фотографий.', article: 'https://ru.wikipedia.org/wiki/Ботанический_сад_(Астана)' },
  { id: 'featured-opera', name: 'Astana Opera', lon: 71.4307, lat: 51.1286, icon: '🎭', description: 'Один из крупнейших театров Астаны с концертами, операми и балетами.', article: 'https://ru.wikipedia.org/wiki/Astana_Opera' },
  { id: 'featured-mosque', name: 'Мечеть Хазрет Султан', lon: 71.4697, lat: 51.1233, icon: '🕌', description: 'Одна из крупнейших мечетей Центральной Азии с узнаваемой белой архитектурой.', article: 'https://ru.wikipedia.org/wiki/Мечеть_Хазрет_Султан' },
  { id: 'featured-nuralem', name: 'Музей энергии будущего Нур-Алем', lon: 71.4179, lat: 51.0908, icon: '🔵', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Expo%202017%20%22Nur%20Alem%22%20Pavilion%20Space%20Exhibition.jpg?width=900', description: 'Сферическое здание и музей технологий на территории EXPO.', article: 'https://ru.wikipedia.org/wiki/Нур-Алем' },
  { id: 'featured-embankment', name: 'Набережная Ишима', lon: 71.4358, lat: 51.1281, icon: '🌊', description: 'Живописное место для спокойной прогулки, фото и отдыха у реки.', article: 'https://ru.wikipedia.org/wiki/Ишим_(река)' },
  { id: 'featured-lovers-park', name: 'Парк Влюблённых', lon: 71.4237, lat: 51.1322, icon: '🌳', description: 'Небольшой городской парк рядом с прогулочными маршрутами центра.', article: 'https://ru.wikipedia.org/wiki/Парк_Влюблённых_(Астана)' },
]

export const AVATARS = [
  ['🐱', 'Кот-путешественник'],
  ['🐶', 'Собака-путешественник'],
  ['🦒', 'Жираф-путешественник'],
  ['🦏', 'Носорог-путешественник'],
  ['🦩', 'Фламинго-путешественник'],
]
