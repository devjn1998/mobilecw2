/* eslint-disable @typescript-eslint/no-require-imports */

// Carregar .env.production ANTES de tudo
require('dotenv').config({ path: '.env.production' });

const defaultTheme = require('tailwindcss/defaultTheme');

// Light theme colors
const radixUILightColors = require('./colors/light');
// Dark theme colors
const radixUIDarkColors = require('./colors/dark');

// Black with alpha variations
const blackA = require('./colors/blackA');
// White with alpha variations
const whiteA = require('./colors/whiteA');

const { BrandTokens } = require('./brand');

// DEBUG: Log para verificar cores do .env
console.log('[Tailwind Config] PRIMARY_COLOR env:', process.env.PRIMARY_COLOR);
console.log('[Tailwind Config] EXPO_PUBLIC_PRIMARY_COLOR env:', process.env.EXPO_PUBLIC_PRIMARY_COLOR);
console.log('[Tailwind Config] BrandTokens.colors.primary:', BrandTokens.colors.primary);

const notchatAppColors = {
  ...blackA,
  ...whiteA,
  ...radixUILightColors,
  ...radixUIDarkColors,
  brand: {
    primary: BrandTokens.colors.primary,
    secondary: BrandTokens.colors.secondary,
    accent: BrandTokens.colors.accent,
  },
};

export const twConfig = {
  theme: {
    ...defaultTheme,
    extend: {
      colors: { 
        ...notchatAppColors,
        // Sobrescrever blues do Tailwind com a cor primária do cliente
        blue: {
          50: '#EFF8FF',   // Mantém tons claros
          100: '#DBEEFF',
          200: '#BFE1FF',
          300: '#93CCFF',
          400: '#60ACFF',
          500: process.env.PRIMARY_COLOR || process.env.EXPO_PUBLIC_PRIMARY_COLOR || '#1FB6FF',
          600: process.env.PRIMARY_COLOR || process.env.EXPO_PUBLIC_PRIMARY_COLOR || '#1FB6FF',
          700: process.env.PRIMARY_COLOR || process.env.EXPO_PUBLIC_PRIMARY_COLOR || '#1FB6FF',
          800: '#1E3A5F',
          900: '#1A2F4A',
        },
      },
      fontSize: {
        xs: '12px',
        cxs: '13px',
        md: '15px',
      },
      // We are using individual static Inter font files (e.g., Inter-400-20.ttf) to load different font weights and styles
      // Please refer to the following links for more information:
      // https://medium.com/timeless/adding-custom-variable-fonts-in-react-native-47e0d062bcfc
      // https://medium.com/timeless/adding-custom-variable-fonts-in-react-native-part-ii-d11a979a38f3
      // - Normal/Regular: "inter-normal-20" (400)
      // - Slightly heavier than Regular: "inter-420-20" (400)
      // - Medium: "inter-medium-24" (500)
      // - Between Medium and Semi-bold: "inter-580-24" (600)
      // - Semi-bold: "inter-semibold-24" (600)
      // -  Last numbers (20, 24 etc) are optical sizes.
      fontFamily: {
        'inter-normal-20': ['Inter-400-20'],
        'inter-420-20': ['Inter-420-20'],
        'inter-medium-24': ['Inter-500-24'],
        'inter-580-24': ['Inter-580-24'],
        'inter-semibold-20': ['Inter-600-20'],
      },
    },
  },
  plugins: [],
};
