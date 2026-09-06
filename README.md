# Hue Muse Beauty — E-commerce Website

Enterprise-grade e-commerce platform for Hue Muse Beauty.

> **Status:** Sprint 10 — Final Release Validation (v1.0.0-rc1) (Frozen)
> All prior sprints (1-9) are closed. Final Go/No-Go decision for
> Version 1.0: **NO-GO for production**, issued honestly after 10
> sprints of static/structural validation and 36 genuinely-executed
> test scenarios found zero Critical/High open defects — but zero live
> execution against a real database, HTTP server, or browser has ever
> occurred (re-confirmed this sprint with fresh command output). A
> specific, bounded path to a future GO exists and requires no further
> feature work, only real-environment access.
> See docs/sprint-reports/SPRINT_10_PRODUCTION_SIGNOFF_AND_GO_NO_GO.md.

## Relationship to HMEOS

This repository is **independent** from Hue Muse Enterprise Operating System
(HMEOS). It will integrate with HMEOS in future sprints strictly through
well-defined, versioned APIs (e.g. catalog, inventory, order sync). It does not
share a codebase, database, or deployment pipeline with HMEOS.

## Repository Layout

See [`docs/architecture/FOLDER_STRUCTURE.md`](docs/architecture/FOLDER_STRUCTURE.md).

## Getting Started

See [`docs/onboarding/DEVELOPER_ONBOARDING.md`](docs/onboarding/DEVELOPER_ONBOARDING.md)
and [`docs/onboarding/LOCAL_DEV_SETUP.md`](docs/onboarding/LOCAL_DEV_SETUP.md).

## Standards

- [Coding Standards](docs/standards/CODING_STANDARDS.md)
- [Git Workflow](docs/standards/GIT_WORKFLOW.md)
- [Commit Conventions](docs/standards/COMMIT_CONVENTIONS.md)
- [PR Policy](docs/standards/PR_POLICY.md)
- [Testing Standards](docs/standards/TESTING_STANDARDS.md)
- [Logging Standards](docs/standards/LOGGING_STANDARDS.md)
- [Error Handling Standards](docs/standards/ERROR_HANDLING_STANDARDS.md)

## Security

See [`docs/security/SECURITY_BASELINE.md`](docs/security/SECURITY_BASELINE.md).

## CI/CD

See [`docs/ci-cd/CI_CD_FOUNDATION.md`](docs/ci-cd/CI_CD_FOUNDATION.md).

## Sprint Reports

See [`docs/sprint-reports/`](docs/sprint-reports/).
