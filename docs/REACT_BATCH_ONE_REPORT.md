# React Batch 1 verification report

Verified 2026-08-28 against `central_govt_db_test`. This report covers todo,
community, and shop only. It is not a production-readiness statement.

## Passed

- Todo is React-owned and preserves create, list, detail, status movement,
  calendar/query handling, and delete contracts. Duplicate submission locking,
  loading/empty/error/unauthorized/success UI, and cross-user update/delete
  isolation were exercised.
- Shop is React-owned for catalogue, cart, quantity accumulation, server-derived
  totals, and cash-on-delivery checkout. Cross-user cart deletion was denied by
  effect, duplicate sequential checkout was rejected, and an untrusted payment
  query is never presented as proof of payment.
- Community is React-owned in the client source for groups, membership, posts,
  likes, comments, and multipart uploads. React tests cover escaped stored
  content, empty/error/loading states, multipart field names, and duplicate
  submission locking. Upload regression checks used generated synthetic files
  and removed only those exact files afterward.
- Todo and shop direct navigation and refresh passed through the React-mode
  Express server with query strings intact. The built community route passed the
  same delivery check through Vite preview.
- Production build passed. React: 6 files/22 tests passed. API/database: 18 tests
  passed (13 baseline plus 5 Batch 1).

## Failed pre-existing backend checks

- Community like/comment counters are doubled. Installed triggers increment or
  decrement the denormalized counters, while `communityRoutes.js` repeats the
  same updates. A focused test produced `like_count = 2` for one like row and
  `comment_count = 2` for one comment row.
- Community endpoints named `/admin/*` use only the citizen JWT middleware. An
  actual synthetic citizen token received HTTP 200 from
  `/api/community/admin/groups`.

Because of these failures, `/community.html` remains served by the legacy page
in Express React mode even though the React implementation exists and its
client-side tests pass. Correcting either backend behavior requires a separately
reviewable decision about the authoritative counter layer and admin middleware.

## Blocked

- Online shop checkout is blocked. The active success callback changes an order
  to `PAID` from its URL id without verifying an SSLCommerz callback/session.
  React exposes COD only and treats return query parameters as unverified.
- Community Express cutover is blocked by the two backend failures above.

## Representative legacy comparison

- Todo preserves the legacy board/calendar operations and payloads; native React
  drag/drop replaces the legacy Sortable controller.
- Community preserves active endpoint and multipart contracts, but React escapes
  user content instead of constructing it with legacy `innerHTML`.
- Shop preserves item/cart/COD behavior. It intentionally does not reproduce the
  legacy unverified online-payment success presentation.

Legacy files and uploads remain untouched for rollback.
