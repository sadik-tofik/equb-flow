# Frontend Prompt for the UI Agent

**Project (working title):** EqubFlow
**Version:** 0.1 (draft, hand this whole file to the UI agent)
**Source of truth for data and routes:** `docs/06-TDD.md` section 9 (types and routes) and `docs/02-SRS.md` (requirements)
**Why this exists:** the backend is being built in parallel. You build the entire UI against a typed mock API first, so nothing waits on the backend. When the real API is ready, you switch one environment variable.

---

## 0. Instructions to the agent (read first)

You are a senior product designer and frontend engineer. You build calm, trustworthy, mobile-first screens for non-technical people, plus one cinematic public page for hackathon judges. **Do not ask questions.** All answers are below. Build in the order in section 11 and stop after each milestone with a short report.

**What the product does, in one paragraph:** EqubFlow runs an Equb (a rotating savings group). Members contribute each round, the pot goes to one member per round, and an agent explains every decision. Software independently verifies that each contribution arrived and only allows the pot to go to the right person. This demo uses **test money with no real value** and **accelerated rounds** (for example one round per day).

**The people using it:** family members and coworkers of the builder, many of whom have never used crypto, on mid-range phones with unreliable connections. If a screen needs explaining, the screen has failed.

## 1. Stack and constraints

- Next.js (App Router), React, TypeScript, Tailwind CSS 3.4, Lucide icons. GSAP only on the public landing page, never in app screens.
- Mobile-first (design at 360 px width first), then tablet and desktop.
- **Performance budget for app screens:** small route bundles, no autoplay video, no large images, skeleton loaders instead of spinners, optimistic UI only where safe (never for anything involving money).
- **Accessibility:** WCAG AA contrast, 44 px minimum touch targets, visible focus, labels on every input, `prefers-reduced-motion` respected, screen-reader text for every status chip.
- **i18n-ready:** every user-visible string lives in a messages file (`en.json` first). Do not hard-code copy in components. Dates show relative time plus the local time zone ("Tomorrow, 6:00 PM").
- **Security rules (non-negotiable):**
  - No secrets in client code. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may exist in the browser.
  - The UI **never computes or converts money**. Display exactly the `display` strings the API returns.
  - No fund logic in the client. Buttons call API routes; the server decides.
  - Session in secure cookies via Supabase; never store tokens in `localStorage`.
  - Render all server text as plain text (no raw HTML), including agent reasoning and member aliases.
  - Every API call handles `401`, `403`, `429` and network failure with a plain-language message.

## 2. Design system

Use the **"Organic Tech" preset**: warm, communal, trustworthy.

| Token | Value | Use |
|---|---|---|
| `moss` | `#2E4036` | Primary, headings, navigation |
| `clay` | `#CC5833` | Accent, primary buttons, highlights |
| `cream` | `#F2F0E9` | Page background |
| `charcoal` | `#1A1A1A` | Body text |
| `success` | `#2F7D4F` | Verified, paid, credited |
| `warning` | `#B7791F` | Late, partial, needs attention |
| `danger` | `#B3261E` | Problems, pause switch, refusals |
| `info` | `#2B5C8A` | Waiting, in progress |

- **Typography:** headings in "Plus Jakarta Sans" (tight tracking); body in "Outfit"; amounts, addresses and hashes in "IBM Plex Mono"; "Cormorant Garamond" italic only for display lines on the landing page.
- **Shape:** rounded containers (`rounded-3xl` on cards in app screens, `rounded-[2rem]` to `rounded-[3rem]` on the landing page). No sharp corners.
- **Status is never color alone:** every chip has an icon and a word.
- **Required global elements:** a persistent **TEST MONEY** badge in the header (text: "Test money, no real value"), and an **ACCELERATED** banner on any group whose `accelerated` is true ("Rounds are sped up for this demo").
- **Mode labels:** `real`, `simulated`, `sandbox` appear as small labels: "Real group", "Simulated", "Sandbox". Simulated and sandbox screens carry a visible, always-on stripe so nobody mistakes them for real activity.

## 3. Voice and copy rules

Plain, warm, short. Address the person as "you". Never use: blockchain, wallet address, gas, hash, token, smart contract, on-chain (except on the Audit and Proof screens, where each term gets a one-line explanation).

| Say this | Never this |
|---|---|
| Your contribution is confirmed | Transaction finalized |
| Receipt | Transaction hash |
| Your account | Your wallet |
| Safety lock | Smart contract |
| Matched your payment | Classified transfer |
| Something doesn't add up | Discrepancy detected |
| The group is paused | Paused flag set |

