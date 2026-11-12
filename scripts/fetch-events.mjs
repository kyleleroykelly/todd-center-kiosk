// Pulls Todd Center events from the LMC Coursedog calendar into events.json.
// Runs in GitHub Actions on a schedule. Node 22+, no dependencies.
import vm from "node:vm";
import fs from "node:fs";

const SITE = "https://lakemichigancollege.events.prod.coursedog.com";
const TZ = "America/Detroit";
const DAYS_AHEAD = Number(process.env.DAYS_AHEAD || 1);   // today + tomorrow
const OUT = process.env.OUT || "events.json";
const isTodd = s => /^TC-|Todd Center/i.test(s || "");
// Pause between page requests. The calendar site starts refusing requests (HTTP 405)
// if they come too fast, so the two-month upcoming run uses a longer pause.
const PAUSE_MS = Number(process.env.PAUSE_MS || 400);

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url){
  for (let i = 0; i < 4; i++){
    let status = 0;
    try {
      const r = await fetch(url, {headers:{"User-Agent":"LMC Todd Center kiosk (github.com/kyleleroykelly/todd-center-kiosk)"}});
      if (r.ok) return await r.text();
      status = r.status;
      throw new Error(r.status + " " + url);
    } catch (e){
      if (i === 3) throw e;
      // 403/405/429 mean "slow down": back off for longer before trying again.
      const wait = [403, 405, 429].includes(status) ? 30000 * (i + 1) : 2000 * (i + 1);
      if (wait > 2000) console.log(`  ${status} from the calendar site, waiting ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}
// Turn Nuxt 3's compact "devalue" payload (a flat JSON array of values that point at each
// other by index) back into ordinary objects.
function unflatten(values){
  if (!Array.isArray(values)) return values;
  const done = new Map();
  const SPECIAL = {"-1": undefined, "-3": NaN, "-4": Infinity, "-5": -Infinity, "-6": -0};
  const hydrate = i => {
    if (String(i) in SPECIAL) return SPECIAL[String(i)];
    if (done.has(i)) return done.get(i);
    const v = values[i];
    if (!v || typeof v !== "object"){ done.set(i, v); return v; }
    if (Array.isArray(v)){
      if (typeof v[0] === "string"){                       // a tagged value: ["Reactive", 5], ["Date", "..."], ...
        const tag = v[0];
        if (tag === "Date"){ const d = new Date(v[1]); done.set(i, d); return d; }
        if (tag === "Set" || tag === "Map" || tag === "null" || tag === "Object" || tag === "RegExp" || tag === "BigInt"){
          if (tag === "Set"){ const out = []; done.set(i, out); for (let k = 1; k < v.length; k++) out.push(hydrate(v[k])); return out; }
          if (tag === "Map" || tag === "null"){ const out = {}; done.set(i, out); for (let k = 1; k < v.length; k += 2) out[String(hydrate(v[k]))] = hydrate(v[k + 1]); return out; }
          done.set(i, v[1]); return v[1];
        }
        const inner = v.length > 1 ? hydrate(v[1]) : undefined;   // Reactive, Ref, ShallowReactive, ... are wrappers
        done.set(i, inner); return inner;
      }
      const out = []; done.set(i, out);
      for (const n of v) out.push(n === -2 ? undefined : hydrate(n));
      return out;
    }
    const out = {}; done.set(i, out);
    for (const [k, n] of Object.entries(v)) out[k] = hydrate(n);
    return out;
  };
  return hydrate(0);
}
// The calendar pages carry their data in the page itself: older pages in a <script> that sets
// window.__NUXT__, newer ones (from November 2026) in a <script id="__NUXT_DATA__"> JSON block,
// with window.__NUXT__ holding only settings. Read whichever is there; if neither works, put a
// short sample in the error so the next format change is easy to see in the Actions log.
function nuxt(html){
  const found = {};
  const json = html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/);
  if (json){
    try { found.payload = unflatten(JSON.parse(json[1])); }
    catch (e){ throw new Error(`could not read the __NUXT_DATA__ block (${e.message}). It starts: ${json[1].slice(0, 160)}`); }
  }
  const m = html.match(/<script[^>]*>\s*(window\.__NUXT__\s*=[\s\S]*?)<\/script>/);
  if (m){
    const win = {};
    const ctx = vm.createContext({window: win, document: {}, navigator: {}, location: {}});
    try { vm.runInContext(m[1], ctx, {timeout: 2000}); found.legacy = win.__NUXT__; }
    catch (e){ if (!found.payload) throw new Error(`${e.message}. Data script (${m[1].length} chars) starts: ${m[1].slice(0, 120)} ... ends: ${m[1].slice(-160)}`); }
  }
  if (!found.payload && !found.legacy) throw new Error("Calendar page format changed: no page data found. Page starts: " + html.slice(0, 200).replace(/\s+/g, " "));
  return found;
}
// A short description of what a page's data holds, for the log when no events are found.
function describe(data){
  const keys = new Map();
  walk(data, o => { if (!Array.isArray(o)) for (const k of Object.keys(o)) keys.set(k, (keys.get(k) || 0) + 1); });
  const top = [...keys].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => `${k}:${n}`).join(" ");
  return `sources: ${Object.keys(data).join(", ") || "none"}; most common keys: ${top}`;
}
function walk(o, fn, seen = new Set()){
  if (!o || typeof o !== "object" || seen.has(o)) return;
  seen.add(o); fn(o);
  for (const v of Object.values(o)) walk(v, fn, seen);
}
const ymd = d => new Intl.DateTimeFormat("en-CA", {timeZone: TZ, year:"numeric", month:"2-digit", day:"2-digit"}).format(d);
const hhmm = t => t == null || t === "" ? null : `${String(Math.floor(t/100)).padStart(2,"0")}:${String(t%100).padStart(2,"0")}`;

// Room lookups by event. A recurring event's page often lists the rooms of all its
// meetings, so one request can cover every week it repeats.
const eventRooms = new Map();   // eventData.id -> {meetings: Map(meetingId -> roomId), rooms: {}}
async function roomFor(m){
  let info = eventRooms.get(m.eventData.id);
  if (!info || !info.meetings.has(m.id)){
    await sleep(PAUSE_MS);
    const det = nuxt(await get(`${SITE}/events/${m.eventData.id}/${m.id}`));
    info = info || {meetings: new Map(), rooms: {}};
    walk(det, o => {
      if (o.id && "roomId" in o && o.roomId) info.meetings.set(o.id, o.roomId);
      if (o.displayName && (o.buildingId !== undefined || o.roomNumber !== undefined) && (o._id || o.id)) info.rooms[o._id || o.id] = o;
    });
    if (!info.meetings.has(m.id)) info.meetings.set(m.id, null);
    eventRooms.set(m.eventData.id, info);
  }
  const roomId = info.meetings.get(m.id);
  return roomId ? (info.rooms[roomId] ? info.rooms[roomId].displayName : roomId) : null;
}

async function day(dateStr){
  const [y, mo, d] = dateStr.split("-");
  const data = nuxt(await get(`${SITE}/${y}/${Number(mo)}/${Number(d)}`));
  const meetings = new Map();
  walk(data, o => { if (o.id && o.eventData && o.eventData.id && "startTime" in o) meetings.set(o.id, o); });
  seenOnDay.set(dateStr, meetings.size);
  if (!meetings.size){
    console.log(`${dateStr}: no events listed`);
    if (!described){ described = true; console.log(`  page data for ${dateStr}: ${describe(data)}`); }
  }
  const out = [];
  for (const m of meetings.values()){
    let room = null;
    try {
      room = await roomFor(m);
    } catch (e){ console.log(`  could not read location for "${m.eventData.name}": ${e.message}`); }
    console.log(`${dateStr} ${hhmm(m.startTime) || "all day"}  ${m.eventData.name}  @ ${room || "no location"}`);
    if (!isTodd(room)) continue;
    const num = (room.match(/\b([12]\d{3})\b/) || [])[1] || "";
    const pretty = room.replace(/^TC-TC-/, "TC-").replace(/\(TC /, "(");
    out.push({
      date: dateStr, start: hhmm(m.startTime), end: hhmm(m.endTime),
      title: m.eventData.name, location: pretty, room: num ? "TC-" + num : "",
      details: (m.eventData.description || "").replace(/\s+/g, " ").trim().slice(0, 220),
      url: `${SITE}/events/${m.eventData.id}/${m.id}`
    });
  }
  return out;
}

const seenOnDay = new Map(); let described = false;
const wanted = [...Array(DAYS_AHEAD + 1)].map((_, i) => ymd(new Date(Date.now() + i * 864e5)));
const dates = [], events = [], failed = [];
for (const d of wanted){
  await sleep(PAUSE_MS);
  try { events.push(...await day(d)); dates.push(d); }
  catch (e){ failed.push(d); console.log(`${d}: could not read the calendar (${e.message})`); }
}
// Days that could not be read are left out of "dates", so the kiosk says they are unavailable
// instead of showing them as empty. If most days failed, keep the old file.
if (failed.length) console.log(`Could not read ${failed.length} of ${wanted.length} day(s): ${failed.join(", ")}`);
if (dates.length < wanted.length / 2) throw new Error(`Only ${dates.length} of ${wanted.length} days could be read, so ${OUT} was not updated.`);
// The LMC calendar lists something somewhere on campus every weekday. If no day had a single
// event (not just none in the Todd Center), the page was read but the events weren't found,
// so keep the old file rather than tell the kiosk the building is empty.
const weekday = dates.some(d => { const w = new Date(d + "T12:00:00Z").getUTCDay(); return w >= 1 && w <= 5; });
if (weekday && dates.every(d => !seenOnDay.get(d)))
  throw new Error(`No events were found anywhere on campus on ${dates.join(", ")}. The calendar page format has probably changed (see the page data line above), so ${OUT} was not updated.`);
events.sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")));
const body = {source: SITE, building: "Todd Center", dates, events};
let prev = null;
try { prev = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch {}
if (prev && JSON.stringify({...prev, updated: undefined}) === JSON.stringify({...body, updated: undefined})){
  console.log(`No changes: ${events.length} Todd Center event(s) for ${dates.join(", ")}`);
} else {
  fs.writeFileSync(OUT, JSON.stringify({...body, updated: new Date().toISOString()}, null, 2) + "\n");
  console.log(`Wrote ${events.length} Todd Center event(s) for ${dates.join(", ")} to ${OUT}`);
}
