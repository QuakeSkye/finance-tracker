/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        paper: '#f6f4ed',
        ink: '#131313',
        signal: '#ef7f45',
        deep: '#1f3a5f',
        mint: '#6eb89e'
      },
      boxShadow: {
        card: '0 20px 60px rgba(19, 19, 19, 0.08)'
      }
    }
  },
  plugins: []
}
