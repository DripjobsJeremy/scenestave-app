# Banquo Context Handoff

**Purpose of this document.** This is a comprehensive context document for Jeremy Harrison's Banquo project, written for upload to the Claude project knowledge base on a new Pro account (jwharrison77@gmail.com). It captures everything Claude should know about the product, the working relationship, and the current state of work as of April 22, 2026, so that a fresh Claude instance in the new account can pick up where the previous one left off without Jeremy having to rebuild context from scratch.

This document lives in project knowledge, not project instructions. Claude should treat it as authoritative reference material and search it via `project_knowledge_search` when context about Banquo, the user's working style, or current project status is needed.

---

## Why this document exists

Jeremy has two paid Anthropic subscriptions attached to the email jeremy@dripjobs.com: a personal Pro subscription and a Team seat on the Dripjobs organization. In mid-April 2026, a regression in the Claude Code VS Code extension's OAuth flow began routing his Pro subscription to the Team org regardless of which org he selected during browser sign-in, making his personal Pro subscription effectively inaccessible via Claude Code. See GitHub issue #12740 for the inverse-direction report of the same bug.

Rather than wait for an OAuth fix, Jeremy is creating a new Pro subscription under jwharrison77@gmail.com, a personal email with no connection to Dripjobs, specifically for Banquo work. This cleanly avoids the multi-org routing bug because the new email has only one org attached.

Dripjobs work continues under the original jeremy@dripjobs.com account. The new jwharrison77@gmail.com account is Banquo-only.

---

## About Jeremy

Jeremy Harrison is a Product Manager and solo founder. His background includes acting, which gives him deep theatre domain fluency that actively shapes product decisions for Banquo. He works as a solo developer, delegating implementation to AI agents (Claude Code via VS Code) while making all product, design, and architectural decisions himself.

He is the user Claude is talking to in this project. Address him directly. He is comfortable with technical depth and prefers substantive responses over preamble or hand-holding.

---

## About Banquo

### What it is

Banquo is a theatre production management SaaS platform. It is positioned as the first of its kind, designed around how theatre actually works rather than generic project management adapted for theatre. The platform targets both theatre organizations (venues, high schools, universities, boards, companies, professional and LORT theatres) and individual theatre artists (performers, directors, designers, stage managers, crew).

The live product is at banquo.app. The codebase is at github.com/DripjobsJeremy/banquo-app. Hosting is GitHub Pages with Porkbun DNS.

### Name and brand identity

**Banquo** is named for the Macbeth ghost who appears uninvited at the banquet table, sees everything, and cannot be ignored. The metaphor is deliberate: a theatre management platform that knows every aspect of your production. Jeremy resolved the theatre superstition concern himself. The prohibition on saying "Macbeth" aloud applies to the title of the play, not to character names.

**GhostLight AI** is the name of the AI assistant embedded inside Banquo as a feature. Named for the single light left burning on an empty stage. When referring to the AI assistant inside the product, always call it GhostLight, not "the AI" or "Claude".

**ScreenStave** (screenstave.app, scenestave.app) is the planned companion product for film and TV production management. Development begins after Banquo MVP is complete.

### Domains and IP

- banquo.app (primary, live)
- banquoapp.com (defensive)
- screenstave.app, scenestave.app, scenestave.com (for the future film/TV product)
- Several sceneRM.* parked domains (legacy)
- USPTO Intent to Use filings pending for Classes 041 and 042

### Product evolution

The product was originally called ShowSuite. It was renamed to SceneStave, then finally to Banquo. The earlier names persist in the codebase as localStorage key prefixes (`showsuite_`, `scenestave_`, `SceneStave_`) and must never be renamed. See "Hard rules" below.

### Core modules

