# Resumen de Sprints — AguaFress v1.0

**Proyecto:** AguaFress - Plataforma de Pedidos para Distribuidores de Agua  
**Equipo:** 5 personas  
**Versión:** 1.0 (MVP Web)  
**Metodología:** Scrum  
**Última actualización:** Abril 2026

---

## 👥 Distribución del Equipo por Áreas

| # | Área | Encargado | Sprint | Docs |
|-----|----------|--------|------|-----|
| 1 | **Infraestructura** | Persona 1 | 1 | DOC-01, DOC-02, DOC-03, DOC-04 |
| 2 | **Base de Datos** | Persona 2 | 1 | DOC-05, DOC-06, DOC-07 |
| 3 | **API + Auth** | Persona 3 | 2 | DOC-08, DOC-09, DOC-10, DOC-11 |
| 4 | **Módulos Backend** | Persona 4 | 3 | DOC-12, DOC-13, DOC-14 |
| 5 | **Frontend** | Persona 5 | 4 | DOC-15, DOC-16, DOC-17 |

**Sprint 5:** DOC-18 a DOC-22 se distribuyen entre todos oassignan a quien quede libre.

---

## 📊 Vista General

| Fase | Sprint | Story Points |
|------|--------|-------------|
| Discovery | Sprint 0 | ~23 SP |
| Documentación | Sprint 1-5 | ~92 SP |
| Nice to have | - | 7 SP |
| **TOTAL** | | **~122 SP** |

---

## 🎯 FASE 1: DISCOVERY (Sprint 0)

**Objetivo:** Documentar lo que ya existe, evaluar gaps, confirmar tecnologías.  
**Duración:** 1 semana (todos los 5 hacen Discovery en paralelo)  
**Velocity:** ~23 SP

### Tareas (distribuidas entre el equipo)

| # | ID | Tarea | SP | Encargado |
|---|------|-------------------|-----|---------|
| 1 | T-01 | Inventario archivos en raíz | 1 | Inf |
| 2 | T-02 | Inventario en documentacion/ | 1 | DB |
| 3 | T-03 | Inventario subcarpetas | 1 | API |
| 4 | T-04 | Revisión SPEC.md | 2 | Mód |
| 5 | T-05 | Revisión modulo-auth-users | 2 | Front |
| 6 | T-06 | Revisión diagramas flujo | 1 | Inf |
| 7 | T-07 | Revisión Presentacion idea | 1 | DB |
| 8 | T-08 | Revisión wireframes | 1 | API |
| 9 | T-09 | Evaluación completitud | 2 | Mód |
| 10 | T-10 | Identificar desactualizados | 1 | Front |
| 11 | T-11 | Identificar obsoletos | 1 | Inf |
| 12 | T-12 | Análisis gaps desarrollo | 2 | DB |
| 13 | T-13 | Priorización gaps | 2 | API |
| 14 | T-14 | Crear inventario completo | 2 | Mód |
| 15 | T-15 | Índice unificado | 2 | Front |

### Definition of Done

- [ ] Inventario completo de docs existentes
- [ ] Clasificación por tipo (técnica, requisitos, UI, procesos)
- [ ] Estado (completo/parcial/desactualizado/obsoleto)
- [ ] Mapa de gaps para desarrollo
- [ ] Índice unificado `documentacion/index.md`

---

## 📦 FASE 2: DOCUMENTACIÓN (Sprint 1-5)

### Sprint 1: Setup + Base de Datos

**Duración:** 2 semanas  
**Velocity:** ~29 SP  
**Responsables:** Infraestructura + Base de Datos

| # | ID | Historia | SP | Encargado |
|---|------|-------------------|-----|---------|
| 1 | DOC-01 | README.md con setup completo | 2 | Inf |
| 2 | DOC-02 | .env.example | 3 | Inf |
| 3 | DOC-03 | Estructura de directorios | 3 | Inf |
| 4 | DOC-04 | Guía Docker y docker-compose | 5 | Inf |
| 5 | DOC-05 | ERD completo | 8 | DB |
| 6 | DOC-06 | Especificación 3 motores DB | 3 | DB |
| 7 | DOC-07 | Mapeo TypeORM entities | 5 | DB |

### Sprint 2: API + Autenticación

**Duración:** 2 semanas  
**Velocity:** ~18 SP  
**Responsable:** API + Auth

| # | ID | Historia | SP | Encargado |
|---|------|-------------------|-----|---------|
| 8 | DOC-08 | OpenAPI/Swagger API | 8 | API |
| 9 | DOC-09 | Guía auth y autorización | 3 | API |
| 10 | DOC-10 | Códigos de error estándar | 2 | API |
| 11 | DOC-11 | Módulo Auth + Users | 5 | API |

### Sprint 3: Módulos Backend

**Duración:** 1 semana  
**Velocity:** ~13 SP  
**Responsable:** Módulos Backend

| # | ID | Historia | SP | Encargado |
|---|------|-------------------|-----|---------|
| 12 | DOC-12 | Módulo Productos | 5 | Mód |
| 13 | DOC-13 | Módulo Órdenes | 5 | Mód |
| 14 | DOC-14 | Módulo Analytics | 3 | Mód |

### Sprint 4: Frontend

**Duración:** 1 semana  
**Velocity:** ~13 SP  
**Responsable:** Frontend

| # | ID | Historia | SP | Encargado |
|---|------|-------------------|-----|---------|
| 15 | DOC-15 | Guía arquitectura Frontend | 5 | Front |
| 16 | DOC-16 | Wireframes/UI specs | 3 | Front |
| 17 | DOC-17 | Guía integración API | 5 | Front |

