/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#1e1b4b',
        },
        status: {
          'pending-bg':   '#fef9c3',
          'pending-text': '#854d0e',
          'confirmed-bg':   '#dcfce7',
          'confirmed-text': '#166534',
          'active-bg':   '#e0e7ff',
          'active-text': '#3730a3',
          'returned-bg':   '#ffedd5',
          'returned-text': '#9a3412',
          'partial-bg':  '#ede9fe',
          'partial-text':'#5b21b6',
          'voided-bg':   '#fee2e2',
          'voided-text': '#991b1b',
        },
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
