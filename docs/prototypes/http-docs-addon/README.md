# Quorum HTTP Docs add-on spike

Disposable feasibility harness for [#10](https://github.com/pattyolowry/quorum/issues/10),
on `prototype/http-docs-addon`. Not production implementation. **Deployed and
installed for the development account; the tested card experience is viable as
agreed.** See
[results.md](results.md) for the evidence checklist and verified cost controls.

The personal Google account is a development test identity only. It cannot
validate real Customer Organization activation, internal membership or tenant
isolation. That remains issue #11.

## What is ready

- Docs-only deployment manifest generator, least-privilege per-file access prompt.
- Signed system/user token verification and an allowlisted test account.
- A test-only identity binding keyed by issuer/sub and current document.
- Option A cards: Approver, Document Owner and prominent Paused stop-review view.
- Simulated responses, re-review, pause/resume and refresh, held in process memory.
- Full-workflow navigation stub and a live test results matrix.

The test view switcher deliberately simulates roles for one user; it is not an
authorization model. No email is sent and no Google Doc is modified. State is
lost on process restart and can differ across instances; use one instance for
this experiment. No production Quorum service exists yet.

## Prerequisites requiring the account holder

1. Choose/create a dedicated Google Cloud project using the personal account;
   record its project ID and the test account email in local `.env`.
2. Link billing for Cloud Run and builds.
3. Configure Google Auth platform branding, External audience, Testing status,
   and add the personal account under Test users. Do not publish the app.

An ephemeral wizard at `/private/tmp/quorum-addon-setup.sh` walks through these
steps on the current workstation. It stores only `QUORUM_PROJECT_ID` and
`TEST_USER_EMAIL` in the ignored `.env`. No client secret or access token is
needed from the user. A temporary local Google Cloud CLI was installed for this
session; a fresh machine can use Cloud Shell or install/authenticate the CLI
before deployment.

## Agent deployment sequence after prerequisites

Use the explicitly chosen project for all commands. Enable Cloud Run, Cloud
Build, Artifact Registry, Drive, Google Workspace add-ons and Marketplace SDK
APIs. Read `gcloud workspace-add-ons get-authorization` for the system service
account email and OAuth client ID; the Marketplace SDK HTTP Deployments page
also shows both. Save as `ADDON_SERVICE_ACCOUNT` and `ADDON_CLIENT_ID`.

Build/deploy this directory with Cloud Run source deployment and authentication
required. Initially set `ADDON_URL=https://setup.invalid` along with the other
three runtime variables so the service can start. Read its assigned HTTPS URL,
save it as `ADDON_URL`, and update that runtime variable. Limit to one instance
and zero minimum instances. Grant only the add-on system service account the
Cloud Run Invoker role. Review any project-specific build IAM failures before
adding permissions; do not grant blanket project owner permissions.

Generate a manifest without npm's log prefix:

```sh
node --env-file=.env manifest.mjs > deployment.json
```

Create the unpublished deployment with:

```sh
gcloud workspace-add-ons deployments create quorum-docs-spike --deployment-file=deployment.json
gcloud workspace-add-ons deployments install quorum-docs-spike
```

Use `deployments replace` for later manifest changes. Add the manifest scopes
on Google Auth platform Data Access as needed. Keep the External app in Testing.
Do not make a public Marketplace listing.

## Run and exercise

Runtime variables: `ADDON_URL`, `ADDON_CLIENT_ID`, `ADDON_SERVICE_ACCOUNT`,
`TEST_USER_EMAIL`. Install and run from this directory:

```sh
npm ci --ignore-scripts
node --env-file=.env server.mjs
```

Local `/health` and authentication-rejection checks are possible before
deployment. Valid signed Google events require the installed add-on. There is
no authentication bypass for local testing.

In a disposable Doc, open the installed add-on, approve OAuth scopes and grant
current-file access. Exercise the result matrix. Use Request changes → Owner
view → Request re-review; Owner view → Pause → Approver view; Owner view → Resume;
then Approver view → Approve. Close/reopen the panel and exercise Refresh and the
full-workflow stub. Measure visible latency separately from server elapsed time.

Record deny/retry and revoked-consent recovery, not only the happy path. Keep
raw tokens, request bodies and real user/document identifiers out of evidence.
Queue/email attention while the panel is closed requires a walkthrough because
those Quorum surfaces are not implemented by this harness.

After the exercise, uninstall the test deployment and remove the test Cloud Run
service when no longer needed. Keep #10 open until the real results support a
verdict. Compare an Apps Script HTML sidebar only if cards fail the essential
interaction.

## Platform references

- [HTTP runtime guide](https://developers.google.com/workspace/add-ons/guides/alternate-runtimes): request authentication, user tokens and consent.
- [Google's Cloud Run codelab](https://codelabs.developers.google.com/codelabs/workspace-add-on-nodejs-cloudrun): personal-account setup, card callbacks and file-access response envelope.
- [Deployment reference](https://developers.google.com/workspace/add-ons/reference/rest/v1/projects.deployments): Docs file-scope trigger and HTTP options.
- [Editor actions](https://developers.google.com/workspace/add-ons/editors/gsao/editor-actions): current-file permission flow.
