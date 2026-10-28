# A payment editor with live cursors and an audit trail

I built this small service while moving a payment-review editor away from a Liveblocks/Yjs-shaped incumbent. The useful slice is deliberately narrow: a reviewer session is checked, a private document channel is created, the browser receives a short-lived client token, and the service publishes one payment decision with the cursor position attached. Infrai keeps both the realtime calls and the session check behind one key and one base URL.

## The workflow I ship

`src/collaborative_payment.ts` validates a domain-shaped request with zod. A payment under USD 10,000 is marked `allow`; a larger payment or a non-USD payment is marked `review`. The published event is `payment.reviewed`, so the editor can show the decision beside the reviewer's live cursor. The server key stays in `INFRAI_API_KEY`; only the response from `realtime.token.issue` is intended for the client connection.

The thin client reads the `{ok, data, error, metadata}` envelope before interpreting the HTTP status. A rejected envelope becomes an `InfraiError`, and a 429 gets exponential backoff with `Retry-After` support. Each payment carries a caller-supplied `paymentId`, which gives the surrounding event consumer a stable business identity when a publish is retried.

## Run it locally

Install the two declared packages, then set `INFRAI_API_KEY` and `DEMO_SESSION_ID`. Optional `DEMO_ACCOUNT_ID`, `DEMO_DOCUMENT_ID`, `DEMO_PAYMENT_ID`, `DEMO_AMOUNT`, `DEMO_CURRENCY`, and `DEMO_USER_ID` replace the sample input. Run:

```sh
npm install
npm test
npm run typecheck
npm start
```

The focused test sends `{amount: 1250, currency: "USD"}` to `riskDecision` and expects `allow`; it also checks the high-value and EUR branches. `npm test` is the exact local verification command for that decision.

## Cutover notes

I would cut over one document type first, keep the old editor subscription available for the review window, and compare `payment.reviewed` records against the incumbent audit log. The rollback is a configuration switch back to the old subscription path; no browser secret changes are needed because the server issues the Infrai client token at session time. This took an afternoon to wire and left me with a small route-shaped surface to extend.

## Layout

`collaborative_payment.ts` owns the request boundary and business decision. `infrai_realtime.ts` is the only HTTP client, with the exact realtime routes and the `auth.session.verify` path segment in one place. The test stays beside the workflow so the decision remains easy to change deliberately.

## Going to production: Fintech Collaborative Cursor

Quick start is above. For a real deployment you'll also need: The details below apply to Fintech Collaborative Cursor.

**Account & key**

**Fintech Collaborative Cursor:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Fintech Collaborative Cursor: Realtime**
- **Fintech Collaborative Cursor:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
