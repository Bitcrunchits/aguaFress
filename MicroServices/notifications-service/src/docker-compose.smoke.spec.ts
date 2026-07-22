import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const serviceRoot = resolve(__dirname, '..');
const repositoryRoot = resolve(serviceRoot, '..', '..');
const dockerComposePath = resolve(repositoryRoot, 'docker-compose.yml');
const dockerfilePath = resolve(serviceRoot, 'Dockerfile');

function readDockerCompose(): string {
  return readFileSync(dockerComposePath, 'utf8');
}

describe('notifications-service docker smoke wiring', () => {
  it('defines MongoDB with a persistent volume and healthcheck', () => {
    const compose = readDockerCompose();

    expect(compose).toContain('mongo:');
    expect(compose).toContain('image: mongo:7');
    expect(compose).toContain('container_name: agua-mongo');
    expect(compose).toContain('27017:27017');
    expect(compose).toContain('agua-mongo-data:/data/db');
    expect(compose).toContain('mongosh --eval');
    expect(compose).toContain("db.adminCommand('ping')");
    expect(compose).toContain('agua-mongo-data:');
  });

  it('defines notifications-service as a TCP-only container that depends on MongoDB', () => {
    const compose = readDockerCompose();

    expect(existsSync(dockerfilePath)).toBe(true);
    expect(compose).toContain('notifications-service:');
    expect(compose).toContain('dockerfile: MicroServices/notifications-service/Dockerfile');
    expect(compose).toContain('container_name: agua-notifications-service');
    expect(compose).toContain('TCP_PORT: "3016"');
    expect(compose).toContain('MONGODB_URI: "mongodb://mongo:27017/agua_notifications"');
    expect(compose).not.toMatch(/notifications-service:[\s\S]*?env_file:[\s\S]*?- \.env[\s\S]*?gateway:/);
    expect(compose).toContain('mongo:');
    expect(compose).toContain('condition: service_healthy');
  });

  it('passes notifications TCP coordinates to the gateway', () => {
    const compose = readDockerCompose();

    expect(compose).toContain('NOTIFICATIONS_SERVICE_HOST: notifications-service');
    expect(compose).toContain('NOTIFICATIONS_SERVICE_TCP_PORT: "3016"');
    expect(compose).toContain('notifications-service:');
    expect(compose).toContain('condition: service_started');
  });
});
