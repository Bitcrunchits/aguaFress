# Product Backlog — Documentación AguaFress v1.0

**Proyecto:** AguaFress - Plataforma de Pedidos para Distribuidores de Agua  
**Equipo:** 5 personas  
**Versión:** 1.0 (MVP Web)  
**Metodología:** Scrum  
**Última actualización:** Abril 2026

---

## 👥 Distribución por Áreas

| # | Área | Sprint | Docs | SP |
|---|----------|--------|------|-----|
| 1 | **Infraestructura** | 1 | DOC-01 a DOC-04 | 13 |
| 2 | **Base de Datos** | 1 | DOC-05 a DOC-07 | 16 |
| 3 | **API + Auth** | 2 | DOC-08 a DOC-11 | 18 |
| 4 | **Módulos Backend** | 3 | DOC-12 a DOC-14 | 13 |
| 5 | **Frontend** | 4 | DOC-15 a DOC-17 | 13 |

**Sprint 5:** DOC-18 a DOC-22 (repartidos)

---

## 📋 Notas de Contexto

El objetivo es generar TODA la documentación necesaria ANTES de escribir código. Cada story de documentación es un deliverable que permite al equipo desarrollar sin blockers de información.

**Prioridad basada en:**
1. **Blockers de desarrollo** — Lo que impide empezar a picar código
2. **Dependencias entre docs** — Hay docs que se necesitan para otros docs
3. **Valor para el equipo** — Lo que más usan durante desarrollo

---

## MoSCoW: MUST HAVE (Para poder desarrollar)

### 1. Infraestructura y Setup

| ID | Prioridad | Encargado | Estimate | Descripción | Definition of Done |
|----|-----------|-----------|----------|-------------|-------------------|
| DOC-01 | Must | Infra | 2 | README.md con setup | EXISTS: README.md con cómo clonar, instalar deps, configurar .env, iniciar servicios |
| DOC-02 | Must | Infra | 3 | .env.example | EXISTS: archivo con TODAS las variables comentadas y valores placeholder |
| DOC-03 | Must | Infra | 3 | Estructura de directorios | EXISTE: documento con estructura carpetas backend y frontend |
| DOC-04 | Must | Infra | 5 | Guía Docker y docker-compose | EXISTE: guía con servicios, un comando para levantar todo, verificar, ver logs |

### 2. Base de Datos y Modelos

| ID | Prioridad | Encargado | Estimate | Descripción | Definition of Done |
|----|-----------|-----------|----------|-------------|-------------------|
| DOC-05 | Must | DB | 8 | ERD completo | EXISTE: diagrama con tablas, FK, cardinalidades, tipos de datos |
| DOC-06 | Must | DB | 3 | Especificación 3 motores DB | EXISTE: documento qué datos en cada motor y justificación |
| DOC-07 | Must | DB | 5 | Mapeo TypeORM/NestJS entities | EXISTE: por cada entidad @Entity, @Column, @OneToMany, validaciones |

### 3. API y Endpoints

| ID | Prioridad | Encargado | Estimate | Descripción | Definition of Done |
|----|-----------|-----------|----------|-------------|-------------------|
| DOC-08 | Must | API | 8 | Documentación API OpenAPI/Swagger | EXISTE: doc con endpoints, path, método, params, body, response |
| DOC-09 | Must | API | 3 | Guía de autenticación y autorización | EXISTE: cómo funciona JWT, estructura token, guards |
| DOC-10 | Must | API | 2 | Códigos de error estándar | EXISTE: lista de códigos 400, 401, 403, 404, 500 con significado |
| DOC-11 | Must | API | 5 | Detalle módulo Auth + Users | EXISTE: flujos login/registro, estrategias Passport, DTOs |

### 4. Módulos Backend

| ID | Prioridad | Encargado | Estimate | Descripción | Definition of Done |
|----|-----------|-----------|----------|-------------|-------------------|
| DOC-12 | Must | Mód | 5 | Módulo Productos | EXISTE: endpoints, entidad, manejo de fotos, búsqueda |
| DOC-13 | Must | Mód | 5 | Módulo Órdenes | EXISTE: estados, transiciones, cálculo precios |
| DOC-14 | Must | Mód | 3 | Módulo Analytics | EXISTE: queries para informes, métricas |

### 5. Frontend

| ID | Prioridad | Encargado | Estimate | Descripción | Definition of Done |
|----|-----------|-----------|----------|-------------|-------------------|
| DOC-15 | Must | Front | 5 | Guía arquitectura Frontend | EXISTE: patrón usado, estructura carpetas, gestión estado, routing |
| DOC-16 | Must | Front | 3 | Diseño de UI (wireframes) | EXISTE: wireframes vistas principales, breakpoints, responsive |
| DOC-17 | Must | Front | 5 | Guía integración API-Frontend | EXISTE: axios config, manejo JWT, manejo errores, servicios |

---

## 🟡 SHOULD HAVE (Mejora calidad del desarrollo)

| ID | Prioridad | Encargado | Estimate | Descripción | Definition of Done |
|----|-----------|----------|----------|-------------|-------------------|
| DOC-18 | Should | Infra | 3 | Guía de contribución | EXISTE: Git flow, conventional commits, PRs |
| DOC-19 | Should | DB | 3 | Estrategia de testing | EXISTE: qué testear, herramientas, cobertura mínima |
| DOC-20 | Should | API | 5 | Guía de deployment | EXISTE: servicios, variables prod, CI/CD |
| DOC-21 | Should | Mód | 5 | ADRs | EXISTE: por qué 3 DBs, por qué JWT, por qué NestJS, por qué React |
| DOC-22 | Should | Front | 3 | Plan de pruebas QA | EXISTE: casos de prueba por feature, criterios |

