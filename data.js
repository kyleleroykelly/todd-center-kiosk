/* =========================================================
   TODD CENTER KIOSK DATA
   Edit this file to update the kiosk. The board picks up
   changes automatically within about 15 minutes, the next
   time nobody is using it.

   Tips:
   - Each entry sits between { and }, followed by a comma.
   - Lines starting with // are notes and are ignored.
   - Keep the quotation marks around every value.
   - room: "" means no office is listed.
   ========================================================= */

/* ---------- Today's events ----------
   Events come from the LMC calendar automatically (Todd Center rooms only).
   Leave this empty. Only paste a Google Sheet CSV link here to use a sheet instead. */
const EVENTS_CSV_URL = "";
const EVENTS_REFRESH_MINUTES = 5;

const IDLE_SECONDS = 90;
/* true: the kiosk goes full screen (no browser bars) the first time someone touches it,
   and again after any reload. Set to false when testing on a laptop. */
const KIOSK_FULLSCREEN = true;
const HELP_DESK = "TC-1215";

/* ---------- Directory ----------
   People and offices come from the LMC website directory automatically
   (directory.json, refreshed nightly). Use the lists below to correct it. */

/* Entries to hide from the kiosk, by name exactly as the directory shows it. */
const DIRECTORY_REMOVE = [
  "Siena Heights University"            // no longer has an office at LMC
];

/* Corrections that override the directory. Use the directory name as the key and
   give only the fields to change: room, building, campus, title, phone, email. */
const DIRECTORY_FIX = {
  "Hawks Nest Cafe": {room: "A-200"}    // from the Main Building floor plan (Hawks Nest, A200)
};

/* People or offices that are missing from the directory. Example:
   {name:"Jane Doe", title:"Faculty, Business", campus:"Benton Harbor Campus", building:"Todd Center", room:"TC-2210", email:"", phone:""} */
const DIRECTORY_ADD = [
];

/* Program tags for the Programs button, by directory name. */
const PROGRAM_TAGS = {
  "Lisa Augustyniak": ["Business"],
  "William Baker": ["Criminal Justice"],
  "James Benak": ["CIS"],
  "Mary Britenfeld": ["Business"],
  "Kristina Broughton": ["Business"],
  "Tamesha Brown": ["Criminal Justice"],
  "Brad Byerle": ["Business","CIS","Criminal Justice"],
  "Randall James": ["CIS"],
  "Jeffrey Johnson": ["Criminal Justice"],
  "Kyle Kelly": ["CIS","Esports"],
  "Kristi Lafrenz": ["Business"],
  "Danny Langston": ["Business"],
  "Lynn Lehman": ["Business"],
  "Anthony Pastrick": ["Business"],
  "John Phillips": ["Esports"],
  "Robert Quigley": ["CIS"],
  "Kristopher Rich": ["Business"],
  "Mark Ridgeway": ["CIS"],
  "Ryan Soper": ["Criminal Justice"],
  "Lynn Tuori": ["Business"],
  "Joe Zwiller": ["Business"]
};

const PROGRAMS = ["Business","CIS","Criminal Justice","Esports"];
const PROGRAM_LABEL = {"Business":"Business","CIS":"Computer Information Systems","Criminal Justice":"Criminal Justice & Police Academy","Esports":"Esports"};

/* ---------- Start screen video ----------
   Plays muted on the right side of the start screen. Upload a new video to the
   media folder with a NEW file name and change it here, so the kiosk does not keep
   playing an old saved copy. Touching the video shows a QR code for VIDEO_LINK. */
const ATTRACT_VIDEO = "media/LMC_CWE_Programs_Display_1080p_v2.mp4";
const VIDEO_LINK = "https://www.lakemichigancollege.edu/contact-us";
const VIDEO_LINK_TITLE = "Questions about our programs?";

/* Partner box on the welcome screen: logo, text, and a QR code for url.
   Set to null to remove it. */
const PARTNER = {
  name: "Berrien Talent Collaborative",
  logo: "media/berrien-talent-collaborative.png",
  text: "Visit the Berrien Talent Collaborative online.",
  url: "https://berrientalent.org/"
};

/* ---------- Directions to other buildings ----------
   Shown for people, offices, and maps in that building.
   text:  how to get there from the Todd Center
   phone: a link that opens directions on a phone, shown as a QR code
   Building names: main, hanson, welch, mendel, beckwith, southhaven, niles */
const BUILDING_DIRECTIONS = {
  welch: {
    text: "The Welch Center for Wine & Viticulture is a separate building at 2774 E Empire Ave, north of the Todd Center.",
    phone: "https://www.google.com/maps/dir/?api=1&destination=Lake+Michigan+College+Welch+Center+for+Wine+%26+Viticulture%2C+2774+E+Empire+Ave%2C+Benton+Harbor%2C+MI+49022"
  }
};

/* ---------------------------------------------------------
   BUILDING MAP DATA
   Positions are percentages of the floor plan page, taken
   from the Todd Center emergency plan. YOU_ARE_HERE marks the
   kiosk; move it if the board is not in the main lobby.
   --------------------------------------------------------- */
const YOU_ARE_HERE = {floor:1, x:77.3, y:44.0, label:"You are here"};
const PLAN_CROP = {x0:2, x1:99, y0:2.5, y1:84};
/* true: show the Todd Center plans turned 90 degrees to the right, to match the way
   people face the board. Positions above stay as measured on the printed plan. */
const TODD_MAP_TURNED = true;
const FLOOR_NAME = {1:"Ground floor", 2:"Second floor"};

