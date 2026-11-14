# Restore vendor logo upload through the TCP service

## Objective and problem

Restore the vendor-logo upload forwarded by the gateway to `users.upload_logo`. The TCP-only usuario-service registered an HTTP Passport/JWT `APP_GUARD`. This handler is not `@Public()`, so the guard tried to read HTTP request headers in an RPC context and produced `Cannot read properties of undefined (reading 'authorization')`. The earlier session reported a passing build and 32 Jest suites / 304 tests after removing the guard; those are historical results, not this session's verification.

## Authorized scope and constraints

- Work locally on `fix/vendor-logo-upload` from `main` at `38ec93c`. The removal of `APP_GUARD` and its unused imports in `MicroServices/usuario-service/src/auth/auth.module.ts` is already staged; do not discard or silently replace it.
- Revalidate the TCP auth and upload path, add a focused behavioral regression test in usuario-service, run applicable checks, and make a local Conventional Commit. Keep the regression test with the behavior in the same work-unit commit.
- Preserve `.agents/`, `packages/frontend/`, and the two other untracked `odd/tasks/` files. No issue creation, remote access, merge, push, PR, deployment, or runtime upload claim is authorized by this continuation.
- The gateway verifies JWT and the `VENDEDOR` role on its HTTP vendor-logo route. TCP handlers currently trust gateway-supplied `payload.user`; local Compose publishes the usuario TCP port. This trust boundary and deployment network isolation remain a security concern. Do not claim a secure directly exposed TCP endpoint or deploy without separately validating it.
- Backend fixes branch from `main`, not the divergent `frontPlanB` backend. Keep hooks enabled and stage only the files belonging to this work unit.

## Acceptance criteria and checks

- A behavioral test exercises the actual Nest RPC pipeline with the auth module (not just a direct controller call) and proves `users.upload_logo` succeeds with a valid vendor context; missing user and incorrect role remain rejected. Stub external DB and upload I/O in tests.
- Usuario-service focused tests, complete Jest suite, Nest build, and `git diff --check` pass. Record exact commands/results, or name any failed/unavailable check. No live upload success is claimed without a separately authorized deployment and authenticated check.
- Inspect the exact staged changes and commit only the scoped auth fix, test, and this document. A parent spot-check repeats one reported check.

## Route, test mode, and delivery

- **Route:** delegated direct for LOGO-001: mapping required 4+ files and the behavioral test plus source/task document need a single bounded writer. The existing staged 3-line source deletion was inherited from the earlier session. Task-document reconciliation is inline before delegation, not a source change.
- **TDD:** no active ODD/backend strict-TDD setting found in the previous backend upload task. Use ordinary Jest verification, not an invented RED phase. Runner: usuario-service Jest via pnpm. Source: `odd/tasks/fix-upload-sharp-commonjs.md` and existing package scripts.
- **RDD:** clone-local off as observed with `gentle-ai review mode status` this session; do not enable or invoke review. Delivery strategy: `ask-on-risk`. Forecast: well under ~400 authored changed lines, subject to test design; this is only an advisory task heuristic. Initial branch/review boundary: `38ec93c`.

## Tasks and evidence

- [ ] **LOGO-001 — Restore logo RPC behavior and prevent guard regression.** Confirm the security boundary, add the focused Nest TCP regression, verify the staged guard removal and checks, and commit locally. Route: delegated direct (4+ files in path; test preparation and nontrivial test write). Commit identity, checks, authored changed-line count, and review outcome: pending.

## Current state and next step

- The auth-module deletion is staged; no commit or new regression test yet. The previous build and 304 tests must be rerun. Other untracked paths are unrelated and must remain untouched.
- Next: implement/test LOGO-001 and record the local work-unit commit. GitHub/Jira issue, merge to main, push, VPS deployment and live retest require separate authorization; the prior shutdown note listed them as future steps, not current permission.
