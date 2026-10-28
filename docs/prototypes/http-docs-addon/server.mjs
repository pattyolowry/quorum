// PROTOTYPE ONLY. One test user; in-memory, simulated workflow state.
// No production Quorum connection, email, history, or document modification.
import {createServer} from 'node:http';
import {OAuth2Client} from 'google-auth-library';

const base = process.env.ADDON_URL?.replace(/\/$/, '');
const clientId = process.env.ADDON_CLIENT_ID;
const serviceAccount = process.env.ADDON_SERVICE_ACCOUNT;
const testEmail = process.env.TEST_USER_EMAIL;
if (![base, clientId, serviceAccount, testEmail].every(Boolean)) {
  throw new Error('Set ADDON_URL, ADDON_CLIENT_ID, ADDON_SERVICE_ACCOUNT, TEST_USER_EMAIL');
}
const verifier = new OAuth2Client();
const states = new Map();
const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const text = value => ({textParagraph: {text: value}});
const button = (label, path) => ({text: label, onClick: {action: {function: `${base}${path}`}}});
const buttons = (...items) => ({buttonList: {buttons: items}});
function response(card, initial = false, message) {
  const action = {navigations: [{[initial ? 'pushCard' : 'updateCard']: card}]};
  if (message) action.notification = {text: message};
  return initial ? {action} : {renderActions: {action}, stateChanged: true};
}
function card(title, widgets) {
  return {header: {title}, sections: [{widgets: [
    text('<b>DEVELOPMENT TEST</b> · Simulated workflow; state resets on restart.'), ...widgets
  ]}]};
}
function workflowCard(state, title) {
  const paused = state.paused;
  const owner = state.view === 'owner';
  const status = paused ? 'Paused' : state.response === 'Approved' ? 'Fully Approved' : 'In Review';
  const widgets = [text(`<b>${escape(title)}</b><br>${status}`)];
  if (paused) widgets.push(text('<b>Stop reviewing: review is paused.</b> Resume before taking a review action.'));
  else if (owner) widgets.push(text(state.response === 'Changes Requested' || state.response === 'Clarification Needed'
    ? '<b>An owner response is needed.</b> Address feedback in Google Docs, then request re-review.'
    : 'No owner response is needed.'));
  else widgets.push(text(state.response === 'Awaiting Review'
    ? '<b>Your approval is needed.</b> Review this Doc, then choose your response.'
    : `<b>Your response: ${state.response}</b>`));
  if (!paused && !owner) widgets.push(buttons(
    button('Approve', '/approve'), button('Changes Requested', '/changes'),
    button('Clarification Needed', '/clarify')));
  if (owner) {
    if (!paused && ['Changes Requested', 'Clarification Needed'].includes(state.response)) {
      widgets.push(buttons(button('Request re-review', '/rereview')));
    }
    if (paused || status === 'In Review') widgets.push(buttons(button(paused ? 'Resume' : 'Pause', paused ? '/resume' : '/pause')));
  }
  widgets.push(text(`<b>Approvers · ${state.response === 'Approved' ? 1 : 0} of 1 approved</b><br>Test Approver: ${state.response}`));
  widgets.push(buttons(button('Refresh', '/refresh')));
  widgets.push(text('<b>Test controls</b> · Switching views simulates roles; it does not change Google identity.'));
  widgets.push(buttons(button('Approver view', '/view/approver'), button('Owner view', '/view/owner'), button('Reset test', '/reset')));
  widgets.push({buttonList: {buttons: [{text: 'Open full workflow in Quorum (test stub)', onClick: {
    openLink: {url: `${base}/workflow`, openAs: 'FULL_SIZE'}
  }}]}});
  return card('Quorum · Action first', widgets);
}

createServer(async (req, res) => {
  const started = Date.now();
  const path = new URL(req.url, 'http://localhost').pathname;
  const send = (status, body) => {
    res.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
    res.end(JSON.stringify(body));
    // Never log request bodies, credentials, identities, document IDs or titles.
    console.log(JSON.stringify({path, status, elapsedMs: Date.now() - started}));
  };
  if (req.method === 'GET' && path === '/health') return send(200, {status: 'development spike'});
  if (req.method === 'GET' && path === '/workflow') {
    return send(200, {notice: 'Test navigation stub only. No production Quorum web app is connected. The real queue and email must carry attention when this panel is closed.'});
  }
  if (req.method !== 'POST') return send(405, {error: 'POST required'});
  let event;
  try {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 1048576) return send(413, {error: 'Request too large'});
    }
    event = JSON.parse(raw);
  } catch { return send(400, {error: 'Invalid JSON'}); }
  try {
    const bearer = req.headers.authorization?.replace(/^Bearer /, '');
    const ticket = await verifier.verifyIdToken({idToken: bearer, audience: [base, `${base}${path}`]});
    const system = ticket.getPayload();
    if (!system.email_verified || system.email !== serviceAccount) throw new Error('Wrong system identity');
  } catch { return send(401, {error: 'Google add-on authentication failed'}); }
  const initial = path === '/home';
  const scopes = event.authorizationEventObject?.authorizedScopes || [];
  const required = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.email', 'openid'];
  const missing = required.filter(scope => !scopes.includes(scope));
  if (missing.length) return send(200, {requesting_google_scopes: {scopes: missing}});
  let identity;
  try {
    identity = (await verifier.verifyIdToken({
      idToken: event.authorizationEventObject.userIdToken, audience: clientId
    })).getPayload();
    if (!identity.email_verified || identity.email.toLowerCase() !== testEmail.toLowerCase()) throw new Error('Not test user');
  } catch { return send(403, {error: 'Verified development test account required'}); }
  if (path === '/grant') return send(200, {renderActions: {
    hostAppAction: {editorAction: {requestFileScopeForActiveDocument: {}}}
  }});
  if (!event.docs?.addonHasFileScopePermission || !event.docs.id) {
    return send(200, response(card('Connect this Google Doc', [
      text('Allow Quorum to access this test document.'), buttons(button('Allow access to this Doc', '/grant'))
    ]), initial));
  }
  const key = `${identity.iss}:${identity.sub}:${event.docs.id}`;
  if (!states.has(key)) states.set(key, {view: 'approver', paused: false, response: 'Awaiting Review'});
  const state = states.get(key);
  let message;
  if (path.startsWith('/view/')) state.view = path === '/view/owner' ? 'owner' : 'approver';
  else if (path === '/reset') Object.assign(state, {view: 'approver', paused: false, response: 'Awaiting Review'});
  else if (['/approve', '/changes', '/clarify'].includes(path)) {
    if (state.paused || state.view !== 'approver') message = 'Action unavailable. Current state refreshed.';
    else state.response = {'/approve': 'Approved', '/changes': 'Changes Requested', '/clarify': 'Clarification Needed'}[path];
  } else if (path === '/pause' && state.view === 'owner' && state.response !== 'Approved') state.paused = true;
  else if (path === '/resume' && state.view === 'owner' && state.paused) {
    state.paused = false;
    if (state.response !== 'Approved') state.response = 'Awaiting Review';
  } else if (path === '/rereview' && state.view === 'owner' && !state.paused && ['Changes Requested', 'Clarification Needed'].includes(state.response)) state.response = 'Awaiting Review';
  else if (!['/home', '/refresh'].includes(path)) message = 'Action unavailable. Current state refreshed.';
  return send(200, response(workflowCard(state, event.docs.title || 'Test document'), initial, message));
}).listen(Number(process.env.PORT || 8080), () => console.log('Quorum development spike listening'));
