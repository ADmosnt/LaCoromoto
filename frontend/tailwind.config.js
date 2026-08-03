/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f6f0fa',
          100: '#ead8f2',
          200: '#d4b1e4',
          300: '#ba86d0',
          400: '#9d5fb8',
          500: '#7e4199',
          600: '#653480',
          700: '#4e2865',
          800: '#391d4b',
          900: '#271235',
        },
        llama: {
          400: '#6a9fd4',
          500: '#4a82bc',
          600: '#356aa0',
        },
        brick: {
          500: '#b4451f',
          600: '#962f12',
        },
        paper: '#f5f2ed',
        ink: '#1e1b26',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Variable', 'system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
