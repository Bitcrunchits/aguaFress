export default () => ({
  iva: {
    // Alícuota de IVA usada para calcular precioFinal a partir de precioSinIva.
    // TODO(equipo): confirmar si esto debe ser configurable por vendedor o fijo.
    // Usar ?? NOT || para que IVA_PORCENTAJE=0 sea válido.
    porcentaje: (() => {
      const raw = process.env.IVA_PORCENTAJE;
      if (raw === undefined || raw === '') return 21;
      return Number(raw);
    })(),
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './public/uploads',
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? '', 10) || 5,
    webpQuality: parseInt(process.env.UPLOAD_WEBP_QUALITY ?? '', 10) || 80,
  },
});

export function validateEnv() {
  const required = ['DATABASE_URL', 'USUARIO_SERVICE_HOST', 'USUARIO_SERVICE_TCP_PORT'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required`);
  }
}
