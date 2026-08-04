# Infrastructure: Products Service Database Isolation

## Purpose

Separate products-service from the shared `agua` database into its own `agua_products` database, enforcing the database-per-service architecture already applied to orders-service (`agua_orders`) and entregas-service (`agua_entregas`).

## Requirements

### Requirement: Database Initialization

The init SQL script MUST create `agua_products` on PostgreSQL startup.

#### Scenario: Database created in init

- GIVEN PostgreSQL is starting via docker-compose
- WHEN `postgres-init` executes `create-service-databases.sql`
- THEN `agua_products` database MUST be created
- AND existing databases `agua`, `agua_orders`, `agua_entregas` MUST remain unchanged

### Requirement: Connection String Update

products-service MUST connect to `agua_products` instead of `agua`.

#### Scenario: Docker compose override

- GIVEN products-service container is starting via docker-compose
- WHEN the service initializes its Prisma connection
- THEN the `DATABASE_URL` environment variable MUST point to `/agua_products`
- AND `prisma db push` MUST succeed against `agua_products`

#### Scenario: Build-time placeholder

- GIVEN the Dockerfile is building the products-service image
- WHEN Prisma generates the client during build
- THEN the placeholder `DATABASE_URL` MUST point to `/agua_products`
- AND the runtime URL MUST override via docker-compose environment

### Requirement: Service Autonomy

products-service MUST NOT depend on the shared `agua` database.

#### Scenario: Isolation verified

- GIVEN products-service is connected to `agua_products`
- WHEN usuario-service is stopped
- THEN products-service MUST continue responding to health checks and API requests

### Requirement: Developer Guidance

`.env.example` SHALL include a commented section for products-service following the pattern of orders-service and entregas-service.

#### Scenario: Commented section present

- GIVEN a developer reads `.env.example`
- WHEN they search for `products-service`
- THEN a commented block SHALL describe the `DATABASE_URL` for running products-service outside compose