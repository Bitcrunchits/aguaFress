SELECT 'CREATE DATABASE agua_orders'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'agua_orders'
)\gexec
