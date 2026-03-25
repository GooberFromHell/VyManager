# Tracking — Simplified Router Onboarding

**Goal:** Simplify instance creation to 5 fields + auto-provision via SSH with real-time progress
**Status:** IN PROGRESS
**Progress:** 0/6 tasks complete

---

## Execution Phases

### Phase 1: Backend (provisioning + SSE endpoint)
| # | Task | Status | Depends On |
|---|------|--------|------------|
| 001 | Rewrite provisioning.py with paramiko + step-by-step generator | not_started | — |
| 002 | Update session router with SSE provisioning endpoint | not_started | 001 |

**Phase 1 status:** not_started
**Phase 1 checkpoint:** Backend provisioning generates SSE events via paramiko. Provision endpoint streams progress.

### Phase 2: Frontend (proxy + API + modal)
| # | Task | Status | Depends On |
|---|------|--------|------------|
| 003 | Add SSE support to session API proxy | not_started | — |
| 004 | Update frontend session API types + SSE method | not_started | — |
| 005 | Rewrite CreateInstanceModal (simple form + progress UI) | not_started | — |

**Phase 2 status:** not_started (blocked by Phase 1)
**Phase 2 checkpoint:** Frontend has simplified form, SSE client, and real-time provisioning progress UI.

### Phase 3: Validation
| # | Task | Status | Depends On |
|---|------|--------|------------|
| 006 | TypeScript type-check and lint | not_started | 003, 004, 005 |

**Phase 3 status:** not_started (blocked by Phase 2)
**Phase 3 checkpoint:** All code compiles and lints clean.

---

## Execution Log

_(Updated as tasks complete)_
