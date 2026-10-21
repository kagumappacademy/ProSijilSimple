/** @type {import('tailwindcss').Config} */
export default {
 darkMode: 'class',
 content: ['./index.html', './src/**/*.{js,jsx}'],
 theme: {
  extend: {
   fontFamily: {
    sans: [
     '-apple-system',
     'BlinkMacSystemFont',
     'Plus Jakarta Sans',
     'SF Pro Display',
     'SF Pro Text',
     'Roboto',
     'Helvetica Neue',
     'sans-serif',
    ],
   },
   colors: {
    // Red Theme (Minimalist Apple / Material Red spectrum)
    forest: {
     950: '#450a0a', // Deep dark maroon
     900: '#7f1d1d', // Primary deep red (sidebar, header accents)
     800: '#991b1b', // Rich crimson
     700: '#b91c1c', // Ruby red (primary buttons, highlights)
     600: '#dc2626', // Vibrant modern red (Apple style accent)
     500: '#ef4444', // Active red
     400: '#f87171', // Light red accent
     200: '#fecaca', // Border tint
     100: '#fee2e2', // Soft background tint
     50: '#fef2f2',  // Ultra-soft highlight
    },
    gold: {
     500: '#e11d48', // Secondary rose ruby
     400: '#f43f5e',
     100: '#ffe4e6',
    },
    ink: '#0f172a',    // Ultra clean slate-900 typography
    canvas: '#fbfbfd', // Apple signature clean light backdrop
   },
   boxShadow: {
    '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    soft: '0 8px 30px rgba(0, 0, 0, 0.04)',
    glow: '0 12px 40px rgba(185, 28, 28, 0.16)',
    apple: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
   },
   keyframes: {
    float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
    shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
    pulseRing: { '0%': { transform: 'scale(.96)', opacity: '.5' }, '100%': { transform: 'scale(1.15)', opacity: '0' } },
   },
   animation: {
    float: 'float 6s ease-in-out infinite',
    shimmer: 'shimmer 2.6s infinite',
    ring: 'pulseRing 2s ease-out infinite',
   },
  },
 },
 plugins: [],
};
