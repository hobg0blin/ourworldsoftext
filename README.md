# Our World of Text — on AT Protocol

A shared text canvas where every character you type is a record in your own
atproto repo (`com.ourworldsoftext.text`). No central database of text: the
server reads each member's PDS directly and draws what it finds.

Built from the Bluesky [Statusphere](https://github.com/bluesky-social/statusphere-example-app) example app (Next.js).

## Running locally

Requirements: Node 22+ and an atproto account (a Bluesky account works).

```sh
git clone git@github.com:hobg0blin/ourworldsoftext.git
cd ourworldsoftext
npm install -g pnpm     # skip if you already have pnpm
pnpm install
pnpm dev
```

Open **http://127.0.0.1:3000** (use `127.0.0.1`, not `localhost` — the OAuth
loopback client is registered for that exact address). Sign in with your handle,
e.g. `yourname.bsky.social`. Click the canvas, type.

No env file is needed for local dev. `pnpm dev` runs the SQLite migration and
regenerates the lexicon TypeScript before starting Next.

## How it works

- **Login** — atproto OAuth. Sessions live in a local SQLite file (`app.db`).
  Anyone who logs in is added to the `member` table; that's the world's
  membership list.
- **Writing** — `POST /api/text` with `{ text, xPosition, yPosition }` creates a
  `com.ourworldsoftext.text` record in *your* repo, on *your* PDS.
- **Reading** — on each page load the server calls `com.atproto.repo.listRecords`
  on every member's PDS and merges the results (`lib/world.ts`). Nothing is cached.
- **Lexicon** — `lexicons/com/ourworldsoftext/text.json`. Generated types in
  `lib/lexicons/` (don't edit those; run `pnpm build:lex`).

## API

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/text` | yes | create a text record `{ text, xPosition, yPosition }` |
| `GET /api/text` | yes | your own text records |
| `GET /api/world` | no | every member's text records, newest first |

## Optional env (`.env.local`)

| Var | Purpose |
|---|---|
| `WORLD_MEMBERS` | comma-separated handles or DIDs to include in the world even if they haven't logged in here |
| `PUBLIC_URL`, `PRIVATE_KEY` | only for a deployed instance (real OAuth client instead of loopback); generate a key with `pnpm gen-key` |

## Notes

- Each member's records are fetched live, so the page is as slow as the slowest
  PDS in the world. Fine for a few people.
- The canvas currently posts one record per keystroke. Batching is an open
  design question.
