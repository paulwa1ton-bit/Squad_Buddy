# Squad Buddy

A grassroots football companion app for managers (U7-U16) and parents: squad & stats
management, custom/preset formations, live match-day tracking with an equitable
game-time substitution recommender, an FA/Laws-of-the-Game reference library, and
parent registration + match-invite push notifications.

## 1. Install prerequisites (one-time)

This machine doesn't have Node.js installed. Install it first:

- Download the LTS installer from https://nodejs.org (v20 LTS recommended) and run it.
- Restart your terminal, then check it worked:

```bash
node --version
npm --version
```

You'll also want the Expo Go app on your phone (iOS App Store / Google Play) for the
fastest way to preview the app during development.

## 2. Install dependencies

From this folder:

```bash
npm install
npx expo install --fix
```

The second command lets Expo align every native package version to the exact Expo
SDK release, which is worth running any time you see a version-mismatch warning.

## 3. Run it

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS). Press `w` in the
terminal to also try it in a browser (some native-only features like haptics won't
work there).

## 4. Connect Firebase (required for real accounts, data sync and push notifications)

The app is wired end-to-end to Firebase Authentication (email/password) and
Firestore (real-time sync), so a manager's phone and a parent's phone see the same
team, squad, formations, matches and match invites live. You just need to point it
at your own Firebase project:

1. Go to https://console.firebase.google.com and create a project.
2. Add a Web app inside it (even though this is a mobile app, the Firebase JS SDK
   uses the web app config) and copy the config values.
3. Paste them into `app.json` under `expo.extra.firebase`, replacing the
   `REPLACE_ME` placeholders (or set them as EAS secrets for a production build).
4. In the Firebase console, enable **Authentication → Sign-in method → Email/Password**
   and create a **Firestore Database** (start in production mode).
5. Deploy the security rules in `firestore.rules` to that project:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore   # point it at your existing project, keep firestore.rules
   firebase deploy --only firestore:rules
   ```

6. That's it - `lib/firebase.ts` reads the same `app.json` values, and
   `isFirebaseConfigured` flips to `true` once real values are in place.

**How the sync works, if you're picking this up later:**
- `lib/firestore/*Api.ts` are thin typed wrappers around Firestore reads/writes/
  listeners for each collection (`teams`, `teams/{id}/players`, `.../formations`,
  `.../matches`, `parents`, `invites`).
- `store/*.ts` (Zustand) remain the source of truth the UI reads from. Every local
  mutation (add player, record a goal, respond to an invite, ...) also fires a
  Firestore write in the background (see the `upsert*`/`persistMatch` calls at the
  end of each store action).
- `lib/teamSync.ts` and `lib/parentSync.ts` open the `onSnapshot` listeners that
  feed changes *back* into those stores, so a different device's Firestore write
  shows up locally without any polling. `hooks/useBootstrapSync.ts` re-opens those
  listeners on a plain app relaunch (not just at sign-in).
- A manager can run **up to 2 teams** on one login (`app/(onboarding)/team-select.tsx`,
  capped via `MAX_TEAMS_PER_MANAGER` in `lib/firestore/teamsApi.ts`) - useful for a
  volunteer who coaches, say, an U9s and an U14s side. Only one team is "active"
  (synced locally) at a time; switching teams is instant since both are already in
  Firestore, nothing is deleted.
- The security rules in `firestore.rules` are a reasonable MVP starting point
  (managers can only write their own team's data; parents can only write their own
  profile and their own invite responses) but are intentionally permissive on reads
  between signed-in users, since there's no team-membership claim system yet - see
  the comment at the top of that file before a wider rollout.

## 5. Push notifications

Match invites are sent via Expo's push service (`lib/notifications.ts`). Two things
to know:

- **Expo Go can't receive real push tokens for Android from SDK 53 onward** - you'll
  need an EAS development build (`npx eas build --profile development`) to fully
  test push on a physical Android device. iOS works in a custom dev client too, but
  not in plain Expo Go either once you add native config.
- For production, move `sendPushNotification` server-side (e.g. a Firebase Cloud
  Function that runs when a manager sends match invites) rather than calling Expo's
  push API directly from the manager's phone - the code is written so that's a
  drop-in change later.

## 6. Deploying to the app stores

Once you're happy with it:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

`eas submit` then uploads the build to Google Play / App Store Connect. See
https://docs.expo.dev/deploy/submit-to-app-stores/ for the full walkthrough
(you'll need a Google Play developer account and/or an Apple Developer account).

## Project structure

```
app/                      expo-router screens (file-based routing)
  (onboarding)/            role select, manager/parent auth, team setup & switcher,
                           link child
  (tabs)/                  Home, Squad, Matches, Guidelines, More - tab navigator
  match/[id]/              per-match setup, live tracking, summary
  player/[id].tsx          player profile & season stats
  formation-builder.tsx    drag-and-drop custom formation editor
components/PitchView.tsx  reusable pitch/lineup visual
store/                    Zustand stores (auth, team, match, parent) - the UI's
                           source of truth; each mutation also writes through to
                           Firestore (see lib/firestore/)
hooks/useBootstrapSync.ts Re-opens Firestore listeners after a plain app relaunch
lib/
  firebase.ts              Firebase app/auth/Firestore init
  auth.ts                  Email/password sign-up, log-in, sign-out
  firestore/*Api.ts        Typed Firestore CRUD + onSnapshot per collection
  teamSync.ts              Wires team/players/formations/matches listeners into
                           the stores; also follows linked parents for managers
  parentSync.ts            Wires a parent's own profile + invites listeners
  matchClock.ts            Live match-clock math
  substitutionRecommender.ts  Equitable-game-time substitution scoring
  notifications.ts, haptics.ts  Push notifications, substitution alert buzz
data/                     Verified FA age-group guidelines & Laws of the Game
                           reference content (with sources), formation presets
types/models.ts           Shared TypeScript data model for the whole app
firestore.rules           Security rules matching the access pattern above
```

## Reference data sources

FA grassroots format/duration guidance and the 2025/26 Laws of the Game changes
embedded in `data/faGuidelines.ts` and `data/refereeGuidelines.ts` were checked
against thefa.com, theifab.com and county FA publications in September 2026 -
see the "source" link on each entry inside the in-app Guidelines tab. Leagues can
vary squad sizes and match rules, so treat these as a helpful default, not a
replacement for your own league handbook.