Every screen has a one-sentence status line at the top (use `statusText` from the API) and one obvious next action.

## 4. Data and API

- Build a typed client from the types in TDD section 9.1 (`GroupSummary`, `RoundView`, `MyObligation`, `DiscrepancyView`, `ProposalView`, `DecisionRecordView`) and the routes in 9.2.
- **Mock first.** Create a mock server (MSW or Next route handlers behind `NEXT_PUBLIC_API_MODE=mock`) with fixtures for every state in section 8. Switching to the real API is `NEXT_PUBLIC_API_MODE=live`. Do not wait for the backend.
- Fixtures must include: a 5-member group mid-cycle, a round with one late member, a partial payment discrepancy, a paused group, a proposal waiting for approval, a completed cycle, an empty new group, and API failure cases.
- Poll the group and round endpoints every 10 seconds while a screen shows an in-progress state; stop polling when hidden.

## 5. Screens (mobile-first)

For each screen: purpose, content, actions, states.

1. **Sign in.** Email field, "Send me a code," six-digit code entry. Plain error messages. No passwords.
2. **Accept invitation (`/join/:token`).** Show the group name, the contribution, the schedule, and the **rules in plain language** with a required "I understand and agree" step that records `rulesVersion` and `rulesHash`. Then "Join the group." While the account is being prepared, show friendly progress ("Setting up your account").
3. **Group home.** Top: group name, status line, TEST MONEY and ACCELERATED badges. Then a large **"What's next for you"** card. If a contribution is due: amount, deadline countdown, and one big **"Pay my contribution"** button. Then the current round summary, then members as a row of avatars with state chips (Waiting, Paid, Late, Problem), then links to Rounds, Approvals, Log.
4. **Pay my contribution (sheet or modal).** Shows amount (`display`), destination in plain words ("The group's safety lock"), and what happens next. Requires a fresh confirmation (sign-in within the last 5 minutes; if older, ask for a new code first). After approval: "Sent. Waiting for confirmation" with progress, then "Confirmed" with a **Receipt** link.
5. **Round detail.** Recipient alias, deadline and grace, each member's contribution row (state, amount, receipt link), pot total, payout status and receipt link, and a plain explanation of any problem.
6. **Approvals inbox.** Cards with a title, the agent's reasoning in plain text, an "Evidence" list (links), a "What happens if you approve" sentence, approvals so far versus required, and **Approve / Reject / Send back** (with an optional note). If the user is the beneficiary, show it disabled with "You can't approve this one because it involves you."
7. **Something doesn't add up (discrepancies).** List of items: expected, received, difference (large, mono font), status, owner, plain explanation. State clearly that differences are never hidden or rounded away.
8. **Decision log.** Reverse-chronological timeline: time, plain "why" sentence, receipt link when relevant. A **"Check the record"** button runs the verify endpoint and shows a clear result: "Record is intact" or "Record changed at entry N."
9. **Organizer console.** Create-group wizard (name, number of members, contribution, schedule, grace period, payout order method, rules summary), invite links with copy buttons, member readiness list, **Start cycle** (with a confirmation that rules freeze), and the **Pause** switch: a large danger-colored control with a confirmation ("This stops all payments until you resume") and an always-visible banner while paused.
10. **Invoice mode.** Issuer: create an invoice (payer alias, what it was for, real-world amount note, test amount, due date) and see its status. Payer page: amount, due date, a single **Pay** action, and a receipt afterward.
11. **Sandbox (public, no login).** "Try a full cycle in two minutes." Buttons to run scenarios by name (for example "A friend pays late," "Someone pays the wrong amount," "A stranger sends money," "Hidden instruction in a payment note"), a live timeline showing what the agent decided and why, a **Reset** button, and a permanent SIMULATED stripe.
12. **Public audit view (no login).** Pseudonymous: aliases and shortened addresses only. Group summary, decision timeline, the "Check the record" button, and an explainer of what this proves and what it doesn't.
13. **Proof and traction page.** Counters split by Real, Simulated and Sandbox, and by test or real money, never added together. Shows the baseline and the change since. Each number links to its source file.

## 6. Public landing page (cinematic, for judges and visitors)

This is the only place for heavy animation. Pre-answered build parameters (do not ask):

- **Brand:** EqubFlow. **Purpose:** "An agent that runs a savings group, proves every payment, and can't be tricked into sending money to the wrong person."
- **Aesthetic:** Organic Tech (section 2).
- **Three value propositions:** (1) Every contribution is proven, not claimed. (2) Every decision is explained in plain language. (3) Money can only go to the right person, even if the agent is fooled.
- **Primary call to action:** "Try the sandbox." Secondary: "Read the proof."

