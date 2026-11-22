/**
 * Дизайн-токены проекта — ЕДИНСТВЕННЫЙ источник цветов, шрифтов и отступов.
 * В страницах только эти токены и компоненты `src/components/ui`: сырые hex и
 * произвольные px запрещены (правило CLAUDE.md). Сменить бренд = поменять значения здесь.
 *
 * Бренд по правилу 70 / 25 / 5:
 *   70% Obsidian Black — фон и поверхности (page-bg, surface-*)
 *   25% Ice Grey       — текст, линии, вторичные элементы (on-surface*, outline*, ice)
 *    5% Champagne Gold — только акцент: главная кнопка, активный пункт меню, фокус, ссылки
 * Показатели (статусы, KPI, тосты) — отдельная шкала: positive / negative / warning / info / neutral.
 * Тексты на золоте и статусах — obsidian (on-primary), контраст ≥ 7:1.
 * @type {import('tailwindcss').Config}
 */
const obsidian = {
  950: '#08080A',
  900: '#0E0E11',
  850: '#141418',
  800: '#1A1A1F',
  750: '#212127',
  700: '#2A2A31',
};
const ice = {
  100: '#E6EAEE',
  200: '#C9D0D7',
  400: '#98A2AD',
  600: '#3E444C',
};
const gold = {
  DEFAULT: '#D4B878',
  strong: '#E3CA92',
  soft: '#3A3324',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', md: '768px', lg: '1100px', xl: '1400px' },
    extend: {
      colors: {
        obsidian,
        ice,
        gold,
        'page-bg': obsidian[950],
        // Акцент бренда (5%) — champagne gold
        primary: gold.DEFAULT,
        'primary-container': gold.strong,
        'on-primary': obsidian[950],
        accent: gold.DEFAULT,
        'primary-fixed': gold.soft,
        // Поверхности (70%) — obsidian
        surface: obsidian[900],
        'surface-container-lowest': obsidian[850],
        'surface-container-low': obsidian[800],
        'surface-container': obsidian[750],
        'surface-container-high': obsidian[700],
        'surface-container-highest': '#33333B',
        // Текст и линии (25%) — ice grey
        'on-surface': ice[100],
        'on-surface-variant': ice[200],
        'outline-variant': ice[600],
        muted: ice[400],
        // Показатели
        positive: '#3DCB8E',
        negative: '#FF7B6B',
        warning: '#F2B544',
        info: '#5DAEF5',
        neutral: '#8E9AA8',
        // Совместимость с генератором инструментов
        success: '#3DCB8E',
        danger: '#FF7B6B',
        // Категориальная палитра графиков (проекты, серии): приглушённые, без
        // зелёного/красного — те заняты финансовым смыслом. Порядок = порядок серий.
        chart: {
          1: '#C9B48A', // песочный (родственник gold, но тусклее)
          2: '#7FA3C4', // стальной голубой
          3: '#A58FC2', // пыльная лаванда
          4: '#7FB5B0', // серо-бирюзовый
          5: '#C49A86', // терракотовая пудра
          6: '#9AA5B1', // графит
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Акцентная антиква — только заголовки страниц и крупные цифры
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      letterSpacing: { caps: '0.14em' },
      fontSize: {
        'display-lg': ['44px', { lineHeight: '48px', fontWeight: '400', letterSpacing: '-0.01em' }],
        'display-lg-mobile': ['34px', { lineHeight: '38px', fontWeight: '400', letterSpacing: '-0.01em' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'label-bold': ['12px', { lineHeight: '16px', fontWeight: '700', letterSpacing: '0.04em' }],
      },
      spacing: { 'card-padding': '20px', 'container-padding': '32px' },
      boxShadow: {
        card: '0 1px 0 rgba(230,234,238,0.04) inset, 0 12px 32px -16px rgba(0,0,0,0.8)',
        gold: '0 0 0 1px rgba(212,184,120,0.35), 0 8px 24px -10px rgba(212,184,120,0.35)',
      },
      borderRadius: { xl: '18px' },
    },
  },
  plugins: [],
};
