-- Seed: usuarios de prueba (admin + 2 vendedores)
-- Password para TODOS: admin123 (bcrypt hasheado)
-- Hash: $2b$12$.uec9OLq1KgBpeimcT1MkeepQgTzQk5XH.AvKVnybnL2QP5JqDtQa

DO $$
DECLARE
  v_password VARCHAR := '$2b$12$.uec9OLq1KgBpeimcT1MkeepQgTzQk5XH.AvKVnybnL2QP5JqDtQa';
BEGIN
  -- ════════════════════════════════════════════════
  --  super_admin
  -- ════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'admin@aguafress.com') THEN
    INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
    VALUES ('f76f78b8-857a-4184-9b0e-dc6ce38bc60e'::uuid, 'admin@aguafress.com', v_password, 'super_admin', true, true, NOW(), NOW());

    INSERT INTO "SUPER_ADMIN" (id, auth_user_id, nombre, created_at, updated_at)
    VALUES ('b3ea28b7-530c-4734-a069-f22a70a7afc8'::uuid, 'f76f78b8-857a-4184-9b0e-dc6ce38bc60e'::uuid, 'Admin', NOW(), NOW());

    RAISE NOTICE 'Admin creado: admin@aguafress.com / admin123';
  ELSE
    RAISE NOTICE 'Admin ya existe, se saltea.';
  END IF;

  -- ════════════════════════════════════════════════
  --  Vendedor 1 — Juan Pérez
  -- ════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'juan@aguafress.com') THEN
    INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
    VALUES ('3294a06a-9096-45c2-bdb9-56c7e031eda6'::uuid, 'juan@aguafress.com', v_password, 'vendedor', true, true, NOW(), NOW());

    INSERT INTO "VENDEDOR" (id, auth_user_id, nombre, apellido, dni, telefono, ciudad_default, estado, created_at, updated_at)
    VALUES ('f7991eee-b685-4ac3-9a1a-e1f2651180a5'::uuid, '3294a06a-9096-45c2-bdb9-56c7e031eda6'::uuid, 'Juan', 'Pérez', '12345678', '1122334455', 'Córdoba', 'activo', NOW(), NOW());

    RAISE NOTICE 'Vendedor creado: juan@aguafress.com / admin123';
  ELSE
    RAISE NOTICE 'juan@aguafress.com ya existe, se saltea.';
  END IF;

  -- ════════════════════════════════════════════════
  --  Vendedor 2 — María García
  -- ════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'maria@aguafress.com') THEN
    INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
    VALUES ('d5e65fb7-f31b-4f42-8b5c-8f080bcd3674'::uuid, 'maria@aguafress.com', v_password, 'vendedor', true, true, NOW(), NOW());

    INSERT INTO "VENDEDOR" (id, auth_user_id, nombre, apellido, dni, telefono, ciudad_default, estado, created_at, updated_at)
    VALUES ('a6c4ac09-3288-45fd-8c60-81d401989c27'::uuid, 'd5e65fb7-f31b-4f42-8b5c-8f080bcd3674'::uuid, 'María', 'García', '87654321', '1166778899', 'Buenos Aires', 'activo', NOW(), NOW());

    RAISE NOTICE 'Vendedor creado: maria@aguafress.com / admin123';
  ELSE
    RAISE NOTICE 'maria@aguafress.com ya existe, se saltea.';
  END IF;

  -- ════════════════════════════════════════════════
  --  Cliente — Pedro López (vinculado a Juan)
  -- ════════════════════════════════════════════════
  IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'pedro@aguafress.com') THEN
    INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
    VALUES ('209c9aba-36ba-4493-a360-7756f6c5e5b6'::uuid, 'pedro@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW());

    INSERT INTO "CLIENTE" (
      id, auth_user_id, nombre, apellido, dni, telefono, tipo_factura,
      direccion_calle, direccion_numero, direccion_piso, direccion_barrio, direccion_referencia,
      direccion_ciudad, direccion_provincia, direccion_cp,
      misma_direccion_entrega,
      latitud, longitud,
      vendedor_id, created_at, updated_at
    ) VALUES (
      '04e95d6b-a9af-4ae5-b187-b953e6c09ee4'::uuid,
      '209c9aba-36ba-4493-a360-7756f6c5e5b6'::uuid,
      'Pedro', 'López', '33445566', '1155667788', 'B',
      'Av. Colón', '1234', '3', 'Centro', 'Al lado de la plaza',
      'Córdoba', 'Córdoba', '5000',
      true,
      -31.4167, -64.1833,
      'f7991eee-b685-4ac3-9a1a-e1f2651180a5'::uuid, NOW(), NOW()
    );

    INSERT INTO "RELACION_CARTERA" (id, vendedor_id, cliente_id, activo, created_at)
    VALUES ('640a68d8-5a40-43bf-9dba-b305d5b36fea'::uuid,
            'f7991eee-b685-4ac3-9a1a-e1f2651180a5'::uuid,
            '04e95d6b-a9af-4ae5-b187-b953e6c09ee4'::uuid, true, NOW());

    RAISE NOTICE 'Cliente creado: pedro@aguafress.com / admin123';
  ELSE
    RAISE NOTICE 'pedro@aguafress.com ya existe, se saltea.';
  END IF;
END $$;
