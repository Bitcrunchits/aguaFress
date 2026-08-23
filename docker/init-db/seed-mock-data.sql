-- ═══════════════════════════════════════════════════════════════
--  Seed: Mock Data — usuario-service
--  5 vendedores × 5 clientes c/u
--  Password para TODOS: admin123 (bcrypt hasheado)
--  Hash: $2b$12$.uec9OLq1KgBpeimcT1MkeepQgTzQk5XH.AvKVnybnL2QP5JqDtQa
--
--  NOTA: los vendedores usan UUIDs fijos (predecibles) para que
--  seed-products-mock.sql pueda referenciarlos desde agua_products.
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_password VARCHAR := '$2b$12$.uec9OLq1KgBpeimcT1MkeepQgTzQk5XH.AvKVnybnL2QP5JqDtQa';

  -- UUIDs fijos de vendedores (compartidos con seed-products-mock.sql)
  v_auth_ferrofix_id    UUID := '10000001-0000-4000-8000-000000000001';
  v_vend_ferrofix_id    UUID := '20000001-0000-4000-8000-000000000001';

  v_auth_lavaquita_id   UUID := '10000002-0000-4000-8000-000000000002';
  v_vend_lavaquita_id   UUID := '20000002-0000-4000-8000-000000000002';

  v_auth_sportmax_id    UUID := '10000003-0000-4000-8000-000000000003';
  v_vend_sportmax_id    UUID := '20000003-0000-4000-8000-000000000003';

  v_auth_aquaplus_id    UUID := '10000004-0000-4000-8000-000000000004';
  v_vend_aquaplus_id    UUID := '20000004-0000-4000-8000-000000000004';

  v_auth_manos_id       UUID := '10000005-0000-4000-8000-000000000005';
  v_vend_manos_id       UUID := '20000005-0000-4000-8000-000000000005';

  -- Lookup vars para CLIENTE inserts
  v_vend_id UUID;
  v_auth_id UUID;
BEGIN

