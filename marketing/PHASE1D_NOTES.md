# Phase 1D — Approval + Execution Center

Phase 1D completes the Phase 1 control-plane surface defined in the Marketing Operating System master plan: structured Director actions must reach a human approval center, sensitive actions must remain blocked until approved, and the dashboard must expose the resulting approval/audit state without pretending an external provider executed anything.

## Scope
- Live approval list in HQ.
- Approve/reject controls in the private HQ UI.
- Shared control-plane/security state for prepare → approve/reject → execution check.
- Clear provider-gated execution status; no fake publishing success.
- Preserve existing navigation, commerce intelligence, Director and safety trail.

## Exit criteria
- `GET /v1/approvals` is visible in Approval Center.
- Pending requests can be approved or rejected from HQ.
- Sensitive actions remain non-executable before approval.
- Approved requests pass the execution boundary check.
- Rejected requests remain blocked.
- Audit trail reflects approval decisions.
- Build/test/deploy evidence exists.
