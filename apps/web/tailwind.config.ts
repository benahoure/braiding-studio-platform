import type { Config } from 'tailwindcss'

// Braids by Deb palette (ported from braiding-studio-webapp/app/globals.css),
// mapped onto the token names the SPA components already use so every page
// inherits the brand colors without per-file edits.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF7F2',
        'cream-deep': '#F3EBE0',
        'cream-border': '#E4D9CE',
        cocoa: '#0D0D0D',
        espresso: '#111111',
        mocha: '#6B4F3A',
        latte: '#7E6E64',
        gold: '#BFA14A',
        'gold-light': '#D4B86A',
        'gold-pale': '#ECD88A',
        'gold-dark': '#8E7320',
        terracotta: '#C4856E',
        blush: '#F0DED6',
        paper: '#FEFCF9',
        ink: '#080808',
        sand: '#D9CABC',
        beige: '#EDE3D6',
        charcoal: '#3A3228',
        success: '#3A6B44',
        error: '#9B2020',
        warning: '#8B5A00',
        info: '#2C5F7A',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Jost', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        editorial: '0 12px 40px rgba(0, 0, 0, 0.10)',
        soft: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
}

export default config
