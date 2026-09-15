# Google Docs integration surface for Quorum

_Research date: 2026-09-14 · Resolves [issue #2](https://github.com/pattyolowry/quorum/issues/2) · Sources are first-party Google documentation only._

## Executive answer

Google supports a credible “Quorum inside Google Docs” product shape, but not an embeddable Google Docs editor.

- **Confirmed:** A Google Workspace add-on can put a Quorum card-based sidebar in the Google Docs desktop web UI. It can run against Quorum-hosted HTTP endpoints and request per-file `drive.file` access from the current user. An accompanying Quorum web app can provide the richer personal queue, author workspace, administration, and reporting surfaces.
- **Confirmed:** Quorum can open the canonical document in Google Docs through the Drive file's `webViewLink`. Google documents a published-document embed, but that surface is view-only. No official Google contract was found for embedding the authenticated, editable native Docs editor in a third-party application.
- **Confirmed:** The stable Docs API can read and edit document content. The stable Drive Comments API can read threads, create comments and replies, and resolve or reopen threads. However, Drive-created anchors do not work as native anchored comments in Google Docs, the Drive API exposes no documented comment deep link, and comment authors do not include an email address.
- **Confirmed:** As of 2026-07-07, a new Docs API comments and suggestions surface can preserve Docs-native anchors and programmatically create and manage suggestions. It is **Developer Preview**, whose terms prohibit use in public applications before general availability. It cannot be an MVP dependency for a multi-tenant product.
- **Confirmed:** Google Drive now also has a generally available native Approvals API. Its model does not match Quorum's settled workflow: only approve/decline, any decline completes the entire approval, reviewers cannot be removed without restarting, and Google sends its own notifications. It is a useful benchmark, not a viable Quorum source of truth.
- **Confirmed:** The generally available Workspace Events API can send granular Drive file, permission, comment, and reply events to Pub/Sub, including comment resolve/reopen. Subscriptions are per-authorizing-user and target, expire after at most seven days without resource data or four hours with it, and cover only resources the user can access. An MVP still needs idempotent reconciliation, not an assumption of a lossless real-time mirror.

**Decision-relevant inference:** The strongest feasible baseline is a two-surface product: (1) a Quorum web application for the approval queue and author workflow, and (2) a Google Workspace add-on for document-local status and actions while the user reads or edits in native Docs. Enroll documents explicitly and use `drive.file` wherever possible. Keep Quorum authoritative for approvals and Google authoritative for content, comments, suggestions, and editing. Treat detailed comment-location mirroring as progressively enhanced until Google's preview APIs reach GA.

## Capability matrix

| Quorum need | Current first-party support | Material constraint | MVP implication |
| --- | --- | --- | --- |
| In-document Quorum UI | **GA:** Google Workspace add-on sidebar using card UI; HTTP runtimes supported | Desktop web only; constrained card widgets; user opens the add-on; it cannot alter core Docs UI | Use for current document status, approver list, approval actions, owner nudges, and “open in Quorum” |
| Rich in-document custom UI | **GA:** Editor add-on HTML sidebar/dialog, Apps Script only | Fixed 300 px sidebar, one sidebar at a time, cannot auto-open; Apps Script limits | Possible alternative prototype, but less suitable for a server-backed multi-tenant product |
| Open native editor | **GA:** Drive `webViewLink` | Opens Google, not embedded Quorum chrome | Primary content/editor handoff |
| Embed editable native editor | No documented supported surface found | Published embed is view-only; an authenticated editor iframe would rely on undocumented behavior | Do not design around editable embedding |
| Read and edit Docs content | **GA:** Docs `documents.get` and `batchUpdate` | Structured/indexed model; concurrent edits require revision-aware writes; rebuilding full editor UX is substantial | Useful for narrowly scoped actions and metadata, not a replacement editor |
| Read comment threads | **GA:** Drive Comments API | Google Docs anchor is opaque; author email absent | Enough for a basic thread list and counts, subject to user/file access |
| Create/reply/resolve/reopen comments | **GA:** Drive Comments and Replies APIs | Drive-created anchors render unanchored in Workspace editors | Replies and status changes are viable; create anchored Docs comments only with preview API |
| Deep-link to a specific comment | No documented API field or URL | `webViewLink` opens the document only; URL fragments would be undocumented | Open document and describe thread/quoted context; prototype anchor focusing before promising it |
| Native anchored comments | **Developer Preview:** Docs API `CommentThread` and range anchors | Public applications cannot use preview features | Prototype privately; do not require for MVP |
| Read suggestions | **GA:** Docs suggestion view modes | Stable API exposes alternate views but not complete write lifecycle | Quorum can observe suggested content but should not mirror it as authoritative workflow state |
| Create/accept/reject suggestions | **Developer Preview:** Docs API suggestion write mode and thread operations | Public applications cannot use preview features; partial comment-save failures are possible | Prototype privately; keep native Docs UI as production path |
| File access and permission checks | **GA:** Drive permissions and per-caller `File.capabilities` | Quorum membership does not confer Google file access | Check access under each user's Google credential; surface remediation, never imply sharing succeeded |
| Least-privilege OAuth | **GA:** `drive.file` | Access is file-by-file and user-authorized; revocable | Explicit document enrollment is a sound baseline |
| Change notification | **GA:** Drive push notifications and changes feed | Notification has no change body; channels expire; change feed is user/shared-drive scoped | Treat notifications as refetch hints; add reconciliation and polling |
| Granular comment/content events | **GA:** Workspace Events API for Drive | Pub/Sub required; per-user/target authorization; subscriptions expire quickly | Primary low-latency signal with renewal and reconciliation |
| Native Google approval workflow | **GA:** Drive Approvals API | Workflow semantics conflict with Quorum | Do not use as Quorum approval source of truth |

## 1. User-interface surfaces inside Google Docs

### Google Workspace add-on: the best first-party fit

**Confirmed.** Google Workspace add-ons can extend Docs with a sidebar built from Google's card framework. Unlike legacy Editor add-ons, they may use Apps Script or an arbitrary HTTP runtime, including a Quorum-controlled service. HTTP add-on event requests include Google-signed system identity data and, when authorized, user tokens that can be used to call Google APIs as the current user. See Google's [editor interface guide](https://developers.google.com/workspace/add-ons/editors/gsao/building-editor-interfaces), [card interface overview](https://developers.google.com/workspace/add-ons/concepts/card-interfaces), and [alternate runtime guide](https://developers.google.com/workspace/add-ons/guides/alternate-runtimes).

With `drive.file`, the add-on can show an explicit “request access to the current document” interaction. Before the current user grants that file permission, the editor event supplies only `addonHasFileScopePermission`; after the grant, it supplies the document ID and title and invokes the configured file-scope trigger. This is a good fit for deliberate Quorum enrollment and least privilege. See [editor actions](https://developers.google.com/workspace/add-ons/editors/gsao/editor-actions) and [editor event objects](https://developers.google.com/workspace/add-ons/editors/gsao/building-editor-interfaces#event_objects).

The constraints are product-significant:

- Workspace add-on UI uses Google's card widgets, not arbitrary HTML/CSS or client-side JavaScript.
- The card UI is available in the desktop web clients; only Gmail has contextual mobile add-on support.
- An add-on cannot change, remove, or constrain native Google Workspace UI, and it cannot observe arbitrary user actions in the editor.
- Cards are limited to 100 widgets across sections.

These are documented in [Google Workspace add-on restrictions](https://developers.google.com/workspace/add-ons/guides/workspace-restrictions). Consequently, the add-on is suitable for a focused approval panel, not the complete dashboard/queue or a custom editing environment.

**Inference.** The sidebar should contain only current-document context: overall status and elapsed review time, due date, approver states, the current user's next action, owner controls, and a link to the richer Quorum page. The personal queue and author comment triage deserve Quorum web pages, where the UI is unconstrained.

### Editor add-on: more visual freedom, more platform coupling

**Confirmed.** A legacy Editor add-on can use Apps Script HTML Service to show menus, dialogs, and sidebars. Its sidebar is fixed at 300 px, only one sidebar can be open at once, and an add-on cannot open its sidebar automatically; the user must launch it. Editor add-ons are desktop-only and execute on Apps Script. See [HTML interfaces](https://developers.google.com/workspace/add-ons/concepts/html-interfaces), [dialogs and sidebars](https://developers.google.com/workspace/add-ons/concepts/dialogs), and [Editor add-on authorization](https://developers.google.com/workspace/add-ons/editors/docs).

Apps Script add-on executions have a 30-second runtime and are subject to per-user service quotas; exceeding a quota stops execution. See [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).

**Inference.** The HTML freedom might make the interaction richer, but Apps Script-only execution, the fixed sidebar, and runtime limits make it a weaker default for a server-backed multi-tenant SaaS. A thin comparison prototype should test whether card UI is sufficient before accepting the added operational complexity of an Editor add-on.

### Smart chips can expose Quorum records, not ambient document status

**Confirmed.** A Workspace add-on can recognize Quorum URLs pasted into Docs and turn them into third-party smart chips whose hover card previews Quorum data. It can also add Quorum resource creation to the Docs `@` menu and insert the resulting Quorum URL as a chip. See [preview links with smart chips](https://developers.google.com/workspace/add-ons/guides/preview-links-smart-chips) and [create third-party resources from the @ menu](https://developers.google.com/workspace/add-ons/guides/create-insert-resource-smart-chip).

**Inference.** A “Quorum workflow” chip could make approval state discoverable inside the document, but it is an explicit object/link embedded into document content. It does not automatically attach status chrome to an arbitrary Google Doc, and users can delete it. It is a useful optional affordance, not the workflow's anchor or source of truth.

### Triggers are insufficient for automatic edit awareness

**Confirmed.** Docs supports open triggers, but the Apps Script installable trigger catalog does not provide a general document-edit/change trigger. Simple triggers cannot use services requiring authorization and have a 30-second limit. See [Apps Script triggers](https://developers.google.com/apps-script/guides/triggers) and [Editor add-on triggers](https://developers.google.com/workspace/add-ons/concepts/editor-triggers).

**Inference.** The add-on cannot reliably infer “the owner finished addressing feedback” from editor activity. Quorum needs explicit workflow actions and backend synchronization.

## 2. Opening, embedding, reading, and editing

### Opening Docs is supported; embedding the editor is not

**Confirmed.** Drive's file resource exposes `webViewLink`, “a link for opening the file in a relevant Google editor or viewer in a browser.” The Docs API also documents the ordinary `https://docs.google.com/document/d/{documentId}/edit` form. See the [Drive `files` resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) and [Docs document identifiers](https://developers.google.com/workspace/docs/api/how-tos/documents).

Google's documented embed workflow is for a **published** Docs file and explicitly provides a view with no toolbar. See [publish a file and embed it](https://support.google.com/docs/answer/183965).

**Inference based on the absence of an official API contract.** No first-party Google documentation reviewed for Docs, Drive, Workspace add-ons, or Picker offers an embeddable authenticated editable Docs component. Quorum should open native Docs with `webViewLink`. Even if an iframe experiment happens to render, it would depend on undocumented browser behavior and should not become an architecture assumption.

Google Picker is appropriate when a user enrolls an existing file: it gives a Google-managed file selection UI and returns Drive identifiers/URLs. See [Google Picker overview](https://developers.google.com/workspace/drive/api/guides/picker).

### Content APIs are capable but are not a native-editor component

**Confirmed.** `documents.get` returns structured document content, and `documents.batchUpdate` applies content changes atomically within the request. Modern documents can contain multiple tabs, so callers must request and process tab content. Text locations use indexes into the document structure. Concurrent collaborators can change indexes; Docs supports write controls with required or target revision IDs to manage conflicts. See the [document structure guide](https://developers.google.com/workspace/docs/api/concepts/document), [`documents.get`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/get), [batch updates](https://developers.google.com/workspace/docs/api/how-tos/batch), and [Docs API best practices](https://developers.google.com/workspace/docs/api/how-tos/best-practices).

**Inference.** Quorum can safely offer narrow content operations once prototypes cover tabs and revision controls. Rendering and editing the entire document in Quorum would require recreating many collaboration semantics and directly conflicts with the Wayfinder map's “do not replace Google Docs' editor” boundary.

## 3. Comments, replies, anchors, and suggestions

### Stable Drive Comments API

**Confirmed.** The Drive API provides comment and reply collections. Quorum can list/get/create/update/delete comments; list/get/create/update/delete replies; and resolve or reopen a comment by creating a reply with the corresponding action. Comment listing requires an explicit `fields` projection, supports `startModifiedTime`, and paginates at no more than 100 comments per page. See [manage comments and replies](https://developers.google.com/workspace/drive/api/guides/manage-comments), [`comments.list`](https://developers.google.com/workspace/drive/api/reference/rest/v3/comments/list), and [`replies.create`](https://developers.google.com/workspace/drive/api/reference/rest/v3/replies/create).

The same Google guide documents a critical Google Docs limitation: anchors for Google Workspace editor files are opaque. An anchored comment created through the Drive API is treated as unanchored in Docs; Google directs developers to the Docs API for anchored comments.

The Drive Comment resource exposes an author display object but does not populate the author's email address or permission ID. It also exposes no documented browser URL for a comment. See the [Comment resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/comments).

**Inference.** A production MVP can show thread text, reply, resolve/reopen, and count pending threads using the Drive API. It cannot promise exact document-range navigation or a durable mapping from every Google commenter to a Quorum account. The safest navigation is “open the document” plus quoted context or thread metadata when available.

### New Docs-native comments and suggestions API: promising, not production-eligible

**Confirmed.** Google announced a Docs API comments and suggestions surface on 2026-07-07. It can return Docs-native `CommentThread` objects with comment IDs, anchors/ranges, posts, and status; create range-anchored comments; reply; resolve/reopen; and update/delete posts. Suggestion write mode can create suggested edits, and API requests can accept, reject, or delete suggestions. See [work with comments and suggestions](https://developers.google.com/workspace/docs/api/how-tos/suggestions), the [`documents` resource](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents), the [`Request` reference](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request), and the [Workspace release notes](https://developers.google.com/workspace/release-notes#july_07_2026).

The API can apply document changes even if saving an associated comment or suggestion thread fails, so callers must inspect `commentUpdateState` rather than assuming all-or-nothing behavior across content and comments.

This surface is labeled Developer Preview. Google's [Developer Preview terms](https://developers.google.com/workspace/preview) state that pre-GA features must not be used in public applications, may not become generally available, and may change incompatibly. Preview testing cannot be shared outside the participant's organization or company.

**Inference.** This API is likely the eventual solution for precise comment locations and native suggestion manipulation. Quorum should prototype it privately behind an adapter, but the public multi-tenant MVP must degrade cleanly to the stable Drive Comments API and native Docs UI.

### Suggestions and revision identity

**Confirmed.** Stable Docs reads can choose an inline, accepted, or rejected suggestions view, enabling observation of suggested content. Stable APIs did not provide the newly previewed complete suggestion-write lifecycle. See the [`SuggestionsViewMode` reference](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents#suggestionsviewmode).

A Docs `revisionId` is opaque, user-specific, and only guaranteed valid for 24 hours. A changed ID usually indicates a document update, but Google notes that internal changes can also change it. See the [`Document` resource](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents).

Drive revision history is not a durable event log for Google Docs: revisions can be merged, and old revisions may be omitted from `revisions.list` for documents with extensive histories. `keepForever` is only available for binary files, not Docs. See [Drive changes and revisions](https://developers.google.com/workspace/drive/api/guides/change-overview), [`revisions.list`](https://developers.google.com/workspace/drive/api/reference/rest/v3/revisions/list), and the [Revision resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/revisions).

**Inference.** Do not use a Google revision ID as Quorum's permanent approval evidence. Record Quorum's own approval events and timestamps. If a product later promises “approved against this exact content,” that requires a separate snapshot/export policy and legal/product decision; Google revision identifiers alone are insufficient.

### Deep links

**Confirmed.** Neither the stable Drive Comment schema nor the preview Docs `CommentThread` schema documents a URL that opens a specific comment. Drive's `webViewLink` opens the file, not a comment.

**Inference.** A comment-specific URL fragment copied from the Docs browser UI is not a supported integration contract. Before showing “jump to comment,” a prototype must determine whether the add-on can focus a Docs anchor through a documented API. Until then, promise only “open document,” not “open this thread in context.”

## 4. Google-native Approvals is not Quorum's workflow engine

**Confirmed.** The generally available Drive Approvals API can start, inspect, approve, decline, cancel, and reassign approval workflows on Drive files. It supports reviewers and due times. With `NO_APPROVAL_ACTION`, edits do not reset approvals or lock the file. See the [Drive approvals guide](https://developers.google.com/workspace/drive/api/guides/approvals), [Approvals API reference](https://developers.google.com/workspace/drive/api/reference/rest/v3/approvals), and [Drive API release notes](https://developers.google.com/workspace/drive/release-notes#april_21_2026).

Its semantics differ from Quorum's settled requirements:

- Reviewer responses are `APPROVED`, `DECLINED`, or `NO_RESPONSE`; there are no “Changes Requested” and “Clarification Needed” review states.
- Any decline completes the entire approval.
- Reviewers cannot be removed from an active approval; the initiator must cancel and start over.
- Completed approvals are final; reviewers cannot continue interacting with them.
- A reviewer can reset their own approved response to pending only while the overall approval remains active under `NO_APPROVAL_ACTION`.
- Google sends activity notifications to the initiator and all reviewers, which would compete with Quorum's configurable notification policy.
- The file must report `canStartApproval`; this can be false because of Workspace edition/admin policy, external-domain ownership, or insufficient access.
- Reviewers must have Google Accounts, and file access must be managed separately.

**Inference.** Drive Approvals should not be Quorum's authoritative approval store. Attempting to dual-write both systems would create conflicting states and duplicate notifications. If customers later demand Google-native approval badges, that needs its own product decision and failure-mode prototype, not an implicit MVP feature.

## 5. Permissions, user identity, and external users

### Ask Google what the current caller can do

**Confirmed.** Drive roles distinguish writer, commenter, and reader. Google directs clients to the current caller's `File.capabilities`—for example `canEdit` and `canComment`—rather than deriving allowed actions from permission roles. See [roles and permissions](https://developers.google.com/workspace/drive/api/guides/ref-roles), [manage sharing](https://developers.google.com/workspace/drive/api/guides/manage-sharing), and the [`File` resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files).

**Inference.** Being a Quorum owner or approver cannot confer Google file access. Quorum should check capabilities using each current user's Google credential, clearly separate “Quorum approval access” from “Google document access,” and offer guidance rather than silently modifying sharing by default.

### Use stable Google identity, not email, as the link key

**Confirmed.** Google's OpenID Connect guidance identifies the `sub` claim as the unique, stable user identifier and warns that email can change and should not be used as the primary identifier. It also says the `hd` claim, not the email's domain, indicates that an account belongs to a Google Workspace/Cloud organization. See [Google OpenID Connect](https://developers.google.com/identity/openid-connect/reference).

**Inference.** Model a Google identity binding keyed by issuer plus `sub`; keep email/display name as mutable profile data. `hd` identifies a domain, not necessarily the complete multi-domain Workspace customer boundary, so organization claiming across primary and secondary domains needs an explicit admin setup prototype or Directory/customer-ID design.

### Service accounts do not bypass sharing

**Confirmed.** A service account can access only resources it has permission to access. Domain-wide delegation lets a Workspace super administrator authorize a service account to impersonate users for specified scopes. See [Workspace authentication overview](https://developers.google.com/workspace/guides/auth-overview), [create credentials](https://developers.google.com/workspace/guides/create-credentials), and [service accounts and domain-wide delegation](https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority).

**Inference.** User OAuth with per-file grants is the safest bottom-up baseline. Domain-wide delegation is an optional enterprise deployment mode with materially greater security and administrator-review burden, not a quiet fallback for missing access.

### External users split into two cases

**Confirmed.** If an organization's policy permits it, Drive visitor sharing lets a non-Google account view, comment, or edit after PIN verification, with verification expiring after seven days. See [visitor sharing](https://support.google.com/drive/answer/9195194). Native Drive approval reviewers, by contrast, must have Google Accounts.

**Inference.** An external person with a Google Account can use the public Quorum app/add-on if file permissions and their administrators permit it. A Quorum-only user with no Google Account cannot authorize the Google APIs or add-on as themselves; Quorum can still track their workflow response, but document reading/commenting/editing must hand off to Google's visitor experience and cannot rely on API access under that user.

## 6. OAuth, verification, administrator consent, and distribution

### Least privilege is viable

**Confirmed.** `drive.file` is a non-sensitive scope that limits access to files the user selects, opens, or shares with the app. Google recommends it when possible. It authorizes the relevant Docs reads/writes and Drive operations on enrolled files. The broader `documents` scope is sensitive; `drive` and `drive.readonly` are restricted. If an app stores or transmits restricted-scope data server-side, Google requires an annual security assessment. See [Docs authorization scopes](https://developers.google.com/workspace/docs/api/auth), [Drive authorization scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), and [restricted-scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).

**Inference.** Start with explicit user-initiated enrollment and `drive.file`. Broader tenant-wide document discovery would materially change the compliance and admin-consent posture and should remain outside the first integration contract.

### Enterprise administrators can still block a bottom-up install

**Confirmed.** Public applications requesting sensitive or restricted scopes undergo OAuth verification. Workspace administrators can classify third-party apps as trusted, limited, specifically allowed, or blocked; they can block unconfigured applications and revoke existing access through policy. See [OAuth app verification policies](https://developers.google.com/identity/protocols/oauth2/policies) and [control API access](https://support.google.com/a/answer/7281227).

Marketplace applications can be public or private. Private applications are limited to one organization and their visibility cannot later be changed; a multi-tenant SaaS therefore needs a public listing, which may be unlisted but is reviewed by Google. Install settings can allow individual and administrator installation or require administrator installation; an administrator can install for an organization, organizational unit, or group. See [publish an app](https://developers.google.com/workspace/marketplace/how-to-publish), [configure the Marketplace SDK](https://developers.google.com/workspace/marketplace/enable-configure-sdk), and [publish a Workspace add-on](https://developers.google.com/workspace/add-ons/how-tos/publish-add-on-overview).

**Inference.** Quorum can support bottom-up adoption technically, but should ship administrator-ready documentation, verified ownership/privacy pages, scope explanations, and an admin installation path from the outset. “No admin required” cannot be promised for large organizations.

## 7. Change notifications and synchronization

### Stable Drive notifications are invalidation signals

**Confirmed.** Drive push notifications can watch a file or a user's changes feed. The webhook request body is empty; headers identify the channel/resource and state, so Quorum must fetch current data. Channels do not renew automatically. File channels expire after at most one day and changes channels after at most one week; the default is one hour. Notification message numbers are not sequential. See [Drive push notifications](https://developers.google.com/workspace/drive/api/guides/push).

The Drive changes feed is scoped to a user or shared drive and reports current state rather than a content delta. A user's change log does not include every change to shared-drive membership or files; shared drives have separate logs. A removed item can mean deletion or loss of access. See [track changes](https://developers.google.com/workspace/drive/api/guides/manage-changes), [changes and revisions overview](https://developers.google.com/workspace/drive/api/guides/about-changes), and [shared-drive support](https://developers.google.com/workspace/drive/api/guides/enable-shareddrives).

**Inference.** Persist channel metadata, renew early, deduplicate, and treat every notification as “refetch/reconcile.” Also reconcile when users open a workflow or take a Quorum action. Never make approval correctness depend on observing every Google change.

### Granular Workspace Events are generally available

**Confirmed.** The generally available Workspace Events API can emit granular Drive file content and permission events plus comment/reply create, edit, resolve, reopen, and delete events through Google Cloud Pub/Sub. It supports the non-sensitive `drive.file` scope. See [subscribe to Drive events](https://developers.google.com/workspace/events/guides/events-drive), [Workspace Events authorization scopes](https://developers.google.com/workspace/events/guides/auth), the [2026-05-18 GA announcement](https://developers.google.com/workspace/release-notes#may_18_2026), and the [subscription resource](https://developers.google.com/workspace/events/reference/rest/v1/subscriptions).

Subscriptions expire quickly: up to seven days without resource data, four hours with resource data, or 24 hours with domain-wide delegation; one user can authorize an app to create only one subscription for a given target resource. A subscription sees only resources the authorizing user can access. Including resource data reduces lifetime substantially; omitting it supplies identifiers that Quorum must refetch.

**Inference.** Workspace Events is the best primary low-latency signal for enrolled files, with payload-free seven-day subscriptions likely the cleaner baseline. Quorum must still persist subscription lifecycle state, renew early, handle suspension/revocation, deduplicate events, and reconcile from the Drive/Docs APIs. Bounded `comments.list(startModifiedTime=...)` polling remains a useful repair path rather than the primary notification strategy.

## 8. Quotas and multi-tenant constraints

**Confirmed.** Current Docs API quotas are 3,000 read requests per minute per project and 300 per minute per user/project; writes are 600 per minute per project and 60 per minute per user/project. Google instructs clients to use truncated exponential backoff for `429` responses. See [Docs API usage limits](https://developers.google.com/workspace/docs/api/limits).

For Drive API projects created on or after 2026-05-01, quotas are expressed in quota units: 1,000,000 per minute per project and 325,000 per minute per user/project, plus 1 TB egress per day. Example costs include 5 units for a read, 100 for a list, 200 for a download, and 50 for an edit. `watch` and `stop` calls consume quota, while delivered push notifications do not. Google also documents a daily no-cost threshold and planned pricing above it later in 2026. See [Drive API usage limits](https://developers.google.com/workspace/drive/api/guides/limits).

**Inference.** Quorum must project fields narrowly, batch Docs mutations, cache stable file metadata, page comment lists, renew watches with jitter, back off by user and project, and meter Google API use by tenant. The per-project ceiling creates noisy-neighbor risk in a multi-tenant service. Quota and pricing assumptions must be configurable because grandfathered projects and future Google pricing may differ.

## 9. Feasible product shapes

### A. Web application plus Google Workspace add-on — strongest fit

The web application owns the personal review queue, author workspace, reporting, tenant settings, notification preferences, and audit history. The card sidebar owns current-document status and lightweight workflow actions. Both open the content in native Google Docs.

- Matches Quorum's workflow needs and the decision that Google owns document collaboration.
- Provides document-local visibility so users do not need to visit Quorum merely to check approval state.
- Supports a Quorum-hosted backend and least-privilege per-file enrollment.
- Requires two coordinated surfaces and a Marketplace/OAuth/admin adoption path.
- Card UI and desktop-only constraints mean the web app remains essential.

### B. Web application only — technically simplest, adoption risk

The web application uses Picker for enrollment, APIs for context, and `webViewLink` to open Docs.

- Avoids add-on review and constrained card development.
- Does not solve the stated concern that users will not visit a separate app to check status.
- Could be an initial technical slice, but not the complete intended experience.

### C. Legacy Editor add-on plus web application — viable alternative

An Apps Script HTML sidebar can be more custom than card UI.

- More visual freedom inside Docs.
- Fixed 300 px, user-launched, Apps Script-only execution and quota/runtime constraints.
- Worth a thin UX prototype only if the card framework proves inadequate.

### D. Browser extension overlay — possible, fragile fallback

**Confirmed.** Chrome extensions can inject content scripts with host permissions, and enterprise Chrome administrators can force-install managed extensions. See [extension permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), and [enterprise extension installation](https://support.google.com/chrome/a/answer/6306504).

**Inference.** Google publishes no supported Docs DOM integration contract. A Chrome-only overlay would be coupled to private DOM behavior, request broad site access, increase security review, and exclude non-Chrome users. Consider it only if a prototype demonstrates a critical UX that the first-party add-on cannot provide.

### E. Quorum editor backed by Docs API — out of scope and high risk

The APIs can read/write structure, but they do not provide an embeddable collaborative editor. This shape would recreate document rendering, concurrent editing, commenting, suggestions, and accessibility while still needing Google reconciliation. It violates the Wayfinder scope and should not be pursued.

## 10. Thin prototypes required before implementation-ready architecture

These are deliberately narrow experiments; none should grow into production code before its question is answered.

1. **Workspace add-on interaction prototype.** Build one HTTP-runtime card sidebar for the active Doc with file-scope grant, Quorum sign-in/linking, approver rows, owner/reviewer actions, and “open full Quorum.” Verify event identity, refresh behavior, error states, card navigation, latency, desktop browser behavior, and whether users can discover/reopen it naturally.
2. **Card versus HTML sidebar usability spike.** Implement the same dense approver/status view in card UI and an Apps Script HTML sidebar. Decide whether card constraints materially impair the workflow enough to justify the legacy runtime.
3. **OAuth and tenant matrix.** Exercise `drive.file` with: same-domain My Drive; same-domain shared drive; cross-domain Google Account; consumer Google Account; visitor-shared non-Google user; admin-blocked OAuth; and revoked consent. Record which identities can enroll, read, comment, edit, and approve, and the exact remediation UX.
4. **Stable comments and events fidelity.** Against real Docs, test Drive API thread pagination, quoted content, replies, resolve/reopen, deletions, anonymous authors, external authors, and permissions. Subscribe through Workspace Events and verify every documented comment/reply event, payload-free refetch, ordering, duplication, and access-loss behavior.
5. **Preview Docs comments/suggestions adapter.** In an enrolled Developer Preview test organization, validate native range anchors across multiple tabs, comment navigation, suggestion creation/accept/reject, concurrent edits, and `commentUpdateState` partial failures. The adapter must be removable and disabled in public builds.
6. **Deep-link/navigation spike.** Search only documented APIs first; test whether an add-on can focus an anchor or whether any Google-generated link is stable and officially supported. If not, specify “open document with quoted context” as the product behavior.
7. **Sync failure drill.** Create and renew Workspace Events subscriptions and legacy Drive file/changes watches, intentionally miss and reorder notifications, revoke permissions, move a file into/out of a shared drive, and delete/restore it. Demonstrate that Quorum converges and never corrupts approval state.
8. **Quota/load model.** Model an enterprise tenant with active workflows, per-user comments polling, watch renewals, queue refreshes, and Docs reads. Load-test quota backoff, per-tenant metering, and noisy-neighbor isolation using the current Docs/Drive unit schedules.
9. **Smart-chip discoverability test.** Compare sidebar-only against an inserted Quorum workflow chip. Determine whether the explicit document-content artifact improves status discovery enough to justify clutter and deletion/staleness behavior.

## 11. Constraints to carry into the implementation-ready spec

1. Quorum remains authoritative for workflow state, approval history, due dates, notifications, and metrics; Google remains authoritative for document content and native collaboration artifacts.
2. The integration contract should target a Quorum web app plus an HTTP Google Workspace add-on; an editable embedded Docs editor is not a supported premise.
3. Begin with explicit document enrollment and `drive.file`; broader discovery or domain-wide delegation requires a separate security/admin decision.
4. Every user-facing Google action must be gated by the caller's current Google `File.capabilities`; Quorum roles and Google access are separate concepts.
5. The stable Drive Comments API supports a useful basic thread experience, but exact anchors, comment deep links, and suggestion writes must be feature-gated until the Docs comments/suggestions API is GA. Workspace Events can be used now for granular change signals.
6. Stable notifications are hints, not an event log. Synchronization must be idempotent, renewable, poll/reconcile capable, and tolerant of access loss.
7. Google revision identifiers are not durable approval evidence. Quorum must retain its own immutable approval events.
8. Public Marketplace publication, OAuth verification, admin controls, external-user constraints, quotas, and future Drive API pricing are product requirements—not post-launch operational details.
9. Do not dual-write to native Drive Approvals without a future explicit decision; its lifecycle and notifications conflict with Quorum's settled model.

## Source-confidence note

All statements marked **Confirmed** are grounded in the linked current Google developer or administrator documentation. Statements marked **Inference** are product or architecture conclusions drawn from those documented surfaces, including explicit conclusions based on the absence of a documented API. Developer Preview capabilities are separated from generally available capabilities because Google's own terms prevent using them as dependencies in a public multi-tenant application.