- **Dashboard** with permission-based views showing active productions, upcoming shows, financial summaries, recent casting, rehearsal schedules
- **Contact Database** with tagging (Board, Donors, Actors, Directors, Crew), CSV/Excel import with field mapping, donor-specific cards with donation history
- **Production Builder and Scene Builder** where directors create productions and define scenes by time, location, action, mood, and music. Scene Builder is the universal source of truth for all department tools.
- **Department Tools** (Lighting, Sound, Wardrobe, Props, Set, Stage Manager), each with its own workspace that reads from and writes to scene data
- **Volunteer Management** (complete) with dashboard, opportunities, shift scheduling, applications, public portal, check-in
- **Calendars** (audition, rehearsal, show, board events) with filter by production, type, department, date
- **Financials and Board Dashboard** with budgets, donor contributions, ticket sales, grants, department budget variance

### Stack

- React via JSX transpiled in-browser through Babel (no build step)
- localStorage for all data persistence (no backend yet)
- Tailwind CSS (no responsive modifiers in Phase 1, desktop-first)
- React Router v5 with HashRouter
- Chart.js for financial analytics
- PapaParse for CSV
- SheetJS for Excel
- GitHub Pages hosting, Porkbun DNS

### Development phase

Phase 1 (current): Desktop-first feature development on the client-side React architecture.

Phase 2 (next): Backend migration to Node/Express with PostgreSQL or MongoDB, plus WebSocket sync for messaging.

Phase 3 (after): Mobile-first transformation.

### Competitive landscape

- **ProductionPro**: Production-focused, no org-layer CRM. Partial overlap.
- **theWorkbook / Casting Workbook**: Casting pipeline, not a direct competitor. Jeremy has a personal connection at this company through a colleague, flagged as potential integration partner or acquisition path specifically for ScreenStave.
- **Movie Magic and Scenechronize**: Enterprise film/TV tooling, not in Banquo's tier.

---

## Hard rules (never violate these)

These are non-negotiable. Violating any of them causes real harm to Jeremy's production data or breaks his working flow.

### 1. Never rename localStorage keys

All `showsuite_`, `scenestave_`, and `SceneStave_` prefixes must remain exactly as they are across all refactors. The product is now called Banquo but the keys stay on the legacy prefixes permanently. Renaming a key causes silent data loss in production because users' existing data lives under the old key. This rule was established after a previous incident where keys were renamed mid-session and custom user data was overwritten.

Protected keys include but are not limited to:
- `showsuite_contacts`, `showsuite_actors`, `showsuite_productions`
- `scenestave_messages`, `scenestave_button_theme`, `scenestave_prod_card_mode`
- `showsuite_lighting_collapsed`, `showsuite_wardrobe_collapsed`, `showsuite_user_role`
- `SceneStave_lighting_collapsed`, `SceneStave_wardrobe_collapsed`
- `lighting_budget_collapsed`, `wardrobe_budget_collapsed`, `sound_budget_collapsed`, `set_budget_collapsed`, `props_budget_collapsed`
- `board_total_budget`, `dept_budgets`
- `showsuite_calendar_view_mode`, `showsuite_calendar_filter_type`
- `SceneStave_image_category_filter`, `SceneStave_image_view_mode`
- `showsuite_contacts_view_mode`, `showsuite_active_production_id`, `showsuite_active_tab`, `showsuite_main_view`, `showsuite_collapsed_scenes`
- `tld_contact_groups_v1`, `tld_donations_v1`, `tld_donor_levels_v1`, `tld_campaign_categories_v1`, `tld_productions_v1`

Also: the `BRANDING_VERSION` one-time migration in `organizationService.js` uses the key `banquo-v3`. Do not change this string. It gates whether existing users get retinted on next load.

### 2. No em-dashes or en-dashes in user-visible copy

Jeremy calls these "telltale AI dashes." Replace with commas, periods, or middle dots ( · ) depending on context. This applies to all copy in the product (UI text, marketing pages, landing), all documentation, all code comments intended for human reading, and all Claude responses in chat. This rule is strict.

### 3. One atomic task per prompt to the VS Code agent

Jeremy uses Claude Code in VS Code as his implementation agent. Prompts must be structured with:
- Imperative opening verb ("Create", "Update", "Add", "Replace")
- Exact file paths from project root
- Complete runnable code blocks (no placeholders, no "// ... rest of code")
- Numbered integration steps
- Specific test instructions

