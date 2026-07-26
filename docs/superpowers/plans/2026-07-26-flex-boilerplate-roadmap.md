# Twilio Flex SDK Next.js Boilerplate — Implementation Roadmap

> Split into sequential **parts** per the user's constraint ("do it in parts to prevent
> max token output"). Each part is its own plan document, produces working + testable
> software, and is written just-in-time before execution. Spec:
> `docs/superpowers/specs/2026-07-26-twilio-flex-sdk-nextjs-boilerplate-design.md`.

## Part ordering (each depends on the previous)

1. **Part 1 — Scaffold & Theme** (`2026-07-26-part-1-scaffold-and-theme.md`)
   Next.js 15 App Router + TS, Tailwind + Twilio brand tokens, fonts, logo, light/dark
   via next-themes, base UI primitives, themed shell page. Deliverable: a runnable,
   brand-themed, theme-toggling app.

2. **Part 2 — i18n foundation** (`...-part-2-i18n.md`)
   next-intl, message catalogs, runtime locale switcher, ESLint no-literal-strings rule.
   Deliverable: shell fully translated, live language switching.

3. **Part 3 — Flex client boundary & stub-ready auth** (`...-part-3-client-auth.md`)
   `/api/token` route (stub-ready), `lib/flex` singleton + provider + event→store bridge,
   Zustand session slice, login flow (SSO + custom token). Deliverable: app authenticates
   (stub or real creds) and holds a live/mocked SDK session.

4. **Part 4 — Presence & Tasks** (`...-part-4-presence-tasks.md`)
   Worker activity/presence selector; task list, accept/reject, wrap-up/complete,
   attributes. Deliverable: agent can go available and handle task reservations.

5. **Part 5 — Voice** (`...-part-5-voice.md`)
   Inbound accept, outbound dialer, mute/hold/unhold, DTMF, transfer/conference, device
   picker, end-for-all, external participant add/kick. Deliverable: full voice call flow.

6. **Part 6 — Conversations** (`...-part-6-conversations.md`)
   Chat panel, outbound email task + WYSIWYG, pause/resume/park, transfer, content
   templates. Deliverable: chat + email task handling.

7. **Part 7 — Supervisor / monitoring** (`...-part-7-supervisor.md`)
   Monitor/coach/barge, worker management (SetWorkerActivity/Attributes), supervisor panel.
   Deliverable: the demo-gap supervisor features.

8. **Part 8 — Plugin system** (`...-part-8-plugins.md`)
   Registry, extension points, host rendering, disabled example skeleton, docs.
   Deliverable: plugins can contribute nav/panels/tabs without core changes.

## Conventions applied to every part

- TDD where logic exists (Vitest + Testing Library); verification steps (type-check,
  build, dev-render) for pure scaffold/config tasks.
- Frequent commits (one per task). Flex SDK mocked at the `lib/flex/client.ts` boundary.
- Global constraints live in each part's header, copied from the spec.
