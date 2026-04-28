export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        brand: { 50:'#f0f4ff', 100:'#dbe4ff', 500:'#4361ee', 600:'#3a56d4', 700:'#2f4abf', 900:'#1a2a7a' },
        surface: { 900:'#0a0e1a', 800:'#0f1629', 700:'#151d35', 600:'#1c2644', 500:'#243054' },
        accent: { cyan:'#4cc9f0', green:'#06d6a0', purple:'#7209b7', pink:'#f72585', yellow:'#ffd60a' }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate'
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-20px)' } },
        glow: { from: { boxShadow: '0 0 10px #4361ee40' }, to: { boxShadow: '0 0 30px #4361ee80, 0 0 60px #4361ee40' } }
      }
    }
  },
  plugins: []
};
