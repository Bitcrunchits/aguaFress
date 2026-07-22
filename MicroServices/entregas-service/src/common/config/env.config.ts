export function validateEnv() {
  const env = process.env;
  const requiredEnvVars = [
    'DATABASE_URL',
    'TCP_PORT',];
    for (const key of requiredEnvVars) {
        if (!env[key]) throw new Error(`Se requiere: ${key}`);
    }
}