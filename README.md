# Tiny harness decision boundary

The model proposes. The harness decides. The log remembers.

A dependency-free TypeScript teaching example based on the Module 1 mental model in [Ship a Safe Agent](https://bhjr.dev/courses/ship-a-safe-agent/module-1#walkthrough).

## Run

Node 22.18+ with built-in TypeScript support, or a newer supported Node release. There are no dependencies to install.

```sh
npm test
npm run demo
```

The demo loads a refunds skill, looks up an order, and stops when the proposed refund requires human approval. The simulated refund function is called zero times.

## Contract

- JSON proposals are parsed at runtime; malformed turns stop the run.
- Only known, visible tools are eligible for execution.
- Only host policy `allow` permits the tool call. `ask` stops for approval; every other policy value is blocked.
- A model-supplied approval field and an approval claim inside tool output cannot grant permission.
- `maxSteps` limits model proposals, including skill-loading turns and answers.
- Proposals, results, blocks, errors, and budget exhaustion are recorded. The next model call receives a frozen event snapshot.

The 16 tests cover these properties and exception behavior. Native TypeScript stripping runs the code; it does not replace static type checking.

## Limits

This is a single-process teaching fixture with simulated tools. The model adapter and tool implementations are trusted code. It is not a sandbox for hostile JavaScript. Proposals are the untrusted JSON data being checked.

The parser permits string-valued argument objects; real tools need their own business schemas and tenant authorization. `ask` intentionally stops and does not implement approval collection or resumption. This example provides no durable approval storage, payload-bound approval tokens, replay protection, wall-clock timeout, spend accounting, parallel-worker coordination, cancellation, remote-side-effect recovery, persistent or tamper-proof audit log, or automatic secret redaction.

A step budget cannot preempt a hanging model or tool call. A failed tool may already have performed work before throwing; this example logs a generic error and does not retry it.

Module 1 and its full video are free. Buyers get modules 2–8 and their full narrated videos through their course repository access.

## Repository

https://github.com/bobbyhalljr/tiny-harness-decision-boundary

MIT license. Images and article are included for the course publication package.