Complex features must be split into multiple sequential prompts. Never combine "create the service" and "wire it into the UI" into a single prompt.

### 4. Implement, don't suggest

By default, implement requested changes rather than offering options. If Jeremy asks "should we add X", the answer is to add X, not to enumerate tradeoffs. Only offer options when he explicitly asks for them ("what are my options", "give me some ideas", "what would you recommend"). A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability. Minimal, focused solutions.

### 5. Read before proposing

Never speculate about code that hasn't been inspected. If Jeremy references a file, open it and read it before proposing changes. Project knowledge search is the primary tool for this. Claims about code must be grounded in actual file contents.

### 6. Trust the uploaded zip, not the project knowledge snapshot

The `/mnt/project/` snapshot in project knowledge is often stale and missing files (services, components in nested folders). When Jeremy uploads a zip mid-chat (typically `banquo-repo.zip`), extract it and read from it. The zip is the source of truth. The project knowledge is convenient but out of date.

### 7. Never wholesale replace index.html

The deployed `index.html` has approximately 60 script tags loading services, components, and dependencies in a specific order. It is fragile. Do additive or targeted edits only. Never output a full replacement file.

### 8. Desktop-first through Phase 1

Do not add responsive modifiers (`sm:`, `md:`, `lg:`) to Tailwind classes unless Jeremy explicitly requests them. Mobile transformation is deliberately deferred to Phase 3 as a single focused sprint.

---

## Working style and communication

### How Jeremy works

Jeremy develops in VS Code with a Claude Code agent doing implementation. His workflow is:
1. Describes the feature or fix he wants, usually in plain English
2. Receives from Claude (this chat) a prompt formatted for the VS Code agent
3. Pastes the prompt into Claude Code
4. Tests the result in browser
5. Reports back: success with any polish notes, or errors with full detail
6. Receives next prompt only after the previous one succeeds

This means the prompts Claude writes for him are not conversational. They are production specs that will be executed by another LLM.

### Prompt format for the VS Code agent

Use triple-backtick code fences wrapped around the full prompt, or fenced as text (not as python/js/etc) so the content renders as copy-pasteable plain text. Inside:

- Opening imperative sentence describing the goal
- A "Technical requirements" bulleted list
- File-by-file sections, each with the exact path, a brief comment on what's changing, and a fenced code block containing the actual code to write
- A numbered "Integration steps" section with explicit instructions
- A "Test by" section with specific manual test steps, numbered, with expected results

Each prompt does one atomic thing. Never mix CSS and JSX changes unless they are tightly coupled and shipping them separately would leave the app broken.

### Tone and response shape

- Substantive and direct. Jeremy does not need reassurance or soft openings.
- No em-dashes in Claude's own responses either, not just the product.
- Be willing to push back on Jeremy's ideas if there's a reason. He values correction over agreement.
- Identify problems early. If a request assumes infrastructure that isn't there, stop and flag it rather than fabricating a prompt that will fail.
- When in doubt, read the code first.

### Copy and design decisions

Jeremy makes final calls on copy and aesthetic choices. Claude can offer two or three distinct options when asked, but should not default to offering options. Jeremy has strong opinions on:

- Theatre-native language throughout. No generic SaaS aesthetics or phrasing.
- Theatrical metaphor at medium register. Acts and scene markers, ghost-light as anchor. Not overt, not subtle.
- Typography: Fraunces for headings, Cormorant Garamond for italic voice, Inter for UI body, JetBrains Mono for labels and eyebrow text (0.22em letter-spacing in gold).
- Professional aesthetic. Theatre professionals work in bright spaces.
- Distinctive, not generic. Avoid overused purple gradients on white. Avoid default shadcn/ui styles.

---

## Current state of the Banquo codebase

This section covers what has shipped, what's in progress, and what's queued as of late April 2026. Treat it as a snapshot that may drift from the actual codebase over time. When in doubt, read the current zip.

### Recently shipped features

**UX audit (March 22, 2026).** All 19 flagged issues resolved in one session. Final backlog document: `SceneStave_UX_Backlog_v5.docx`.

