# Tenner for iPhone

A native SwiftUI app for Tenner. It reads the same data as tenner.stream (the hourly charts, the Browse catalogue and
the search service), so it's always as up to date as the site. It never changes the website.

## What's in it

- **Home** opens on the Top 10s, like the phone site: the services' logos, Shows / Films, and a column per service
  you swipe between. Then the season's favourites (Christmas right now) and what's trending in the UK.
- **Browse**: the whole catalogue by service, Shows / Films / Both and genre, plus search across every film and show
  (the same forgiving search as the site).
- **Watchlist**: tap Add to Watchlist on any title. Swipe a row to remove it. For now it's kept on the iPhone.
- **Title sheet**: the artwork melting into the page, the main facts, Add to Watchlist, Share, Trailer, and where to
  watch in the UK (stream, free, rent, buy).
- **Settings**: Day, Night or Auto, **changed with Waves** (the old look ripples away in rings from where you tapped,
  drawn by a Metal shader on the iPhone's graphics chip), Animations on or off, My services, and clearing the Watchlist.
- Tenner's house style throughout: one 9px corner, the shared frost, deep navy buttons with an icon and white words,
  circles for icon-only buttons, headings with the last word in the pink gradient, and still neon chart numbers.
  Dark Mode, Reduce Motion, Reduce Transparency, larger text and VoiceOver are all respected.

## Run it on your iPhone (about ten minutes the first time)

You need a Mac with **Xcode** (free from the Mac App Store, version 16 or later) and your iPhone on iOS 17 or later.
A free Apple ID is enough to put it on your own phone; the paid Apple Developer Program (£79 a year) is only needed
for TestFlight or the App Store.

1. **Get the code.** In Terminal: `git clone https://github.com/danxharvard/tenner.git` (or `git pull` in your copy).
2. **Open it.** Double-click `tenner/ios/Tenner.xcodeproj`. Xcode opens the project.
3. **Sign it.** In Xcode's left column click **Tenner** (the blue icon), then the **Signing & Capabilities** tab.
   Under **Team** choose your name (if it's not there: **Add an Account…** and sign in with your Apple ID).
   If Xcode says the bundle identifier is taken, change `stream.tenner.app` to something of your own, such as
   `stream.tenner.dan`.
4. **Plug in your iPhone** with a cable and unlock it. Tap **Trust** if it asks. The first time, the iPhone asks you to
   turn on **Developer Mode** (Settings → Privacy & Security → Developer Mode), then restarts.
5. **Run it.** At the top of Xcode pick your iPhone from the device list, then press the **▶︎ Run** button (or ⌘R).
   The first build takes a minute or two.
6. **Trust yourself as the developer** (first time only): on the iPhone open Settings → General → VPN & Device
   Management, tap your Apple ID and **Trust**. Then open Tenner from the Home Screen.

To try it without a phone, pick any iPhone simulator in step 5 instead.

With a free Apple ID the app keeps working for 7 days; just press Run again to renew it. With the paid programme
it's a year, and you can send it to TestFlight from **Product → Archive**.

## How it's built

- `Tenner.xcodeproj`: the project. It picks up every file in `Tenner/` by itself, so new files need no project edits.
- `Tenner/TennerApp.swift`: the app and its four tabs.
- `Tenner/Store.swift`: where the data comes from (`tenner-site…workers.dev/data/…` and `tenner-api…workers.dev`),
  the Watchlist and the settings, all kept on the phone. The last charts are kept too, so it opens instantly and
  works offline.
- `Tenner/Design.swift`: the house style (corner, frost, buttons, headings, ranks, the one list design).
- `Tenner/Waves.swift` and `Tenner/Waves.metal`: the Waves transition.
- `Tenner/HomeView.swift`, `BrowseView.swift`, `WatchlistView.swift`, `SettingsView.swift`, `TitleSheet.swift`: the screens.

GitHub builds the app on a Mac on every change to this folder (`.github/workflows/ios.yml`) and takes screenshots in
the simulator, by day and by night; they're under the run's **Artifacts**.

## Next steps

- Sign in with your Tenner account, so the Watchlist matches tenner.stream.
- Watchlist alerts as real iPhone notifications.
- New This Week, Cast & Crew and Tenner TV.
- An App Store listing and TestFlight.
