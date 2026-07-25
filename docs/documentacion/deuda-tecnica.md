# Deuda Técnica y Pendientes

**Actualizado:** Julio 2026

---

## 🟡 Media Prioridad

### 1. Migraciones Prisma no gestionadas automáticamente

Los microservicios comparten la misma instancia PostgreSQL pero con DBs separadas (`agua`, `agua_products`, etc.). Cuando un microservicio usa `prisma db push`, intenta dropear tablas de otros servicios que no están en su schema.

**Solución propuesta:** Usar `prisma migrate` con migrations manuales (como se hizo hoy) o configurar schemas de PostgreSQL separados por microservicio.

**Archivos afectados:**
- `MicroServices/products-service/prisma/migrations/` — migración manual `0001_add_impuestos`
- Todos los microservicios con Prisma

---

### 2. Productos existentes: precioFinal no recalculado automáticamente

Los productos creados antes del modelo A tienen `precioFinal` calculado solo con IVA 21%, pero ese valor persiste aunque ahora la fórmula incluya impuestos. No se recalcula hasta la próxima vez que se edite el producto.

**Solución propuesta:** Script de migración de datos que recalcule `precioFinal` para todos los productos activos usando sus `porcentajeIva` y `porcentajeImpuestos` actuales.

---

### 3. Sin tests de integración para endpoints de productos

Los tests unitarios cubren `PricingService` y `ProductsService`, pero no hay tests que verifiquen el endpoint HTTP completo (`POST /api/v1/products/create`, `GET /api/v1/products/list`, etc.).

**Cobertura actual:** 35 tests unitarios (todos pasando).  
**Cobertura deseada:** Agregar tests de integración contra el gateway + products-service.

---

### 4. Frontend: toggle de ingreso de precio no implementado

Decisión de arquitectura tomada (Julio 2026): el frontend debe implementar un toggle entre "Precio sin IVA" y "Precio final", calculando `precioSinIva` en cliente cuando el vendedor ingresa el precio final.

**Referencia:** `docs/documentacion/modelo-precios.md` — sección "UX Frontend — Toggle Precio Final / Precio sin IVA"

---

## 🟢 Baja Prioridad (V2.0+)

### 5. Modelo B — Impuestos múltiples por producto

Si en el futuro un producto necesita más de un impuesto adicional (ej: IVA + IIBB + tasa municipal), migrar del modelo A (campos fijos) al modelo B (tabla `ImpuestoProducto` con N filas por producto).

### 6. Configuración de impuestos por vendedor

Default de `porcentajeIva` y `porcentajeImpuestos` configurables a nivel de perfil de vendedor, para que los productos nuevos hereden los valores del vendedor en lugar de los defaults globales.

---

## Historial

| Fecha | Item | Estado |
|-------|------|--------|
| Julio 2026 | Migración manual Prisma (products-service) | 🟡 Pendiente de solución permanente |
| Julio 2026 | Recalcular precioFinal en productos legacy | 🟡 Pendiente |
| Julio 2026 | Tests de integración productos | 🟡 Pendiente |
| Julio 2026 | Toggle frontend ingreso de precio | 🟡 Pendiente |

_AguaFress — Deuda Técnica_  
_Julio 2026_
