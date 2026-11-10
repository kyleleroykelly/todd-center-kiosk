# Todd Center Kiosk

Touch-screen directory and wayfinding kiosk for the Todd Center at Lake Michigan College, built for a Clevertouch display.

This is Kyle Kelly's working copy, forked from [jmbenak-lmc/todd-center-kiosk](https://github.com/jmbenak-lmc/todd-center-kiosk).

| Site | Address | Built from |
|---|---|---|
| This copy | https://kyleleroykelly.github.io/todd-center-kiosk/ | `kyle_dev` branch of this repository (for testing) |
| Original | https://jmbenak-lmc.github.io/todd-center-kiosk/ | `main` branch of jmbenak-lmc/todd-center-kiosk |

## Branches

- `kyle_dev`: day-to-day work, and what this copy's site shows while it is being tested. Every push here updates the site within a few minutes.
- `main`: the finished version. Merge `kyle_dev` into `main` (with a pull request) when it is ready.

The scheduled update Actions only run on the repository's **default branch** and save fresh `directory.json` and `events.json` there. While the site is built from `kyle_dev`, make `kyle_dev` the default branch (**Settings > General > Default branch**) so its data stays current. Switch the default back to `main`, and Pages to `main`, once you merge.

## Setting up the live site (one time)

1. **Turn on GitHub Pages.** In this repository go to **Settings > Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick the branch to show (`kyle_dev` while testing, `main` after) and **/ (root)**, and click **Save**. The site is live at the address above within a few minutes.
2. **Turn on the Actions.** GitHub pauses scheduled Actions in a fork. Open the **Actions** tab and click **I understand my workflows, go ahead and enable them**. Then open **Update directory** and **Update Todd Center events** and click **Enable workflow** on each if asked. Use **Run workflow** once on each to get fresh data right away.
3. **Check the Action permissions.** In **Settings > Actions > General**, under **Workflow permissions**, choose **Read and write permissions** so the Actions can save the data files.

Current version: see `CHANGELOG.md` (also shown in the kiosk footer).

## Files

| File | What it is | Edit it? |
|---|---|---|
| `data.js` | Corrections to the directory, program tags, Todd Center rooms and directions, kiosk settings | Yes, this is the file you update |
| `index.html` | The kiosk app (holds `KIOSK_VERSION`) | Only for design or feature changes |
| `CHANGELOG.md` | Version history | Add an entry with every release |
| `directory.json` | People and offices from the LMC website | No, updated nightly by the `Update directory` Action |
| `events.json` | Today's Todd Center events from the LMC calendar | No, updated every 30 minutes by the `Update Todd Center events` Action |
| `upcoming.json` | Todd Center events for about the next two months, for the Upcoming events calendar | No, updated nightly by the `Update upcoming events` Action |
| `maps/` | Floor plans and room positions for the Main Building, Hanson, Welch, and South Haven | Only if building plans change |
| `fonts/` | The Overpass font (SIL Open Font License, see `fonts/OFL.txt`) | No |
| `manifest.webmanifest`, `icons/` | Lets the kiosk be added to the board's home screen as a full-screen app | No |
| `media/` | The start screen video (`ATTRACT_VIDEO` in `data.js`) and the partner logo (`PARTNER`) | To change the video, upload one with a new file name and update `data.js` |
| `lib/qrcode.js` | QR code maker used for the directions codes (MIT license, by Kazuhiko Arase) | No |
| `qr-space-use.svg` | QR code for the space request page, shown when there are no events | Only if the link changes (make a new QR code with the same file name) |
| `floor-ground.jpg`, `floor-second.jpg` | Todd Center floor plans (the `-turned` copies are the same plans turned 90 degrees right, used when `TODD_MAP_TURNED` is on) | Only if building plans change |
| `scripts/` | The scripts the Actions run | Only if the LMC website changes |

## Fixing the directory

The kiosk shows what the LMC website directory says. To correct something without waiting for the website, edit `data.js`:

- `DIRECTORY_REMOVE`: names to hide
- `DIRECTORY_FIX`: change a room, building, title, phone, or email for one name
- `DIRECTORY_ADD`: people or offices missing from the directory
- `PROGRAM_TAGS`: who appears under each program on the Programs screen
- `BUILDING_DIRECTIONS`: directions from the Todd Center to another building, and a phone link shown as a QR code

Quick corrections can go straight to the branch the site is built from, so they show up right away: switch to that branch, click the pencil icon on `data.js`, make the change, and commit. The kiosk picks it up within about 15 minutes, the next time nobody is using it. If an edit has a typo, the kiosk shows a message instead of the directory: open `data.js`, click **History**, and revert the last change.

## Versions

Versions use MAJOR.MINOR.PATCH. For each release, update `KIOSK_VERSION` in `index.html`, add an entry to `CHANGELOG.md`, and start the commit message with the version, for example `v2.0.1: fix room for Financial Aid`. File names on the site stay the same so the kiosk address never changes.