const AREA = {
  geSE:"Southeast of the lobby. Walk past the Clerical desk (1201) and continue down Hall 1200.",
  geW:"West wing. Walk through the Student Commons (1101) to Corridor 1300.",
  geN:"North wing. Take the hallway north of the lobby, past the elevator.",
  s2SE:"Southeast office suite. Enter at the Waiting area (2205) and continue down Hall 2200.",
  s2S:"South end of the office suite, past the Workroom (2213).",
  s2W:"West wing, along Corridor 2300.",
  s2C:"South of the lobby, off Corridor 2100.",
  s2N:"North wing. Take the hallway north of the second-floor lobby.",
  s2L:"In the second-floor lobby, around the open stairwell."
};

const ROOMS = {
  "1201":{floor:1,x:82.0,y:50.8,area:"Just southeast of the lobby."},
  "1204":{floor:1,x:90.8,y:58.8,area:AREA.geSE},
  "1212":{floor:1,x:83.3,y:75.8,area:AREA.geSE},
  "1215":{floor:1,x:81.5,y:70.0,area:AREA.geSE},
  "1101":{floor:1,x:62.3,y:59.2,area:"Southwest of the lobby."},
  "1301":{floor:1,x:69.5,y:75.4,area:"South of the Student Commons (1101)."},
  "1303":{floor:1,x:52.9,y:76.1,area:AREA.geW},
  "1304":{floor:1,x:42.0,y:60.8,area:AREA.geW},
  "1306":{floor:1,x:29.4,y:62.6,area:AREA.geW},
  "1308":{floor:1,x:16.0,y:61.0,area:AREA.geW},
  "1309":{floor:1,x:20.1,y:77.8,area:AREA.geW},
  "1405":{floor:1,x:65.4,y:28.7,area:AREA.geN},
  "1413":{floor:1,x:65.7,y:14.3,area:AREA.geN},
  "REST1":{floor:1,x:85.0,y:24.3,area:AREA.geN},
  "ELEV1":{floor:1,x:81.5,y:37.9,area:"Northeast side of the lobby."},
  "2002":{floor:2,x:86.7,y:43.6,area:AREA.s2L},
  "2003":{floor:2,x:63.9,y:43.6,area:AREA.s2L},
  "2107":{floor:2,x:59.3,y:64.7,area:AREA.s2C},
  "2202":{floor:2,x:80.8,y:50.2,area:"Just southeast of the second-floor lobby."},
  "2204":{floor:2,x:85.7,y:52.1,area:AREA.s2SE},
  "2206":{floor:2,x:90.9,y:54.7,area:AREA.s2SE},
  "2208":{floor:2,x:90.4,y:56.9,area:AREA.s2SE},
  "2210":{floor:2,x:90.3,y:60.4,area:AREA.s2SE},
  "2211":{floor:2,x:80.2,y:64.7,area:AREA.s2SE},
  "2212":{floor:2,x:90.2,y:64.0,area:AREA.s2SE},
  "2214":{floor:2,x:90.2,y:67.0,area:AREA.s2SE},
  "2216":{floor:2,x:90.7,y:71.0,area:AREA.s2SE},
  "2301":{floor:2,x:76.8,y:74.8,area:AREA.s2S},
  "2303":{floor:2,x:64.8,y:72.8,area:AREA.s2W},
  "2304":{floor:2,x:40.4,y:64.7,area:AREA.s2W},
  "2305":{floor:2,x:50.3,y:73.2,area:AREA.s2W},
  "2306":{floor:2,x:25.9,y:66.2,area:AREA.s2W},
  "2308":{floor:2,x:12.3,y:65.1,area:AREA.s2W},
  "2309":{floor:2,x:25.6,y:73.9,area:AREA.s2W},
  "2311":{floor:2,x:9.3,y:73.9,area:AREA.s2W},
  "2405":{floor:2,x:64.0,y:30.5,area:AREA.s2N},
  "2413":{floor:2,x:64.5,y:17.1,area:AREA.s2N},
  "REST2":{floor:2,x:85.3,y:24.8,area:AREA.s2N},
  "ELEV2":{floor:2,x:81.5,y:38.2,area:"Northeast side of the second-floor lobby."}
};

const PLACES = [
  {id:"restrooms", name:"Restrooms", title:"Men 1408, Women 1410. Also on the second floor: Men 2408, Women 2410.", room:"", loc:"REST1", multi:"REST", show:"Restrooms", keywords:"restroom bathroom washroom toilet mens womens 1408 1410 2408 2410"},
  {id:"elevator", name:"Elevator", title:"Serves the ground and second floors.", room:"", loc:"ELEV1", multi:"ELEV", show:"Elevator", keywords:"elevator lift accessible"},
  {name:"Student Commons", title:"Seating and study space", room:"TC-1101", keywords:"commons lounge study"},
  {name:"Board of Trustees Conference Room", title:"Meeting room", room:"TC-1301", keywords:"board trustees conference"},
  {name:"Study / TLC Lab", title:"Study space and computer lab", room:"TC-2002", keywords:"tlc lab computer study"},
  {name:"Open Study Area", title:"Study space", room:"TC-2003", keywords:"study open"},
  ...["1303","1309","1405","1413","2107","2303","2304","2305","2306","2308","2309","2311","2405","2413"].map(r => ({name:"Classroom "+r, title:"Classroom", room:"TC-"+r, keywords:"classroom class"})),
  ...["1304","1306","1308"].map(r => ({name:"Classroom "+r, title:"Classroom and meeting room", room:"TC-"+r, keywords:"classroom class meeting"}))
];

