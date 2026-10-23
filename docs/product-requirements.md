# Product Requirements Document

**Status:** Draft, pending customer evidence and narrow MVP selection.

## Problem

Third-party API changes silently break applications. Engineers must discover updates,
understand compatibility risks, locate affected code, implement fixes, and validate
changes manually.

## MVP Scope (provisional - to be narrowed by research)

**One provider, one language, one change category.**

Proposed initial wedge: npm packages + TypeScript + field/parameter renames.
Rationale: most common breaking change pattern, deterministic fix possible,
TypeScript AST analysis is well-supported.

### In scope
- npm registry version tracking for watched packages
- Changelog parsing for breaking change classification
- AST-based call-site mapping in TypeScript repos
- Deterministic fix for field/parameter renames
- Local sandbox test verification (red-to-green)
- PR preparation with evidence (no auto-submit)

### Explicit non-goals
- Multiple language ecosystems
- Live API contract probing (post-MVP)
- GitHub Marketplace listing
- Payment processing
- Multi-team workspace management
- Auto-merge

## User Stories

1. As a developer, I can register an npm package to watch, so I get notified when it changes.
2. As a developer, I can see which of my files use a changed package, so I know my exposure.
3. As a developer, I can review a proposed fix with test evidence, so I can decide to merge.
4. As a developer, I can see what was NOT verified, so I can assess remaining risk.
5. As a developer, I get silence when nothing is wrong, so I don't develop alert fatigue.

## Acceptance Criteria

- [ ] Watch a package, detect a version change within 1 hour
- [ ] Map 100% of known call sites in a fixture repo, zero false positives
- [ ] Classify a fixture breaking change with > 90% confidence
- [ ] Generate a correct fix for a field rename pattern
- [ ] Sandbox proof: red on new version, green after fix
- [ ] PR body includes proof table, coverage honesty, confidence
- [ ] No PR when fix fails verification
- [ ] CI green at every milestone boundary
