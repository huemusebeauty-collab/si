# Phase 1D approval interaction fix

Observed live behavior: approval requests are rendered correctly, but approval interaction is not conclusively completing from the HQ UI. The dashboard must use one delegated click handler for dynamically-rendered approval buttons, prevent duplicate submissions, surface HTTP/API failures, and refresh both approval state and audit state after a decision.

No provider execution is performed by this fix.
