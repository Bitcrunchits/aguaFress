-- Allow vendors to reuse a category/brand name after soft delete.
-- The old Prisma-level unique constraints included inactive rows forever.

ALTER TABLE "CATEGORIA" DROP CONSTRAINT IF EXISTS "CATEGORIA_vendedor_id_nombre_key";
ALTER TABLE "MARCA" DROP CONSTRAINT IF EXISTS "MARCA_vendedor_id_nombre_key";

DROP INDEX IF EXISTS "CATEGORIA_vendedor_id_nombre_key";
DROP INDEX IF EXISTS "MARCA_vendedor_id_nombre_key";

CREATE UNIQUE INDEX IF NOT EXISTS "CATEGORIA_vendedor_id_nombre_active_key"
  ON "CATEGORIA" ("vendedor_id", "nombre")
  WHERE "activo" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "MARCA_vendedor_id_nombre_active_key"
  ON "MARCA" ("vendedor_id", "nombre")
  WHERE "activo" = true;
