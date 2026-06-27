export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
});

export function validateEnv() {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required`);
  }
}
