# Sentry Integration Design

## Overview

Add Sentry error tracking, performance monitoring, and session replay to the Next.js 16 App Router application.

## Scope

- **Error tracking**: Client-side JS errors, server-side errors (API routes, Server Components, middleware)
- **Performance monitoring**: Route transitions, API latency
- **Session replay**: Video-like reproduction of user sessions on errors

## Files to Create/Modify

### New Files

1. `sentry.client.config.ts` — Client SDK init (errors, performance, replay, router instrumentation)
2. `sentry.server.config.ts` — Server SDK init (Node.js runtime)
3. `sentry.edge.config.ts` — Edge SDK init (middleware)
4. `src/instrumentation.ts` — Next.js instrumentation hook, registers server/edge configs, exports `onRequestError`
5. `src/app/global-error.tsx` — Global error boundary, captures React rendering errors to Sentry

### Modified Files

6. `next.config.ts` — Wrap with `withSentryConfig` for source maps and auto-instrumentation
7. `package.json` — Add `@sentry/nextjs` dependency
8. `.env.local` (gitignored) — DSN and org/project config
9. `.env.example` — Template for required env vars

## Environment Variables

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Client + Server | Sentry DSN |
| `SENTRY_ORG` | Build time | Sentry organization slug |
| `SENTRY_PROJECT` | Build time | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Build time (CI) | Auth token for source map upload |

## Sample Rates

| Setting | Development | Production |
|---|---|---|
| `tracesSampleRate` | 1.0 | 0.1 |
| `replaysSessionSampleRate` | — | 0.1 |
| `replaysOnErrorSampleRate` | — | 1.0 |

## Architecture

```
Client Browser                    Server (Node.js / Edge)
┌──────────────────┐              ┌──────────────────────┐
│ sentry.client.ts │              │ instrumentation.ts   │
│ - replayInteg.   │              │ ├ sentry.server.ts   │
│ - routerTransit. │              │ └ sentry.edge.ts     │
│ - feedbackInteg. │              │ - onRequestError     │
└──────────────────┘              └──────────────────────┘
         │                                   │
         └───────── Sentry Cloud ────────────┘
```

## Decisions

- **Manual setup over Wizard**: Full control over configuration, avoid unnecessary files
- **`@sentry/nextjs`**: Official SDK with App Router support
- **Environment-based sample rates**: Full tracing in dev, 10% in prod
- **No `sentry.properties` file**: Use env vars instead for flexibility
