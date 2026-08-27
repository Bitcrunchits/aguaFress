# Deuda Técnica y Pendientes

**Actualizado:** Agosto 2026

---

## 🔴 Alta Prioridad

### 1. Crear uploads-service para administrar archivos y revisión de contenido

Actualmente los uploads se guardan desde `usuario-service` y `products-service` en un volumen compartido (`agua-uploads`) montado como `/app/public/uploads`, mientras el `gateway` solo los sirve públicamente desde `/uploads/...`.

**Problema:** La responsabilidad está distribuida: servicios de dominio escriben archivos y el gateway los expone. Esto acopla servicios al filesystem compartido y no deja un dueño claro para auditoría, cuarentena, revisión de contenido, ownership, trazabilidad y limpieza de archivos.

**Solución propuesta:** Crear un `uploads-service` dedicado para administrar todo lo referente a revisión de contenido y registros de archivos. El `gateway` queda como entrada pública, valida firma/autenticación, formato y límites de tamaño usando UUID + Multer, y guarda inicialmente cada archivo en cuarentena.

**Flujo objetivo:**
1. El frontend sube el archivo al `gateway`.
2. El `gateway` valida firma/autenticación, formato, tamaño y genera un UUID para el archivo.
3. El `gateway` guarda el archivo en `uploads/quarantine/`.
4. El `uploads-service` registra el upload en MongoDB y revisa el contenido.
5. Si el contenido está aprobado, `uploads-service` ordena moverlo a `uploads/available/`.
6. Solo los archivos en `uploads/available/` se sirven públicamente desde el servidor.

**Estructura propuesta en gateway:**
```txt
uploads/
  quarantine/  # archivos recién subidos, no públicos
  available/   # archivos aprobados y servidos públicamente
```

**Responsabilidades:**
| Componente | Responsabilidad |
|------------|-----------------|
| `gateway` | Recibir archivo, validar firma/formato/tamaño, asignar UUID, guardar en cuarentena y servir solo archivos disponibles. |
| `uploads-service` | Revisar contenido, administrar estado del archivo y guardar registros/auditoría en MongoDB. |
| MongoDB de `uploads-service` | Persistir metadata, estado de revisión, timestamps, owner y resultado de moderación. |
| Servicios de dominio | Guardar solo la referencia final del archivo aprobado; no escribir ni revisar archivos. |

**Archivos afectados:**
- `MicroServices/gateway/src/upload-proxy/` — validar con Multer, UUID, formato y tamaño; escribir primero en cuarentena.
- `MicroServices/gateway/src/main.ts` — servir únicamente `uploads/available/`.
- `MicroServices/uploads-service/` — nuevo microservicio para revisión, estados y registros.
- `MicroServices/products-service/src/common/upload/` — remover escritura física cuando se migre.
- `MicroServices/usuario-service/src/common/upload/` — remover escritura física cuando se migre.
- `docker-compose.yml` — agregar `uploads-service`, MongoDB/DB propia si aplica y revisar/eliminar el volumen compartido actual.

---

## 🟡 Media Prioridad

### 2. Migraciones Prisma no gestionadas automáticamente

Los microservicios comparten la misma instancia PostgreSQL pero con DBs separadas (`agua`, `agua_products`, etc.). Cuando un microservicio usa `prisma db push`, intenta dropear tablas de otros servicios que no están en su schema.

**Solución propuesta:** Usar `prisma migrate` con migrations manuales (como se hizo hoy) o configurar schemas de PostgreSQL separados por microservicio.

**Archivos afectados:**
- `MicroServices/products-service/prisma/migrations/` — migración manual `0001_add_impuestos`
- Todos los microservicios con Prisma

---

### 3. Productos existentes: precioFinal no recalculado automáticamente

Los productos creados antes del modelo A tienen `precioFinal` calculado solo con IVA 21%, pero ese valor persiste aunque ahora la fórmula incluya impuestos. No se recalcula hasta la próxima vez que se edite el producto.

**Solución propuesta:** Script de migración de datos que recalcule `precioFinal` para todos los productos activos usando sus `porcentajeIva` y `porcentajeImpuestos` actuales.

---

### 4. Sin tests de integración para endpoints de productos

Los tests unitarios cubren `PricingService` y `ProductsService`, pero no hay tests que verifiquen el endpoint HTTP completo (`POST /api/v1/products/create`, `GET /api/v1/products/list`, etc.).

**Cobertura actual:** 35 tests unitarios (todos pasando).  
**Cobertura deseada:** Agregar tests de integración contra el gateway + products-service.

---

### 5. Frontend: toggle de ingreso de precio no implementado

Decisión de arquitectura tomada (Julio 2026): el frontend debe implementar un toggle entre "Precio sin IVA" y "Precio final", calculando `precioSinIva` en cliente cuando el vendedor ingresa el precio final.

**Referencia:** `docs/documentacion/modelo-precios.md` — sección "UX Frontend — Toggle Precio Final / Precio sin IVA"

---

## 🟢 Baja Prioridad (V2.0+)

### 6. Modelo B — Impuestos múltiples por producto

Si en el futuro un producto necesita más de un impuesto adicional (ej: IVA + IIBB + tasa municipal), migrar del modelo A (campos fijos) al modelo B (tabla `ImpuestoProducto` con N filas por producto).

### 7. Configuración de impuestos por vendedor

Default de `porcentajeIva` y `porcentajeImpuestos` configurables a nivel de perfil de vendedor, para que los productos nuevos hereden los valores del vendedor en lugar de los defaults globales.

---

## Historial

| Fecha | Item | Estado |
|-------|------|--------|
| Agosto 2026 | Crear uploads-service con cuarentena, revisión y MongoDB | 🔴 Pendiente |
| Julio 2026 | Migración manual Prisma (products-service) | 🟡 Pendiente de solución permanente |
| Julio 2026 | Recalcular precioFinal en productos legacy | 🟡 Pendiente |
| Julio 2026 | Tests de integración productos | 🟡 Pendiente |
| Julio 2026 | Toggle frontend ingreso de precio | 🟡 Pendiente |

_AguaFress — Deuda Técnica_  
_Agosto 2026_