**Global Calendar.** `src/components/GlobalCalendar.jsx` aggregates all `production.calendar[]` arrays. Month and list views, filter by production and event type, production color legend, persisted view mode. Navigation restored for admin, board, director, and default roles.

**Staff and crew system (March 2026).** `staffProfile` schema, StaffDirectory with multi-role production assignments (`roles[]` array, merge on duplicate), Contacts hub with 6 tabs, Staff Portal with per-production role resolution, "Viewing as" picker, persistent role badge, budget editing restricted to admin and board roles. Tab access uses `effectiveTab` pattern (union of all roles on that production drives visible department tabs).

**Theme system (March 23).** CSS custom properties in `style.css` (`--color-primary`, `--color-bg-base`, etc.). Tailwind remapping via `!important` overrides. `organizationService` writes brand colors to CSS variables. Light and dark toggle in Settings and sidebar footer. `data-theme` on html element. Sidebar stays dark in both modes.

**Contacts hub UX pass (March 23).** 6-tab unified directory. All Contacts merges `showsuite_contacts` and `showsuite_actors` (19 records). Type filter, card and table toggle. Donors table aligned. Staff and Crew shows production titles. Actors full roster. Volunteers merges tagged contacts and `volunteerApplications`. Board card/table toggle. `hub-table`, `hub-card`, `hub-badge` CSS classes in `style.css`.

