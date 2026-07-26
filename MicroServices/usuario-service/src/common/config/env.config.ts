export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './public/uploads',
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? '', 10) || 5,
    webpQuality: parseInt(process.env.UPLOAD_WEBP_QUALITY ?? '', 10) || 80,
  },
});

export function validateEnv() {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`${key} is required`);
  }
}
