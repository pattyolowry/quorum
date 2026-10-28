# HTTP Docs add-on feasibility evidence

Issue: [#10](https://github.com/pattyolowry/quorum/issues/10).

Verdict: **viable as agreed for the tested desktop Google Docs card experience**.
The HTTP card surface supports Option A without an architecture change. The
human exercised it in Chrome with a personal development account and confirmed
the sidebar's intended role. This resolves card feasibility, not enterprise
activation or production authentication readiness; the limits below remain
explicit acceptance work.
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
rejected (401). Subsequent successful live card actions demonstrate that signed
Google add-on callbacks and the allowlisted user-token checks work together.

The original full-workflow stub lived behind Cloud Run IAM and could not be
opened in a normal browser tab. The card link now points to a clearly marked
test page on the prototype branch instead. It receives no document or identity
details. The replacement is deployed in revision 00003; the human confirmed that
the test page opens in another tab while the Doc remains available. This tests
external navigation only, not production Quorum web sign-in
or live workflow synchronization.

| Capability | Required observation | Live result |
| --- | --- | --- |
| Open/reopen | Add-on is discoverable in a real Doc; reopen preserves current test state | Human confirmed Action first card; Approved response and Fully Approved status survived panel close/reopen and Refresh |
| Per-file access | Deny, retry, grant; current Doc ID appears only after grant | Initial grant path reached workflow card; human confirmed cancellation and retrying the grant in a second test Doc |
| Identity | Verify user token and bind by issuer/sub; reject a second account | Live allowlisted Google user and system tokens accepted; test-only issuer/sub binding exercised; second-account rejection not tested live |
| Approver card | Action first; all three response buttons readable at sidebar width | Human exercised Approve, Changes Requested, and Clarification Needed successfully |
| Document Owner card | Owner attention and re-review; pause/resume refresh | Human confirmed Changes Requested → owner attention → Request re-review → Awaiting Review; Approval → Clarification Needed reopened In Review with owner attention |
| Paused card | Stop-review message precedes summary; review actions unavailable | Human confirmed Pause/Approver view and review buttons returning after Resume; visual prominence not independently inspected |
| Callback/refresh | Response updates; reopen/refresh returns that state | Human confirmed response transitions and Fully Approved after close/reopen plus Refresh |
| Navigation | Full-workflow test stub opens without losing document context | Human confirmed test page opens in another tab while retaining the Google Doc |
| Auth failures | Declined scope, revoked consent, wrong account; actionable recovery | Current-file permission cancellation/retry passed; system-token rejection passed smoke checks; full OAuth revocation and second Google account not exercised |
| Latency | Measure click-to-render for cold and warm calls; distinguish server duration | Human reports opening and actions feel “basically instant” in Chrome; qualitative observation, no stopwatch measurements or controlled cold/warm comparison |
| Closed panel | User understands queue/email are needed; panel gives no ambient attention | Human accepts relying on Quorum queue/email while the panel is closed; conceptual walkthrough only, those surfaces are not implemented |

Sanitized server logs corroborate 26 successful add-on callbacks (all HTTP 200)
for initial rendering, file grants and the review paths above. Application
handler durations ranged from 1–12 ms. These exclude cold startup, network
transport, Google host processing and rendering; they are not user-visible
latency measurements. The separate authentication smoke check returned the
expected 401 and is excluded from that success count.

Record browser, date, deployment revision, opaque account labels, repeat count,
observations and timings here. Do not include tokens, email addresses, user IDs,
document IDs/titles or real document content. Server logs intentionally contain
only route, HTTP status and server elapsed milliseconds.

The live results above are the human's reported observations in this session,
not an automated browser run or recording. Each stated path has been exercised
once; browser is Chrome (version not recorded). Visible latency is reported
qualitatively above. Memory
surviving a panel reopen does not demonstrate persistence across process restarts.

The harness simulates roles in one allowlisted user's isolated workflow. It
validates signed Google identity against a test-only Quorum record keyed by
issuer/sub, not a production Quorum login or Workspace membership. No Google API
read/write is made and no access grant is proven by a successful API call yet.
If that proof is needed, add a metadata-only `files.get` under the event's user
OAuth token and record only its status, never the token or response data.

## Card constraints and interpretation

The spike uses basic text paragraphs, button lists and an external link in one
section; no custom HTML/CSS, private Google interface, or Developer Preview API.
No widget limitation prevented the tested action-first experience. Large lists,
mobile clients and the full management interface were not tested.

Google's [documented restrictions](https://developers.google.com/workspace/add-ons/guides/workspace-restrictions)
limit cards to 100 widgets and 100 sections, require card UI rather than custom
HTML/CSS, and restrict the Docs add-on experience to desktop web. These are
documented limits, not stress-test results from this one-Approver harness.

## Consequences and remaining acceptance work

- Keep the HTTP card sidebar and Option A hierarchy. There is no evidence from
  this spike that justifies a legacy Apps Script HTML sidebar comparison.
- The cross-surface interaction prototype (#5) may use the card surface as
  feasible. The human accepts the queue/email attention boundary while the
  panel is closed; actual attention delivery remains outside this harness.
- Real Workspace organization activation, member identity, administrator policy
  and access revocation remain with #11. A personal account cannot settle them.
- Production account linking, full OAuth revocation/re-consent, second-account
  failure/recovery, durable shared workflow state and cold-start performance
  remain implementation acceptance requirements informed by #12. The test-only
  allowlist, simulated role switcher and in-memory state are not production
  authorization or persistence designs.
- External navigation worked to the marked test page. Real Quorum web sign-in,
  workflow routing and cross-surface state synchronization still need their own
  implementation checks.
- Permission prompt cancellation/retry was tested. Revoked OAuth consent was
  not tested and must not be reported as passing.

The runnable artifact and this matrix are the resolution evidence. No recording
was made. Keep the spike on its prototype branch; none of its test-only account
or role behavior is a change to the settled domain model.

## Teardown after validation

At the human's request, the test add-on was uninstalled and the Cloud Run
service, dedicated container repository/images, and build-source uploads/bucket
were removed. The disposable source bucket's soft-delete retention was cleared
before removal. Verified afterward: no Cloud Run service in the test region,
no Artifact Registry repository across the project, no Cloud Storage bucket,
and add-on `installed=false`.

The Google Cloud project, unpublished add-on deployment definition, dedicated
service identities, OAuth configuration and budgets remain for later reuse.
The code and evidence remain in GitHub. Previous test usage can still appear on
billing reports after teardown; the removed hosting and storage resources are
no longer available. Redeploy and reinstall before attempting further live
tests, especially for #11.
