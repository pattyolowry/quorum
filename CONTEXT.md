# Quorum

Quorum coordinates the review and approval of project-governance documents while the documents themselves remain in Google Docs.

## Language

**Customer Organization**:
A Google Workspace organization represented by one Quorum tenant, including its multiple domains and participating departments.
_Avoid_: Department tenant, domain tenant

**Project Governance Document**:
A Google Doc used to support a decision about whether or how an engineering project may progress and requiring approval from named people.
_Avoid_: Workflow document, approval document

**Approval Workflow**:
The single Quorum-owned record of the reviews and approvals required for a Project Governance Document to progress, reused across Approval Rounds, cancellation, and reactivation.
_Avoid_: Google Docs approval, document workflow

**Approval Round**:
One attempt to obtain the required Approvals within an Approval Workflow. A new round resets current approval requirements while preserving earlier rounds in history, and only one round may be active at a time.
_Avoid_: Document revision, separate workflow

**Document Owner**:
The internal person who initiates and manages a Project Governance Document's Approval Workflow. This role does not require Google Drive file ownership; workflow ownership may later be transferable.
_Avoid_: Author, workflow administrator

**Approver**:
A named individual whose approval is required by an Approval Workflow. A future group assignment may select an individual Approver through a defined rotation, but the responsibility ultimately belongs to a person.
_Avoid_: Reviewer, approval group

**Approval**:
An Approver's durable acceptance of a Project Governance Document within an Approval Workflow. Later document edits do not automatically invalidate it; the Document Owner is responsible for requesting fresh attention when changes are significant.
_Avoid_: Revision approval, immutable sign-off

**Changes Requested**:
A review outcome indicating that the Document Owner should edit the document before requesting re-review. Attention rests with the Document Owner while this state remains current.
_Avoid_: Rejected, review complete

**Awaiting Review**:
An Approver's default state when their Approval is required and their next action is to review the Project Governance Document. Changes Requested and Clarification Needed are distinct states that await a Document Owner response.
_Avoid_: Pending

**Clarification Needed**:
A review outcome indicating that the Document Owner should supply additional explanation before asking the Approver to review again. It has the same routing behavior as Changes Requested but communicates a different kind of feedback.
_Avoid_: Question, changes requested

**Fully Approved**:
The status of an Approval Workflow with at least one required Approver after every required Approver has approved. It certifies completion within Quorum but does not unlock or advance work in another system.
_Avoid_: Released, unblocked

**In Review**:
The status of an Approval Workflow open for parallel review and not Fully Approved. It may include Approvers awaiting review, Approvers awaiting an owner response, or no Approvers yet.
_Avoid_: Changes requested, pending

**Paused**:
A temporary status set by the Document Owner that suspends review actions in an Approval Workflow while preserving its current Approval Round and existing Approvals. Approvers should stop reviewing until the Document Owner resumes the workflow.
_Avoid_: Cancelled, withdrawn document

**Draft**:
An Approval Workflow being prepared before its first Approval Round starts. Its Approver list and optional due date may be configured without requesting review.
_Avoid_: Paused, awaiting review

**Overdue**:
A timing condition of an unfinished Approval Workflow whose due date has passed. It does not end the workflow or prevent further review.
_Avoid_: Expired, cancelled

**Cancelled**:
The status of an Approval Workflow stopped by the Document Owner without continuing review. Its history is preserved; the Document Owner can reactivate it by starting a new Approval Round.
_Avoid_: Paused, deleted workflow

**Withdraw Approval**:
An action by which an Approver retracts an existing Approval while remaining an Approver. That person returns to Awaiting Review; a Fully Approved workflow reopens, while a Paused workflow stays paused.
_Avoid_: Remove approver, restart review

**Reset Approval**:
A Document Owner action returning selected Approvers to Awaiting Review within the same Approval Round, preserving everyone else's states and earlier responses in history.
_Avoid_: Withdraw approval, new approval round

**Reset Approvals**:
A Document Owner action starting a new Approval Round with the current Approver list and resetting everyone to Awaiting Review. Earlier rounds remain in history.
_Avoid_: Clear approver list, targeted reset

**Remove Self as Approver**:
An action by which an Approver ends their own approval responsibility. It removes their requirement rather than returning the Approval Workflow to pending, and remains visible in the workflow history.
_Avoid_: Withdraw approval
