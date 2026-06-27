/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Marca "almacén": verde pino profundo, el color de las puertas de
        // depósito y las cajas de mercado. Reemplaza el índigo genérico.
        brand: {
          50:  '#eef4f0',
          100: '#d4e6db',
          200: '#a9cdb7',
          300: '#7aae93',
          400: '#4e8568',
          500: '#2f6b4f',
          600: '#1f4d3a',
          700: '#173b2d',
          800: '#102b21',
          900: '#0a1f18',
        },
        // Acento "maíz": el amarillo de la harina y los abastos. Reservado
        // para la tasa del día y acciones de mayor jerarquía.
        maiz: {
          400: '#f0b542',
          500: '#e0991a',
          600: '#b97610',
        },
        // Rojo "ladrillo" para acciones destructivas / saldos negativos.
        brick: {
          500: '#b4451f',
          600: '#962f12',
        },
        paper: '#f5f3ef',
        ink: '#211f1a',
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