-- ═══════════════════════════════════════════════════════════════
--  VENDEDOR 1: HERRAMIENTAS — "Ferrofix"
--  Carlos Martínez
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'carlos@aguafress.com') THEN
  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
  VALUES (v_auth_ferrofix_id, 'carlos@aguafress.com', v_password, 'vendedor', true, true, NOW(), NOW());

  INSERT INTO "VENDEDOR" (id, auth_user_id, nombre, apellido, dni, telefono, empresa, logo, estado, ciudad_default, created_at, updated_at)
  VALUES (v_vend_ferrofix_id, v_auth_ferrofix_id, 'Carlos', 'Martínez', '20123456', '1122334401', 'Ferrofix', 'https://picsum.photos/seed/ferrofix/200/200', 'activo', 'Córdoba', NOW(), NOW());

  -- 5 clientes para Ferrofix
  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at) VALUES
    (gen_random_uuid(), 'cliente1@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente2@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente3@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente4@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente5@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW());

  RAISE NOTICE 'Vendedor 1 creado: carlos@aguafress.com / admin123 (Herramientas - Ferrofix)';
ELSE
  RAISE NOTICE 'carlos@aguafress.com ya existe, se saltea.';
END IF;

-- Clientes + Cartera de Ferrofix
SELECT id INTO v_vend_id FROM "VENDEDOR" WHERE empresa = 'Ferrofix' LIMIT 1;
IF v_vend_id IS NOT NULL THEN
  INSERT INTO "CLIENTE" (id, auth_user_id, nombre, apellido, dni, telefono, tipo_factura, direccion_calle, direccion_numero, direccion_barrio, direccion_ciudad, direccion_provincia, direccion_cp, misma_direccion_entrega, vendedor_id, created_at, updated_at)
  SELECT gen_random_uuid(), au.id, c.nombre, c.apellido, c.dni, c.tel, c.tf::"TipoFactura", c.calle, c.num, c.barrio, c.ciudad, c.prov, c.cp, true, v_vend_id, NOW(), NOW()
  FROM (VALUES
    ('cliente1@aguafress.com', 'Pedro', 'López', '33445566', '1155660011', 'B', 'Av. Colón', '1234', 'Centro', 'Córdoba', 'Córdoba', '5000'),
    ('cliente2@aguafress.com', 'Marcela', 'Ruíz', '27889900', '1155660012', 'B', 'San Martín', '567', 'Nva Cba', 'Córdoba', 'Córdoba', '5001'),
    ('cliente3@aguafress.com', 'Gustavo', 'Álvarez', '30111222', '1155660013', 'C', 'Belgrano', '890', 'Gral Paz', 'Córdoba', 'Córdoba', '5002'),
    ('cliente4@aguafress.com', 'Laura', 'Fernández', '23455678', '1155660014', 'A', '9 de Julio', '345', 'Alberdi', 'Córdoba', 'Córdoba', '5003'),
    ('cliente5@aguafress.com', 'Diego', 'Moreno', '28999000', '1155660015', 'B', 'Pueyrredón', '678', 'Cerro', 'Córdoba', 'Córdoba', '5004')
  ) AS c(email, nombre, apellido, dni, tel, tf, calle, num, barrio, ciudad, prov, cp)
  JOIN "AUTH_USER" au ON au.email = c.email
  WHERE NOT EXISTS (SELECT 1 FROM "CLIENTE" cl WHERE cl.auth_user_id = au.id);

  INSERT INTO "RELACION_CARTERA" (id, vendedor_id, cliente_id, activo, created_at)
  SELECT gen_random_uuid(), v_vend_id, cl.id, true, NOW()
  FROM "CLIENTE" cl
  WHERE cl.vendedor_id = v_vend_id
    AND NOT EXISTS (SELECT 1 FROM "RELACION_CARTERA" rc WHERE rc.vendedor_id = v_vend_id AND rc.cliente_id = cl.id);

  RAISE NOTICE 'Clientes de Ferrofix creados/verificados.';
END IF;

-- ═══════════════════════════════════════════════════════════════
--  VENDEDOR 2: LÁCTEOS Y FIAMBRES — "La Vaquita"
--  Ana Rodríguez
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'ana@aguafress.com') THEN
  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
  VALUES (v_auth_lavaquita_id, 'ana@aguafress.com', v_password, 'vendedor', true, true, NOW(), NOW());

  INSERT INTO "VENDEDOR" (id, auth_user_id, nombre, apellido, dni, telefono, empresa, logo, estado, ciudad_default, created_at, updated_at)
  VALUES (v_vend_lavaquita_id, v_auth_lavaquita_id, 'Ana', 'Rodríguez', '27123456', '1122334402', 'La Vaquita', 'https://picsum.photos/seed/lavaquita/200/200', 'activo', 'Buenos Aires', NOW(), NOW());

  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at) VALUES
    (gen_random_uuid(), 'cliente6@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente7@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente8@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente9@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente10@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW());

  RAISE NOTICE 'Vendedor 2 creado: ana@aguafress.com / admin123 (Lácteos - La Vaquita)';
ELSE
  RAISE NOTICE 'ana@aguafress.com ya existe, se saltea.';
END IF;

SELECT id INTO v_vend_id FROM "VENDEDOR" WHERE empresa = 'La Vaquita' LIMIT 1;
IF v_vend_id IS NOT NULL THEN
  INSERT INTO "CLIENTE" (id, auth_user_id, nombre, apellido, dni, telefono, tipo_factura, direccion_calle, direccion_numero, direccion_barrio, direccion_ciudad, direccion_provincia, direccion_cp, misma_direccion_entrega, vendedor_id, created_at, updated_at)
  SELECT gen_random_uuid(), au.id, c.nombre, c.apellido, c.dni, c.tel, c.tf::"TipoFactura", c.calle, c.num, c.barrio, c.ciudad, c.prov, c.cp, true, v_vend_id, NOW(), NOW()
  FROM (VALUES
    ('cliente6@aguafress.com', 'Sofía', 'Mendoza', '33440011', '1166770021', 'B', 'Av. Rivadavia', '3400', 'Caballito', 'CABA', 'Buenos Aires', '1424'),
    ('cliente7@aguafress.com', 'Martín', 'Luna', '28765432', '1166770022', 'C', 'Corrientes', '2567', 'Almagro', 'CABA', 'Buenos Aires', '1425'),
    ('cliente8@aguafress.com', 'Valeria', 'Torres', '31222333', '1166770023', 'B', 'Santa Fe', '1789', 'Recoleta', 'CABA', 'Buenos Aires', '1426'),
    ('cliente9@aguafress.com', 'Jorge', 'Acosta', '25678901', '1166770024', 'A', 'Córdoba', '3456', 'Palermo', 'CABA', 'Buenos Aires', '1427'),
    ('cliente10@aguafress.com', 'Florencia', 'Campos', '29334455', '1166770025', 'B', 'Callao', '1234', 'Belgrano', 'CABA', 'Buenos Aires', '1428')
  ) AS c(email, nombre, apellido, dni, tel, tf, calle, num, barrio, ciudad, prov, cp)
  JOIN "AUTH_USER" au ON au.email = c.email
  WHERE NOT EXISTS (SELECT 1 FROM "CLIENTE" cl WHERE cl.auth_user_id = au.id);

  INSERT INTO "RELACION_CARTERA" (id, vendedor_id, cliente_id, activo, created_at)
  SELECT gen_random_uuid(), v_vend_id, cl.id, true, NOW()
  FROM "CLIENTE" cl
  WHERE cl.vendedor_id = v_vend_id
    AND NOT EXISTS (SELECT 1 FROM "RELACION_CARTERA" rc WHERE rc.vendedor_id = v_vend_id AND rc.cliente_id = cl.id);

  RAISE NOTICE 'Clientes de La Vaquita creados/verificados.';
END IF;

-- ═══════════════════════════════════════════════════════════════
--  VENDEDOR 3: ROPA DEPORTIVA — "SportMax"
--  Luis Gómez
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'luis@aguafress.com') THEN
  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
  VALUES (v_auth_sportmax_id, 'luis@aguafress.com', v_password, 'vendedor', true, true, NOW(), NOW());

  INSERT INTO "VENDEDOR" (id, auth_user_id, nombre, apellido, dni, telefono, empresa, logo, estado, ciudad_default, created_at, updated_at)
  VALUES (v_vend_sportmax_id, v_auth_sportmax_id, 'Luis', 'Gómez', '30123456', '1122334403', 'SportMax', 'https://picsum.photos/seed/sportmax/200/200', 'activo', 'Rosario', NOW(), NOW());

  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at) VALUES
    (gen_random_uuid(), 'cliente11@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente12@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente13@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente14@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente15@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW());

  RAISE NOTICE 'Vendedor 3 creado: luis@aguafress.com / admin123 (Ropa Deportiva - SportMax)';
ELSE
  RAISE NOTICE 'luis@aguafress.com ya existe, se saltea.';
END IF;

SELECT id INTO v_vend_id FROM "VENDEDOR" WHERE empresa = 'SportMax' LIMIT 1;
IF v_vend_id IS NOT NULL THEN
  INSERT INTO "CLIENTE" (id, auth_user_id, nombre, apellido, dni, telefono, tipo_factura, direccion_calle, direccion_numero, direccion_barrio, direccion_ciudad, direccion_provincia, direccion_cp, misma_direccion_entrega, vendedor_id, created_at, updated_at)
  SELECT gen_random_uuid(), au.id, c.nombre, c.apellido, c.dni, c.tel, c.tf::"TipoFactura", c.calle, c.num, c.barrio, c.ciudad, c.prov, c.cp, true, v_vend_id, NOW(), NOW()
  FROM (VALUES
    ('cliente11@aguafress.com', 'Camila', 'Roldán', '31222001', '1144550031', 'B', 'Pellegrini', '1500', 'Centro', 'Rosario', 'Santa Fe', '2000'),
    ('cliente12@aguafress.com', 'Federico', 'Paz', '27555123', '1144550032', 'C', 'San Lorenzo', '2345', 'Abasto', 'Rosario', 'Santa Fe', '2001'),
    ('cliente13@aguafress.com', 'Gabriela', 'Sosa', '29888456', '1144550033', 'B', 'Mitre', '678', 'Pichincha', 'Rosario', 'Santa Fe', '2002'),
    ('cliente14@aguafress.com', 'Hernán', 'Castillo', '32111789', '1144550034', 'A', 'Urquiza', '901', 'Echesortu', 'Rosario', 'Santa Fe', '2003'),
    ('cliente15@aguafress.com', 'Julieta', 'Navarro', '24666111', '1144550035', 'B', 'Oroño', '234', 'Fisherton', 'Rosario', 'Santa Fe', '2004')
  ) AS c(email, nombre, apellido, dni, tel, tf, calle, num, barrio, ciudad, prov, cp)
  JOIN "AUTH_USER" au ON au.email = c.email
  WHERE NOT EXISTS (SELECT 1 FROM "CLIENTE" cl WHERE cl.auth_user_id = au.id);

  INSERT INTO "RELACION_CARTERA" (id, vendedor_id, cliente_id, activo, created_at)
  SELECT gen_random_uuid(), v_vend_id, cl.id, true, NOW()
  FROM "CLIENTE" cl
  WHERE cl.vendedor_id = v_vend_id
    AND NOT EXISTS (SELECT 1 FROM "RELACION_CARTERA" rc WHERE rc.vendedor_id = v_vend_id AND rc.cliente_id = cl.id);

  RAISE NOTICE 'Clientes de SportMax creados/verificados.';
END IF;

-- ═══════════════════════════════════════════════════════════════
--  VENDEDOR 4: AGUAS Y SODAS — "AquaPlus"
--  Sofía Díaz
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'sofia@aguafress.com') THEN
  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
  VALUES (v_auth_aquaplus_id, 'sofia@aguafress.com', v_password, 'vendedor', true, true, NOW(), NOW());

  INSERT INTO "VENDEDOR" (id, auth_user_id, nombre, apellido, dni, telefono, empresa, logo, estado, ciudad_default, created_at, updated_at)
  VALUES (v_vend_aquaplus_id, v_auth_aquaplus_id, 'Sofía', 'Díaz', '28123456', '1122334404', 'AquaPlus', 'https://picsum.photos/seed/aquaplus/200/200', 'activo', 'Mendoza', NOW(), NOW());

  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at) VALUES
    (gen_random_uuid(), 'cliente16@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente17@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente18@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente19@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente20@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW());

  RAISE NOTICE 'Vendedor 4 creado: sofia@aguafress.com / admin123 (Aguas - AquaPlus)';
ELSE
  RAISE NOTICE 'sofia@aguafress.com ya existe, se saltea.';
END IF;

SELECT id INTO v_vend_id FROM "VENDEDOR" WHERE empresa = 'AquaPlus' LIMIT 1;
IF v_vend_id IS NOT NULL THEN
  INSERT INTO "CLIENTE" (id, auth_user_id, nombre, apellido, dni, telefono, tipo_factura, direccion_calle, direccion_numero, direccion_barrio, direccion_ciudad, direccion_provincia, direccion_cp, misma_direccion_entrega, vendedor_id, created_at, updated_at)
  SELECT gen_random_uuid(), au.id, c.nombre, c.apellido, c.dni, c.tel, c.tf::"TipoFactura", c.calle, c.num, c.barrio, c.ciudad, c.prov, c.cp, true, v_vend_id, NOW(), NOW()
  FROM (VALUES
    ('cliente16@aguafress.com', 'Ignacio', 'Pereyra', '30111555', '1122330041', 'B', 'San Martín', '567', 'Centro', 'Mendoza', 'Mendoza', '5500'),
    ('cliente17@aguafress.com', 'Rocío', 'Medina', '28666777', '1122330042', 'C', 'Las Heras', '890', 'Godoy Cruz', 'Mendoza', 'Mendoza', '5501'),
    ('cliente18@aguafress.com', 'Emiliano', 'Ríos', '32444999', '1122330043', 'B', 'Belgrano', '123', 'Guaymallén', 'Mendoza', 'Mendoza', '5502'),
    ('cliente19@aguafress.com', 'Luciana', 'Aguirre', '25222111', '1122330044', 'A', 'Sarmiento', '456', 'Maipú', 'Mendoza', 'Mendoza', '5503'),
    ('cliente20@aguafress.com', 'Nicolás', 'Cruz', '29333666', '1122330045', 'B', 'Alvear', '789', 'Luján', 'Mendoza', 'Mendoza', '5504')
  ) AS c(email, nombre, apellido, dni, tel, tf, calle, num, barrio, ciudad, prov, cp)
  JOIN "AUTH_USER" au ON au.email = c.email
  WHERE NOT EXISTS (SELECT 1 FROM "CLIENTE" cl WHERE cl.auth_user_id = au.id);

  INSERT INTO "RELACION_CARTERA" (id, vendedor_id, cliente_id, activo, created_at)
  SELECT gen_random_uuid(), v_vend_id, cl.id, true, NOW()
  FROM "CLIENTE" cl
  WHERE cl.vendedor_id = v_vend_id
    AND NOT EXISTS (SELECT 1 FROM "RELACION_CARTERA" rc WHERE rc.vendedor_id = v_vend_id AND rc.cliente_id = cl.id);

  RAISE NOTICE 'Clientes de AquaPlus creados/verificados.';
END IF;

-- ═══════════════════════════════════════════════════════════════
--  VENDEDOR 5: ARTESANÍAS — "Manos Mágicas"
--  Roberto Vargas
-- ═══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM "AUTH_USER" WHERE email = 'roberto@aguafress.com') THEN
  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at)
  VALUES (v_auth_manos_id, 'roberto@aguafress.com', v_password, 'vendedor', true, true, NOW(), NOW());

  INSERT INTO "VENDEDOR" (id, auth_user_id, nombre, apellido, dni, telefono, empresa, logo, estado, ciudad_default, created_at, updated_at)
  VALUES (v_vend_manos_id, v_auth_manos_id, 'Roberto', 'Vargas', '26789123', '1122334405', 'Manos Mágicas', 'https://picsum.photos/seed/manosmagicas/200/200', 'activo', 'Salta', NOW(), NOW());

  INSERT INTO "AUTH_USER" (id, email, password, role, is_active, is_verified, created_at, updated_at) VALUES
    (gen_random_uuid(), 'cliente21@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente22@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente23@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente24@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'cliente25@aguafress.com', v_password, 'cliente', true, true, NOW(), NOW());

  RAISE NOTICE 'Vendedor 5 creado: roberto@aguafress.com / admin123 (Artesanías - Manos Mágicas)';
ELSE
  RAISE NOTICE 'roberto@aguafress.com ya existe, se saltea.';
END IF;

SELECT id INTO v_vend_id FROM "VENDEDOR" WHERE empresa = 'Manos Mágicas' LIMIT 1;
IF v_vend_id IS NOT NULL THEN
  INSERT INTO "CLIENTE" (id, auth_user_id, nombre, apellido, dni, telefono, tipo_factura, direccion_calle, direccion_numero, direccion_barrio, direccion_ciudad, direccion_provincia, direccion_cp, misma_direccion_entrega, vendedor_id, created_at, updated_at)
  SELECT gen_random_uuid(), au.id, c.nombre, c.apellido, c.dni, c.tel, c.tf::"TipoFactura", c.calle, c.num, c.barrio, c.ciudad, c.prov, c.cp, true, v_vend_id, NOW(), NOW()
  FROM (VALUES
    ('cliente21@aguafress.com', 'Patricia', 'Vega', '27555111', '1166110051', 'B', 'Alvarado', '345', 'Centro', 'Salta', 'Salta', '4400'),
    ('cliente22@aguafress.com', 'Alejandro', 'Mansilla', '30333222', '1166110052', 'C', 'Balcarce', '678', 'San Martín', 'Salta', 'Salta', '4401'),
    ('cliente23@aguafress.com', 'Mariana', 'Coronel', '28888333', '1166110053', 'B', 'Zuviría', '901', 'Nva Cba', 'Salta', 'Salta', '4402'),
    ('cliente24@aguafress.com', 'Fernando', 'Carrizo', '32444455', '1166110054', 'A', 'Santiago del Estero', '234', 'Belgrano', 'Salta', 'Salta', '4403'),
    ('cliente25@aguafress.com', 'Carolina', 'Álamo', '25666333', '1166110055', 'B', 'Mitre', '567', 'Grand Bourg', 'Salta', 'Salta', '4404')
  ) AS c(email, nombre, apellido, dni, tel, tf, calle, num, barrio, ciudad, prov, cp)
  JOIN "AUTH_USER" au ON au.email = c.email
  WHERE NOT EXISTS (SELECT 1 FROM "CLIENTE" cl WHERE cl.auth_user_id = au.id);

  INSERT INTO "RELACION_CARTERA" (id, vendedor_id, cliente_id, activo, created_at)
  SELECT gen_random_uuid(), v_vend_id, cl.id, true, NOW()
  FROM "CLIENTE" cl
  WHERE cl.vendedor_id = v_vend_id
    AND NOT EXISTS (SELECT 1 FROM "RELACION_CARTERA" rc WHERE rc.vendedor_id = v_vend_id AND rc.cliente_id = cl.id);

  RAISE NOTICE 'Clientes de Manos Mágicas creados/verificados.';
END IF;

-- ═══════════════════════════════════════════════════════════════
--  Resumen
-- ═══════════════════════════════════════════════════════════════
RAISE NOTICE '═══════════════════════════════════════════════════';
RAISE NOTICE '  Seed usuario-service completado';
RAISE NOTICE '  Todos los usuarios: password = admin123';
RAISE NOTICE '  Vendedores: carlos, ana, luis, sofia, roberto @aguafress.com';
RAISE NOTICE '  Clientes: cliente1 al cliente25 @aguafress.com';
RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
