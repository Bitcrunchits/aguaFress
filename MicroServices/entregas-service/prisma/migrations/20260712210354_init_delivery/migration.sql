-- CreateEnum
CREATE TYPE "DeliveryEstado" AS ENUM ('pendiente', 'en_camino', 'entregada');

-- CreateTable
CREATE TABLE "DELIVERY" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "vendedor_id" UUID NOT NULL,
    "estado" "DeliveryEstado" NOT NULL DEFAULT 'pendiente',
    "cliente_nombre" VARCHAR(255) NOT NULL,
    "cliente_telefono" VARCHAR(20),
    "direccion_calle" VARCHAR(200) NOT NULL,
    "direccion_numero" VARCHAR(20) NOT NULL,
    "direccion_piso" VARCHAR(20),
    "direccion_referencia" VARCHAR(200),
    "direccion_barrio" VARCHAR(100),
    "direccion_ciudad" VARCHAR(100) NOT NULL,
    "direccion_provincia" VARCHAR(100) NOT NULL,
    "direccion_cp" VARCHAR(20),
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "fecha_asignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_entrega" TIMESTAMP(3),
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DELIVERY_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DELIVERY_order_id_key" ON "DELIVERY"("order_id");
