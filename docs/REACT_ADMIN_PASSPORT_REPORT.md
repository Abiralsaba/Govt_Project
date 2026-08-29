# React admin migration — Passport domain

Verified on 2026-08-29 against `central_govt_db_test`. The React implementation
is complete, but Express cutover is deliberately blocked by a backend audit
conflict. This is not a production-readiness statement.

## Implemented contract

- `/admin-passport.html` is implemented with React-owned markup/state and the
  existing admin Bearer-token contract. No iframe or legacy JavaScript controls
  the React page.
- Server filters preserve `status`, `office`, `date_from`, `date_to`, and
  `search`; client pagination preserves `page` on the literal `.html` URL.
- Stats, offices, application detail, status history, all installed status enum
  values, rejection reason, remarks, and status-specific custom date field names
  match `src/routes/passportRoutes.js` and `passport_schema.sql`.
- Payment state is read-only. This admin page does not initialize payments,
  repair the missing citizen payment column, or treat any callback as verified.

## Passed checks

- Production Vite build.
- Six focused React tests plus the admin guard: loading, empty, error, success,
  safe text/XSS handling, filter encoding, 20-row client pagination, exact
  selected-id payload, duplicate-submit lock, custom date mapping, and logout.
- Isolated API checks: missing/citizen/`isAdmin:false` denial; approved-admin
  reads; combined status/office/date/search filtering; selected detail; unknown
  id rejection; A-only update with B unchanged; custom approval date and remarks.
- Direct navigation/refresh passed twice in Vite preview with query parameters.
  React-mode Express passed rollback verification by returning the legacy page
  twice. Synthetic application/history rows were removed.

The first combined-filter test run failed because it compared a JavaScript date
to MySQL's server date. The corrected test reads the fixture's stored MySQL date
and passed; the failed run is not counted as a product pass.

## Blocking audit conflict

One route update produced exactly two new history rows:

- `trg_passport_after_update` atomically inserts a `changed_by='System'` entry;
- `PUT /api/passport/admin/application/:id/status` separately inserts an Admin
  entry containing the route remarks.

The route does not wrap its application update and second history write in a
transaction, and neither layer enforces a legal status-transition graph. Simply
deleting either write would change audit actor/remark meaning. A separately
approved correction must decide the authoritative audit source while retaining
one atomic entry with the required actor and remarks. Until then,
`/admin-passport.html` remains outside the Express React allow-list.