**Scene Builder UI (March 26).** Progressive disclosure restored. SmartDropdown for Time of Day and Lighting Mood (global custom values). Character picker from Cast List. Full Company in characters and performers. Performers mic table (Mic #, Level, Custom). Musical Number type hides Artist and shows performers. Sound and Lighting department views synced.

**Auto-allocate budget (March 28).** Evenly distributes across 10 departments (`DepartmentsBudget.jsx`). Client Organizations section on SuperAdmin dashboard when Venue Operator Mode enabled. Button theming panel in Settings > Branding. Primary, Secondary, Success with bg, text, hover-bg, hover-text, active colors. Persists via `scenestave_button_theme`, syncs `--color-primary`.

**Cue-to-Cue system (March 29).** Scene Builder 4 sections. `cueSheetService.js` with 9 cue types, `scene.name` as identifier. CueSheetBuilder with scene and linear views, completion summary, needs-review badges. CallingScreen dark mode with GO button (88px), jump-to-scene dropdown, keyboard shortcuts. Brand reset dialog with options to reset theme, buttons, or both.

**Budget enhancements (March 29).** Percentage sliders per department (bidirectional with dollar input), total allocated percentage summary. Royalty calculator with 7 contract types (flat, per-perf, per-seat, perf+seat, % gross, % gross with minimum, custom). Production details with breakdown engine (caps and discounts). Persists to `showsuite_productions`. BudgetOverview shows royalties total.

**Production Image Management (March 29).** `ProductionImagesManager.jsx` in `src/components/production/departments/`. 10 image categories. URL input with Dropbox and Google Drive auto-conversion. PRIMARY badge, category filter chips. Persists to `production.images[]`. Images tab in SceneBuilder between Set and Stage Manager. Productions list card mode toggle (poster, thumbnail, list) persisted to `scenestave_prod_card_mode`.

**Actor Portal (March 30).** @mention blocking notes push to `actorsService.rehearsalNotes`. `MentionTextarea` dropdown. `pushRehearsalNotes` on blur. Portal has sidebar navigation (Dashboard, Productions, Calendar), expandable productions, `ActorProductionDashboard`, profile photo in sidebar avatar and dashboard, admin escape banner. `profilePhotoUrl` field on actor schema.

**Messaging system (March 30).** `messagesService.js` with thread and message schema, CRUD, unread counts, role permission matrix, localStorage at `scenestave_messages`. `MessagesView.jsx` with thread list, chat window, compose modal with recipient typeahead, production context. Messages nav in main app (admin, director, board, department roles) and Actor Portal sidebar. Unread badges. 10-second polling. Phase 2 will add WebSocket sync.

### Banquo redesign Phases 1 through 2c (ongoing, April 2026)

The current active workstream is retheming the app to match the `banquo-wizard` landing page aesthetic. The target aesthetic is: ink-black background (#0a0706), parchment text (#f4ede2), crimson (#7a1f24) and gold (#c9a14a) accents, Fraunces serif headings, Cormorant Garamond for italic voice.

**Phase 1 and 1b (complete).** Palette migration. DEFAULT_BRANDING in `src/services/organizationService.js` updated from SceneStave purple (#7C3AED) to Banquo crimson. DEFAULT_BTN_THEME also updated (it was racing `applyBrandingToDOM` and resetting `--color-primary` back to purple). One-time localStorage migration gated by `BRANDING_VERSION = 'banquo-v3'` retints existing users on next load. Sidebar identity flipped from crimson gradient to ink with gold-tinted right border and gold left-border active nav treatment matching the landing page.

**Phase 2a (complete).** Component retint. Five `:root` aliases added: `--legacy-purple`, `--legacy-purple-dark`, `--legacy-purple-surface`, `--legacy-purple-border`, `--legacy-purple-text`. Roughly 20 bespoke component classes migrated from hardcoded `#7c3aed` family colors to the legacy aliases. `.prod-card-btn--primary` rewritten as a ghost style (transparent, gold-dim border, parchment text).

**Phase 2b (complete).** Typography (Inter and JetBrains Mono added to @imports, h1-h5 use Fraunces, em/.italic-voice use Cormorant Garamond, .label/.eyebrow use JetBrains Mono with gold letter-spacing). Body background override (`body.bg-gray-50` remapped to `var(--color-bg-base)`). Logo swap (SHOWSUITE_LOGO_SVG replaced with BANQUO_LOGO_SVG, a ghost-candle with tapered flame). App.jsx sidebar header fallback changed from "SceneStave" to "Banquo".

**Phase 2c (complete, shipped as commit 2ce8363).** Three dark-mode polish fixes:
1. Status badges. `getStatusColor()` in `src/components/production/ProductionsView.jsx` (lines 115-124) now returns BEM class names (`prod-status-badge prod-status-badge--planning` etc.) instead of raw Tailwind. Base rule plus 5 dark-surface variants (gold and crimson tones) plus 5 light-surface overrides scoped to `.prod-thumb-card` (because thumbnail cards have white card bodies).
2. Active-card button readability. `.prod-card-btn--primary` inside `.prod-poster-card--active` and `.prod-list-row--active` now brightens to readable gold instead of camouflaging into the active gold ring.
3. Grain overlay. `body::before` with `fractalNoise` SVG at opacity 0.05, `mix-blend-mode: overlay`. Matches the landing page. Light-mode dials to opacity 0.035 and `mix-blend-mode: multiply` so it reads as paper texture. Also: added `-webkit-backdrop-filter` alongside `backdrop-filter` on `.prod-status-badge` for Safari.

### Queued next: light-mode audit (Prompt A)

After Phase 2c shipped, a light-mode audit identified three Severity 1 legibility bugs that break on sight in light mode. Prompt A is drafted and ready for the VS Code agent. All three edits are in `style.css`:

1. **`.text-white` remap bug.** Line 511 remaps `.text-white` to `var(--color-text-primary)`, which is near-black in light mode. Fix: hardcode to `#FFFFFF`.
2. **`.prod-card-mode-btn--active` blends into its container in light mode.** Line 1255. Fix: add light-mode scoped override with crimson background and white icon.
3. **`.prod-card-btn--primary:hover` gold text is invisible on white cards in light mode.** Line 1271. Fix: light-mode scoped override with darker amber (#6b5015) on stronger wash.

When Jeremy is back in Claude Code, the Prompt A block (drafted in chat, available for him to retrieve) can be pasted directly. Or, these three edits are small enough to apply manually in VS Code without an agent.

### Queued after Prompt A

- **Prompt B (Severity 2 light-mode cleanup).** Theme the `--legacy-purple-text` variable for light mode (redefine to `#8a6b1f` in the `[data-theme="light"]` block, retints ~8-12 rules at once). Plus swap four hardcoded `color: #111827` values to `var(--color-text-primary)` for theme-system hygiene (`.prod-list-title`, `.mention-item-name`, `.prod-images-title`, `.prod-images-card-label`).
- **Chart.js recoloring on Financial Dashboard.** Hardcoded color arrays in `FinancialCharts.jsx` bypass the theme entirely. Still SceneStave-era regardless of CSS.
- **Inline `style={{ color: '#...' }}` cleanup.** Phase 3 polish. Some of these bleed into the light-mode audit because inline hex values ignore `data-theme` switches.
- **Severity 3 deferrable items.** Actor Portal sidebar still gradients from legacy purple to indigo (`style.css:1450`, `.ap-sidebar`). Cue filter chip colors hardcode Tailwind brand colors by cue type, arguably correct semantically, leave alone unless Jeremy wants a Banquo-tinted cue type system.

### On the horizon (post-Phase 2)

- Backend migration to Node + Express with PostgreSQL or MongoDB
- WebSocket sync for messaging (replacing 10-second polling)
- Mobile-first transformation (Phase 3)
- ScreenStave development (post-Banquo MVP)
- Ticket sales integration
- Google Calendar two-way sync
- Script import with AI analysis
- New user tutorial wizard
- Potential casting platform integration or partnership via theWorkbook connection

---

## Parallel deliverable: Banquo landing and wizard

Separate from the main app, Jeremy maintains two files at the repo root:

- `banquo-landing.html`
- `banquo-wizard.html` (also present as `banquo-wizard (1).html` in the uploaded zip)

These implement a wizard-only onboarding experience (no traditional landing page). Four-act flow:
- **Act I.** Ghost light dictionary entry. "Proper noun: Banquo" as secondary definition.
- **Act II.** Org vs. artist fork.
- **Act III.** Branching forms with geo opt-in and role multi-select.
- **Act IV.** Curtain call with share and invite tools.
- **Act V** (artist users only). Restricted portal preview seeded from wizard form.

GhostLight AI easter egg: clicking the animated candle in the wordmark triggers a full-screen dossier overlay. Exits via "Follow Banquo back to the stage."

The wizard is the visual source of truth for the app redesign. When in doubt about the target aesthetic, read the wizard HTML.

---

## Tooling and references

### Development environment

- VS Code with Claude Code agent for implementation
- GitHub Pages for hosting (banquo-app repo, DripjobsJeremy org)
- Porkbun for DNS and domain registrar
- Babel browser transpilation (no build step)

### Design references

- Laws of UX (`SCENESTAVE_UX_DESIGN_STANDARDS.md` in project root, standing authority for agent prompts)
- Fraunces + Cormorant Garamond typography for brand-facing surfaces
- banquo-wizard.html as the visual target for app retheming

### Reading and influences

- Rob Walling, *The SaaS Playbook*
- Rob Fitzpatrick, *The Mom Test*
- Ethan Mollick, *Co-Intelligence* and newsletter
- Anthropic docs (docs.claude.com) for AI workflow guidance

---

## First message in a new chat

When Jeremy opens a new chat in the new Pro account's Banquo project, a reasonable first move for Claude is to search this document via `project_knowledge_search` (query "Banquo handoff" or "current state of Banquo") to orient, then respond to whatever Jeremy actually asks about. Don't volunteer a summary of this document unless he asks for one. Just absorb it and act on it.

If Jeremy opens with "continue where we left off" or similar, the most likely pickup point is Prompt A (the three Severity 1 light-mode fixes), unless he says otherwise.

---

## Meta note on memory

The new account will not have the userMemories block that encoded much of this context on the previous account. That's fine. This document substitutes for it in the project-knowledge layer. Over time, as Jeremy has more conversations in the new account, the new userMemories will build back up automatically. Don't try to reconstruct it faster than that happens naturally.

---

*Document generated April 22, 2026, for handoff from jeremy@dripjobs.com Pro account to jwharrison77@gmail.com Pro account. Authoritative as of that date. When in doubt, read the current codebase.*
