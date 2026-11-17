# Tenner: how we build

Read this before changing anything. Every new page, feature and fix follows it.

## The design rule: Apple's aesthetic, always

Tenner should look and feel like software Apple would ship: calm, premium, fluid and native to Safari, iPhone and
Mac. When in doubt, ask "would this look at home in Apple TV, Apple Music or the App Store?" If not, it isn't done.

### The owner's references (start here)
- https://developer.apple.com/design/human-interface-guidelines
- https://developer.apple.com/design/resources/#macos-apps

**The three principles behind every decision:**
- **Clarity:** legible, precise and easy to understand. Text is readable at every size, icons are unmistakable,
  nothing is decoration for its own sake.
- **Deference:** the interface steps back so the content (the shows and films) is the star. Minimise clutter;
  if a page feels busy, take something away rather than add.
- **Depth:** visual layers and realistic motion show hierarchy (glass above content, sheets above the page,
  things moving the way physical objects would).

**The areas to check a design against:**
- **Navigation:** familiar, standard patterns (sidebar on computers, tab bar / menu on phones); people always know
  where they are and how to get back.
- **User interaction:** comfortable touch targets (44pt minimum), natural gestures (swipe, drag, pull), clear feedback
  for every tap (a press state, a change, a toast), and haptics where the device offers them.
- **System capabilities:** keyboard shortcuts (/ and ⌘K for search, arrow keys), drag and drop where it makes sense,
  the share sheet, Add to Home Screen, works across iPhone, iPad and Mac.
- **Visual design:** layout, colour, typography, iconography and imagery that are beautiful *and* accessible.
- **Modality:** use sheets and popups only to focus on one task, never to interrupt; always easy to dismiss.
- **Loading states:** never a blank or jumpy page; placeholders (skeletons) and gentle transitions while things load.
- **Haptics and feedback:** reinforce actions consistently (a save gets a visible confirmation, a swipe a small buzz).
- **Augmented reality:** not used by Tenner.

### Apple's Human Interface Guidelines (the source)
- Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
- Adopting Liquid Glass: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass
- Materials (glass, depth, layering): https://developer.apple.com/design/human-interface-guidelines/materials
- Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Color: https://developer.apple.com/design/human-interface-guidelines/color
- Dark Mode: https://developer.apple.com/design/human-interface-guidelines/dark-mode
- Motion: https://developer.apple.com/design/human-interface-guidelines/motion
- Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Writing: https://developer.apple.com/design/human-interface-guidelines/writing
- Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Lists and tables: https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
- Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- Tab bars: https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Sidebars: https://developer.apple.com/design/human-interface-guidelines/sidebars
- Search fields: https://developer.apple.com/design/human-interface-guidelines/search-fields
- Apple Design Resources: https://developer.apple.com/design/resources/

### What that means here (Apple's principles, applied to the web)
- **Content first; glass is the controls layer.** Navigation, bars, buttons and pills float above the content in glass.
  Use glass sparingly: only for the important functional elements, never stacked glass on glass.
