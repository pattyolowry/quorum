# Quorum

Quorum coordinates the review and approval of project-governance documents while the documents themselves remain in Google Docs.

## Language

**Project Governance Document**:
A Google Doc used to support a decision about whether or how an engineering project may progress and requiring approval from named people.
_Avoid_: Workflow document, approval document

**Approval Workflow**:
The Quorum-owned record of the reviews and approvals required for a Project Governance Document to progress.
_Avoid_: Google Docs approval, document workflow

**Approval Round**:
One attempt to obtain the required Approvals within an Approval Workflow. A new round resets current approval requirements while preserving earlier rounds in history, and only one round may be active at a time.
_Avoid_: Document revision, separate workflow

**Document Owner**:
The person responsible for initiating and managing a Project Governance Document's Approval Workflow. Initially this is the document's owner, though workflow ownership may later be transferable.
_Avoid_: Author, workflow administrator

**Approver**:
A named individual whose approval is required by an Approval Workflow. A future group assignment may select an individual Approver through a defined rotation, but the responsibility ultimately belongs to a person.
_Avoid_: Reviewer, approval group

**Approval**:
An Approver's durable acceptance of a Project Governance Document within an Approval Workflow. Later document edits do not automatically invalidate it; the Document Owner is responsible for requesting fresh attention when changes are significant.
_Avoid_: Revision approval, immutable sign-off

**Changes Requested**:
A review outcome indicating that the Document Owner should edit the document before asking the Approver to review it again. It transfers attention to the Document Owner until re-review is explicitly requested.
_Avoid_: Rejected, review complete

**Clarification Needed**:
A review outcome indicating that the Document Owner should supply additional explanation before asking the Approver to review again. It has the same routing behavior as Changes Requested but communicates a different kind of feedback.
_Avoid_: Question, changes requested

**Fully Approved**:
The status of an Approval Workflow after every required Approver has approved. It certifies completion within Quorum but does not unlock or advance work in another system.
_Avoid_: Released, unblocked

**Withdraw Approval**:
An action by which an Approver retracts an existing Approval while remaining an Approver. It returns the Approval Workflow to a pending state and makes that person's approval require attention again.
_Avoid_: Remove approver, restart review

**Remove Self as Approver**:
An action by which an Approver ends their own approval responsibility. It removes their requirement rather than returning the Approval Workflow to pending, and remains visible in the workflow history.
_Avoid_: Withdraw approval
