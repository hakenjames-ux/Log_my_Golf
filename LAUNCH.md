# Log My Golf — Launch Guide

Everything needed to take logmygolf.com from "live website" to **public launch** and **App Store / Play Store**. Items marked ✅ are done in this repo; ⬜ are actions only you can take.

---

## 1. What's already been set up

| ✅ | Item | Files |
|----|------|-------|
| ✅ | Proper app icon set (favicon, Apple touch, PWA 192/512, maskable) | `assets/icon-master.svg`, `icons/`, `assets/gen-icons.mjs` |
| ✅ | Updated PWA manifest (name, icons, categories, maskable) | `manifest.json` |
| ✅ | SEO + social meta (description, canonical, Open Graph, Twitter card) | `index.html` `<head>` |
| ✅ | Social share image (1200×630) | `icons/og-image.png`, `assets/og-master.svg` |
| ✅ | Service worker (installable + offline app shell) | `sw.js` + registration in `index.html` |
| ✅ | Privacy Policy + Terms pages | `privacy.html`, `terms.html` |
| ✅ | Legal links on auth screen + profile | `index.html` |
| ✅ | Real account deletion (edge function, deletes data + auth user) | `supabase/functions/delete-account/`, `deleteAccount()` |
| ✅ | Security hardening migration | `supabase/migrations/20260629_security_hardening.sql` |
| ✅ | Capacitor config + build pipeline | `capacitor.config.ts`, `scripts/build.mjs`, `package.json` |

To regenerate icons after editing the SVG: `npm run icons`

---

## 2. Before going public — your action items

### 2a. Deploy the account-deletion function ⬜
```bash
# one-time
npm i -g supabase
supabase login
supabase link --project-ref xnfudoypksanbbfliuab

# deploy
supabase functions deploy delete-account
```
The function uses the service role to fully erase a user. `verify_jwt` stays ON so only a signed-in user can delete their own account. Test it with a throwaway account.

### 2b. Apply the security migration ⬜
```bash
supabase db push
```
Then in the **dashboard**: Authentication → enable **Leaked password protection**.

### 2c. Fill in the legal placeholders ⬜
In `privacy.html` and `terms.html`, replace `[Your name / company]`, `[address]`, `[your jurisdiction]`. Set up a real **support@logmygolf.com** inbox. Have both reviewed for your jurisdiction (UK/EU GDPR especially).

### 2d. Activate error monitoring ⬜ (strongly recommended)
Sentry is **already wired into `index.html`** (SDK + init + user tagging) — it just stays dormant until you add a DSN:
1. Create a free project at [sentry.io](https://sentry.io) → platform **Browser/JavaScript**.
2. Copy the project's **DSN**.
3. In `index.html`, find `var SENTRY_DSN = ''` and paste your DSN between the quotes.
That's it — errors and unhandled promise rejections will report automatically, tagged with the user's id and whether it's production vs preview.

### 2e. Tidy the database ⬜ (optional)
Your Supabase project also holds tables from another app (`companies`, `incomes`, `outgoings`, `favourite_outgoings`). Consider moving those to a separate project so GolfTracker only contains golf data.

---

## 3. App Store + Play Store path (Capacitor)

You don't rewrite anything — Capacitor wraps the existing site into native apps.

### One-time setup ⬜
```bash
npm install                      # installs Capacitor (already in package.json)
npm run build                    # bundles the web app into dist/
npx cap add ios                  # needs a Mac + Xcode
npx cap add android              # needs Android Studio
```

### Each time you change the web app ⬜
```bash
npm run cap:ios       # build + sync + open Xcode
npm run cap:android   # build + sync + open Android Studio
```

### App icons for native ⬜
Use `icons/icon-1024.png` as the master. Easiest: `npm i -D @capacitor/assets` then
`npx capacitor-assets generate --iconBackgroundColor '#1f6e40'` — generates every iOS/Android icon + splash from the 1024 master.

### Store accounts & assets you'll need ⬜
- **Apple Developer Program** — $99/year. Required to ship to the App Store.
- **Google Play Developer** — $25 one-time.
- App screenshots (multiple device sizes — Xcode simulator / Android emulator).
- Store listing copy (you can reuse the meta description).
- **Privacy policy URL** → `https://logmygolf.com/privacy.html` (both stores require it).
- Apple **App Privacy** questionnaire — declare: email (account), user content, identifiers.
- **Account deletion** — both stores now require it; ✅ already built (§2a).

### Apple review gotchas to pre-empt
- Pure "website in a webview" can get rejected (Guideline 4.2). The bundled-`dist` default (not the live-URL `server.url`) plus native feel (your bottom-sheet modals, pull-to-refresh — already done) helps a lot.
- Make sure Sign in works on a clean device and account deletion is reachable in-app (it is: Profile → Danger Zone).

---

## 4. Recommended launch order

1. Deploy delete-account fn + run migration + enable leaked-password protection (§2a–b)
2. Fill legal placeholders + support email (§2c)
3. Add Sentry (§2d)
4. Push to Vercel, verify PWA installs on a real phone (Add to Home Screen → icon shows)
5. Soft launch publicly (share the URL) — gather feedback for a few weeks
6. Capacitor → TestFlight (iOS) + internal testing (Android)
7. Submit to stores

---

## 5. Higher-impact product ideas (post-launch)

- **Onboarding** flow for first-time public users.
- **Privacy-friendly analytics** (Plausible/Umami) to see what's actually used.
- **Self-host / pin the CDN deps** (Supabase JS, Chart.js, fonts) — today an outage at jsdelivr/cdnjs blanks the app.
- **Split the 5,400-line `index.html`** into modules once you're iterating fast with others.
- **Push notifications** (Capacitor supports them) for challenges, follows, society events.
