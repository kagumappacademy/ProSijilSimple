/** @type {import('tailwindcss').Config} */
export default {
 content:['./index.html','./src/**/*.{js,jsx}'],
 theme:{extend:{
  fontFamily:{sans:['Plus Jakarta Sans','DM Sans','ui-sans-serif','system-ui']},
  colors:{forest:{950:'#102E29',900:'#123E35',800:'#174B40',700:'#21695A',600:'#2C8570',100:'#EAF4EF'},gold:{500:'#BE9858',400:'#D6B77B',100:'#F7EEDC'},ink:'#21312C',canvas:'#F7F9F7'},
  boxShadow:{soft:'0 12px 46px rgba(12,51,41,.07)',glow:'0 24px 65px rgba(18,62,53,.20)'},
  keyframes:{float:{'0%,100%':{transform:'translateY(0)'},'50%':{transform:'translateY(-11px)'}},shimmer:{'0%':{backgroundPosition:'-200% 0'},'100%':{backgroundPosition:'200% 0'}},pulseRing:{'0%':{transform:'scale(.95)',opacity:.5},'100%':{transform:'scale(1.16)',opacity:0}}},
  animation:{float:'float 6s ease-in-out infinite',shimmer:'shimmer 2.6s infinite',ring:'pulseRing 2s ease-out infinite'}
 }},plugins:[]
};
