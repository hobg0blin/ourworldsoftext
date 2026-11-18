# Current demo deployment

This deploys the existing single canvas. Text records stay in participants' PDSes;
SQLite holds OAuth credentials, browser sessions, and the list of participants.
Anyone who signs in joins that list. Visitors see the canvas immediately and use
the floating "Log in to join" control to enter their handle and continue to their
PDS login. Only signed-in users can write. There is no network index or worker.

## Server configuration

The inspected Ubuntu server already runs the PDS and Caddy using host networking.
The PDS occupies port 3000. This project's Compose file publishes the app only on
`127.0.0.1:3100`, forwarding to port 3000 inside its own container.

1. Build the image with `docker compose build` in the project directory.
2. Copy `.env.production.template` to `.env.production`, restrict it with
   `chmod 600 .env.production`, and replace the placeholder private key using
   the generator command in the template. Keep `PUBLIC_URL=https://owot.bront.rodeo`
   without a trailing slash. Keep this key stable across rebuilds.
3. Start the app with `docker compose up -d` and inspect `docker compose logs --tail=100 app`.
   Startup runs database migrations automatically. `./data` persists the database.
4. Verify `http://127.0.0.1:3100/`, `/oauth-client-metadata.json`, and
   `/.well-known/jwks.json`. Metadata must advertise the public HTTPS URL and
   the JWKS must contain a public key with no private `d` field.
5. Back up `/pds/caddy/etc/caddy/Caddyfile`, append `deploy/Caddyfile-snippet`,
   then validate and reload the existing Caddy container:

   ```sh
   docker exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
   docker exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
   ```

   If validation fails, restore the saved file before proceeding. Do not start a
   second Caddy instance or restart the PDS. DNS must point to this server, and
   ports 80/443 must be reachable for HTTPS certificate issuance.

## Acceptance checks

- Open the HTTPS URL, sign in, click the canvas, and type a short sample.
- Reload and verify that the text was saved to the PDS.
- Use a second account/browser and verify both participants' text appears.
- Log out, verify writing requires authentication, then sign back in.
- Restart the app container and verify membership and login persistence.
- A legacy `did` cookie or a fabricated `owot_session` cookie must not grant access
  to `/api/text` or revoke another account on `/oauth/logout`.

Browser cookies now contain random, seven-day tokens; the database stores only
their hashes. Old DID-only cookies require signing in again. Logout revokes the
account's stored OAuth session, so other browsers using that account may need to
sign in again too.

## Backup and recovery

Before updating an existing installation, save the deployed source/image and
`.env.production`. Stop only this app (`docker compose stop app`), copy its entire
`data` directory, then start it again (`docker compose start app`). Stopping avoids
an inconsistent SQLite/WAL copy. Backups contain credentials and must stay private.
If rolling back an update, stop the app and restore the matching source/image and
database backup together before restarting. Preserve the Caddy backup as well.

## Local development and checks

Use Node 22 and the pnpm version in `package.json`. Install with
`pnpm install --frozen-lockfile`, then run `pnpm dev` and visit
`http://127.0.0.1:3000`. For local loopback OAuth, leave `PUBLIC_URL` and
`PRIVATE_KEY` unset in the shell and local environment files. `APP_URL` in the old
template is unused. Optional `WORLD_MEMBERS` seeds participants by handle or DID.
Separate installations discover their own participants; use seeds to share a view.

Checks: `pnpm exec tsx --test scripts/browser-session.test.ts`,
`pnpm exec tsc --noEmit`, `pnpm lint`, and `docker build -t owot-demo:review .`.

## Existing prototype limitations

Each character creates a PDS record, and each browser polls all participants every
three seconds. Failed writes are not yet shown in the UI; use reload to confirm
persistence. Deleted text can remain in an already-open canvas until reload.
The canvas uses the window size at page load. This is intended for a small demo.
