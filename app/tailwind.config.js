/**
 * Дизайн-токены проекта — ЕДИНСТВЕННЫЙ источник цветов, шрифтов и отступов.
 * В страницах только эти токены и компоненты `src/components/ui`: сырые hex и
 * произвольные px запрещены (правило CLAUDE.md). Сменить бренд = поменять значения здесь.
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: { sm: '640px', md: '768px', lg: '1100px', xl: '1400px' },
    extend: {
      colors: {
        'page-bg': '#f4f7fb',
        primary: '#0b2545',
        'primary-container': '#13406f',
        'on-primary': '#ffffff',
        accent: '#1f7ae0',
        'primary-fixed': '#d6e3ff',
        surface: '#fbfcfe',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f1f5fa',
        'surface-container': '#eaeff6',
        'surface-container-high': '#e2e9f2',
        'surface-container-highest': '#dae2ee',
        'on-surface': '#171a1f',
        'on-surface-variant': '#434851',
        'outline-variant': '#c3c8d4',
        muted: '#647084',
        success: '#0a7d44',
        warning: '#8b5000',
        danger: '#ba1a1a',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      fontSize: {
        'display-lg': ['32px', { lineHeight: '40px', fontWeight: '800' }],
        'display-lg-mobile': ['24px', { lineHeight: '32px', fontWeight: '800' }],
        'headline-md': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        'label-bold': ['12px', { lineHeight: '16px', fontWeight: '700', letterSpacing: '0.04em' }],
      },
      spacing: { 'card-padding': '20px', 'container-padding': '32px' },
      boxShadow: {
        card: '0 1px 2px rgba(11,37,69,0.06), 0 8px 24px -12px rgba(11,37,69,0.18)',
      },
      borderRadius: { xl: '14px' },
    },
  },
  plugins: [],
};
