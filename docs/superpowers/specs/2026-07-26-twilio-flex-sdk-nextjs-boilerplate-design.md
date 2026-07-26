# Twilio Flex SDK — Next.js Boilerplate — Design Spec

Date: 2026-07-26
Status: Draft for review

## 1. Purpose

A production-shaped **boilerplate** for building standalone Twilio Flex agent-desktop
applications on **Next.js + TypeScript**, using the browser **`@twilio/flex-sdk`** (v4.1.x).
It ports the official [flex-sdk-demo](https://github.com/twilio-samples/flex-sdk-demo)
(which is Vite + React 17 + Twilio Paste) to Next.js, adds the base SDK features the demo
omits, and layers on: multi-lingual UI, a plugin system, light/dark theming, and a
brand-faithful UI derived from the live Twilio brand guidelines.

## 2. Goals & non-goals

**Goals**
- Next.js 15 App Router + TypeScript, with hot reload (Fast Refresh) for UI dev.
- Implement **all base Flex SDK capabilities**: Voice, Tasks/Reservations, Worker
  presence/activity, Conversations (chat + email), and Supervisor/monitoring.
- On-the-fly UI translation — every string translatable at runtime.
- Plugin system (extension points) — ships with zero plugins but a documented skeleton.
- Light + dark themes.
- Brand-faithful UI using **Tailwind CSS with custom Twilio brand tokens** (no Twilio Paste),
  tokens sourced directly from the Twilio brand guidelines (see §8).

**Non-goals (v1)**
- Video (the Flex SDK 4.1 exposes no video APIs — out of the SDK's scope, not a gap).
- A real production auth/identity backend — we ship a stub-ready token route (see §6).
- Shipping actual CRM/other business plugins — only the plugin *framework* + example.

## 3. Answers to the originating questions

- **Hot reload:** Yes. `next dev` provides Fast Refresh. The live SDK session (WebRTC/
  WebSocket) is isolated in a singleton provider so hot-reloading UI does not tear down an
  in-progress call.
- **SDK feature inventory & gap analysis:** see §4.

## 4. Flex SDK 4.1.0 feature inventory + gap analysis

Confirmed from the 4.1.0 TypeDoc (`sdk.twilio.com/js/flex-sdk/releases/4.1.0/docs`).

| Domain | Capabilities (SDK actions) |
|---|---|
| Client / Auth | `createClient`, `exchangeToken` (Enhanced SSO OAuth), `autoUpdateToken` + `tokenUpdated` event, logger config |
| Voice | `StartOutboundCall`, `HoldVoiceParticipant`/`UnholdVoiceParticipant`, `KickVoiceParticipant`, `AddExternalVoiceParticipant`, `EndVoiceCallForAll`, `StartVoiceTaskTransfer`/`CancelVoiceTaskTransfer`, `GetCallByTask`, `AddVoiceEventListener`; mute/DTMF/device selection via underlying Voice SDK device |
| Voice — Supervisor | `MonitorCall` (silent listen), `CoachCall` (whisper), `BargeCall` (join) |
| Tasks | `AcceptTask`, `RejectTask`, `CompleteTask`, `EndTask`, `WrapUpTask`, `SetTaskAttributes`, `GetTaskParticipants`, `GetChannelsForTask`, `AddTaskParticipantListener` |
| Worker | `SetCurrentActivity` (presence), `SetAttributes` |
| Supervisor | `SetWorkerActivity`, `SetWorkerAttributes` (act on other workers) |
| Conversations | messaging via data-client, `PauseConversation`/`ResumeConversation`/`GetPausedConversations`, `LeaveConversation`, `StartConversationTransfer`/`GetConversationTransfers`, `StartOutboundEmailTask`, `AddEmailParticipant`/`RemoveEmailParticipant`, `GetContentTemplates`, `GetConversationBySid`/`ByTask`/`User`, `AddConversationEventListener` |
| Low-level | `data-client`, `TaskRouter` |

**Demo implements:** login/SSO, activity selector, call panel, outbound dialer, transfer
modal, conversation panel, paused conversations, outbound email tasks + WYSIWYG, audio
device picker, task list/header, queues, worker info, profile menu.

**Gaps in the demo we WILL cover (per "all base functionalities"):**
- **Supervisor / real-time monitoring** — `MonitorCall`, `CoachCall`, `BargeCall`, and
  `SetWorkerActivity`/`SetWorkerAttributes` on other workers. The demo has no supervisor UI.
- **`GetContentTemplates`** — templated/rich messaging.
- **`AddExternalVoiceParticipant` / `KickVoiceParticipant`** — external conference add and
  participant removal.

## 5. Tech stack

- **Next.js 15 (App Router) + React + TypeScript.** All SDK code lives behind a
  `'use client'` boundary, loaded with `next/dynamic` `ssr:false` (SDK requires
  `window`/WebRTC/localStorage). React version pinned to whatever `@twilio/flex-sdk` peer
  deps allow — verified at install (target React 19, fall back to 18.3 if the peer range
  requires it). The demo pins React 17 only because of Paste, which we are not using.
- **Tailwind CSS** + custom Twilio brand token layer (CSS variables). No Twilio Paste.
- **next-themes** for light/dark (class strategy over CSS variables).
- **Zustand** for the SDK-event → app-state bridge (mirrors the demo's `state/listener.ts`).
- **next-intl** for i18n.
- **date-fns** (time formatting), **react-simple-wysiwyg** (email editor, as in demo).

## 6. Authentication (stub-ready)

- A Next.js Route Handler `app/api/token/route.ts` mints the Flex access token server-side
  using the Twilio server SDK + env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`,
  `TWILIO_API_SECRET`, `FLEX_*`). Ships with a **clear stub/TODO** so the app boots and the
  UI/plugins are developable without a live Twilio account; swapping in real creds requires
  no code changes elsewhere.
- Login flow supports both Enhanced SSO (`exchangeToken` OAuth callback) and the custom
  token path, matching the SDK. Token refresh via `autoUpdateToken` + `tokenUpdated`.
- `.env.example` documents every variable.

## 7. Architecture

```
app/
  (auth)/login/            SSO redirect / token fetch entry
  agent-desktop/           main desktop (client-only shell)
  api/token/route.ts       server token minting (stub-ready)
lib/flex/
  client.ts                createClient singleton (browser-only)
  provider.tsx             FlexClientProvider React context
  events.ts                SDK event listeners -> Zustand bridge
  actions/                 typed thin wrappers over SDK action modules
store/                     Zustand slices (voice, tasks, presence, conversations, supervisor, session)
features/
  voice/  tasks/  presence/  conversations/  supervisor/
                           each: components + hooks + store slice usage + i18n namespace
components/ui/             Tailwind primitives built on brand tokens
plugins/
  registry.ts  types.ts    plugin host + extension points
  example/                 disabled skeleton plugin (template)
theme/
  tokens.css               brand CSS variables (light + dark)  <- from §8
  fonts.ts                 @font-face / next/font setup
i18n/  messages/{en,...}.json
public/brand/twilio-logo.svg
```

**SDK boundary & hot reload:** `lib/flex/client.ts` holds a module-level singleton client so
Fast Refresh of UI components never re-initializes the live session. The provider creates the
client once a token is available, registers listeners, and pushes events into Zustand.

**Feature modules** are self-contained (own components, hooks, store usage, i18n namespace),
so each is understandable and testable in isolation.

## 8. Branding — sourced from the live Twilio brand guidelines

Extracted from the public Bynder content APIs behind
`library.twilio.com/guidelines/.../2df9dac8-.../page/9ba48791-...`.

**Color palette (exact hex):**

- Primary brand red: `#F22F46`  ·  `red-450` accent `#EF223A`
- Red scale: 50 `#FFF1F1` · 100 `#FFD6DC` · 200 `#FFA7AD` · 300 `#FF7681` · 400 `#F84050`
  · 500 `#DD1020` · 600 `#B20E22` · 700 `#890A1E` · 800 `#5D0A18` · 900 `#240206`
- Blue scale: 50 `#E4F7FF` · 100 `#A9EAFF` · 200 `#3ACEFA` · 300 `#0CAEE1` · 400 `#0E8CDF`
  · 500 `#1866EE` · 600 `#1953B9` · 700 `#0E3E92` · 800 `#0B2A60` · 900 `#000D25`
  (portal chrome uses `#126DFE`; we standardize primary UI actions on guideline **Blue-500
  `#1866EE`** to stay within the documented palette).
- Neutral scale: 50 `#F3F4F7` · 100 `#DDE0E6` · 200 `#BCBECC` · 300 `#99A2B0`
  · 400 `#7E879C` · 500 `#676E88` · 600 `#52567B` · 700 `#3F4062` · 800 `#282A48`
  · 900 `#000D25` · white `#FFFFFF`
- **Role mapping:** primary action = Blue-500 `#1866EE`; brand/logo accent = Red `#F22F46`;
  destructive = Red-500 `#DD1020`; info = Blue scale; warning = `#F0B429` (amber, chosen for
  ≥4.5:1 contrast in both themes); success = `#14804A` (green, chosen for ≥4.5:1 contrast in
  both themes — adjustable if the guideline "Core Visual Elements" page specifies an exact
  green). Light theme surfaces = white/Neutral-50 + Neutral-900 text; dark theme surfaces =
  Neutral-800/900 + Neutral-50 text.

**Typography (from guideline `typographies`):**

- H1 — BuffaloBF, Black, 48px, letter-spacing 4px
- H2 — Twilio Sans Display, ExtraBold, 36px, letter-spacing 1px
- H3 — BuffaloBF, Black, 24px, letter-spacing 2px
- H4 — Twilio Sans Display, ExtraBold, 24px, line-height 36px
- Body — Twilio Sans Text (fallback Source Sans Pro)
- Mono — Twilio Sans Mono

**Fonts:** Twilio Sans (Display/Text/Mono) and BuffaloBF are **proprietary licensed** fonts
served from `d8ejoa1fys2rk.cloudfront.net/5.0.5/includes/fonts-licensed/...` (woff2). Source
Sans Pro is open (SIL OFL). Boilerplate font stack: prefer Twilio Sans (loaded via
`@font-face`, with a documented note that the user must confirm/self-host per license),
falling back to Source Sans Pro → Inter → system-ui. This keeps the app legal to run out of
the box while honoring the brand where licensing allows.

**Logo:** official Twilio logo SVG (`fill="#F22F46"`) downloaded from
`https://www.twilio.com/content/dam/twilio-com/core-assets/customer-logos/t-z/twilio.svg`
→ committed to `public/brand/twilio-logo.svg`. Used in header/login with proper clear-space.

All tokens live in one file (`theme/tokens.css`) so exact values are trivial to audit/adjust.

## 9. Internationalization

- `next-intl` with `messages/{locale}.json`; **every UI string** via `t()`.
- Runtime locale switcher in the header — no reload.
- Each feature module and each plugin owns its own message namespace.
- ESLint rule flags literal JSX text to enforce translation coverage.
- Ships with `en` (and one stub locale to prove switching works).

## 10. Plugin system

Lightweight registry + extension-point model. Built now; zero plugins shipped.

- `PluginManifest`: `{ id, name, version, i18nNamespace?, register(host): void }`.
- Extension points (slots) the host renders: nav items, agent-desktop side panels,
  task-context tabs, header actions, settings pages.
- A plugin is a TS module that, in `register(host)`, contributes React components +
  optional SDK event subscriptions + its own translation files.
- `plugins/example/` is a disabled skeleton demonstrating a task-side-panel contribution —
  the template for "Claude, build a CRM plugin": drop a folder, export a manifest, register
  a contribution; no core changes.

## 11. Agent Desktop UX

Header (activity/presence selector · profile · locale switcher · theme toggle · Twilio logo)
· Task list · Active-task panel that swaps between Call panel (voice) and Conversation panel
(chat/email) · Outbound dialer · Transfer/conference modal · Audio device picker · Supervisor
panel (monitor/coach/barge + worker management).

## 12. Testing

- Unit tests (Vitest + Testing Library) for store slices, action wrappers (SDK mocked),
  i18n string coverage, and the plugin registry.
- The Flex SDK is mocked at the `lib/flex/client.ts` boundary so features are testable
  without a live session.

## 13. Open items / assumptions

- React peer-dep range of `@twilio/flex-sdk` verified at install (npm page was 403 during
  research); pin accordingly.
- Success/warning greens/ambers are not in the extracted core palette; §8 sets accessible
  defaults now, to be reconciled against the guideline "Core Visual Elements" page during
  implementation.
- Twilio Sans / BuffaloBF licensing is the user's responsibility to confirm for production;
  boilerplate degrades gracefully to open fallbacks.
