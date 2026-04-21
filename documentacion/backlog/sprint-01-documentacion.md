# Sprint 1 Backlog — Documentación AguaFress

**Proyecto:** AguaFress v1.0 (MVP Web)  
**Equipo:** 5 personas  
**Objetivo del Sprint:** Poder levantar el proyecto + tener la base de datos diseñada  
**Duración sugerida:** 2 semanas  
**Velocity estimada:** ~29 SP

---

## 👥 Distribución del Equipo (Sprint 1)

| # | Área | Persona | Docs | SP |
|---|------|---------|------|-----|
| 1 | **Infraestructura** | DOC-01, DOC-02, DOC-03, DOC-04 | 13 |
| 2 | **Base de Datos** | DOC-05, DOC-06, DOC-07 | 16 |

---

## 📌 Sprint Goal

> "El equipo debe poder levantar todo el proyecto localmente con un comando, y tener el modelo de datos claro para empezar a implementar."

---

## Definition of Done general del Sprint

Para completar este sprint, el equipo debe tener:

1. ✅ README.md funcional en la raíz del proyecto
2. ✅ .env.example completo
3. ✅ Estructura de carpetas documentada
4. ✅ Docker compose levantando todo (PostgreSQL, MySQL, MongoDB, Redis, Mailhog)
5. ✅ ERD completo con todas las entidades y relaciones



## Sprint 1 Backlog Items

### 📦 Entregable 1.1: README del Proyecto

| ID | Descripción | Estimate | Owner | DoD |
|----|-------------|----------|-------|------|
| DOC-01 | README.md con setup completo | 2 SP | Infra | README tiene: cómo clonar, cómo instalar dependencias, cómo configurar .env, cómo iniciar servicios, cómo verificar que funciona |

### 📦 Entregable 1.2: Configuración de Entorno

| ID | Descripción | Estimate | Owner | DoD |
|----|-------------|----------|-------|------|
| DOC-02 | .env.example con todas las variables | 3 SP | Infra | Existe archivo con TODAS las variables necesarias (DB, Redis, JWT secrets, Google OAuth, etc.) con comentarios y valores placeholder |
| DOC-07 | Mapeo TypeORM entities | 5 SP | DB | Cada entidad tiene: @Entity, @Column con tipos, @OneToMany/@ManyToOne, validaciones class-validator |

### 📦 Entregable 1.3: Estructura del Proyecto

| ID | Descripción | Estimate | Owner | DoD |
|----|-------------|----------|-------|------|
| DOC-03 | Estructura de directorios documentada | 3 SP | Infra | Documento con estructura de carpetas tanto backend como frontend, propósito de cada carpeta |

### 📦 Entregable 1.4: Infraestructura Docker

| ID | Descripción | Estimate | Owner | DoD |
|----|-------------|----------|-------|------|
| DOC-04 | Guía Docker + docker-compose | 5 SP | Infra | Guía con: servicios a levantar, un comando para levantar todo, cómo verificar servicios, cómo ver logs |

### 📦 Entregable 1.5: Modelo de Datos

| ID | Descripción | Estimate | Owner | DoD |
|----|-------------|----------|-------|------|
| DOC-05 | ERD completo (Entity-Relationship Diagram) | 8 SP | DB | Diagrama visual con: todas las tablas/colecciones, foreign keys, cardinalidades 1:1, 1:n, n:m, tipos de datos |
| DOC-06 | Especificación 3 motores DB | 3 SP | DB | Explica qué datos van en PostgreSQL vs MySQL vs MongoDB, justificación técnica |

---

## Story Points por Entregable

| Entregable | Story Points |
|-----------|------------|
| 1.1 README | 2 |
| 1.2 Configuración | 8 |
| 1.3 Estructura | 3 |
| 1.4 Docker | 5 |
| 1.5 Modelo de Datos | 11 |
| **TOTAL** | **29 SP** |

> ~29 SP es alto para un primer sprint. **Sugerencia:** Dividir si el equipo no tiene experiencia previa con NestJS + 3 DBs.

---

## 🔄 Revisión de Sprint (Definition of Done para el Sprint)

Al final del Sprint 1, debe existir:

```
aguaFress/
├── README.md                              ✅
├── .env.example                        ✅
├── docker-compose.yml                   ✅
├── documentacion/
│   ├── setup/
│   │   ├── estructura-directorios.md  ✅
│   │   └── docker-setup.md           ✅
│   └── base-de-datos/
│       ├── erd-completo.png           ✅
│       └── especificacion-motores.md  ✅
└── src/                           # Estructura de carpetas vacía o básica
```

---

## ⚠️ Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|------------|---------|-----------|
| Team sin experiencia con 3 DBs | Alta | Alto | DOC-06 (especificación clara) reduce confusión |
| Configuración de Docker falla | Media | Alto | Hacer guía detallada de troubleshooting |
| ERD incompleto causa refactors después | Media | Alto | Revisión del equipo antes de mover a Sprint 2 |

---

## ⏭️ Siguiente: Sprint 2

El Sprint 1 habilita el trabajo en:

- DOC-07 (Entities) → Necesita ERD
- DOC-08 (API Docs) → Necesita entities
- DOC-09 (Auth guide) → Necesita entities + API
- DOC-11 (Module Auth+Users) → Necesita todo lo anterior

---

## Historial

| Versión | Fecha | Descripción |
|---------|-----|-------------|
| 1.0 | Abril 2026 | Versión inicial Sprint 1 |

---

_Sprint 1 Backlog - AguaFress Documentation_
_Abril 2026_