# React admin migration — NID domain

Verified on 2026-08-29 against `central_govt_db_test`. This report covers only
`/admin-nid.html`; it is not a production-readiness statement.

## Active implementation

- `client/src/features/admin/AdminNidPage.jsx` owns the admin NID markup, state,
  filters, pagination, detail review, selected-record update, and logout.
- The literal `/admin-nid.html` URL is routed through `AdminGuard`; API calls use
  the existing `adminToken` Bearer contract.
- Filter state uses the existing `.html` URL query (`type`, `status`, `search`,
  `page`) and survives direct navigation/refresh.
- Status choices follow each installed table enum. User/admin-provided text is
  rendered as React text; no legacy script, iframe, or raw HTML injection is used.
- `src/app.js` serves this route from the Vite build only when
  `FRONTEND_MODE=react`. Default `npm start` remains legacy, and all legacy NID
  admin assets remain available for rollback.

## Passed checks

- Production Vite build.
- Six focused React cases: loading/empty/error/success, safe rendering,
  filtering, 20-row client pages, duplicate-submit locking, exact update body,
  installed status lists, and admin-session logout.
- Admin route guard: an absent admin token reaches the admin sign-in form.
- Five API regression checks on the isolated test database:
  - missing, citizen, and `isAdmin:false` tokens cannot read or update;
  - approved synthetic admin reads stats/list/detail;
  - unapproved table names are rejected;
  - marker A changes while marker B remains unchanged;
  - correction remarks remain attached to the selected marker.
- Direct navigation and refresh passed twice at
  `/admin-nid.html?type=Correction&status=Submitted&page=2` through React-mode
  Express. `/admin-passport.html` remained on its legacy rollback page.

Synthetic records were removed after the API test. No development database,
uploads, payment service, or external system was modified.

## Pre-existing API limitations

- `GET /api/nid/admin/applications` ignores query filters, has no server-side
  pagination, hard-limits results to 200, and omits smart-card/address queues.
  React filtering and pagination therefore apply only to that subset.
- `POST /api/nid/admin/update-status` returns a success response even when no
  reference matched. It also does not enforce a legal current-status-to-next-
  status transition. The React UI narrows values to the installed table enum,
  but that is not a server-side workflow guarantee.
- Stats similarly cover only New NID, correction, and reissue categories.

These limitations did not require a React contract change, but they block a
claim that the entire NID administration queue/workflow is complete.
