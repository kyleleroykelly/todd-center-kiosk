# Todd Center Kiosk changelog

Versions use MAJOR.MINOR.PATCH. The current version shows in the kiosk footer and in `KIOSK_VERSION` in `index.html`.

- **MAJOR**: a new section of the kiosk or a change in where its data comes from
- **MINOR**: a new feature or screen within an existing section
- **PATCH**: fixes and small display changes

When you release a change, update `KIOSK_VERSION`, add an entry here, and start the commit message with the version, for example `v2.0.1: fix room for Financial Aid`.

## v2.11.0 (2026-11-10)
- Welcome screen redesign: smaller video at the top left with a "Touch here to search people or places" button under it; Today's events on the right above the Berrien Talent Collaborative box, with the space request QR code and a See upcoming events button
- Welcome screen button in the footer returns to the welcome screen
- Today's events fall back to the nightly upcoming events data when the half-hourly update is late

## v2.10.0 (2026-11-03)
- The Berrien Talent Collaborative pop-up has an Open website button next to Close; the site opens in a new tab, which the kiosk closes after 5 minutes (`minutes` in `PARTNER`, `data.js`)

## v2.9.1 (2026-11-03)
- Fixed: the kiosk always loads a fresh `data.js`, so new settings (like the partner button) show up right away instead of after the browser's saved copy expires

## v2.9.0 (2026-11-03)
- Start screen redesign: "Welcome to the Todd Center" banner across the top with the clock, a larger video on the left, and the start button on the right
- Berrien Talent Collaborative button on the start screen; touching it shows a QR code for berrientalent.org (`PARTNER` in `data.js`, logo in `media/`)
- Fixed: touching the start screen no longer also touches the home screen button underneath it

## v2.8.0 (2026-10-15)
- Full screen by default: the kiosk hides the browser bars on the first touch, and again after a reload (`KIOSK_FULLSCREEN` in `data.js`)
- Web app manifest and icons, so the kiosk can be added to the board's home screen and open full screen

## v2.7.0 (2026-10-15)
- Programs video on the right side of the start screen (`media/`, set by `ATTRACT_VIDEO` in `data.js`), muted, with a pause button; it plays only while the start screen is showing
- Touching the video shows a QR code for the Contact Us page (`VIDEO_LINK` in `data.js`); touching anywhere else starts the kiosk as before

## v2.6.0 (2026-10-15)
- Directions to other buildings: `BUILDING_DIRECTIONS` in `data.js` holds directions from the Todd Center and a phone link for each building, shown with a QR code on people, offices, and the building map
- Welch Center added as the first building
- QR codes are made on the kiosk itself (`lib/qrcode.js`), so changing a link in `data.js` is all it takes

## v2.5.1 (2026-10-15)
- Calendar updates are gentler on the LMC calendar site: a longer pause between requests for the upcoming events run, a longer wait when the site says to slow down, and one room lookup per recurring event instead of one per meeting
- A day the calendar site won't return is skipped (the kiosk shows it as unavailable) instead of failing the whole update

## v2.5.0 (2026-10-15)
- Upcoming events: "See upcoming events" on the home page opens a monthly calendar of Todd Center events; touch a day to see its events, and touch an event with a room to see it on the map
- Upcoming events come from `upcoming.json`, filled nightly by the new GitHub Action `Update upcoming events` (about two months ahead)
- Search buttons on Programs and Elsewhere on campus
- All four home tiles are navy with a red top stripe

## v2.4.0 (2026-10-15)
- Search people button on Find a person and Search offices & rooms button on Offices & rooms, each searching only its own section (Todd Center first, with the All of LMC switch)
- Smaller home tiles; the events panel is wider

## v2.3.1 (2026-10-15)
- Shorter header, so more of each screen is content
- Always shown in light mode, even if the board's system setting is dark
- Overpass font kept in `fonts/` instead of loading from Google Fonts

## v2.3.0 (2026-10-15)
- Search bar removed from the home page; the tiles fill the space
- When there are no more Todd Center events today, the events panel invites visitors to request a space, with a QR code to lakemichigancollege.edu/community/space-use (`qr-space-use.svg`)

## v2.2.0 (2026-10-15)
- Search shows only the Todd Center by default, with a Todd Center / All of LMC switch and a button to show matches elsewhere at LMC

## v2.1.0 (2026-10-15)
- Find a person opens with Todd Center faculty and staff, with a Todd Center / All of LMC switch and a "Show everyone at LMC" button at the end of the list
- Search puts people in the Todd Center first, and last-name matches above first-name matches
- Search shows how many matches there are, and fits more results above the keyboard

## v2.0.0 (2026-10-15)
- Find a person lists everyone in the LMC directory, Benton Harbor first, with other campuses labeled and an A to Z bar
- Directory refreshes nightly from the LMC website (`directory.json`, GitHub Action `Update directory`)
- Corrections lists in `data.js`: DIRECTORY_REMOVE, DIRECTORY_FIX, DIRECTORY_ADD, PROGRAM_TAGS
- Siena Heights University removed
- Elsewhere on campus comes from the directory's office listings
- Floor maps added for the Main Building, Hanson Technology Center, Welch Center, and South Haven Campus, with zoom
- Rooms not marked on a floor plan show an orange pin for their wing and floor
- Building picker on the Building map screen
- Version shown in the footer

## v1.2.0 (2026-10-14)
- Today's events come from the LMC calendar, Todd Center rooms only (`events.json`, GitHub Action `Update Todd Center events`)
- Home page tiles resize to the screen so text never overlaps

## v1.1.0 (2026-10-14)
- Today's events panel on the home page
- Directory split into `data.js`; automatic reload when the site changes

## v1.0.0 (2026-10-14)
- First release: Todd Center directory, search with on-screen keyboard, floor maps with You are here, full-screen map, start screen