Structure (follow in this order, adapting content and colors):

- **A. Floating island navbar:** transparent over the hero, then frosted cream with a border after scrolling. Links: How it works, Safety, Proof, Sandbox. CTA: Try the sandbox.
- **B. Hero (100dvh):** full-bleed image (forest, moss and organic textures, from Unsplash via `next/image` with alt text and a gradient fallback; keep under 200 KB) under a moss-to-black gradient. Content bottom-left. Headline pattern: "Trust is the" (bold sans) / "proof." (massive serif italic, 3 to 5 times larger). Staggered fade-up.
- **C. Three interactive artifacts:** (1) a shuffler cycling labeled cards (Matched, Partial, Late, Unknown sender); (2) a live-text typewriter showing realistic decision-log lines with a "Live record" pulsing dot; (3) a round calendar where a cursor selects a day, taps Pay, and the day turns verified.
- **D. Manifesto:** dark section with the statement "Most savings tools focus on: reminders." / "We focus on: *proof.*" revealed word by word on scroll.
- **E. Protocol (sticky stacking cards):** Collect, Verify, Release, each with a small looping SVG animation (rotating ring, scanning line, pulse).
- **F. Honest limits:** a clear card: "What this demo is: test money, accelerated rounds, a small real group. What it isn't: a bank, a real-money product, or audited."
- **G. Footer:** deep moss, rounded top, system-status indicator with a pulsing dot reading "Testnet demo," repository link, and the documentation links.

Technical rules for the landing page: global SVG noise overlay at 0.05 opacity; magnetic buttons (`scale(1.03)`, `cubic-bezier(0.25, 0.46, 0.45, 0.94)`) with a sliding background layer; `gsap.context()` inside `useEffect` with `ctx.revert()` on cleanup; entrance easing `power3.out`; stagger 0.08 for text and 0.15 for cards; every animation disabled when `prefers-reduced-motion` is set. No placeholders anywhere.

## 7. Components to build once and reuse

`StatusLine`, `TestMoneyBadge`, `AcceleratedBanner`, `ModeStripe`, `StateChip`, `MoneyText` (renders a `display` string in mono), `ReceiptLink`, `ConfirmSheet`, `ApprovalCard`, `DiscrepancyCard`, `Timeline`, `VerifyButton`, `MemberAvatarRow`, `EmptyState`, `ErrorState`, `Skeleton`, `PauseBanner`.

## 8. State matrix (each screen must handle all)

Loading; empty (new group, no rounds, no proposals); normal; waiting for confirmation; partial payment; late; discrepancy open; proposal waiting; paused; completed cycle; sign-in expired; no permission; rate limited; offline or API failure (with retry); and the sandbox's running, finished and reset states.

## 9. Content safety on screen

- Render member aliases and agent text as plain text with length limits and line clamping.
- Never display full wallet addresses outside the Audit and Proof screens; show the first six and last four characters with a copy button.
- Never show internal error details; show the API's plain-language message and an error code.

## 10. Acceptance criteria

- Every screen in section 5 works on a 360 px phone in mock mode, with all states in section 8 reachable through fixtures.
- Lighthouse mobile: Performance 85 or higher on app screens, Accessibility 95 or higher.
- No hard-coded copy; no money math in the client; no `localStorage` tokens; no secrets in the bundle.
- A first-time user can reach "Pay my contribution" from the invitation link in under 60 seconds in a usability walk-through.
- Landing page: all animations run, are cleaned up on navigation, and are disabled with reduced-motion.
- The mock-to-live switch requires only the `NEXT_PUBLIC_API_MODE` variable and the base URL.

## 11. Build order and reports (stop after each)

1. **M-A (first, needed by about Oct 3):** design tokens, layout shell, mock API, sign-in, invitation acceptance, group home, pay-my-contribution flow, round detail.
2. **M-B:** approvals inbox, discrepancies, decision log with "Check the record."
3. **M-C:** organizer console (wizard, invites, start cycle, pause).
4. **M-D:** sandbox and public audit view.
5. **M-E:** proof and traction page, invoice mode.
6. **M-F:** landing page.

After each milestone, report: what works, what is mocked, any API contract gaps you found (list exact field or route changes you need), and the Lighthouse numbers.

## 12. Things to ask the builder later (not now)

Whether to add Amharic or Afaan Oromoo strings, whether to show the Ethiopian calendar as an optional display, and the final product name.