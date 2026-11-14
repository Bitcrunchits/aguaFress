import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * AguaFress preset derived from Aura. Keeps the Aura base and only overrides
 * the primary color scale (deep teal #008ba3 / hover #006f83 / accent #71e0e8)
 * and the button radius so PrimeNG controls align with the "Agua fluida"
 * palette. The `darkModeSelector` stays `.agua-dark` (configured in
 * app.config.ts), so dark variants of the same primary scale apply
 * automatically.
 *
 * Note: the Agua Fluida request (13/11/26) replaces the previous square-corner
 * convention (FMVP-009 `border-radius: 0`). The global radius reset was
 * already removed in styles.scss, and the RQ specifies rounded controls:
 * buttons/fields 24px, cards 22px, header 18px.
 */
export const AguaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#e1f5f7',
      100: '#c5e2e7',
      200: '#a0eef2',
      300: '#71e0e8',
      400: '#26bdcc',
      500: '#008ba3',
      600: '#006f83',
      700: '#00586a',
      800: '#004552',
      900: '#103d4a',
      950: '#071f26',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.600}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.800}',
        },
      },
      dark: {
        primary: {
          color: '{primary.300}',
          contrastColor: '{primary.950}',
          hoverColor: '{primary.200}',
          activeColor: '{primary.100}',
        },
      },
    },
  },
  components: {
    button: {
      root: { borderRadius: '24px' },
    },
  },
});
