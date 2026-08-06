-- ═══════════════════════════════════════════════════════════════
--  Seed: Mock Data — products-service
--  5 vendedores × 1-2 categorías × 10 productos c/u
--
--  Crea las tablas si no existen (para que el init container
--  funcione antes de que products-service haga prisma db push).
--  Es idempotente: corre solo si CATEGORIA está vacía.
-- ═══════════════════════════════════════════════════════════════

-- ─── Crear tablas si no existen ─────────────────────────────
CREATE TABLE IF NOT EXISTS "CATEGORIA" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    vendedor_id UUID NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_categoria_vendedor_nombre UNIQUE (vendedor_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_categoria_vendedor ON "CATEGORIA"(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_categoria_vendedor_activo ON "CATEGORIA"(vendedor_id, activo);

CREATE TABLE IF NOT EXISTS "MARCA" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    vendedor_id UUID NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_marca_vendedor_nombre UNIQUE (vendedor_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_marca_vendedor ON "MARCA"(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_marca_vendedor_activo ON "MARCA"(vendedor_id, activo);

CREATE TABLE IF NOT EXISTS "PRODUCTO" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_sin_iva DECIMAL(10,2) NOT NULL,
    precio_final DECIMAL(10,2) NOT NULL,
    imagen VARCHAR(500),
    stock INTEGER NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    mostrar_precio BOOLEAN NOT NULL DEFAULT true,
    porcentaje_iva DECIMAL(5,2) NOT NULL DEFAULT 21.00,
    porcentaje_impuestos DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vendedor_id UUID NOT NULL,
    categoria_id UUID,
    marca_id UUID,
    created_at TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producto_vendedor ON "PRODUCTO"(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON "PRODUCTO"(categoria_id);
CREATE INDEX IF NOT EXISTS idx_producto_marca ON "PRODUCTO"(marca_id);
CREATE INDEX IF NOT EXISTS idx_producto_vendedor_activo ON "PRODUCTO"(vendedor_id, activo);

-- ─── Seed data (solo si no hay categorías) ──────────────────
DO $$
DECLARE
  -- UUIDs de vendedores (mismos que en seed-mock-data.sql)
  v_vend_ferrofix_id    UUID := '20000001-0000-4000-8000-000000000001';
  v_vend_lavaquita_id   UUID := '20000002-0000-4000-8000-000000000002';
  v_vend_sportmax_id    UUID := '20000003-0000-4000-8000-000000000003';
  v_vend_aquaplus_id    UUID := '20000004-0000-4000-8000-000000000004';
  v_vend_manos_id       UUID := '20000005-0000-4000-8000-000000000005';

  -- UUIDs de categorías
  v_cat_ferreteria  UUID := '30000001-0000-4000-8000-000000000001';
  v_cat_lacteos     UUID := '30000002-0000-4000-8000-000000000001';
  v_cat_fiambres    UUID := '30000002-0000-4000-8000-000000000002';
  v_cat_indumentaria UUID := '30000003-0000-4000-8000-000000000001';
  v_cat_calzado     UUID := '30000003-0000-4000-8000-000000000002';
  v_cat_aguas       UUID := '30000004-0000-4000-8000-000000000001';
  v_cat_sodas       UUID := '30000004-0000-4000-8000-000000000002';
  v_cat_decoracion  UUID := '30000005-0000-4000-8000-000000000001';
  v_cat_textil      UUID := '30000005-0000-4000-8000-000000000002';

  -- UUIDs de marcas
  v_marca_stanley   UUID := '40000001-0000-4000-8000-000000000001';
  v_marca_lavaquita UUID := '40000002-0000-4000-8000-000000000001';
  v_marca_sportmax  UUID := '40000003-0000-4000-8000-000000000001';
  v_marca_aquaplus  UUID := '40000004-0000-4000-8000-000000000001';
  v_marca_manos     UUID := '40000005-0000-4000-8000-000000000001';
BEGIN

  IF EXISTS (SELECT 1 FROM "CATEGORIA" LIMIT 1) THEN
    RAISE NOTICE 'CATEGORIA ya tiene datos, se saltea seed de products-service.';
    RETURN;
  END IF;

  -- ═════════════════════════════════════════════════════════
  --  VENDEDOR 1: Ferrofix (Herramientas)
  -- ═════════════════════════════════════════════════════════

  INSERT INTO "CATEGORIA" (id, nombre, orden, activo, vendedor_id, created_at, updated_at)
  VALUES (v_cat_ferreteria, 'Ferretería', 1, true, v_vend_ferrofix_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "MARCA" (id, nombre, activo, vendedor_id, created_at, updated_at)
  VALUES (v_marca_stanley, 'Stanley', true, v_vend_ferrofix_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "PRODUCTO" (id, nombre, descripcion, precio_sin_iva, precio_final, imagen, stock, activo, mostrar_precio, porcentaje_iva, porcentaje_impuestos, vendedor_id, categoria_id, marca_id, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Taladro Percutor 800W', 'Taladro percutor con mandril metálico, 800W, velocidad variable', 15000.00, 18150.00, 'https://picsum.photos/seed/taladro/400/400', 25, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Martillo de Uña 500g', 'Martillo de acero forjado con mango de madera', 4500.00, 5445.00, 'https://picsum.photos/seed/martillo/400/400', 50, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Juego Destornilladores 6pz', 'Set de destornilladores philips y planos con mango ergonómico', 6200.00, 7502.00, 'https://picsum.photos/seed/destor/400/400', 40, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Sierra Circular 1800W', 'Sierra circular con guía láser, corte máximo 65mm', 28000.00, 33880.00, 'https://picsum.photos/seed/sierra/400/400', 10, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Llave Inglesa 12"', 'Llave ajustable en acero cromo-vanadio, 300mm', 8500.00, 10285.00, 'https://picsum.photos/seed/llave/400/400', 35, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Cinta Métrica 5m', 'Cinta métrica retráctil con freno, 19mm de ancho', 2200.00, 2662.00, 'https://picsum.photos/seed/cinta/400/400', 60, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Nivel de Burbuja 60cm', 'Nivel de aluminio con 3 burbujas, precisión 0.5mm/m', 5800.00, 7018.00, 'https://picsum.photos/seed/nivel/400/400', 30, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Alicate Universal 8"', 'Alicate multiuso con corte lateral, mango ergonómico', 4200.00, 5082.00, 'https://picsum.photos/seed/alicate/400/400', 45, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Lijadora Orbital 300W', 'Lijadora orbital con disco velcro, 300W, 12000rpm', 18500.00, 22385.00, 'https://picsum.photos/seed/lijadora/400/400', 15, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW()),
    (gen_random_uuid(), 'Cincel Plano 20mm', 'Cincel de acero para trabajos en hormigón y mampostería', 3200.00, 3872.00, 'https://picsum.photos/seed/cincel/400/400', 55, true, true, 21.00, 0.00, v_vend_ferrofix_id, v_cat_ferreteria, v_marca_stanley, NOW(), NOW());
  RAISE NOTICE 'Productos de Ferrofix creados.';

  -- ═════════════════════════════════════════════════════════
  --  VENDEDOR 2: La Vaquita (Lácteos y Fiambres)
  -- ═════════════════════════════════════════════════════════

  INSERT INTO "CATEGORIA" (id, nombre, orden, activo, vendedor_id, created_at, updated_at) VALUES
    (v_cat_lacteos, 'Lácteos', 1, true, v_vend_lavaquita_id, NOW(), NOW()),
    (v_cat_fiambres, 'Fiambres', 2, true, v_vend_lavaquita_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "MARCA" (id, nombre, activo, vendedor_id, created_at, updated_at)
  VALUES (v_marca_lavaquita, 'La Vaquita', true, v_vend_lavaquita_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "PRODUCTO" (id, nombre, descripcion, precio_sin_iva, precio_final, imagen, stock, activo, mostrar_precio, porcentaje_iva, porcentaje_impuestos, vendedor_id, categoria_id, marca_id, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Leche Entera 1L', 'Leche entera pasteurizada, 1 litro', 1200.00, 1452.00, 'https://picsum.photos/seed/leche/400/400', 100, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_lacteos, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Queso Cremoso x500g', 'Queso cremoso suave, ideal para sandwiches', 3500.00, 4235.00, 'https://picsum.photos/seed/queso-cremoso/400/400', 40, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_lacteos, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Yogurt Natural x1kg', 'Yogurt entero natural sin conservantes', 1800.00, 2178.00, 'https://picsum.photos/seed/yogurt/400/400', 60, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_lacteos, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Manteca x200g', 'Manteca pasteurizada, 200g', 1500.00, 1815.00, 'https://picsum.photos/seed/manteca/400/400', 80, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_lacteos, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Dulce de Leche x500g', 'Dulce de leche cremoso tradicional', 2200.00, 2662.00, 'https://picsum.photos/seed/dulce-leche/400/400', 50, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_lacteos, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Jamón Cocido x300g', 'Jamón cocido natural, cortado en fetas', 2800.00, 3388.00, 'https://picsum.photos/seed/jamon-cocido/400/400', 45, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_fiambres, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Salame Milanes x200g', 'Salame tipo milán, curado natural', 3200.00, 3872.00, 'https://picsum.photos/seed/salame/400/400', 35, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_fiambres, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Panceta Ahumada x250g', 'Panceta de cerdo ahumada en fetas', 3500.00, 4235.00, 'https://picsum.photos/seed/panceta/400/400', 30, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_fiambres, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Mozzarella x400g', 'Mozzarella fresca, ideal para pizzas', 3000.00, 3630.00, 'https://picsum.photos/seed/mozza/400/400', 40, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_fiambres, v_marca_lavaquita, NOW(), NOW()),
    (gen_random_uuid(), 'Ricota x500g', 'Ricota cremosa, ideal para pastas y tartas', 1600.00, 1936.00, 'https://picsum.photos/seed/ricota/400/400', 55, true, true, 21.00, 0.00, v_vend_lavaquita_id, v_cat_fiambres, v_marca_lavaquita, NOW(), NOW());
  RAISE NOTICE 'Productos de La Vaquita creados.';

  -- ═════════════════════════════════════════════════════════
  --  VENDEDOR 3: SportMax (Ropa Deportiva)
  -- ═════════════════════════════════════════════════════════

  INSERT INTO "CATEGORIA" (id, nombre, orden, activo, vendedor_id, created_at, updated_at) VALUES
    (v_cat_indumentaria, 'Indumentaria', 1, true, v_vend_sportmax_id, NOW(), NOW()),
    (v_cat_calzado, 'Calzado', 2, true, v_vend_sportmax_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "MARCA" (id, nombre, activo, vendedor_id, created_at, updated_at)
  VALUES (v_marca_sportmax, 'SportMax', true, v_vend_sportmax_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "PRODUCTO" (id, nombre, descripcion, precio_sin_iva, precio_final, imagen, stock, activo, mostrar_precio, porcentaje_iva, porcentaje_impuestos, vendedor_id, categoria_id, marca_id, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Zapatillas Running Aero', 'Zapatillas ligeras con amortiguación reactiva, suela antideslizante', 45000.00, 54450.00, 'https://picsum.photos/seed/zapatillas/400/400', 20, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_calzado, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Remera Técnica DryFit', 'Remera transpirable de secado rápido, manga corta', 8500.00, 10285.00, 'https://picsum.photos/seed/remera/400/400', 50, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Short Deportivo Premium', 'Short con cintura elástica y bolsillos con cierre', 9500.00, 11495.00, 'https://picsum.photos/seed/short/400/400', 35, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Buzo Oversize Felpa', 'Buzo de felpa con capucha y bolsillo canguro', 18000.00, 21780.00, 'https://picsum.photos/seed/buzo/400/400', 25, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Medias Deportivas 3pz', 'Pack de 3 medias deportivas con refuerzo en talón', 3500.00, 4235.00, 'https://picsum.photos/seed/medias/400/400', 60, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Campera Rompevientos', 'Campera ligera con capucha, resistente al agua', 25000.00, 30250.00, 'https://picsum.photos/seed/campera/400/400', 15, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Gorra Trucker', 'Gorra tipo trucker con malla trasera y ajuste snapback', 6500.00, 7865.00, 'https://picsum.photos/seed/gorra/400/400', 40, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Mochila Deportiva 30L', 'Mochila con compartimento para notebook y bolsillo hidratación', 22000.00, 26620.00, 'https://picsum.photos/seed/mochila/400/400', 18, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Calza Compresiva', 'Calza de compresión graduada para entrenamiento', 14000.00, 16940.00, 'https://picsum.photos/seed/calza/400/400', 30, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW()),
    (gen_random_uuid(), 'Musculosa Deportiva', 'Musculosa de algodón orgánico con panel transpirable', 7200.00, 8712.00, 'https://picsum.photos/seed/musculosa/400/400', 45, true, true, 21.00, 0.00, v_vend_sportmax_id, v_cat_indumentaria, v_marca_sportmax, NOW(), NOW());
  RAISE NOTICE 'Productos de SportMax creados.';

  -- ═════════════════════════════════════════════════════════
  --  VENDEDOR 4: AquaPlus (Aguas y Sodas)
  -- ═════════════════════════════════════════════════════════

  INSERT INTO "CATEGORIA" (id, nombre, orden, activo, vendedor_id, created_at, updated_at) VALUES
    (v_cat_aguas, 'Aguas', 1, true, v_vend_aquaplus_id, NOW(), NOW()),
    (v_cat_sodas, 'Sodas y Saborizadas', 2, true, v_vend_aquaplus_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "MARCA" (id, nombre, activo, vendedor_id, created_at, updated_at)
  VALUES (v_marca_aquaplus, 'AquaPlus', true, v_vend_aquaplus_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "PRODUCTO" (id, nombre, descripcion, precio_sin_iva, precio_final, imagen, stock, activo, mostrar_precio, porcentaje_iva, porcentaje_impuestos, vendedor_id, categoria_id, marca_id, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Agua Mineral 2L', 'Agua mineral natural de manantial, 2 litros', 800.00, 968.00, 'https://picsum.photos/seed/agua-mineral/400/400', 200, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_aguas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Agua con Gas 1.5L', 'Agua mineral carbonatada natural, 1.5 litros', 900.00, 1089.00, 'https://picsum.photos/seed/agua-gas/400/400', 150, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_aguas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Soda Sifón Retornable', 'Sifón de soda retornable, 1 litro', 600.00, 726.00, 'https://picsum.photos/seed/soda-sifon/400/400', 80, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_sodas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Agua Saborizada Limón 1.5L', 'Agua saborizada con jugo natural de limón', 1100.00, 1331.00, 'https://picsum.photos/seed/agua-limon/400/400', 120, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_sodas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Agua Saborizada Pomelo 1.5L', 'Agua saborizada con jugo natural de pomelo', 1100.00, 1331.00, 'https://picsum.photos/seed/agua-pomelo/400/400', 120, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_sodas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Agua Tónica Premium 1L', 'Agua tónica con quinina natural y burbuja fina', 1500.00, 1815.00, 'https://picsum.photos/seed/tonica/400/400', 60, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_sodas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Agua de Coco 500ml', 'Agua de coco natural sin azúcares agregados', 1800.00, 2178.00, 'https://picsum.photos/seed/coco/400/400', 40, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_sodas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Agua Alcalina pH 9.0 1L', 'Agua alcalina ionizada, pH 9.0, 1 litro', 2000.00, 2420.00, 'https://picsum.photos/seed/alcalina/400/400', 50, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_aguas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Pack Agua 6×1.5L', 'Pack de 6 botellas de agua mineral 1.5 litros', 4200.00, 5082.00, 'https://picsum.photos/seed/pack-agua/400/400', 100, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_aguas, v_marca_aquaplus, NOW(), NOW()),
    (gen_random_uuid(), 'Agua con Electrolitos 1L', 'Agua con electrolitos y minerales para hidratación deportiva', 1600.00, 1936.00, 'https://picsum.photos/seed/electrolitos/400/400', 70, true, true, 21.00, 0.00, v_vend_aquaplus_id, v_cat_sodas, v_marca_aquaplus, NOW(), NOW());
  RAISE NOTICE 'Productos de AquaPlus creados.';

  -- ═════════════════════════════════════════════════════════
  --  VENDEDOR 5: Manos Mágicas (Artesanías)
  -- ═════════════════════════════════════════════════════════

  INSERT INTO "CATEGORIA" (id, nombre, orden, activo, vendedor_id, created_at, updated_at) VALUES
    (v_cat_decoracion, 'Decoración', 1, true, v_vend_manos_id, NOW(), NOW()),
    (v_cat_textil, 'Textil Artesanal', 2, true, v_vend_manos_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "MARCA" (id, nombre, activo, vendedor_id, created_at, updated_at)
  VALUES (v_marca_manos, 'Manos Mágicas', true, v_vend_manos_id, NOW(), NOW())
  ON CONFLICT (vendedor_id, nombre) DO NOTHING;

  INSERT INTO "PRODUCTO" (id, nombre, descripcion, precio_sin_iva, precio_final, imagen, stock, activo, mostrar_precio, porcentaje_iva, porcentaje_impuestos, vendedor_id, categoria_id, marca_id, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Tallado en Madera', 'Figura tallada a mano en cedro, diseño único', 8500.00, 10285.00, 'https://picsum.photos/seed/tallado/400/400', 10, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_decoracion, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Cerámica Pintada a Mano', 'Jarro de cerámica esmaltado con diseños andinos', 5500.00, 6655.00, 'https://picsum.photos/seed/ceramica/400/400', 15, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_decoracion, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Cuadro Artesanal Texturizado', 'Cuadro con técnica mixta y texturas naturales, 30×40cm', 12000.00, 14520.00, 'https://picsum.photos/seed/cuadro/400/400', 8, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_decoracion, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Manta Tejida a Mano', 'Manta de lana de oveja tejida en telar, 1.5×2m', 18500.00, 22385.00, 'https://picsum.photos/seed/manta/400/400', 6, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_textil, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Aros de Plata Artesanales', 'Aros de plata 925 con diseño de hojas, hechos a mano', 6500.00, 7865.00, 'https://picsum.photos/seed/aros-plata/400/400', 20, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_decoracion, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Canasta Tejida en Mimbre', 'Canasta decorativa tejida en mimbre natural, 30cm diámetro', 4200.00, 5082.00, 'https://picsum.photos/seed/canasta/400/400', 12, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_decoracion, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Vela Aromática Artesanal', 'Vela de soja con esencia de lavanda, 300g, frasco de vidrio', 2800.00, 3388.00, 'https://picsum.photos/seed/vela/400/400', 30, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_decoracion, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Almohadón Bordado a Mano', 'Almohadón 40×40cm con bordado floral tradicional', 7500.00, 9075.00, 'https://picsum.photos/seed/almohadon/400/400', 10, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_textil, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Portarretrato Tallado', 'Marco de madera tallada a mano para foto 15×20cm', 3800.00, 4598.00, 'https://picsum.photos/seed/portarretrato/400/400', 18, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_decoracion, v_marca_manos, NOW(), NOW()),
    (gen_random_uuid(), 'Móvil Colgante Macramé', 'Móvil decorativo en macramé con plumas y mostacillas', 4500.00, 5445.00, 'https://picsum.photos/seed/macrame/400/400', 12, true, true, 21.00, 0.00, v_vend_manos_id, v_cat_decoracion, v_marca_manos, NOW(), NOW());
  RAISE NOTICE 'Productos de Manos Mágicas creados.';

  -- ═════════════════════════════════════════════════════════
  --  Resumen
  -- ═════════════════════════════════════════════════════════
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '  Seed products-service completado';
  RAISE NOTICE '  5 vendedores, % categorías, 5 marcas, 50 productos',
    (SELECT COUNT(*) FROM "CATEGORIA");
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;
