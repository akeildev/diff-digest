/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        animation: {
          'fadeIn': 'fadeIn 0.5s ease-in-out forwards',
          'slideUp': 'slideUp 0.4s ease-out forwards',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          slideUp: {
            '0%': { transform: 'translateY(20px)', opacity: '0' },
            '100%': { transform: 'translateY(0)', opacity: '1' },
          },
        },
        typography: (theme) => ({
          DEFAULT: {
            css: {
              code: {
                backgroundColor: theme('colors.gray.100'),
                borderRadius: theme('borderRadius.DEFAULT'),
                padding: '0.125rem 0.25rem',
                fontWeight: '400'
              },
              'code::before': {
                content: '""',
              },
              'code::after': {
                content: '""',
              },
              pre: {
                backgroundColor: theme('colors.gray.800'),
                color: theme('colors.gray.100'),
                borderRadius: theme('borderRadius.lg'),
                padding: theme('spacing.4'),
              },
              '.dark pre': {
                backgroundColor: theme('colors.gray.900'),
              },
            },
          },
        }),
      },
    },
    plugins: [
      require('@tailwindcss/typography'),
    ],
  };