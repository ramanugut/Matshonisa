import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#14327F', 50: '#EEF2FB', 100: '#DCE5F7', 200: '#B7C7EC', 600: '#14327F', 700: '#102A6B', 800: '#0D2257', 900: '#0A1F4D' },
        brand: { DEFAULT: '#43B02A', 50: '#EFF9EB', 100: '#DDF2D5', 500: '#43B02A', 600: '#379322', 700: '#2D771C', light: '#7FD35F' },
      },
      fontFamily: { sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'] },
      backgroundImage: {
        'grad-deep': 'radial-gradient(900px 420px at 85% -10%, rgba(127,211,95,.35), transparent 60%), linear-gradient(135deg,#0A1F4D 0%,#14327F 100%)',
        'grad-green': 'linear-gradient(135deg,#43B02A 0%,#7FD35F 100%)',
        'grad-soft': 'linear-gradient(180deg,#F4F8FF 0%,#FFFFFF 100%)',
      },
      boxShadow: { card: '0 1px 2px rgba(10,31,77,.06), 0 8px 24px -12px rgba(10,31,77,.18)' },
    },
  },
  plugins: [],
} satisfies Config;
