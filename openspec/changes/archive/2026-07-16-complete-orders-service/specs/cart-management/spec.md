# Cart Management Spec

## Purpose

Cliente cart behavior.

## Requirements

### Requirement: Active cart

The system MUST manage one active cart per cliente using JWT identity, never body `userId`.

#### Scenario: Read

- GIVEN a cliente has a non-expired cart
- WHEN the cliente requests it
- THEN the system MUST return it with server totals

#### Scenario: userId ignored

- GIVEN the body includes `userId`
- WHEN JWT context identifies another cliente
- THEN the system MUST use JWT context only

### Requirement: Item mutations

The system MUST mutate only the caller's active cart, MUST NOT trust client product metadata, MUST increment existing quantity when adding a duplicate product, and MUST replace quantity when updating an item.

#### Scenario: Product missing

- GIVEN product data is unavailable
- WHEN a cliente adds an item
- THEN the system MUST return controlled unavailable
- AND MUST NOT accept client metadata

#### Scenario: Ownership

- GIVEN a cart belongs to cliente A
- WHEN cliente B mutates it
- THEN the system MUST reject the mutation

#### Scenario: Add duplicate item increments quantity

- GIVEN a cliente cart already contains product P with quantity 2
- WHEN the cliente adds product P with quantity 3
- THEN the item quantity MUST become 5

#### Scenario: Update item replaces quantity

- GIVEN a cliente cart contains product P with quantity 5
- WHEN the cliente updates product P to quantity 3
- THEN the item quantity MUST become exactly 3

### Requirement: Expiration

Expired carts MUST NOT be mutable or active.

#### Scenario: Expired

- GIVEN a cart is expired
- WHEN the cliente mutates it
- THEN the system MUST reject the mutation