---

## 🟢 COULD HAVE (Nice to have)

| ID | Prioridad | Estimate | Descripción |
|----|-----------|----------|------------|
| DOC-23 | Could | 2 | Changelog |
| DOC-24 | Could | 2 | FAQ problemas comunes |
| DOC-25 | Could | 3 | Roadmap versiones futuras |

---

## 📊 Estimación Total

| Categoría | Story Points |
|-----------|--------------|
| Infraestructura y Setup | 13 |
| Base de Datos y Modelos | 16 |
| API y Endpoints | 18 |
| Módulos Backend | 13 |
| Frontend | 13 |
| **TOTAL MUST HAVE** | **~73 SP** |
| SHOULD HAVE | 19 |
| COULD HAVE | 7 |
| **TOTAL GENERAL** | **~99 SP** |

---

## Sprint Planning Sugerido (5 personas)

### Sprint 0: Discovery (Semana 1) — ~23 SP

**Objetivo:** Ver qué docs existen, confirmar stacktech.

**Responsable:** TODOS (cada uno hace ~4-5 tareas)

- T-01 a T-03: Inventario archivos
- T-04 a T-08: Revisión docs existentes
- T-09 a T-11: Evaluar estado
- T-12 a T-15: Gap analysis + Índice

---

### Sprint 1: Setup + Base de Datos (Semanas 3-4) — ~29 SP

**Objetivo:** Poder levantar el proyecto y tener DB diseñada.

| Encargado | Docs |
|----------|------|
| Infra | DOC-01, DOC-02, DOC-03, DOC-04 |
| DB | DOC-05, DOC-06, DOC-07 |

---

### Sprint 2: API + Auth (Semanas 5-6) — ~18 SP

**Objetivo:** API documentada + módulo de autenticación.

**Encargado:** API

- DOC-08, DOC-09, DOC-10, DOC-11

---

### Sprint 3: Módulos Backend (Semana 7) — ~13 SP

**Objetivo:** Documentar módulos restantes.

**Encargado:** Mód

- DOC-12, DOC-13, DOC-14

---

### Sprint 4: Frontend (Semana 8) — ~13 SP

**Objetivo:** Arquitectura frontend + UI.

**Encargado:** Front

- DOC-15, DOC-16, DOC-17

---

### Sprint 5: Calidad (Semana 9) — ~19 SP

**Objetivo:** Guías de soporte.

**Responsable:** TODOS (repartidos)

- DOC-18 a DOC-22

---

## 🔗 Dependencias

```
Sprint 0 (Discovery)
    │
     ├─> INFRAESTRUCTURA ──> DB ──> API + Auth ──> MÓDULOS ──> FRONTEND ──> CALIDAD
     │                                                     
     └──> Base de Datos ───────────────────────────────────────┘
```

---

## Definition of Ready (DoR)

Un item de documentación está **listo para trabajarse** cuando:

- [ ] Tiene claro el **formato de entrega** (Markdown, HTML, diagrama, código)
- [ ] EXISTE la **documentación prerequisito** completada
- [ ] El **owner** está asignado
- [ ] Tiene **criterios de aceptación claros** (Definition of Done)

---

## Definition of Done (DoD)

Un item de documentación está **completo** cuando:

- [ ] Está en el repositorio, en la carpeta correcta
- [ ] El equipo la revisó y no hay feedback pendiente
- [ ] Tiene ejemplos prácticos donde corresponde
- [ ] Está linkeada desde el índice de documentación

---

## 📁 Estructura de Carpetas de Documentación

```
aguaFress/
├── documentacion/
│   ├── index.md                          # Índice general (T-15)
│   ├── backlog/
│   │   └── Resumen-sprints.md           # Este archivo
│   ├── setup/                          # DOC-01 a DOC-04
│   │   ├── README-setup.md
│   │   ├── env-example.md
│   │   ├── estructura-directorios.md
│   │   └── docker-setup.md
│   ├── base-de-datos/                  # DOC-05 a DOC-07
│   │   ├── erd-completo.png
│   │   └── especificacion-motores.md
│   ├── api/                           # DOC-08 a DOC-11
│   │   ├── openapi.yaml
│   │   ├── guia-autenticacion.md
│   │   └── codigos-error.md
│   ├── modulos/                        # DOC-12 a DOC-14
│   │   ├── modulo-productos.md
│   │   ├── modulo-ordenes.md
│   │   └── modulo-analytics.md
│   ├── frontend/                      # DOC-15 a DOC-17
│   │   ├── arquitectura.md
│   │   ├── wireframes/
│   │   └── guia-integracion.md
│   └── calidad/                     # DOC-18 a DOC-22
│       ├── guia-contribucion.md
│       ├── estrategia-testing.md
│       ├── deployment.md
│       ├── adrs/
│       └── plan-pruebas.md
```

---

## Historial de Versiones

| Versión | Fecha | Descripción | Autor |
|--------|-----|-------------|-------|
| 1.0 | Abril 2026 | Versión inicial con equipo de 5 | Equipo AguaFress |

---

**Documento preparado para Sprint Planning**

_AguaFress - Product Backlog Documentación_
_Abril 2026_