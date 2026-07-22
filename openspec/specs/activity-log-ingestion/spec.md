# Activity Log Ingestion Specification

## Purpose

Define trusted internal ingestion into notifications-service MongoDB `activity_logs` while preserving public read-only access and usuario-service `AUDIT_LOG` ownership.

## Requirements

### Requirement: Trusted TCP activity-log create

The notifications-service **MUST** accept `activity_logs.create` only as a trusted internal TCP pattern. Public HTTP, gateway, and frontend flows **MUST NOT** expose activity-log creation.

#### Scenario: Trusted producer creates an activity log

- GIVEN a trusted internal caller sends a valid create payload
- WHEN `activity_logs.create` is handled
- THEN one MongoDB `activity_logs` record is persisted
- AND the response is the created activity-log DTO.

#### Scenario: Public create is unavailable

- GIVEN any public HTTP or gateway caller attempts activity-log creation
- WHEN the request targets the `activity-logs` family
- THEN no create action is available or dispatched.

### Requirement: Validation and typed contract

Create payloads **MUST** validate required typed fields, enum-backed values, and ISO 8601 timestamps. Invalid payloads **MUST** fail with typed errors suitable for TCP callers and **MUST NOT** persist partial records.

#### Scenario: Invalid enum or timestamp is rejected

- GIVEN a create payload with an unsupported source/action/result or non-ISO timestamp
- WHEN ingestion validates the payload
- THEN a typed validation error is returned
- AND no `activity_logs` record is stored.

#### Scenario: Stored timestamps are ISO strings

- GIVEN a valid payload without a producer timestamp
- WHEN it is ingested
- THEN the stored and returned `createdAt` is an ISO 8601 string.

### Requirement: Super-admin read-after-ingest

After ingestion, existing SUPER_ADMIN list and get-by-id flows **MUST** expose the new record using current read contracts. Read authorization behavior **MUST NOT** change.

#### Scenario: Super-admin lists an ingested log

- GIVEN an activity log was ingested successfully
- WHEN an authenticated SUPER_ADMIN lists activity logs
- THEN the ingested log can appear in newest-first results.

#### Scenario: Super-admin reads ingested log by id

- GIVEN an ingested log id exists
- WHEN an authenticated SUPER_ADMIN requests get-by-id
- THEN the existing read flow returns that log DTO.

### Requirement: Idempotent ingestion

When a payload includes `requestId` or producer event id, notifications-service **MUST** use it as a deduplication key. Replayed messages with the same key **MUST NOT** create duplicate activity logs.

#### Scenario: Duplicate requestId is replayed

- GIVEN an activity log was created with `requestId = R1`
- WHEN the same requestId is ingested again
- THEN no second record is created
- AND the response identifies the existing activity log.

#### Scenario: Payload without dedupe key

- GIVEN a valid payload has no requestId or event id
- WHEN it is ingested twice
- THEN each call MAY create a separate log because no idempotency key exists.

### Requirement: usuario-service AUDIT_LOG boundary

Notifications ingestion **MUST NOT** read, migrate, write, replace, or create Prisma relations/FKs to usuario-service `AUDIT_LOG`. `AUDIT_LOG` remains the relational audit trail; `activity_logs` remains notifications-owned operational activity history.

#### Scenario: AUDIT_LOG remains independent

- GIVEN a notifications activity log is ingested
- WHEN usuario-service audit logs are queried
- THEN results come only from usuario-service `AUDIT_LOG`
- AND no notifications MongoDB data is required.

### Requirement: Phased Redis Streams ingestion

Redis Streams consumption **SHOULD** be implemented as a later phased capability if it exceeds the first slice. When enabled, it **MUST** map typed events into the same create contract and idempotency rules.

#### Scenario: Stream event maps to create

- GIVEN a typed domain event is consumed from Redis Streams
- WHEN stream ingestion is enabled
- THEN it is mapped into the activity-log create contract
- AND duplicates use stream/event id or requestId for dedupe.

#### Scenario: Stream consumer not enabled yet

- GIVEN phase 1 ships without Redis consumption
- WHEN TCP ingestion is available
- THEN the system still satisfies internal create and read-after-ingest behavior.
