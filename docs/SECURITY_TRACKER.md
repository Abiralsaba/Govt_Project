# NationX security tracker

This tracker is separate from the database compatibility work. The application
must not be deployed publicly or described as production-ready while critical
items remain open.

## Critical — open

- User-uploaded identity images and documents are present under
  `public/uploads/` and have been committed historically. They require a
  separately approved privacy review, removal plan, history-cleaning decision,
  and safer private object/file storage before publication.
- `POST /api/nid/verify-public` returns name and photo to an unauthenticated
  caller with NID+DOB, while authenticated `POST /api/nid/verify` lets any
  citizen query another NID and receive name, parent names, DOB, blood group,
  photo path, and profile status. Isolated Alice/Bob tests reproduced both
  disclosures. Consent, purpose authorization, response minimization, abuse
  controls, and audit access need a separate identity-data design decision.
- NID profile upload persistence has been implemented using the existing
  `photo_url` and `signature_url` columns, without changing schema or multipart
  field names. Its final database-backed positive-upload rerun is pending while
  local MySQL is stopped; public file privacy/storage remains separately open.
- Several active payment paths are sandbox/demo implementations with localhost
  return URLs and fallback test credentials. Payment verification, signed
  callbacks, environment-only configuration, and deployment return URLs remain
  unresolved.
- Passport payment has two distinct critical failures. The installed
  `passport_applications` table has no `transaction_id`, so sandbox init returns
  HTTP 500 and the public callbacks redirect to `status=error`. Separately,
  authenticated `POST /api/passport/application/:id/payment` trusts a
  client-supplied method/transaction and immediately changes the application to
  `Paid` / `Payment Verified`; this was reproduced with a synthetic string.
  React passport exposes no payment action or trusted-success message.
- Passport application submission now rejects a supplied `nid_number` unless it
  belongs to the authenticated `reg_info` identity. The focused regression was
  added; its final rerun is pending while local MySQL is stopped.
- University admission payment success is unauthenticated and trusts
  client-supplied `value_a`, `tran_id`, and `card_type`. An isolated request with
  arbitrary values changed a marker application from Draft/Pending to
  Submitted/Paid and redirected with `success=true`. The legacy page also shows
  its success UI when gateway initialization fails. React calls neither payment
  route and never interprets the return query as success.
- University `verify-hsc`, `application/:id`, and
  `my-applications/:roll/:year` are public. Actual probes returned student and
  parent names, DOB/result data, phone, email, address, and payment/application
  state. The unauthenticated apply route can create an application for a known
  HSC record. Applicant authentication/consent and minimal response policy need
  an explicit identity-access decision.
- The active shop callback `POST /api/shop/payment/success/:orderId` marks the
  URL-selected order `PAID` without validating an SSLCommerz callback, signature,
  transaction, amount, or ownership. React online checkout remains disabled; a
  return query is treated as unverified.
- Land-tax initiation is unauthenticated and selects a citizen by client-supplied
  NID. More critically, `POST /api/payment/land/tax/success/:tran_id` changes the
  URL-selected row to `Success` without gateway validation, signature, amount,
  transaction-state, or ownership checks. An isolated test-database callback
  changed a marker row from `Pending` to `Success` with no token. The local
  React page is active for the teacher demo but never calls this initiation or
  callback; it exposes only the labeled, non-writing simulation. Real land-tax
  payment remains blocked pending an approved verified callback design.
- Community and agriculture `/admin/*` route groups now require explicit admin
  middleware. Community like/comment counters and passport history also use the
  installed triggers as their single write authority. Focused regressions passed
  before the current MySQL outage; a final full-suite rerun remains pending.
- Public `GET /api/agriculture/market/browse` includes both `Approved` and
  `Pending` listings and returns the farmer phone/email fields. A test marker's
  Pending status and phone were visible without authentication. Publication
  policy and response-field minimization need an explicit privacy decision.
- `POST /api/water/bill/pay` now rejects connections not owned by the
  authenticated citizen, but still trusts client-provided totals and immediately
  records `Paid`. React does not call it; the isolated presentation simulation
  performs no API or database write. A verified real-payment design remains a
  public-deployment blocker.
- `POST /api/health/vaccination/register` now verifies that an optional
  `health_card_id` belongs to the authenticated citizen. The cross-owner
  regression is added and awaits the final MySQL-backed rerun.
- Education result endpoints are unauthenticated and return student name,
  parent names, institution, registration number, group, grades, and result from
  a guessable exam/year/roll path. The citizen page is guarded, but direct API
  access is public; field-level publication and rate/access policy require an
  explicit privacy decision.
- Express currently uses unrestricted `cors()` for the API. Allowed origins,
  methods, headers, and credential behavior need an environment-specific policy
  before public deployment.
- `GET /api/departments/land/mutation/status/:trackingNum` is now scoped to the
  authenticated submitting owner. It still returns the full owner-visible row;
  a separately approved minimal response may be preferable before publication.
- Legacy/public routes and the uninstalled routine catalogue have not received
  a complete authorization and input-validation audit. The focused baseline
  tests do not establish whole-API security.

## High — open

- The final root production-dependency audit reports 12 advisories (9 high,
  2 moderate, 1 low), including Axios, Express transitive parsing/routing,
  express-rate-limit, Multer, Nodemailer, Lodash, and SSLCommerz's unpatched
  `form-data` dependency. The React client audit reports zero advisories.
  Automated upgrades were deliberately not applied during the teacher-demo
  migration because several require compatibility/security review and one has
  no upstream fix. Resolve and rerun all regressions before publication.
- Citizen and admin authentication use different fallback JWT secrets. `.env`
  currently masks this locally, but startup should fail closed when the secret
  is missing before any deployment.
- Browser tokens are stored in `localStorage`; an XSS review and token-storage
  decision are required during the React migration.
- `POST /api/tax/payments/pay` now rejects a supplied `return_id` that does not
  belong to the authenticated citizen. Its cross-owner regression awaits the
  final MySQL-backed rerun.
- NID admin status updates are admin-authorized and table names are allow-listed,
  but `POST /api/nid/admin/update-status` neither checks that the selected
  reference exists before returning success nor enforces a legal transition
  from the current status. The React UI restricts choices to installed enum
  values, but direct API callers are not bound to the UI workflow. The combined
  admin listing also ignores filters and exposes only its hard-coded newest 200
  New NID/correction/reissue rows, so it cannot establish complete queue review.
- Passport status history now uses the installed trigger as the single writer;
  the duplicate route insert was removed and the focused exactly-one-history
  regression passed. The route still lacks a server-enforced legal transition
  graph, and trigger history records the actor as `System`, so richer actor audit
  attribution remains a public-hardening item.
- Health admin authorization and selected-record isolation passed across cards,
  vaccinations, appointments, ambulance, complaints, and hospitals. However,
  its update/delete routes do not check `affectedRows`, so unknown ids return
  false HTTP 200 success; status changes have no transition graph; and these
  admin actions have no dedicated actor audit log. Lists also have no server-side
  pagination. React preserves all editable metadata and confirms permanent
  hospital deletion, but it cannot make those server guarantees.
- There is no established automated security scanning, CI gate, or full API
  authorization matrix.

## Scope note

The current migration preserves existing authentication behavior and does not
claim to resolve these issues. No deployment action is authorized.
