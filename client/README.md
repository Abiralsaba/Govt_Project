# NationX React client

This is the route-by-route React + Vite replacement for the legacy frontend in
`public/`. The Express API, MySQL schema, authentication tokens, uploads and
payment callbacks remain backend-owned.

## Development

Run the existing backend on port 3000, then start Vite in a second terminal:

```bash
npm start
npm run client:dev
```

Vite runs at `http://localhost:5173` and proxies relative `/api`, `/uploads`,
`/images` and `/css` requests to Express. During the partial migration,
unmigrated routes hand off to `VITE_LEGACY_ORIGIN` (default
`http://localhost:3000`) as a full-page redirect. They are never placed in an
iframe and legacy scripts never control React-owned UI.

## Build and controlled Express serving

```bash
npm run client:test
npm run client:build
npm run start:react
```

`FRONTEND_MODE=react` is deliberately opt-in. Express serves `client/dist` only
for the paths listed in `migratedReactRoutes` in `src/app.js`; all other HTML
pages continue from `public/`. Running the normal `npm start` is the rollback
path and serves the complete legacy frontend.

Do not put secrets or database credentials in `client/` or in `VITE_*`
variables. Vite variables are browser-visible.

See `docs/REACT_MIGRATION_MATRIX.md` for the current verified route boundary.