- **Blend, never cut off.** Artwork and backgrounds melt into the page with soft masks and fades. No straight hard
  edges where an image or panel stops. Hero artwork runs the full width beside the sidebar, and the sidebar picks up
  its colours underneath (Apple's "background extension"). Scroll boxes fade at their edges.
- **Rounded and concentric.** Corners echo their container (a card's corner inside a sheet is a little tighter than the
  sheet's). No square corners on cards, tiles or hovers, and no boxy hover states.
- **Fluid motion.** Spring easing, things that grow and glide rather than snap. Prefer native, off-main-thread motion
  (CSS transitions, View Transitions, scroll-driven animations). Only when Settings → Animations is on, and never when
  the device asks for Reduce Motion. Motion must never pull content away from an edge (e.g. a top image leaving a gap).
- **Generous, legible lists.** Room to breathe, hairline separators, title-style headings.
- **Respect the device's settings:** Dark Mode and light (test both), Reduce Motion, Reduce Transparency
  (`prefers-reduced-transparency`: glass becomes solid), larger text, keyboard and VoiceOver (labels on every icon).
- **Native first.** Use what Safari and iOS provide: `<select>` menus, `<dialog>` for sheets and alerts, the iOS switch
  (`<input type="checkbox" switch>` with a drawn fallback), the share sheet (`navigator.share`), passkeys, web push,
  `position: sticky`, `backdrop-filter`, scroll snap. Don't rebuild what the platform already does well.

### Tenner's house style (learned the hard way: these are rules, not suggestions)
- **One list design everywhere:** the homepage's chart list (`.cl` in styles.css): small poster, title, grey second
  line, hairline separators, frosted hover, two columns on computers, one on phones. New This Week, Watchlist,
  Cast & Crew Top 10 and Browse's list view all use it. Rows of posters use `.nr`.
- **Glass tokens:** `--gl-fill`, `--gl-rim`, `--gl-hover` (defined for light, auto-dark and forced dark).
- **Buttons (the owner's chosen design, use it for every button):** solid deep tinted fills (`--bt-fill` navy, `--bt-round`
  dark grey for icon-only circles), no glass or rim, softly rounded rectangles, never capsules, circles when there's only an icon, an icon beside the words where there is one, and **white words and icons**, in Day and Night.
  Regular weight (500) with font smoothing, never bold. Pills and badges that aren't buttons stay glass.
- **Secondary buttons** (`.btn-2nd`, added beside `btn btn-tinted`): the less important action next to a main one (Cancel,
  Not now, Share and Trailer beside Watch, Start again, Copy link, Delete in red). iOS's quiet grey (`--bt2`: the system fill over
  the frost) with the page's text colour, so dark words by day and white by night; same icon, corner and weight. Main actions
  stay navy; a lone button is never secondary.
- **No hairline dividers except in chart listings** (the owner's rule): a hairline separator belongs only between rows of a
  chart or list (`.cl`, the Top 10s' columns). Never put one between sections, under a bar, above a header or around a
  toolbar; use space (a steady 16px rhythm) or one shared frost instead. Remove any you come across elsewhere (a button
  group's joins, below, are the one standing exception).
- **Button groups** (`.bgrp`): related secondary actions joined into one bar with hairline dividers and a fine rim, the 9px
  corner on the outside only (Settings' Import | Export | Clear all, the sheet's Mark as watched | Not interested, the Help
  Centre's Yes | No). Use one wherever related actions sit side by side, especially in Settings.
- **The sidebar (computers):** its original shape (full height, against the window's edge, no rounded pane or rim), fixed
  in place; a light frost (milky by day, smoky by night), regular-weight names and plain monochrome icons.
- **My services:** the iOS Subscriptions card: round back button, centred title, Active / Inactive headings, a rounded
  card per service (logo tile, name, grey line, note, chevron) and the all-services switch in its own card.
- **One corner everywhere:** every button, search bar, box, card, panel, sheet and poster uses `--r` (9px) in
  styles.css; never a one-off radius. Only icon-only circles, switches, app-icon logos and hairline-thin bars differ.
- **One frost everywhere:** every box, bar, search box, sheet and popup uses `--fr-bg` (the page colour at 80%) over
  `--fr-blur` (40px blur) with a `--fr-rim` edge, like the My services card; a box inside a frosted one uses the faint
  `--fr-in` tint instead (never glass on glass). Buttons keep their deep tint, a touch see-through, over the same blur.
- **Shows / Films / Both** is a native dropdown (`.dd` with a `<select>`) except where a segmented switch was approved
  (Browse's search bar).
- **The chart numbers never shine:** no rainbow sweep, colour turn (`hue-rotate`) or any other moving effect on the neon
  ranks, on hover or otherwise. It was removed twice because it slowed the site; the glow is drawn once and stays still.
- **Only major features introduce themselves** (the owner's rule, changed in 2.93.0: tips for small updates annoyed people).
  A big new feature or service may call the shared tip once its button or box is on the page; small features, tweaks and
  fixes never get one. `major: true` is required, or nothing shows:
  `tn.tip({ id: 'free-to-watch', major: true, for: '#svcRail [data-svc="free"]', title: 'Free to watch', text: 'What it is and how it works, in a sentence or two.' })`.
  `id` is a new kebab-case name per feature (never reuse one); `for` is a selector or element to point at; `delay` (ms,
  default 1200) is optional. The frosted box (`.ft` in styles.css, `tn.tip` in shell.js) points at the feature, waits until it's
  on screen and the privacy note is away, shows one tip at a time, and is never shown again once seen: kept in
  `tenner-tips` and synced with the account (`tips` in `worker/src/auth.js`). Works inside sheets too. Playwright skips tips
  unless the test sets `window.tnTipsTest = true`.
- **Selected states** get Tenner's rainbow underline, except Browse's collections and search scopes: the owner turned it down
  there (2.121.0), so they get a plain line in the text colour.
- **Popups** look like iOS alerts or sheets: centred glass, blurred backdrop, one clear primary button, tap outside to close.
- **Colour:** premium and restrained. No muddy greens or browns; Apple system colours (blue `#0a84ff`, pink `#ff375f`,
  green `#30d158`, purple `#bf5af2`) and artwork colours, blurred.
- **Type:** one text font everywhere (`--font`: San Francisco on Apple devices, Inter elsewhere), the owner's favourite (the About
  page's lede). The display font (`--font-display`) is only for big headlines, 30px and up. Sentence case for buttons and labels.
- **Nothing off the page:** no element may run past the edge of the screen (check 320, 375, 390, 430, 768, 1100, 1440px).
- **Writing:** plain British English, short and friendly, no jargon.
- **Before shipping anything visual:** screenshot it on phone and computer, light and dark, and look at it critically.

### The Appllama skills (`.claude/skills/`, a second opinion, never the boss)
Two skills from Appllama (MIT, copied from github.com/Appllama/appllama-skills at `dd5caae`, licence kept beside each):
`appllama-app-design-skill` (the bar for native-feeling screens: HIG fidelity, anti-slop counts, navigation, motion,
full state cycles) and `appllama-usage` (research with the paid Appllama MCP; it only applies if that's connected, and
it isn't set up here). They're written for Expo / React Native apps, so translate them to the web: their "simulator
loop" is our Playwright screenshots on phone and computer in both themes, their native controls are Safari's.
**Where they disagree with this file, this file wins.** In particular: buttons keep the owner's solid deep tint with an
icon and white words, never pills or capsules (ignore their "actions are pills"); one 9px `--r` corner everywhere is
Tenner's shape lock; the shared frost on boxes, bars and sheets is Tenner's chosen material, not "glassmorphism slop";
and don't generate stock illustrations: the shows' artwork is the imagery.

### Impeccable, Taste Skill, Emil Kowalski's, Vercel's, Jakub Krehel's, UI UX Pro Max, macOS design and Apple HIG skills (`.claude/skills/`, also a second opinion, never the boss)
- **Impeccable** (`impeccable`, Apache-2.0, pbakaus/impeccable 4.9.2, plus its helper agents in `.claude/agents/`):
  design commands such as `/impeccable critique`, `audit`, `polish`, `typeset`, `animate`, `harden` and `distill`. Its
  engine downloads itself on first use. Its edit-by-edit hooks are deliberately not installed (they'd run after every
  edit in every session); run `/impeccable audit` or `critique` by hand on a page instead.
- **Taste Skill** (`design-taste-frontend`, MIT, Leonxlnx/taste-skill, installed with `npx skills add`, pinned in
  `skills-lock.json`): an anti-slop bar for pages, copy and motion. It's written for company landing pages, so take its
  checks on clarity, copy and craft, not its look: no stock photos, shaders, 3D scenes or its components on Tenner.
- **Emil Kowalski's skills** (emilkowalski/skills, installed with `npx skills add`, pinned in `skills-lock.json`): motion and
  polish craft, e.g. `apple-design`, `animate`, `choreograph`, `gestures`, `mobile-native`, `review-animations`,
  `remove-animations`, `animation-performance`, `break-ui` and `emil-design-eng`. Use their plain CSS / View Transitions
  advice; Tenner has no React, so skip their library picks (Motion, Sonner, Vaul) and the Expo and Swift skills. Motion
  still only runs when Settings → Animations is on and never under Reduce Motion, and the chart numbers never shine.
- **Vercel's agent skills** (vercel-labs/agent-skills): `web-design-guidelines` (a UI and accessibility review against
  Vercel's Web Interface Guidelines) and `writing-guidelines` are the useful ones here; the React, React Native and
  composition skills only apply if Tenner ever uses React. Their deploy and cost skills were left out on purpose:
  Tenner is served by Cloudflare and is never deployed to Vercel. Writing stays plain British English as above.
- **Make interfaces feel better** (`make-interfaces-feel-better`, jakubkrehel): a checklist of small polish details
  (optical alignment, tabular numbers, font smoothing, image outlines, shadows, icon states, motion restraint). Its
  concentric-radius rule (inner corner = outer minus padding) doesn't apply: Tenner keeps one 9px `--r` corner.
- **UI UX Pro Max** (`ui-ux-pro-max`, uipro-cli 2.2.3, `uipro init --ai claude`): a searchable library of styles,
  palettes, font pairings and UX rules (`python3 .claude/skills/ui-ux-pro-max/scripts/search.py`). Use its UX and
  accessibility rules; ignore the styles, palettes and fonts it suggests, since Tenner's look is already set.
- **macOS design** (`macos-design`, ceorkm/macos-design-skill, installed with `npx skills add`): how native Mac apps lay
  out, move and feel (top bar, sidebar, panels, keyboard-first interaction). Take its layout and interaction advice for
  the computer view; its sizes don't apply: Tenner keeps one 9px `--r` corner (not its 4, 8, 10 or 20px), its own
  buttons (no pills), the shared frost and `--font`, and nothing gets a coloured glow. Traffic lights are for desktop
  apps, not a website, so skip that part.
- **Apple HIG reviewer** (`apple-hig`, dickwu/apple-design-skill at `91e1566`, renamed from `apple-design` so it doesn't
  clash with Emil Kowalski's skill of that name): 123 pages of Apple's Human Interface Guidelines plus a review checklist.
  The best source here for checking a page against the HIG; its "distinctive design" directions (palettes, type
  pairings, zero-radius looks) don't apply, since Tenner's look is set.
- **The same rule applies: this file wins.** Ignore any default they suggest for corners, buttons, glass, fonts,
  colour or layout that differs from Tenner's house style above (one 9px `--r` corner, solid deep tinted buttons with an
  icon and white words, the shared frost, Apple system colours, `--font`). If a detector flags `backdrop-filter`,
  glass or the shared frost as slop, it's a false alarm here.

## How we work
- Merge and push without asking. Always `git pull --rebase` first (the site is also edited from another device).
- **One version and one Update centre entry a day, at 19:30 UK time (the owner's rule).** Changes still go live as
  they're merged, as always; only the version number and the Update centre wait. At 19:30 the daily release
  (`release.yml`) bumps the version once and adds one entry covering everything since the last release (it marks each
  one with a `release-YYYY-MM-DD` tag). So **never bump the version or write `site/updates.json` yourself**. Run it by
  hand from the Actions tab only if the owner asks for a release straight away.
- **How to write commits for the release notes:** a major new feature gets the subject `Feature: <short title>` and
  `- ` lines in the body for what's genuinely new; everything else (fixes, tweaks, small changes) gets a plain subject
  and is never spelled out. A day with a feature is a minor version, otherwise a patch.
- The Update centre (`updates.html`, opened from the "Tenner X.Y.Z" at the foot of the menu, a link, and the build number
  on About and Settings) lists every release from `site/updates.json`. Every release shows "Bug fixes and improvements",
  "Stability improvements" and "Speed and reliability improvements" (added by `updates.js`, so never write them anywhere),
  with that day's major features above them. Notes never mention Apple, Apple's design or any other company's look:
  say what changed for the viewer. To polish an entry, edit it in `site/updates.json` (entries are never overwritten).
  The history was last reset on 17 Nov 2026, so the list starts with that evening's release.
- After each update: a quick code check, and remove any code that's no longer used.
- Test what you change (Playwright on phone and computer sizes, both themes); run the worker's auth tests after touching accounts.

## Runs by itself (keep it that way)
- **Hourly** (`update.yml`): charts, Browse, New, cinema and title details rebuilt and deployed; keeps its own schedule alive.
  To spare the APIs: Browse's catalogue is rebuilt every 6 hours, a charted title's details every 3 hours (others daily),
  New once a day, and Watchmode prices are kept a week (at most five new lookups a run). Keep new data on the same footing.
  The site is served by Cloudflare (`site-worker/`: the `site/` folder as static files on the `tenner-site` Worker at
  tenner.stream, and `tenner-www` sending www.tenner.stream on to it), not GitHub Pages, since the old GitHub account was lost.
  GitHub skips many scheduled runs, so it's asked three times an hour and a try that finds the live chart under 40 minutes
  old stops at once (pushes and runs by hand always build). Only the deploy job queues (on `site`), so a spare try never
  takes a waiting push's place. tenner.stream is behind Cloudflare's bot check, which turns away automated requests
  (people and link previews get through), so the jobs, the watchdog and the alerts Worker read the live data from
  `tenner-site.danseacroft.workers.dev`, never tenner.stream. Links say `about.html`: `site-worker/index.js` serves those
  straight away (Cloudflare would otherwise redirect them); `site/_headers` sets how long browsers keep files, and
  `site/404.html` sends a gone title page (`/t/<key>/`) to `/?t=<key>`.
  It also writes a small page per title (`site/t/<key>/`, not in git) whose tags give shared links that title's artwork and
  name; the sheet's Share uses it, and it sends people on to `/?t=<key>`.
- **Minified on the way out:** the build shrinks the site's scripts and styles with esbuild just before it deploys (not
  `sw.js` or `qrcode.js`); the files in git stay readable, and if it fails the readable copies go live instead. So never
  read the live JS for a value (the watchdog takes the version from the homepage's `shell.js?v=`).
- **On every push**: the site (`update.yml`), the search/accounts Worker (`api.yml`) and Tenner TV (`tv.yml`) deploy themselves.
  Tenner TV runs `node tv/test.mjs` first; a failing test stops the deploy, so what's live keeps working.
- **Tenner TV** (`tv/`, tv.tenner.stream): listings from the open Freeview EPG feed, plus the most popular Sky channels
  from Sky's own public guide (`awk.epgsky.com`; channels in `tv/channels.json` with `sky` / `match`, live Sky copy kept if it's down), built every 3 hours by
  `scripts/fetch-tv.mjs` into compact day files (only the fields a programme has; Sky pictures as just their id), TVmaze
  only for a day the feed doesn't cover, and the last good copy served if a source is down. Its own logos in `tv/public/logos`
  (sized for where they're shown). A service worker (`tv/public/sw.js`) keeps the page on the device: it opens instantly
  and works offline. Bump its `?v=` with every Tenner TV update (sed over `tv/public/index.html tv/public/sw.js`).
  Signing in on Tenner TV goes through tenner.stream (`account.html?to=tv`), which asks the Worker for a session of its own
  (`/me/handoff`) and sends you back with it in the address (`#signin=`); the TV's pins and reminders are kept in the
  account's data as `tv` (merged in `auth.js`, untouched by tenner.stream's syncs), and the Watchlist feeds its shelf.
- **Alerts and the Sunday email** (the search/accounts Worker's hourly cron): Watchlist alerts for arrivals each hour; from
  9am UK time a morning pass for new episodes out today, titles leaving within three days, Watchlist titles on Freeview
  later that day and ones that got cheaper to rent or buy (`push.js`); on Sunday mornings
  the opt-in Sunday email through Resend, with a signed unsubscribe link (`digest.js`).
- **On TV this week**: `scripts/fetch-tv.mjs` also writes `onair.json` (title → next showings); tenner.stream's title sheet
  reads it from tenner-tv's workers.dev address at `/api/onair` (the Worker adds the cross-site header; a file in `public/` is served without the Worker running), and the line opens Tenner TV's search with `?q=`.
- **Watchdog** (`watchdog.yml`, hourly): checks the site, the charts' age, the search service and Tenner TV; re-runs
  whatever's behind, re-checks after 7 minutes, and only then fails (GitHub emails the owner). It also checks that titles' own links
  (Netflix, Disney+, Prime Video, HBO Max and Apple TV, found on Wikidata by TMDB or IMDb ID) are still being looked up, checks the Watch live
  links still open, and fails a fortnight before tenner.stream's registration runs out (from its public RDAP record).
  `tv.yml` likewise fails a fortnight before the Cloudflare token's end date, if it has one. tv.tenner.stream is behind Cloudflare's bot check, so it checks Tenner TV at its workers.dev address.
- Anything new should follow the same pattern: no step that needs a person, a fallback when a source is down, and a check
  in the watchdog.

## Security
- Never post API keys or tokens in chat.
- The owner's personal email address must never appear on the site or in the code.
- Secrets live in GitHub Secrets only: TMDB_TOKEN, WATCHMODE_API_KEY, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID,
  RESEND_API_KEY. Public IDs (the Google client ID) are fine in code.
- Escape every outside value before it goes into HTML (`esc`). Email links point at https://tenner.stream only.
- Keep third-party GitHub Actions pinned to exact commits.
