export default () => ({
  iva: {
    // Alícuota de IVA usada para calcular precioFinal a partir de precioSinIva.
    // TODO(equipo): confirmar si esto debe ser configurable por vendedor o fijo.
    porcentaje: parseFloat(process.env.IVA_PORCENTAJE ?? '') || 21,
  },
});

export function validateEnv() {
  const required = ['DATABASE_URL'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required`);
  }
}
