import type { Config } from 'tailwindcss';

/**
 * Material Design 3 color system (dark scheme, orange source color).
 * Reference: https://m3.material.io/styles/color/system/overview
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // M3 primary roles
        primary: '#FFB68F',
        'on-primary': '#4E2000',
        'primary-container': '#6F3000',
        'on-primary-container': '#FFDACE',
        // M3 secondary roles (neutral warm)
        'secondary-container': '#4A3C32',
        'on-secondary-container': '#F5DFD3',
        // M3 surface roles (tonal elevation)
        surface: '#17120E',
        'surface-container-lowest': '#120C08',
        'surface-container-low': '#1F1913',
        'surface-container': '#231D17',
        'surface-container-high': '#2E2721',
        'surface-container-highest': '#39322B',
        'on-surface': '#ECE0D8',
        'on-surface-variant': '#D0C4BB',
        // M3 outline roles
        outline: '#998E85',
        'outline-variant': '#4E463F',
        // M3 error roles
        error: '#FFB4AB',
        'error-container': '#93000A',
        'on-error-container': '#FFDAD6',
      },
      borderRadius: {
        // M3 shape scale
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '28px',
      },
      fontFamily: {
        sans: ['var(--font-heebo)', 'Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
