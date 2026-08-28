# NationX security tracker

This tracker is separate from the database compatibility work. The application
must not be deployed publicly or described as production-ready while critical
items remain open.

## Critical — open

- User-uploaded identity images and documents are present under
  `public/uploads/` and have been committed historically. They require a
  separately approved privacy review, removal plan, history-cleaning decision,
  and safer private object/file storage before publication.
- Several active payment paths are sandbox/demo implementations with localhost
  return URLs and fallback test credentials. Payment verification, signed
  callbacks, environment-only configuration, and deployment return URLs remain
  unresolved.
- Legacy/public routes and the uninstalled routine catalogue have not received
  a complete authorization and input-validation audit. The focused baseline
  tests do not establish whole-API security.

## High — open

- Citizen and admin authentication use different fallback JWT secrets. `.env`
  currently masks this locally, but startup should fail closed when the secret
  is missing before any deployment.
- Browser tokens are stored in `localStorage`; an XSS review and token-storage
  decision are required during the React migration.
- There is no established automated security scanning, CI gate, or full API
  authorization matrix.

## Scope note

The current migration preserves existing authentication behavior and does not
claim to resolve these issues. No deployment action is authorized.
