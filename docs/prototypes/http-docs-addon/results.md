# HTTP Docs add-on feasibility evidence

Issue: [#10](https://github.com/pattyolowry/quorum/issues/10).

Status: deployed and installed for the development test account; not yet exercised
in Google Docs. No feasibility verdict yet.
Environment selected: personal Google account, development-only. This cannot
validate Workspace organization activation or membership (issue #11).

Local validation (2026-10-27): JavaScript syntax, generated manifest fields,
health response, rejection of an unsigned review action (401), malformed JSON
handling (400), and navigation stub passed. Setup wizard passes `bash -n`.
These checks do not validate signed Google events, rendering or live consent.

Deployment validation (2026-10-27 local): Cloud Run reports Ready. The private
service has one service-level and revision-level maximum instance, no minimum
instances, request-based CPU allocation, 1 vCPU and 256 MiB memory. A dedicated
runtime identity has no additional project roles; the separate build identity
uses Cloud Run Builder. Only the Google add-on system identity has an explicit
service-level Invoker grant. The unpublished Docs-only deployment is installed
for the CLI user's account.

Cost controls verified: a USD 5 monthly Cloud Run spend cap is Configured for the
test project. A separate USD 5 alert-only budget covers the billing account,
including other projects if any; it is broader than a project-only alert.

Deployed smoke checks: an unsigned health request is rejected (403); an
authenticated owner health request succeeds (200); attempting a review action
with that owner's identity token instead of the add-on system identity is
rejected (401). No signed Google add-on callback has been validated yet.

Known harness limitation: the full-workflow stub lives behind Cloud Run IAM, so
a normal browser tab without a bearer token cannot display it. This is a test
hosting limitation, not evidence that card links are unsupported; use an
accessible stub or the real web app before treating navigation as validated.

| Capability | Required observation | Live result |
| --- | --- | --- |
| Open/reopen | Add-on is discoverable in a real Doc; reopen preserves current test state | Not run |
| Per-file access | Deny, retry, grant; current Doc ID appears only after grant | Not run |
| Identity | Verify user token and bind by issuer/sub; reject a second account | Not run |
| Approver card | Action first; all three response buttons readable at sidebar width | Not run |
| Document Owner card | Owner attention and re-review; pause/resume refresh | Not run |
| Paused card | Stop-review message precedes summary; review actions unavailable | Not run |
| Callback/refresh | Response updates; reopen/refresh returns that state | Not run |
| Navigation | Full-workflow test stub opens without losing document context | Not run |
| Auth failures | Declined scope, revoked consent, wrong account; actionable recovery | Not run |
| Latency | Measure click-to-render for cold and warm calls; distinguish server duration | Not run |
| Closed panel | User understands queue/email are needed; panel gives no ambient attention | Not run |

Record browser, date, deployment revision, opaque account labels, repeat count,
observations and timings here. Do not include tokens, email addresses, user IDs,
document IDs/titles or real document content. Server logs intentionally contain
only route, HTTP status and server elapsed milliseconds.

The harness simulates roles in one allowlisted user's isolated workflow. It
validates signed Google identity against a test-only Quorum record keyed by
issuer/sub, not a production Quorum login or Workspace membership. No Google API
read/write is made and no access grant is proven by a successful API call yet.
If that proof is needed, add a metadata-only `files.get` under the event's user
OAuth token and record only its status, never the token or response data.

Verdict after live exercise: viable as agreed / viable with specified changes /
insufficient. If insufficient, compare the essential interaction in a minimal
Apps Script HTML sidebar before reopening the architecture decision.
