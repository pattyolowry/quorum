# HTTP Docs add-on feasibility evidence

Issue: [#10](https://github.com/pattyolowry/quorum/issues/10).

Status: prepared, not deployed or tested in Google Docs. No feasibility verdict yet.
Environment selected: personal Google account, development-only. This cannot
validate Workspace organization activation or membership (issue #11).

Local validation (2026-10-27): JavaScript syntax, generated manifest fields,
health response, rejection of an unsigned review action (401), malformed JSON
handling (400), and navigation stub passed. Setup wizard passes `bash -n`.
These checks do not validate signed Google events, rendering or live consent.

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
