module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'SF Pro Text',
          'SF Pro Display',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: 'var(--font-size-xs)', // 11px
        sm: 'var(--font-size-sm)', // 12px
        base: 'var(--font-size-base)', // 14px
        lg: 'var(--font-size-lg)', // 16px
        xl: 'var(--font-size-xl)', // 18px
        '2xl': 'var(--font-size-2xl)', // 20px
        '3xl': 'var(--font-size-3xl)', // 24px
      },
    },
  },
  plugins: [],
};
