# Sprint 0 — Discovery: Reunión de Documentación Existente

**Proyecto:** AguaFress v1.0 (MVP Web)  
**Equipo:** 5 personas  
**Objetivo:** Levantar, catalogar y evaluar TODA la documentación existente  
**Duración sugerida:** 1 semana  
**Tipo:** Sprint de Discovery  
**Velocity:** ~23 SP

---

## 📌 Sprint Goal

> "Saber exactamente QUÉ documentación tenemos, DÓNDE está, y QUÉ gaps tenemos ANTES de planificar qué documentar."

---

## 👥 Distribución del Equipo (Discovery)

| # | Área | Persona | Tareas |
|---|------|---------|--------|
| 1 | Infraestructura | T-01, T-06, T-11 |
| 2 | Base de Datos | T-02, T-07, T-12 |
| 3 | API + Auth | T-03, T-08, T-13 |
| 4 | Módulos Backend | T-04, T-09, T-14 |
| 5 | Frontend | T-05, T-10, T-15 |

---

## Definition of Done del Sprint 0

Al terminar este sprint, el equipo debe tener:

- [ ] **Inventario completo** de toda la documentación existente
- [ ] **Clasificación por tipo** (técnica, requisitos, UI, procesos)
- [ ] **Evaluación de estado** (completo, parcial, desactualizado, obsoleto)
- [ ] **Mapa de gaps** (qué falta para desarrollo)
- [ ] **Índice unificado** de documentación

---

## 🔍 Trabajo de Discovery: Cómo hacer

### Paso 1: Buscar en el repositorio

Buscar por patrones conocidos:

```
**/*.md
**/*.txt
**/*.html
**/*.pdf
**/*.yml / **/*.yaml
**/*.json
**/README*
**/SPEC*
**/requerimientos/**
**/docs/**
```

### Paso 2: Clasificar cada documento

Por cada documento encontrado, responder:

| Campo | Descripción |
|-------|-------------|
| **Nombre** | Nombre del archivo |
| **Ubicación** | Ruta relativa |
| **Tipo** | Requisitos / Arquitectura / API / UI / Proceso /Otro |
| **Estado** | Completo / Parcial / Desactualizado / Obsoleto |
| **Pertinencia** | Alta / Media / Baja (para v1.0) |
| **Owner** | Quién lo creó o mantiene |
| **Última revisión** | Fecha de última actualización |
| **Observaciones** | Notas del reviewer |

### Paso 3: Identificar gaps

Comparar contra lo que NECESITAMOS para desarrollar:

- [ ] README.md
- [ ] .env.example
- [ ] Estructura de proyecto
- [ ] Docker setup
- [ ] ERD / Modelo de datos
- [ ] API docs (OpenAPI/Swagger)
- [ ] Documentación de módulos
- [ ] Arquitectura frontend
- [ ] Wireframes / UI specs
- [ ] Guía de contribución

### Paso 4: Crear índice unificado

Un documento `index.md` que sirva como punto de entrada.

---

## Sprint 0 Backlog Items

### 📋 Tarea 1: Levantar documentación en raíz y carpetas conocidas

| ID | Estimate | Owner | Entregable |
|----|----------|-------|-----------|
| T-01 | 1 SP | Infra | Lista de archivos .md/.txt en raíz |
| T-02 | 1 SP | DB | Lista de archivos en `documentacion/` |
| T-03 | 1 SP | API | Lista de archivos en subcarpetas de `documentacion/` |

### 📋 Tarea 2: Revisar cada documento

| ID | Estimate | Owner | Entregable |
|----|----------|-------|-----------|
| T-04 | 2 SP | Mód | Lectura + clasificación de SPEC.md |
| T-05 | 2 SP | Front | Lectura + clasificación de modulo-auth-users-Requerimientos.md |
| T-06 | 1 SP | Infra | Revisión de diagramas (carpeta diagramas de flujos) |
| T-07 | 1 SP | DB | Revisión de presentaciones (carpeta Presentacion de idea) |
| T-08 | 1 SP | API | Revisión de wireframes |

