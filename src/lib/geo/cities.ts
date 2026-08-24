import { ClusterId } from './clusters';

export interface City {
  /** kebab-case id, stable */
  id: string;
  name: { he: string; ru: string; en: string };
  cluster: ClusterId;
}

/**
 * Major Israeli cities grouped by matching cluster.
 * Extensible: add a row here and matching picks it up automatically —
 * no external geo service needed for the MVP.
 */
export const CITIES: City[] = [
  // ── Gush Dan (Tel Aviv metro) ─────────────────────────────────────────
  { id: 'tel-aviv', name: { he: 'תל אביב-יפו', ru: 'Тель-Авив-Яффо', en: 'Tel Aviv-Yafo' }, cluster: 'gush_dan' },
  { id: 'ramat-gan', name: { he: 'רמת גן', ru: 'Рамат-Ган', en: 'Ramat Gan' }, cluster: 'gush_dan' },
  { id: 'givatayim', name: { he: 'גבעתיים', ru: 'Гиватаим', en: 'Givatayim' }, cluster: 'gush_dan' },
  { id: 'bnei-brak', name: { he: 'בני ברק', ru: 'Бней-Брак', en: 'Bnei Brak' }, cluster: 'gush_dan' },
  { id: 'petah-tikva', name: { he: 'פתח תקווה', ru: 'Петах-Тиква', en: 'Petah Tikva' }, cluster: 'gush_dan' },
  { id: 'rishon-lezion', name: { he: 'ראשון לציון', ru: 'Ришон-ле-Цион', en: 'Rishon LeZion' }, cluster: 'gush_dan' },
  { id: 'holon', name: { he: 'חולון', ru: 'Холон', en: 'Holon' }, cluster: 'gush_dan' },
  { id: 'bat-yam', name: { he: 'בת ים', ru: 'Бат-Ям', en: 'Bat Yam' }, cluster: 'gush_dan' },
  { id: 'herzliya', name: { he: 'הרצליה', ru: 'Герцлия', en: 'Herzliya' }, cluster: 'gush_dan' },
  { id: 'raanana', name: { he: 'רעננה', ru: 'Раанана', en: 'Ra\'anana' }, cluster: 'gush_dan' },
  { id: 'kfar-saba', name: { he: 'כפר סבא', ru: 'Кфар-Саба', en: 'Kfar Saba' }, cluster: 'gush_dan' },
  { id: 'hod-hasharon', name: { he: 'הוד השרון', ru: 'Ход-ха-Шарон', en: 'Hod HaSharon' }, cluster: 'gush_dan' },
  { id: 'ramat-hasharon', name: { he: 'רמת השרון', ru: 'Рамат-ха-Шарон', en: 'Ramat HaSharon' }, cluster: 'gush_dan' },
  { id: 'netanya', name: { he: 'נתניה', ru: 'Нетания', en: 'Netanya' }, cluster: 'gush_dan' },
  { id: 'or-yehuda', name: { he: 'אור יהודה', ru: 'Ор-Йехуда', en: 'Or Yehuda' }, cluster: 'gush_dan' },
  { id: 'yehud', name: { he: 'יהוד', ru: 'Йехуд', en: 'Yehud' }, cluster: 'gush_dan' },
  { id: 'kiryat-ono', name: { he: 'קריית אונו', ru: 'Кирьят-Оно', en: 'Kiryat Ono' }, cluster: 'gush_dan' },
  { id: 'givat-shmuel', name: { he: 'גבעת שמואל', ru: 'Гиват-Шмуэль', en: 'Givat Shmuel' }, cluster: 'gush_dan' },
  { id: 'ramla', name: { he: 'רמלה', ru: 'Рамла', en: 'Ramla' }, cluster: 'gush_dan' },
  { id: 'lod', name: { he: 'לוד', ru: 'Лод', en: 'Lod' }, cluster: 'gush_dan' },
  { id: 'rehovot', name: { he: 'רחובות', ru: 'Реховот', en: 'Rehovot' }, cluster: 'gush_dan' },
  { id: 'ness-ziona', name: { he: 'נס ציונה', ru: 'Нес-Циона', en: 'Ness Ziona' }, cluster: 'gush_dan' },
  { id: 'yavne', name: { he: 'יבנה', ru: 'Явне', en: 'Yavne' }, cluster: 'gush_dan' },
  { id: 'elad', name: { he: 'אלעד', ru: 'Эльад', en: 'Elad' }, cluster: 'gush_dan' },

  // ── Jerusalem area ────────────────────────────────────────────────────
  { id: 'jerusalem', name: { he: 'ירושלים', ru: 'Иерусалим', en: 'Jerusalem' }, cluster: 'jerusalem' },
  { id: 'beit-shemesh', name: { he: 'בית שמש', ru: 'Бейт-Шемеш', en: 'Beit Shemesh' }, cluster: 'jerusalem' },
  { id: 'modiin', name: { he: 'מודיעין', ru: 'Модиин', en: 'Modi\'in' }, cluster: 'jerusalem' },
  { id: 'maale-adumim', name: { he: 'מעלה אדומים', ru: 'Маале-Адумим', en: 'Ma\'ale Adumim' }, cluster: 'jerusalem' },
  { id: 'mevaseret-zion', name: { he: 'מבשרת ציון', ru: 'Мевасерет-Цион', en: 'Mevaseret Zion' }, cluster: 'jerusalem' },

  // ── Haifa & North ─────────────────────────────────────────────────────
  { id: 'haifa', name: { he: 'חיפה', ru: 'Хайфа', en: 'Haifa' }, cluster: 'haifa_north' },
  { id: 'hadera', name: { he: 'חדרה', ru: 'Хадера', en: 'Hadera' }, cluster: 'haifa_north' },
  { id: 'kiryat-motzkin', name: { he: 'קריית מוצקין', ru: 'Кирьят-Моцкин', en: 'Kiryat Motzkin' }, cluster: 'haifa_north' },
  { id: 'kiryat-bialik', name: { he: 'קריית ביאליק', ru: 'Кирьят-Бялик', en: 'Kiryat Bialik' }, cluster: 'haifa_north' },
  { id: 'kiryat-yam', name: { he: 'קריית ים', ru: 'Кирьят-Ям', en: 'Kiryat Yam' }, cluster: 'haifa_north' },
  { id: 'akko', name: { he: 'עכו', ru: 'Акко', en: 'Acre' }, cluster: 'haifa_north' },
  { id: 'nahariya', name: { he: 'נהריה', ru: 'Нагария', en: 'Nahariya' }, cluster: 'haifa_north' },
  { id: 'karmiel', name: { he: 'כרמיאל', ru: 'Кармиэль', en: 'Karmiel' }, cluster: 'haifa_north' },
  { id: 'afula', name: { he: 'עפולה', ru: 'Афула', en: 'Afula' }, cluster: 'haifa_north' },
  { id: 'tiberias', name: { he: 'טבריה', ru: 'Тверия', en: 'Tiberias' }, cluster: 'haifa_north' },
  { id: 'safed', name: { he: 'צפת', ru: 'Цфат', en: 'Safed' }, cluster: 'haifa_north' },
  { id: 'nazareth', name: { he: 'נצרת', ru: 'Назарет', en: 'Nazareth' }, cluster: 'haifa_north' },
  { id: 'nesher', name: { he: 'נשר', ru: 'Нешер', en: 'Nesher' }, cluster: 'haifa_north' },
  { id: 'tirat-carmel', name: { he: 'טירת כרמל', ru: 'Тират-Кармель', en: 'Tirat Carmel' }, cluster: 'haifa_north' },
  { id: 'zichron-yaakov', name: { he: 'זכרון יעקב', ru: 'Зихрон-Яаков', en: 'Zichron Ya\'akov' }, cluster: 'haifa_north' },

  // ── South (Beer Sheva & Negev) ────────────────────────────────────────
  { id: 'beer-sheva', name: { he: 'באר שבע', ru: 'Беэр-Шева', en: 'Beer Sheva' }, cluster: 'south' },
  { id: 'ashdod', name: { he: 'אשדוד', ru: 'Ашдод', en: 'Ashdod' }, cluster: 'south' },
  { id: 'ashkelon', name: { he: 'אשקלון', ru: 'Ашкелон', en: 'Ashkelon' }, cluster: 'south' },
  { id: 'kiryat-gat', name: { he: 'קריית גת', ru: 'Кирьят-Гат', en: 'Kiryat Gat' }, cluster: 'south' },
  { id: 'kiryat-malachi', name: { he: 'קריית מלאכי', ru: 'Кирьят-Малахи', en: 'Kiryat Malakhi' }, cluster: 'south' },
  { id: 'sderot', name: { he: 'שדרות', ru: 'Сдерот', en: 'Sderot' }, cluster: 'south' },
  { id: 'netivot', name: { he: 'נתיבות', ru: 'Нетивот', en: 'Netivot' }, cluster: 'south' },
  { id: 'dimona', name: { he: 'דימונה', ru: 'Димона', en: 'Dimona' }, cluster: 'south' },
  { id: 'arad', name: { he: 'ערד', ru: 'Арад', en: 'Arad' }, cluster: 'south' },
  { id: 'ofakim', name: { he: 'אופקים', ru: 'Офаким', en: 'Ofakim' }, cluster: 'south' },
  { id: 'eilat', name: { he: 'אילת', ru: 'Эйлат', en: 'Eilat' }, cluster: 'south' },
];

const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]));

export function getCity(id: string): City | undefined {
  return CITY_BY_ID.get(id);
}

export function getClusterOfCity(cityId: string): ClusterId | undefined {
  return CITY_BY_ID.get(cityId)?.cluster;
}

/** Localized city name helper */
export function cityName(cityId: string, locale: string): string {
  const city = CITY_BY_ID.get(cityId);
  if (!city) return cityId;
  return city.name[locale as keyof City['name']] ?? city.name.en;
}
