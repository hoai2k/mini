// The day's almanac, worked out in the browser: the Chinese lunar date, the
// day's stem and branch, the solar term, the moon and the double-hour.

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const STEMS_PINYIN = ['jiǎ', 'yǐ', 'bǐng', 'dīng', 'wù', 'jǐ', 'gēng', 'xīn', 'rén', 'guǐ'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const BRANCHES_PINYIN = ['zǐ', 'chǒu', 'yín', 'mǎo', 'chén', 'sì', 'wǔ', 'wèi', 'shēn', 'yǒu', 'xū', 'hài'];
export const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const STEM_ELEMENTS = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];

// The 24 solar terms, from the spring equinox (sun at 0°) in steps of 15°.
export const SOLAR_TERMS = [
  ['春分', 'Spring Equinox'], ['清明', 'Clear and Bright'], ['穀雨', 'Grain Rain'],
  ['立夏', 'Start of Summer'], ['小滿', 'Grain Buds'], ['芒種', 'Grain in Ear'],
  ['夏至', 'Summer Solstice'], ['小暑', 'Minor Heat'], ['大暑', 'Major Heat'],
  ['立秋', 'Start of Autumn'], ['處暑', 'End of Heat'], ['白露', 'White Dew'],
  ['秋分', 'Autumn Equinox'], ['寒露', 'Cold Dew'], ['霜降', 'Frost Descent'],
  ['立冬', 'Start of Winter'], ['小雪', 'Minor Snow'], ['大雪', 'Major Snow'],
  ['冬至', 'Winter Solstice'], ['小寒', 'Minor Cold'], ['大寒', 'Major Cold'],
  ['立春', 'Start of Spring'], ['雨水', 'Rain Water'], ['驚蟄', 'Awakening of Insects'],
];

const DAY_MS = 86400000;

const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '臘月'];
const NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const LUNAR_DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = i + 1;
  if (d <= 10) return `初${NUMS[d - 1]}`;
  if (d < 20) return `十${NUMS[d - 11]}`;
  if (d === 20) return '二十';
  if (d < 30) return `廿${NUMS[d - 21]}`;
  return '三十';
});

function utcNoon(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

/** Stem-branch of the day. 1 January 2000 was 戊午, number 54 of the sixty. */
export function dayPillar(date) {
  const days = Math.round((utcNoon(date) - Date.UTC(2000, 0, 1, 12)) / DAY_MS);
  const i = (((54 + days) % 60) + 60) % 60;
  return { index: i, zh: STEMS[i % 10] + BRANCHES[i % 12], pinyin: `${STEMS_PINYIN[i % 10]}-${BRANCHES_PINYIN[i % 12]}`, element: STEM_ELEMENTS[i % 10], animal: ANIMALS[i % 12] };
}

/** The sun's apparent ecliptic longitude in degrees (low precision, ~0.01°). */
export function sunLongitude(ms) {
  const d = ms / DAY_MS + 2440587.5 - 2451545.0;
  const g = ((357.529 + 0.98560028 * d) % 360) * Math.PI / 180;
  const q = 280.459 + 0.98564736 * d;
  const l = q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return ((l % 360) + 360) % 360;
}

export function solarTerm(date) {
  const lon = sunLongitude(date.getTime());
  const i = Math.floor(lon / 15) % 24;
  const [zh, en] = SOLAR_TERMS[i];
  return { index: i, zh, en, longitude: lon };
}

/** Moon phase from a known new moon (6 January 2000, 18:14 UTC). */
export function moonPhase(date) {
  const synodic = 29.530588853;
  const age = ((((date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / DAY_MS) % synodic) + synodic) % synodic;
  const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  const idx = Math.floor(((age / synodic) * 8) + 0.5) % 8;
  const illumination = (1 - Math.cos((2 * Math.PI * age) / synodic)) / 2;
  return { age, name: names[idx], illumination, waxing: age < synodic / 2 };
}

/** The double-hour: 子 is 23:00-01:00. */
export function doubleHour(date) {
  const i = Math.floor(((date.getHours() + 1) % 24) / 2);
  return { zh: BRANCHES[i] + '時', pinyin: `${BRANCHES_PINYIN[i]} shí`, animal: ANIMALS[i] };
}

/** The lunar date, from the browser's Chinese calendar if it has one. */
export function lunarDate(date) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('zh-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric' })
      .formatToParts(date).map((p) => [p.type, p.value]));
    const en = Object.fromEntries(new Intl.DateTimeFormat('en-u-ca-chinese', { month: 'numeric', day: 'numeric' })
      .formatToParts(date).map((p) => [p.type, p.value]));
    const yearName = parts.yearName || '';
    const branch = BRANCHES.indexOf(yearName.slice(-1));
    const month = Number.parseInt(en.month, 10) || null;
    const day = Number.parseInt(en.day, 10) || null;
    const leap = /bis|leap|閏|闰/i.test(`${en.month}${parts.month}`);
    return {
      zh: `${yearName}年 ${leap ? '閏' : ''}${LUNAR_MONTHS[month - 1] || ''}${LUNAR_DAYS[day - 1] || ''}`.trim(),
      month,
      leap,
      day,
      yearName,
      animal: branch >= 0 ? ANIMALS[branch] : null,
    };
  } catch {
    return null;
  }
}

export function almanac(date = new Date()) {
  return { date, lunar: lunarDate(date), day: dayPillar(date), term: solarTerm(date), moon: moonPhase(date), hour: doubleHour(date) };
}
