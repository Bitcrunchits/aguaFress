import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * AguaFress preset derived from Aura. Keeps the Aura base and only overrides
 * the primary color scale (petróleo/cian) and the button radius so PrimeNG
 * controls align with the "Agua fluida" palette. The `darkModeSelector` stays
 * `.agua-dark` (configured in app.config.ts), so dark variants of the same
 * primary scale apply automatically.
 *
 * Note: the RQ "Agua fluida" (13/11/26) replaces the previous square-corner
 * convention (FMVP-009 `border-radius: 0`). The global radius reset was
 * already removed in styles.scss, and the RQ specifies rounded controls:
 * buttons/campos 24px, cards 22px, header 18px.
 */
export const AguaPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{cyan.50}',
      100: '{cyan.100}',
      200: '{cyan.200}',
      300: '{cyan.300}',
      400: '{cyan.400}',
      500: '{cyan.500}',
      600: '{cyan.600}',
      700: '{cyan.700}',
      800: '{cyan.800}',
      900: '{cyan.900}',
      950: '{cyan.950}',
    },
  },
  components: {
    button: {
      root: { borderRadius: '24px' },
    },
  },
});
