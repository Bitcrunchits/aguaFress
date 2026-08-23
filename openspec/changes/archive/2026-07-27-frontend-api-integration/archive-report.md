# Archive Report: frontend-api-integration

## Outcome

`frontend-api-integration` is archived with PASS WITH WARNINGS. The frontend API integration spec has been promoted into the main OpenSpec source of truth, and the completed change folder has been moved to the dated archive path.

## Source of Truth Sync

| Domain | Action | Details |
|--------|--------|---------|
| `frontend-api-integration` | Created | Added `openspec/specs/frontend-api-integration/spec.md` from the completed delta spec. |

## Verification Summary

| Check | Result | Evidence |
|-------|--------|----------|
| Tasks | ✅ Complete | 18/18 tasks complete in `tasks.md`. |
| Tests | ✅ PASS | `pnpm --filter @agua/frontend test` passed: 24 files / 114 tests. |
| Build | ✅ PASS | `pnpm --filter @agua/frontend build` passed. |
| Lint | ⚠️ WARNING | `pnpm --filter @agua/frontend lint` could not run because `eslint: not found`. |
| API smoke | ⚠️ Not run | Requires valid backend credentials/environment. |

## Completed Scope

- Product create, edit, toggle, and delete flows are implemented and covered.
- Vendedor dashboard mocks were removed; dashboard data now comes from service-backed gateway data.
- SUPER_ADMIN route/nav scope was fixed so admin access no longer bypasses vendedor route restrictions.
- Async order/delivery behavior, duplicate command protection, QR/link flows, cliente catalog/cart/orders, and admin read views remain compliant per verification report.

## Traceability

| Artifact | OpenSpec path | Engram observation |
|----------|---------------|--------------------|
| Proposal | `openspec/changes/archive/2026-07-27-frontend-api-integration/proposal.md` | `#934` (`sdd/frontend-api-integration/proposal`) |
| Spec delta | `openspec/changes/archive/2026-07-27-frontend-api-integration/specs/frontend-api-integration/spec.md` | `#936` (`sdd/frontend-api-integration/spec`) |
| Main spec | `openspec/specs/frontend-api-integration/spec.md` | N/A |
| Design | `openspec/changes/archive/2026-07-27-frontend-api-integration/design.md` | `#938` (`sdd/frontend-api-integration/design`) |
| Tasks | `openspec/changes/archive/2026-07-27-frontend-api-integration/tasks.md` | `#940` (`sdd/frontend-api-integration/tasks`) |
| Apply progress | Engram only | `#945` (`sdd/frontend-api-integration/apply-progress`) |
| Verify report | `openspec/changes/archive/2026-07-27-frontend-api-integration/verify-report.md` | Not found in Engram search |
| Fix notes | `openspec/changes/archive/2026-07-27-frontend-api-integration/fix-notes.md` | N/A |

## Archive Verification

- [x] Main spec created at `openspec/specs/frontend-api-integration/spec.md`.
- [x] No destructive merge was required because the main domain spec did not already exist.
- [x] Archive report created before moving the completed change folder.
- [x] Change folder moved to `openspec/changes/archive/2026-07-27-frontend-api-integration/`.
- [x] Active `openspec/changes/frontend-api-integration/` no longer exists.

## Final Verdict

PASS WITH WARNINGS. Remaining warnings are tooling/environment debt, not implementation blockers: frontend ESLint is unavailable, API smoke was not run without valid backend credentials, and known jsdom/React Router warning noise remains non-blocking.
