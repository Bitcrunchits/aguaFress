SELECT 'CREATE DATABASE agua_orders'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'agua_orders'
)\gexec

SELECT 'CREATE DATABASE agua_entregas'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'agua_entregas'
)\gexec
