// PROTOTYPE: emits the unpublished, Docs-only HTTP deployment manifest.
const base = process.env.ADDON_URL?.replace(/\/$/, '');
if (!base?.startsWith('https://')) throw new Error('Set ADDON_URL to the HTTPS service URL');
console.log(JSON.stringify({
  oauthScopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
  ],
  addOns: {
    common: {
      name: 'Quorum — development spike',
      logoUrl: 'https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png',
      homepageTrigger: {runFunction: `${base}/home`}
    },
    docs: {onFileScopeGrantedTrigger: {runFunction: `${base}/home`}},
    httpOptions: {authorizationHeader: 'SYSTEM_ID_TOKEN', granularOauthPermissionSupport: 'OPT_IN'}
  }
}, null, 2));
