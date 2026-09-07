# Backend

API server: Node.js with a structured framework (NestJS), per the approved
Phase 8 Technical Architecture, Section 2 ("Node.js with a structured
framework, e.g. NestJS"). Confirmed during Sprint 1 Architecture Compliance
review — see `docs/sprint-reports/SPRINT_1_ARCHITECTURE_COMPLIANCE_MATRIX.md`.
No business endpoints, database schemas, or ERP/CRM/HMEOS integration code
exist yet — see OUT OF SCOPE in the Sprint 1 specification. This package
currently contains only tooling configuration and a placeholder entry
point; NestJS itself is not installed until the sprint that adds the first
real module, to keep Sprint 1 free of business-adjacent dependencies.

Structure (to be populated starting Sprint 2+):
- `src/modules/` — feature modules
- `src/common/` — shared middleware, guards, filters
- `src/config/` — runtime configuration loading
- `src/database/` — migrations / schema (business logic deferred)