### 📋 Tarea 3: Evaluar estado

| ID | Estimate | Owner | Entregable |
|----|----------|-------|-----------|
| T-09 | 2 SP | Mód | Evaluación de completitud por documento |
| T-10 | 1 SP | Front | Identificar documentos desactualizados |
| T-11 | 1 SP | Infra | Identificar documentos obsoletos |

### 📋 Tarea 4: Gap analysis

| ID | Estimate | Owner | Entregable |
|----|----------|-------|-----------|
| T-12 | 2 SP | DB | Lista de gaps (qué falta para desarrollo) |
| T-13 | 2 SP | API | Priorización de gaps por blocker |

### 📋 Tarea 5: Entregable final

| ID | Estimate | Owner | Entregable |
|----|----------|-------|-----------|
| T-14 | 2 SP | Mód | Inventario completo (tabla) |
| T-15 | 2 SP | Front | Índice unificado `documentacion/index.md` |

---

## 📊 Estimación Sprint 0

| Tarea | Story Points |
|-------|------------|
| Tarea 1: Buscar | 3 SP |
| Tarea 2: Revisar | 8 SP |
| Tarea 3: Evaluar | 4 SP |
| Tarea 4: Gaps | 4 SP |
| Tarea 5: Entregable | 4 SP |
| **TOTAL** | **~23 SP** |

> Con ~23 SP, es un sprint de 1 semana Intensity-alta o 2 semanas standard.

---

## 📁 Estructura sugerida del inventario

### Tabla de Inventario

| # | Documento | Ubicación | Tipo | Estado | Pertinencia | Owner | Última Revisión |
|---|-----------|-----------|-------|-------|------------|-------|----------------|
| 1 | SPEC.md | / | Requisitos | | | | |
| 2 | modulo-auth-users-Requerimientos.md | documentacion/requerimientos/ | Requisitos | | | | |
| 3 | Diagrama Flujo compra | documentacion/diagramas de flujos/ | Proceso | | | | |
| 4 | Flujo de registro y login | documentacion/diagramas de flujos/ | Proceso | | | |
| 5 | Wireframes v1 | / | UI | | | | |
| 6 | Presentación idea | documentacion/ | Marketing | | | | |

---

## 📦 Entregables del Sprint 0

| Entregable | Descripción |
|----------|--------------|
| **Inventario de documentación** | Tabla con TODOS los documentos encontrados |
| **Gap Analysis** | Lista de qué falta para desarrollo |
| **Índice unificado** | `documentacion/index.md` pointing to todo |

---

## ⏭️ Después del Sprint 0

Con el inventario y gaps levantados, se puede planificar:

1. **Product Backlog de Documentación** — Actualizar con lo QUE REALMENTE falta
2. **Sprint 1** — Empezar por los gaps de prioridad más alta (blockers de desarrollo)

---

## ⚠️ Preguntas para el equipo (a responder en Sprint 0)

Antes de cerrar el Sprint 0, responder:

- [ ] ¿Hay documentos en otras ubicaciones (Google Drive, Notion, papel)?
- [ ] ¿Hay stakeholders con documentación adicional?
- [ ] ¿El cliente tiene specs o requisitos adicionales?
- [ ] ¿Hay docs de versiones anteriores del proyecto?
- [ ] ¿Confirmamos 3 DBs (PostgreSQL, MySQL, MongoDB)?
- [ ] ¿Confirmamos JWT para autenticación?
- [ ] ¿Confirmamos NestJS + React?

---

## Historial

| Versión | Fecha | Descripción |
|---------|-----|-------------|
| 1.0 | Abril 2026 | Versión inicial Sprint 0 |

---

_Sprint 0 Discovery - AguaFress Documentation_
_Abril 2026_