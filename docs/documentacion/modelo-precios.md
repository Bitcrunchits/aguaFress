# Modelo de Precios — AguaFress

**Versión:** 1.0  
**Fecha:** Julio 2026  
**Stack:** PricingService (products-service)

---

## Modelo A — IVA + Impuestos por Producto

Cada producto tiene su propia configuración de impuestos:

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `precioSinIva` | DECIMAL(10,2) | — | Precio base sin IVA ni impuestos (lo manda el vendedor) |
| `porcentajeIva` | DECIMAL(5,2) | `21.00` | Porcentaje de IVA del producto |
| `porcentajeImpuestos` | DECIMAL(5,2) | `0.00` | Porcentaje de impuestos adicionales (IIBB, municipales) |
| `precioFinal` | DECIMAL(10,2) | — | Calculado server-side |

### Cálculo

```
precioFinal = precioSinIva × (1 + porcentajeIva/100 + porcentajeImpuestos/100)

costoIva       = precioSinIva × (porcentajeIva/100)
costoImpuestos = precioSinIva × (porcentajeImpuestos/100)
```

**Ejemplo:** precioSinIva = 150, IVA = 10.5%, impuestos = 3%
```
precioFinal = 150 × (1 + 0.105 + 0.03) = 170.25
costoIva       = 150 × 0.105      = 15.75
costoImpuestos = 150 × 0.03       = 4.50
```

### Response de producto

```json
{
  "precioSinIva": 150,
  "porcentajeIva": 10.5,
  "porcentajeImpuestos": 3,
  "costoIva": 15.75,
  "costoImpuestos": 4.50,
  "precioFinal": 170.25
}
```

---

## Regla de negocio

> **El `precioFinal` SIEMPRE se calcula server-side.**  
> El frontend NUNCA manda `precioFinal`. Solo manda `precioSinIva` y opcionalmente los porcentajes.

### Flujo create
1. Vendedor manda `precioSinIva`, `porcentajeIva` (opcional), `porcentajeImpuestos` (opcional)
2. `PricingService.calcularPrecioFinal()` calcula `precioFinal`
3. Se persisten `precioSinIva`, `porcentajeIva`, `porcentajeImpuestos` y `precioFinal`
4. Response incluye todos los campos calculados

### Flujo update
1. Si cambia `precioSinIva` **o** `porcentajeIva` **o** `porcentajeImpuestos` → se recalcula `precioFinal`
2. Si no cambia ninguno → no se toca `precioFinal`

---

## UX Frontend — Toggle Precio Final / Precio sin IVA

**Decisión de arquitectura (Julio 2026):** el backend solo recibe `precioSinIva`.  
El frontend implementa un toggle para que el vendedor elija cómo ingresar el precio:

```
[○] Ingresar precio sin IVA  → input:  826.45   → muestra: "IVA 21% = 173.55" → total: $1000
[○] Ingresar precio final     → input:  1000     → calcula: sin IVA = 826.45  → total: $1000
```

### Lógica del frontend
| Modo | Lo que ve el vendedor | Lo que se manda al backend |
|------|----------------------|---------------------------|
| Precio sin IVA | Ingresa `826.45` | `precioSinIva: 826.45` |
| Precio final | Ingresa `1000` | `precioSinIva: 1000 / (1 + iva/100 + imp/100)` |

El backend **no necesita cambios** para soportar esta UX. El cálculo inverso (`precioFinal → precioSinIva`) se hace en el frontend.

---

## Configuración global (fallback)

Cuando el producto no especifica `porcentajeIva`, `PricingService` usa:

| Variable de entorno | Clave ConfigService | Default |
|---------------------|-------------------|---------|
| `IVA_PORCENTAJE` | `iva.porcentaje` | `21` |
| — | `impuestos.porcentaje` | `0` |

---

## Migración desde v1.4

La migración fue automática. Los productos existentes heredaron:

| Campo | Valor asignado |
|-------|---------------|
| `porcentajeIva` | `21.00` |
| `porcentajeImpuestos` | `0.00` |

El `precioFinal` existente **no se modificó**. La próxima vez que se actualice el producto se recalculará con la fórmula nueva.

---

## Tests

- **PricingService** (unit): 7 tests — cálculo con defaults, porcentajes custom, redondeo
- **ProductsService** (unit): recalcula al cambiar precioSinIva, porcentajeIva, porcentajeImpuestos
- **Total:** 35 tests, todos pasando

_AguaFress — Modelo de Precios_  
_Julio 2026_