### Sprint 5: Calidad

**Duración:** 1 semana  
**Velocity:** ~19 SP  
**Responsable:** Todos (repartidos)

| # | ID | Historia | SP | Encargado |
|---|------|-------------------|-----|---------|
| 18 | DOC-18 | Guía de contribución | 3 | Inf |
| 19 | DOC-19 | Estrategia de testing | 3 | DB |
| 20 | DOC-20 | Guía de deployment | 5 | API |
| 21 | DOC-21 | ADRs | 5 | Mód |
| 22 | DOC-22 | Plan de pruebas QA | 3 | Front |

---

## 🎁 NICE TO HAVE (Post-Sprint 5)

| # | ID | Historia | SP |
|---|------|-------------------|-----|
| 23 | DOC-23 | Changelog | 2 |
| 24 | DOC-24 | FAQ problemas comunes | 2 |
| 25 | DOC-25 | Roadmap versiones | 3 |

---

## 📅 Timeline Sugerido (trabajo en paralelo)

```
SEMANA 1-2: Sprint 0 (DISCOVERY) - TODOS
├── Inf: T-01, T-06, T-11
├── DB: T-02, T-07, T-12
├── API: T-03, T-08, T-13
├── Mód: T-04, T-09, T-14
└── Front: T-05, T-10, T-15

SEMANA 3-4: Sprint 1 (SETUP + DB) - 2 personas
├── Inf: DOC-01, DOC-02, DOC-03, DOC-04
└── DB: DOC-05, DOC-06, DOC-07

SEMANA 5-6: Sprint 2 (API + AUTH) - 1 persona
└── API: DOC-08, DOC-09, DOC-10, DOC-11

SEMANA 7: Sprint 3 (MÓDULOS) - 1 persona
└── Mód: DOC-12, DOC-13, DOC-14

SEMANA 8: Sprint 4 (FRONTEND) - 1 persona
└── Front: DOC-15, DOC-16, DOC-17

SEMANA 9: Sprint 5 (CALIDAD) - TODOS
└── Docs 18-22 repartidos
```

**Total estimado:** ~9 semanas para documentación

---

## 🔄 Dependencias entre Áreas

```
┌─────────────────────────────────────────────────────────────┐
│                      SPRINT 0 (Discovery)                  │
│           (TODOS - 1 semana)                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────┐  ┌──────────────────────┐
│  INFRAESTRUCTURA     │  │   BASE DE DATOS       │
│  (DOC 1-4)          │  │  (DOC 5-7)           │
│  2 semanas         │  │  2 semanas           │
└──────────────────────┘  └──────────────────────┘
           │                      │
           └──────────┬─────────┘
                      ▼
              ┌─────────────────┐
              │  API + AUTH     │
              │ (DOC 8-11)     │
              │ 2 semanas     │
              └─────────────────┘
                      │
                      ▼
              ┌─────────────────┐
              │    MÓDULOS     │
              │ (DOC 12-14)    │
              │ 1 semana      │
              └─────────────────┘
                      │
                      ▼
              ┌─────────────────┐
              │   FRONTEND     │
              │ (DOC 15-17)   │
              │ 1 semana      │
              └─────────────────┘
                      │
                      ▼
              ┌─────────────────┐
              │   CALIDAD      │
              │ (DOC 18-22)    │
              │ 1 semana      │
              └─────────────────┘
```

---

## ✅ Definition of Done para Documentation

Un item de documentación está **completo** cuando:

- [ ] Está en el repositorio, en la carpeta correcta
- [ ] El equipo la revisó y no hay feedback pendiente
- [ ] Tiene ejemplos prácticos donde corresponde
- [ ] Está linkeada desde el índice de documentación

---

## 🎯 Reglas del Equipo

1. **Sprint 0 PRIMERO:** Nadie empieza a doclear sin hacer Discovery
2. **Dependencias:** No empezar Sprint 2 sin terminar Sprint 1
3. **Definition of Done:** Cada doc tiene DoD clara - se entrega cuando está completa
4. **Revisión:** Cada doc la revisa otra persona antes de marcar como done
5. **Daily:** 15 min standup - qué docs terminé, qué gaps encontré

---

## 📁 Estructura de Carpetas

```
aguaFress/
├── documentacion/
│   ├── index.md                    # Índice general (T-15)
│   ├── backlog/
│   │   ├──Resumen-sprints.md      # Este archivo
│   │   ├── product-backlog-documentacion.md
│   │   ├── sprint-00-discovery-documentacion.md
│   │   └── sprint-01-documentacion.md
│   ├── setup/                     # DOC-01 a DOC-04
│   ├── base-de-datos/            # DOC-05 a DOC-07
│   ├── api/                      # DOC-08 a DOC-11
│   ├── modulos/                  # DOC-12 a DOC-14
│   ├── frontend/                 # DOC-15 a DOC-17
│   └── calidad/                 # DOC-18 a DOC-22
```

---

## 🏃 Próximo Paso: Sprint 0 (Discovery)

**Semana 1:** Todos hacen Discovery en paralelo.

**Entregable final:** Índice unificado de documentación existente + gaps identificados.

**Preguntas clave a responder:**
- ¿Qué documentación YA existe?
- ¿Está actualizada o desactualizada?
- ¿Confirmamos 3 DBs (PostgreSQL, MySQL, MongoDB)?
- ¿Confirmamos JWT para auth?
- ¿Confirmamos NestJS + React?

---

_Actualizado: Abril 2026_
_AguaFress v1.0 - Product Backlog con Equipo_