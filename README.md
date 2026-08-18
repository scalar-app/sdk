# @scalar/sdk

Official TypeScript client for the Scalar API.

Part of [scalar-app](https://github.com/scalar-app). Used by `web`, `mobile`, `desktop`, `integrations` and third-party developers. Every request and response is validated with zod, so the client never hands you an unvalidated shape.

## Install and build

Requires Node 24 (`.nvmrc`) and pnpm 11.

```bash
pnpm install
pnpm build
```

Scripts: `pnpm dev` (watch), `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

The package is not published to npm yet. Sibling repos consume it with pnpm's link protocol: `"@scalar/sdk": "link:../sdk"`. Run `pnpm build` here first.

Runtime dependency: `zod` only. Uses the global `fetch`; pass your own via options in environments without it.

## Usage

```ts
import { createScalarClient, isScalarApiError, collectAll } from '@scalar/sdk';

const scalar = createScalarClient({ baseUrl: 'http://localhost:4000' });

await scalar.auth.requestMagicLink({ email: 'you@example.com' });
// In non-production the response includes `devLink`. Open it, then:
const me = await scalar.me.get();

const task = await scalar.tasks.create({
  title: 'Finish CS assignment',
  dueAt: '2026-08-21T23:59:00.000Z',
  priority: 'high',
});

const page = await scalar.tasks.list({ status: ['todo', 'in_progress'], limit: 50 });
const everything = await collectAll((cursor) => scalar.tasks.list({ cursor }));

const today = await scalar.today.get({ tz: 'America/New_York' });
```

Client surface: `health.get`, `auth.requestMagicLink / verifyMagicLink / logout`, `me.get`, `workspaces.list`, `spaces.list / create / get / update / delete`, `tasks.list / create / get / update / delete`, `events.list`, `today.get`, `integrations.list / connectGoogle / sync / disconnect`. Every method accepts a trailing `{ signal }` for cancellation.

## Errors

Non-2xx responses throw `ScalarApiError` with `status`, `code` (for example `TASK_NOT_FOUND`), `message` and `requestId` (from the `x-request-id` header). A 2xx body that does not match the contract throws `ScalarApiError` with code `INVALID_RESPONSE`. Failures before any HTTP response (offline, CORS, abort) throw `ScalarNetworkError`. Use `isScalarApiError` and `isScalarNetworkError` to narrow.

## Sessions

Scalar uses an httpOnly session cookie. The client sends `credentials: 'include'` by default so the cookie travels to a cross-origin API in the browser. In Node, cookies are not stored automatically; pass a `fetch` that manages them or forward `Cookie` via `headers`.

## Pagination

List endpoints return `{ data, nextCursor }`. `paginate(fetchPage)` is an async generator that follows cursors; `collectAll(fetchPage, { max })` gathers into an array.

## Contract source of truth

The API repository ([scalar-app/api](https://github.com/scalar-app/api)) owns the contract and the docs live in [scalar-app/docs](https://github.com/scalar-app/docs) under `api/`. When the API changes, this SDK changes in the same release.

## Status

Auth (magic link), me, workspaces, spaces, tasks, events (read), today, integrations (Google Calendar connect, status, sync, disconnect). Not yet: inbox, notifications, search, AI command, streaming helpers.

## Contributing

See [scalar-app/.github/CONTRIBUTING.md](https://github.com/scalar-app/.github/blob/main/CONTRIBUTING.md).

## License

AGPL-3.0-only. See [LICENSE](./LICENSE).
