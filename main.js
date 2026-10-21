if (typeof PLACES === "undefined" || typeof ROOMS === "undefined" || typeof DIRECTORY_FIX === "undefined"){
    document.body.innerHTML = '<div style="font:600 1.6rem/1.5 system-ui,sans-serif;padding:3rem;max-width:40ch">The kiosk could not read <b>data.js</b>. The most recent edit to that file has a typo. Undo it in GitHub (History, then revert) and the kiosk will recover.</div>';
    throw new Error("data.js missing or invalid");
}
/* ========================================================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lastName = n => { const p = n.trim().split(/\s+/); return (p.length > 1 ? p[p.length-1] : p[0]).toLowerCase(); };
const byName = (a,b) => lastName(a.name).localeCompare(lastName(b.name)) || a.name.localeCompare(b.name);

/* ---------- Buildings and maps ---------- */
const BH = "Benton Harbor Campus";
const BUILDING_NAME = {todd:"Todd Center", main:"Main Building", hanson:"Hanson Technology Center", welch:"Welch Center",
    mendel:"Mendel Center", beckwith:"Beckwith Hall", southhaven:"South Haven Campus", niles:"Niles Campus", allegan:"Allegan"};
const BUILDINGS = {
    todd: {name:"Todd Center", campus:BH, crop:PLAN_CROP, floors:[
            {n:1, label:FLOOR_NAME[1], img:"floor-ground.jpg", w:1600, h:2079},
            {n:2, label:FLOOR_NAME[2], img:"floor-second.jpg", w:1600, h:2079}], rooms:{}}
};
const MAP_ORDER = ["todd","main","hanson","welch","southhaven"];

function buildingKey(campus, building, room){
    const b = (building || "").toLowerCase(), c = (campus || "").toLowerCase(), r = (room || "").toUpperCase();
    if (/^TC-?\d/.test(r) || b.includes("todd")) return "todd";
    if (c.includes("south haven") || b.includes("south haven")) return "southhaven";
    if (c.includes("niles") || b.includes("niles")) return "niles";
    if (c.includes("allegan") || b.includes("allegan")) return "allegan";
    if (b.includes("hanson")) return "hanson";
    if (b.includes("welch")) return "welch";
    if (b.includes("mendel")) return "mendel";
    if (b.includes("beckwith")) return "beckwith";
    if (b.includes("main") || b.includes("napier")) return "main";
    return "";
}
function campusOf(campus, bkey){
    if (["todd","main","hanson","welch","mendel","beckwith"].includes(bkey)) return BH;
    if (bkey === "southhaven") return "South Haven Campus";
    if (bkey === "niles") return "Niles Campus";
    if (bkey === "allegan") return "Allegan";
    const c = (campus || "").trim();
    if (/benton harbor/i.test(c)) return BH;
    return c && !/^[A-Z]-?\d/.test(c) ? c : "";
}
function displayRoom(bkey, room){
    room = (room || "").trim();
    if (bkey === "todd"){ const m = room.match(/(\d{4})/); return m ? "TC-" + m[1] : room; }
    return /^[A-Za-z]{1,3}-?\d/.test(room) ? room.toUpperCase() : room;
}
const isCode = r => /\d/.test(r || "") && !/\s/.test((r || "").trim());

/* Returns {b, f, x, y, approx} for a building and a room as written in the directory. */
function lookupRoom(bkey, room){
    const B = BUILDINGS[bkey]; if (!B || !room) return null;
    const r = room.toUpperCase().replace(/^NA-/, "");
    const hit = (k, approx) => { const p = B.rooms[k]; return p ? {b:bkey, f:p.f ?? p.floor, x:p.x, y:p.y, area:p.area, approx:!!approx} : null; };
    if (bkey === "todd"){ const m = r.match(/(\d{4})/); return m ? hit(m[1]) : null; }
    if (bkey === "main"){
        const m = r.match(/([ABCDLS])-?(\d{3})([A-Z])?/); if (!m) return null;
        const exact = hit(m[1] + m[2] + (m[3] || "")) || hit(m[1] + m[2], !!m[3]);
        if (exact) return exact;
        const fl = Math.max(1, +m[2][0]), w = B.wings && B.wings[fl] && B.wings[fl][m[1]];
        return w ? {b:bkey, f:fl, x:w.x, y:w.y, approx:true, wing:m[1]} : null;
    }
    if (bkey === "hanson"){
        if (/COLLABORATION/.test(r)) return hit("H112");
        const m = r.match(/H[A-Z]*-?(\d{3})([A-Z])?/); if (!m) return null;
        return hit("H" + m[1] + (m[2] || "")) || hit("H" + m[1], !!m[2]);
    }
    if (bkey === "welch"){ const m = r.match(/([AB])-?(\d{3})/); return m ? hit(m[1] + m[2]) : null; }
    if (bkey === "southhaven"){ const m = r.match(/(\d{3})/); return m ? hit(m[1]) : null; }
    return null;
}

/* ---------- Directory ---------- */
let DIR = [];             // people and offices from directory.json
let dirLoaded = false, dirError = "";
function normalizeEntry(e){
    const fix = DIRECTORY_FIX[e.name] || {};
    e = {...e, ...fix};
    const bkey = buildingKey(e.campus, e.building, e.room);
    const office = e.office ?? (e.name === e.title);
    return {
        kind: office ? "office" : "person", name: e.name, title: office ? (e.dept && e.dept !== e.name ? e.dept : "") : e.title,
        dept: e.dept || "", bkey, campus: campusOf(e.campus, bkey), buildingName: BUILDING_NAME[bkey] || e.building || "",
        room: displayRoom(bkey, e.room), email: e.email || "", phone: e.phone || "",
        programs: PROGRAM_TAGS[e.name] || []
    };
}
function buildDirectory(entries){
    const remove = new Set(DIRECTORY_REMOVE.map(n => n.toLowerCase()));
    DIR = [...entries, ...DIRECTORY_ADD].filter(e => e && e.name && !remove.has(e.name.toLowerCase())).map(normalizeEntry);
    rebuildAll();
}
async function loadDirectory(){
    try {
        const res = await fetch("directory.json?_=" + Date.now(), {cache:"no-store"});
        if (!res.ok) throw new Error("directory.json HTTP " + res.status);
        const j = await res.json();
        buildDirectory(j.entries || []);
        dirLoaded = true; dirError = "";
        try { localStorage.setItem("toddKioskDirectory", JSON.stringify(j.entries || [])); } catch(_){}
    } catch (err){
        dirError = String(err.message || err); console.warn("Directory load failed:", dirError);
        if (!dirLoaded){
            try { const c = JSON.parse(localStorage.getItem("toddKioskDirectory") || "null"); if (c){ buildDirectory(c); dirLoaded = true; } } catch(_){}
        }
    }
    if (current && ["people","programs","campus","offices","search"].includes(current.view)) render();
}
async function loadBuildings(){
    const res = await fetch("maps/buildings.json", {cache:"no-store"});
    if (!res.ok)  {
        let err = new Error("buildings.json HTTP " + res.status);
        console.warn("Building maps unavailable:", err.message || err);
    }
    try {
        const j = await res.json();
        Object.entries(j).forEach(([k, v]) => {
            // this forEach isn't actually doing anything?
            //v.floors.forEach(f => { f.img = f.img; });
            BUILDINGS[k] = v;
        });
    } catch (err){ console.warn("Building maps unavailable:", err.message || err); }
}

let ALL = [];
function rebuildAll(){
    ALL = [...DIR, ...PLACES.map(p => ({...p, kind:"place", bkey:"todd", campus:BH, buildingName:"Todd Center"}))];
}

/* ---------- Navigation ---------- */
let stack = [];
let current = null;
let query = "";
let progFilter = "Business";

function show(id){
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const v = $("#v-"+id); v.classList.remove("hidden"); v.scrollTop = 0;
}
function go(state, push=true){
    if (push && current) stack.push(current);
    current = state;
    render();
    $("#back").disabled = stack.length === 0;
}
function back(){ if (stack.length){ current = stack.pop(); render(); $("#back").disabled = stack.length === 0; } }
function goHome(){ stack = []; current = {view:"home"}; query = ""; render(); $("#back").disabled = true; }

/* ---------- Lists ---------- */
const shortBuilding = it => it.bkey === "southhaven" ? "South Haven" : it.bkey === "niles" ? "Niles" :
    it.bkey === "main" ? "Main Bldg" : it.bkey === "hanson" ? "Hanson Tech" : (it.buildingName || it.campus || "");
function roomCell(item){
    if (item.show) return `<span class="room">${esc(item.show)}</span>`;
    if (item.room && item.bkey === "todd") return `<span class="room">${esc(item.room)}</span>`;
    if (item.room) return `<span class="room${isCode(item.room) ? "" : " txt"}">${esc(item.room)}<small>${esc(shortBuilding(item))}</small></span>`;
    if (item.bkey === "todd" && item.kind === "person") return `<span class="room ask">Ask at ${HELP_DESK}</span>`;
    const where = shortBuilding(item);
    return `<span class="room ask">${esc(where || "No room listed")}</span>`;
}
function rowHTML(item, i){
    if (item.header) return `<div class="grouphead" ${item.letter ? `data-letter="${item.letter}"` : ""}>${esc(item.header)}</div>`;
    const away = item.bkey && item.bkey !== "todd";
    const sub = [item.title, item.campus && item.campus !== BH ? item.campus : ""].filter(Boolean).join(", ");
    return `<button class="row${away ? " away" : ""}" data-i="${i}" data-l="${esc(lastName(item.name)[0] || "")}">
    <div><div class="n">${esc(item.name)}</div><div class="s">${esc(sub)}</div></div>${roomCell(item)}</button>`;
}
function bindRows(container, items){
    container.querySelectorAll(".row").forEach(r => r.addEventListener("click", () => go({view:"detail", item:items[+r.dataset.i]})));
}
const CAMPUS_ORDER = [BH, "South Haven Campus", "Niles Campus", "Allegan", "All campuses"];
function grouped(items, sorter){
    const groups = {};
    items.forEach(it => { const g = it.campus || "Campus not listed"; (groups[g] = groups[g] || []).push(it); });
    const names = Object.keys(groups).sort((a,b) => {
        const ia = CAMPUS_ORDER.indexOf(a), ib = CAMPUS_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
    const out = [];
    names.forEach(n => { out.push({header:n}); out.push(...groups[n].sort(sorter)); });
    return out;
}
/* Todd Center / All of LMC switch, used by Find a person and Search. */
function scopeSwitch(el, scope){
    el.innerHTML = [["todd","Todd Center"],["all","All of LMC"]].map(([k, l]) => `<button aria-pressed="${scope === k}" data-scope="${k}">${l}</button>`).join("");
    el.querySelectorAll("[data-scope]").forEach(b => b.addEventListener("click", () => { current.scope = b.dataset.scope; render(); }));
}
function renderList(title, sub, items, opts = {}){
    show("list");
    $("#list-title").textContent = title;
    $("#list-sub").textContent = sub;
    const ch = $("#chips");
    if (opts.programs){
        ch.classList.remove("hidden");
        ch.innerHTML = PROGRAMS.map(p => `<button class="chip" aria-pressed="${p===progFilter}" data-p="${p}">${esc(PROGRAM_LABEL[p])}</button>`).join("");
        ch.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => { progFilter = c.dataset.p; current.prog = progFilter; render(); }));
    } else if (opts.letters){
        ch.classList.remove("hidden");
        const have = new Set(items.filter(i => !i.header && i.campus === BH).map(i => lastName(i.name)[0]));
        ch.innerHTML = [..."abcdefghijklmnopqrstuvwxyz"].map(l => `<button class="chip letter" data-jump="${l}" ${have.has(l) ? "" : "disabled"}>${l.toUpperCase()}</button>`).join("");
        ch.querySelectorAll("[data-jump]").forEach(c => c.addEventListener("click", () => {
            const row = $("#list").querySelector(`.row[data-l="${c.dataset.jump}"]`);
            const v = $("#v-list");
            if (row) v.scrollTo({top: v.scrollTop + row.getBoundingClientRect().top - v.getBoundingClientRect().top - $("#chips").offsetHeight - 12, behavior:"smooth"});
        }));
    } else ch.classList.add("hidden");
    const sb = $("#list-search");
    if (opts.search){
        sb.classList.remove("hidden");
        sb.querySelector("span").textContent = SEARCH[opts.search].button;
        sb.onclick = () => { query = ""; go({view:"search", filter:opts.search, scope:opts.scope || "todd"}); };
    } else sb.classList.add("hidden");
    const sc = $("#scope");
    if (opts.scope){ sc.classList.remove("hidden"); scopeSwitch(sc, opts.scope); }
    else sc.classList.add("hidden");
    const L = $("#list");
    if (opts.loading){ L.innerHTML = `<div class="empty">${dirError && !dirLoaded ? "The directory is unavailable right now." : "Loading the directory..."}</div>`; return; }
    if (!items.length){ L.innerHTML = `<div class="empty">${esc(opts.empty || "Nothing to show.")}</div>`; return; }
    L.innerHTML = items.map(rowHTML).join("");
    bindRows(L, items);
    if (opts.more){
        L.insertAdjacentHTML("beforeend", `<button class="morebtn" id="list-more">${esc(opts.more.label)}</button>`);
        $("#list-more").addEventListener("click", opts.more.go);
    }
}

/* ---------- Map ---------- */
const pct = (v, a, b) => ((v - a) / (b - a) * 100).toFixed(2) + "%";
function pinStyle(B, p, inv){ return `left:${pct(p.x,B.crop.x0,B.crop.x1)};top:${pct(p.y,B.crop.y0,B.crop.y1)};--inv:${inv}`; }
const STAR = '<svg class="star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z"/></svg>';

function mapHTML(bkey, floor, target, targetLabel, noElev){
    const B = BUILDINGS[bkey];
    const fl = B.floors.find(f => f.n === floor) || B.floors[0];
    const isTodd = bkey === "todd";
    const tFloor = target ? target.f : null;
    const wide = fl.w / fl.h > 1.2;
    if (current.zoom == null) current.zoom = (target && wide) ? 2.4 : 1;
    const z = (target && tFloor === fl.n) ? current.zoom : 1;
    const inv = (1 / z).toFixed(3);
    const tabs = B.floors.length > 1 ? B.floors.map(f => `<button class="ft" data-floor="${f.n}" aria-pressed="${f.n===fl.n}">${esc(f.label)}${f.n===tFloor?'<span class="tag">Destination</span>':''}${isTodd && f.n===YOU_ARE_HERE.floor && f.n!==tFloor?'<span class="tag" style="background:#1F5FB8">You are here</span>':''}</button>`).join("")
        : `<div class="ft single">${esc(B.name)}</div>`;
    let pins = "";
    if (isTodd && target && !noElev && target.f !== YOU_ARE_HERE.floor){
        const e = ROOMS["ELEV"+fl.n];
        if (e) pins += `<div class="pin elev" style="${pinStyle(B, e, inv)}"><span class="lbl">Elevator</span></div>`;
    }
    if (isTodd && YOU_ARE_HERE.floor === fl.n){
        pins += `<div class="pin yah" style="${pinStyle(B, YOU_ARE_HERE, inv)}">${STAR}<span class="lbl">${esc(YOU_ARE_HERE.label)}</span></div>`;
    }
    let origin = "50% 50%";
    if (target && tFloor === fl.n){
        const xr = (target.x - B.crop.x0) / (B.crop.x1 - B.crop.x0);
        const right = xr > 0.84 ? " right" : "";
        pins += `<div class="pin target${right}${target.approx ? " approx" : ""}" style="${pinStyle(B, target, inv)}"><span class="ring"></span><div class="dot"></div><span class="lbl">${esc(targetLabel)}${target.approx ? " (area)" : ""}</span></div>`;
        origin = `${pct(target.x,B.crop.x0,B.crop.x1)} ${pct(target.y,B.crop.y0,B.crop.y1)}`;
    }
    const full = !!current.full;
    const icon = full
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    const zoomBtn = (target && tFloor === fl.n) ? `<button class="mapz" id="mapz">${current.zoom > 1 ? "Zoom out" : "Zoom in"}</button>` : "";
    const legend = isTodd
        ? `<span><i style="background:#A8192C"></i>Destination</span><span><i style="background:#1F5FB8"></i>You are here</span><span><i style="background:#F4B6B6"></i>Severe weather shelter</span>`
        : `<span><i style="background:#A8192C"></i>Destination</span><span><i style="background:#F4B6B6"></i>Severe weather shelter</span><span>${esc(B.name)}</span>`;
    return `<div class="mapcard${full ? " full" : ""}">
    <div class="floortabs">${tabs}${zoomBtn}<button class="mapx" id="mapx">${icon}${full ? "Close map" : "Full screen"}</button></div>
    <div class="mapstage"><div class="mapbox" data-ar="${fl.w / fl.h}"><div class="mapzoom" style="transform:scale(${z});transform-origin:${origin}"><img alt="${esc(fl.label)} plan of ${esc(B.name)}" src="${esc(fl.img)}">${pins}</div></div></div>
    <div class="maplegend">${legend}</div>
  </div>`;
}
function fitMaps(){
    document.querySelectorAll(".mapstage").forEach(st => {
        const box = st.querySelector(".mapbox"); if (!box) return;
        const ar = +box.dataset.ar || 1, W = st.clientWidth, H = st.clientHeight;
        let w = W, h = W / ar; if (h > H){ h = H; w = H * ar; }
        box.style.width = Math.floor(w) + "px"; box.style.height = Math.floor(h) + "px";
    });
}
window.addEventListener("resize", fitMaps);
function bindTabs(){
    document.querySelectorAll(".ft[data-floor]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); current.floor = +b.dataset.floor; render(); }));
    const x = $("#mapx");
    if (x) x.addEventListener("click", () => { current.full = !current.full; render(); });
    const z = $("#mapz");
    if (z) z.addEventListener("click", () => { current.zoom = current.zoom > 1 ? 1 : 2.4; render(); });
    const st = document.querySelector(".mapstage");
    if (st && !current.full) st.addEventListener("click", () => { current.full = true; render(); });
    requestAnimationFrame(fitMaps);
}

/* Directions to other buildings, from BUILDING_DIRECTIONS in data.js */
const BDIR = typeof BUILDING_DIRECTIONS === "object" && BUILDING_DIRECTIONS ? BUILDING_DIRECTIONS : {};
function qrSVG(text, label){
    if (typeof qrcode !== "function" || !text) return "";
    try { const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({cellSize:1, margin:4, scalable:true, alt:label}); }
    catch (err){ console.warn("QR code failed:", err.message || err); return ""; }
}
function phoneCard(bkey){
    const d = BDIR[bkey], svg = d && qrSVG(d.phone, "QR code for directions to " + (BUILDING_NAME[bkey] || "this building"));
    return svg ? `<div class="phonedir"><div class="qrbox">${svg}</div><div><b>Directions on your phone</b>
    <p>Scan with your phone camera to open directions to the ${esc(BUILDING_NAME[bkey] || "building")} in Google Maps.</p></div></div>` : "";
}
const WING = {A:"A-wing", B:"B-wing", C:"C-wing", D:"D-wing", L:"L-wing", S:"S-wing"};
function directions(loc){
    if (!loc) return "";
    if (loc.b === "todd"){
        const fn = FLOOR_NAME[loc.f];
        if (loc.f === YOU_ARE_HERE.floor) return `<strong>${fn} (this floor).</strong> ${esc(loc.area || "")}`;
        return `<strong>${fn}.</strong> Take the elevator or the spiral stairs in the lobby. ${esc(loc.area || "")}`;
    }
    const B = BUILDINGS[loc.b], fl = B.floors.find(f => f.n === loc.f);
    const head = [B.name, B.floors.length > 1 && fl ? fl.label.toLowerCase() : "", loc.wing ? (WING[loc.wing] || loc.wing + "-wing") : ""].filter(Boolean).join(", ") + ".";
    const approx = loc.approx ? "The exact room isn't marked on this floor plan, so the pin shows the general area. " : "";
    const other = BDIR[loc.b] && BDIR[loc.b].text ? esc(BDIR[loc.b].text)
        : B.campus === BH ? "This is in another building on the Benton Harbor campus." : `This is at the ${B.name}.`;
    return `<strong>${esc(head)}</strong> ${approx}${other}`;
}

function renderDetail(item){
    show("detail");
    const bkey = item.bkey || "todd";
    if (item.multi && current.floor == null) current.floor = YOU_ARE_HERE.floor;
    let loc = null;
    if (item.multi){ const p = ROOMS[item.multi + current.floor]; loc = p ? {b:"todd", f:p.floor, x:p.x, y:p.y, area:p.area} : null; }
    else if (item.loc){ const p = ROOMS[item.loc]; loc = p ? {b:"todd", f:p.floor, x:p.x, y:p.y, area:p.area} : null; }
    else loc = lookupRoom(bkey, item.room);

    const inTodd = bkey === "todd";
    const where = inTodd ? "Todd Center" : [item.buildingName, item.campus && item.campus !== item.buildingName ? item.campus : ""].filter(Boolean).join(", ");
    let plate;
    if (item.show){
        plate = `<div class="bigroom" style="font-size:clamp(2.8rem,6vw,6rem)">${esc(item.show)}</div><div class="where">Todd Center</div>`;
    } else if (item.room){
        plate = `<div class="bigroom${isCode(item.room) ? "" : " txt"}">${esc(item.room)}</div><div class="where">${esc(where || "Room listed in the directory")}</div>`;
    } else if (inTodd && item.kind === "person"){
        plate = `<div class="bigroom">${HELP_DESK}</div>
      <div class="where">No office is listed. Career &amp; Workforce Education in ${HELP_DESK} can help you reach this person.</div>`;
    } else {
        plate = `<div class="bigroom" style="font-size:clamp(2rem,4.2vw,3.8rem);line-height:1">${esc(where || "Location not listed")}</div>
      <div class="where">No room is listed in the directory${item.phone || item.email ? ". Use the phone or email below." : "."}</div>`;
    }
    const helpLoc = (!item.room && inTodd && item.kind === "person") ? (p => ({b:"todd", f:p.floor, x:p.x, y:p.y, area:p.area}))(ROOMS[HELP_DESK.replace("TC-","")]) : null;
    const mapLoc = loc || helpLoc;
    const custom = item.directions ? esc(item.directions) : "";
    const away = !inTodd && BDIR[bkey] && BDIR[bkey].text ? `<strong>${esc(BUILDING_NAME[bkey] || "")}.</strong> ${esc(BDIR[bkey].text)}` : "";
    const dir = custom || (item.multi && mapLoc ? `<strong>On both floors.</strong> ${esc(mapLoc.area)}` : directions(mapLoc) || away);
    if (dir) plate += `<div class="dir">${dir}</div>`;

    let dl = "";
    if (item.phone) dl += `<dt>Phone</dt><dd>${esc(item.phone)}</dd>`;
    if (item.email) dl += `<dt>Email</dt><dd>${esc(item.email)}</dd>`;
    if (item.kind === "person" && item.dept) dl += `<dt>Department</dt><dd>${esc(item.dept)}</dd>`;
    if (item.kind === "person" && item.programs && item.programs.length)
        dl += `<dt>Program</dt><dd>${item.programs.map(p => esc(PROGRAM_LABEL[p])).join(", ")}</dd>`;
    const note = item.kind === "person" && item.room
        ? `<div class="note">Office hours change each semester. Check the schedule posted outside the office or send an email to set a time.</div>` : "";

    const left = `<div class="dleft"><div class="plate">${plate}</div>${inTodd ? "" : phoneCard(bkey)}
    <div class="info"><h2>${esc(item.name)}</h2><div class="title">${esc(item.title || "")}</div>
    ${dl ? `<dl>${dl}</dl>` : ""}${note}</div></div>`;
    let detail = $("#detail");
    if (mapLoc && BUILDINGS[mapLoc.b]){
        if (current.floor == null) current.floor = mapLoc.f;
        const label = item.show || item.room || HELP_DESK;

        detail.innerHTML = left + mapHTML(mapLoc.b, current.floor, mapLoc, label, !!item.multi);
        detail.style.gridTemplateColumns = "";
        bindTabs();
    } else {
        detail.innerHTML = left;
        detail.style.gridTemplateColumns = "minmax(0,1fr)";
    }
}

const MAP_INFO = {
    todd: `<div class="dir">Room numbers starting with 1 are on the ground floor. Room numbers starting with 2 are on the second floor. Take the elevator or the spiral stairs in the lobby between floors.</div></div>
    <div class="info"><h2>What's where</h2><ul>
      <li><b>Ground floor:</b> Career &amp; Workforce Education offices (1201 to 1215), Student Commons, classrooms 1303 to 1413</li>
      <li><b>Second floor:</b> faculty offices (2202 to 2216), Financial Services (2301), Study / TLC Lab, classrooms 2107 to 2413</li>
      <li><b>Restrooms:</b> north wing on both floors</li></ul></div>`,
    main: `<div class="dir">Rooms are named by wing and floor. In C-229, C is the wing and 2 is the floor.</div></div>
    <div class="info"><h2>Wings</h2><ul><li><b>A-wing:</b> center, with Student Services and the Welcome Center</li><li><b>B-wing:</b> east</li><li><b>C-wing:</b> west</li><li><b>L-wing:</b> north, with the Library</li><li><b>D-wing:</b> south, with the gym and lecture halls</li></ul></div>`
};
function renderMap(){
    show("detail");
    let detail = $("#detail");
    const bkey = current.bkey && BUILDINGS[current.bkey] ? current.bkey : "todd";
    const B = BUILDINGS[bkey];
    if (current.floor == null) current.floor = bkey === "todd" ? YOU_ARE_HERE.floor : B.floors[0].n;
    const picker = MAP_ORDER.filter(k => BUILDINGS[k]).map(k => `<button class="chip" data-bk="${k}" aria-pressed="${k===bkey}">${esc(BUILDINGS[k].name)}</button>`).join("");
    const info = MAP_INFO[bkey] || `<div class="dir">${esc(BDIR[bkey] && BDIR[bkey].text || B.campus)}</div></div>${phoneCard(bkey)}<div class="info"></div>`;
    const left = `<div class="dleft"><div class="chips mapchips">${picker}</div><div class="plate"><div class="bigroom" style="font-size:clamp(2.4rem,5vw,5rem)">${esc(B.name)}</div>
    <div class="where">${esc(B.floors.map(f => f.label).join(", "))}</div>${info}</div>`;
    detail.innerHTML = left + mapHTML(bkey, current.floor, null, "");
    detail.style.gridTemplateColumns = "";
    document.querySelectorAll("[data-bk]").forEach(b => b.addEventListener("click", () => { current.bkey = b.dataset.bk; current.floor = null; current.full = false; render(); }));
    bindTabs();
}

function score(item, q){
    const hay = [item.name, item.title, item.dept, item.room, item.buildingName, item.campus, item.keywords, (item.programs||[]).map(p => p + " " + (PROGRAM_LABEL[p] || "")).join(" ")].join(" ").toLowerCase();
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every(t => hay.includes(t) || hay.replace(/-/g,"").includes(t.replace(/-/g,"")))) return -1;
    /* Name matches rank first (last name above first name), then room numbers.
       Todd Center entries get a boost so people in this building come before
       a name match elsewhere on campus. */
    const n = item.name.toLowerCase(), words = n.split(/\s+/), last = words[words.length - 1];
    const room = (item.room || "").toLowerCase().replace(/-/g, "");
    let s = 0;
    terms.forEach(t => {
        if (last.startsWith(t)) s += 10;
        else if (words.some(w => w.startsWith(t))) s += 8;
        else if (n.includes(t)) s += 4;
        else if (room && t.replace(/-/g, "") && room.includes(t.replace(/-/g, ""))) s += 10;
    });
    if (n.startsWith(q.trim().toLowerCase())) s += 4;
    if (item.bkey === "todd") s += 6;
    else if (item.campus === BH) s += 1;
    return s;
}
/* Each section's search: which entries it covers and what it tells the visitor. */
const SEARCH = {
    people: {button:"Search people", match: i => i.kind === "person", ph:"Type a name",
        hint:'Type a first or last name, like "Kelly."'},
    places: {button:"Search offices & rooms", match: i => i.kind !== "person", ph:"Type an office or room",
        hint:'Type an office like "Financial Aid," a room like "Commons," or a room number like "1303."'},
    programs: {button:"Search programs", match: i => i.kind === "person" && i.programs && i.programs.length, scope:false,
        ph:"Type a name or program", hint:'Type a name, or a program like "CIS" or "Criminal Justice."'},
    campus: {button:"Search offices", match: i => i.kind === "office" && i.bkey !== "todd", scope:false,
        ph:"Type an office", hint:'Type an office, like "Financial Aid" or "Library."'}
};
function renderSearch(){
    show("search");
    const S = SEARCH[current.filter] || SEARCH.people;
    $("#q").textContent = query;
    $("#q").dataset.ph = S.ph;
    const R = $("#results"), C = $("#qcount");
    const scoped = S.scope !== false;
    const scope = scoped ? (current.scope || "todd") : "all", inTodd = scope === "todd";
    const ss = $("#sscope");
    if (scoped){ ss.classList.remove("hidden"); scopeSwitch(ss, scope); } else ss.classList.add("hidden");
    C.textContent = "";
    if (!query.trim()){
        R.innerHTML = `<div class="empty">${esc(S.hint)}${inTodd ? " Showing the Todd Center. Touch All of LMC to search the whole college." : ""}</div>`;
        return;
    }
    const all = ALL.filter(S.match).map(i => [score(i, query), i]).filter(x => x[0] >= 0).sort((a,b) => b[0]-a[0] || a[1].name.localeCompare(b[1].name)).map(x => x[1]);
    const here = all.filter(i => i.bkey === "todd");
    const items = (inTodd ? here : all).slice(0, 60);
    const elsewhere = all.length - here.length;
    const moreBtn = inTodd && elsewhere
        ? `<button class="morebtn" id="search-more">Show ${elsewhere === 1 ? "1 match" : elsewhere + " matches"} elsewhere at LMC</button>` : "";
    if (!items.length){
        R.innerHTML = inTodd && elsewhere
            ? `<div class="empty">Nothing in the Todd Center matches "${esc(query)}."</div>${moreBtn}`
            : `<div class="empty">Nothing matches "${esc(query)}." Check the spelling, try fewer letters, or ask at Career &amp; Workforce Education in ${HELP_DESK}.</div>`;
    } else {
        const n = items.length === 1 ? "1 match" : `${items.length === 60 ? "60+" : items.length} matches`;
        C.textContent = inTodd ? n + " in the Todd Center" : n;
        R.innerHTML = items.map(rowHTML).join("") + moreBtn;
        bindRows(R, items);
    }
    const m = $("#search-more");
    if (m) m.addEventListener("click", () => { current.scope = "all"; render(); });
}

function buildKeyboard(){
    const rows = ["1234567890","QWERTYUIOP","ASDFGHJKL-","ZXCVBNM"];
    let h = rows.map(r => `<div class="kr">${[...r].map(c => `<button class="k" data-k="${c}">${c}</button>`).join("")}</div>`).join("");
    h += `<div class="kr"><button class="k mid" data-k="CLEAR">Clear</button><button class="k wide" data-k=" ">Space</button><button class="k mid" data-k="DEL" aria-label="Delete">Delete</button></div>`;
    $("#kbd").innerHTML = h;
    $("#kbd").addEventListener("click", e => {
        const b = e.target.closest(".k"); if (!b) return;
        const k = b.dataset.k;
        if (k === "DEL") query = query.slice(0,-1);
        else if (k === "CLEAR") query = "";
        else if (query.length < 40) query += k.toLowerCase();
        renderSearch();
    });
}

function render(){
    const s = current;
    if (s.view === "home") show("home");
    else if (s.view === "search") renderSearch();
    else if (s.view === "detail") renderDetail(s.item);
    else if (s.view === "map") renderMap();
    else if (s.view === "calendar") renderCalendar();
    else if (s.view === "people"){
        const scope = s.scope || "todd";
        const people = DIR.filter(d => d.kind === "person" && (scope === "all" || d.bkey === "todd"));
        if (scope === "all")
            renderList("Find a person", "Everyone in the LMC directory. Benton Harbor campus first, sorted by last name", grouped(people, byName), {letters:true, scope, search:"people", loading:!dirLoaded});
        else
            renderList("Find a person", "Faculty and staff in the Todd Center, sorted by last name", people.sort(byName), {letters:true, scope, search:"people", loading:!dirLoaded,
                empty:"No one in the directory is listed in the Todd Center.",
                more:{label:"Not listed here? Show everyone at LMC", go:() => { current.scope = "all"; render(); }}});
    } else if (s.view === "offices"){
        const items = [...DIR.filter(d => d.kind === "office" && d.bkey === "todd").sort((a,b) => a.name.localeCompare(b.name)), ...PLACES.map(p => ({...p, kind:"place", bkey:"todd", campus:BH, buildingName:"Todd Center"}))];
        renderList("Offices & rooms", "Everything in the Todd Center", items, {search:"places"});
    } else if (s.view === "programs"){
        if (s.prog) progFilter = s.prog;
        const items = DIR.filter(p => p.kind === "person" && p.programs.includes(progFilter)).sort(byName);
        renderList("Programs", "Faculty and staff by program", items, {programs:true, search:"programs", loading:!dirLoaded, empty:"No one is listed for this program."});
    } else if (s.view === "campus"){
        const offices = DIR.filter(d => d.kind === "office" && d.bkey !== "todd");
        renderList("Elsewhere on campus", "Offices in other buildings and at other campuses", grouped(offices, (a,b) => a.name.localeCompare(b.name)), {search:"campus", loading:!dirLoaded});
    }
}




/* =========================================================
   TODAY'S EVENTS
   Todd Center events from the LMC calendar (events.json).
   Optional Google Sheet columns: Date, Start, End, Event, Location, Details
   ========================================================= */
const EVENTS_CACHE_KEY = "toddKioskEvents";

let EVENTS = [];          // all rows from the sheet
let eventsUpdated = null; // Date of last successful load
let eventsError = "";

function parseCSV(text){
    const rows = []; let row = [], f = "", q = false;
    for (let i = 0; i < text.length; i++){
        const c = text[i];
        if (q){
            if (c === '"' && text[i+1] === '"'){ f += '"'; i++; }
            else if (c === '"') q = false;
            else f += c;
        } else if (c === '"') q = true;
        else if (c === ",") { row.push(f); f = ""; }
        else if (c === "\n" || c === "\r"){
            if (c === "\r" && text[i+1] === "\n") i++;
            row.push(f); rows.push(row); row = []; f = "";
        } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.some(v => v.trim() !== ""));
}

function parseDate(s){
    s = (s || "").trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2]-1, +m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m){ const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[1]-1, +m[2]); }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseTime(s){
    s = (s || "").trim().toLowerCase().replace(/\./g, "");
    if (!s) return null;
    if (s === "noon") return 720;
    const m = s.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm|a|p)?$/);
    if (!m) return null;
    let h = +m[1]; const min = +(m[2] || 0); const ap = m[3];
    if (ap && ap[0] === "p" && h < 12) h += 12;
    if (ap && ap[0] === "a" && h === 12) h = 0;
    return h * 60 + min;
}
function fmtTime(mins){
    if (mins == null) return "";
    let h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2,"0")} ${ap}`;
}

function rowsToEvents(rows){
    if (!rows.length) return [];
    const head = rows[0].map(h => h.trim().toLowerCase());
    const col = (...names) => head.findIndex(h => names.includes(h));
    const iD = col("date"), iS = col("start","start time","time"), iE = col("end","end time"),
        iT = col("event","title","name"), iL = col("location","room","where"), iX = col("details","description","notes");
    if (iD < 0 || iT < 0) throw new Error("The sheet needs at least a Date column and an Event column.");
    return rows.slice(1).map(r => {
        const date = parseDate(r[iD]);
        return date && (r[iT] || "").trim() ? {
            date: date.toDateString(),
            start: iS >= 0 ? parseTime(r[iS]) : null,
            end: iE >= 0 ? parseTime(r[iE]) : null,
            title: r[iT].trim(),
            location: iL >= 0 ? (r[iL] || "").trim() : "",
            details: iX >= 0 ? (r[iX] || "").trim() : ""
        } : null;
    }).filter(Boolean);
}

function roomFromLocation(loc){
    const m = (loc || "").match(/\b(?:TC[-\s]?)?([12]\d{3})\b/i);
    return m && ROOMS[m[1]] ? m[1] : null;
}

function todaysEvents(){
    const now = new Date(), today = now.toDateString(), mins = now.getHours()*60 + now.getMinutes();
    return EVENTS.filter(e => e.date === today)
        .filter(e => e.end == null ? (e.start == null || e.start + 60 > mins) : e.end > mins)
        .sort((a,b) => (a.start ?? -1) - (b.start ?? -1))
        .map(e => ({...e, now: e.start != null && e.start <= mins}));
}

/* Shown when there are no more events today. To change the link, regenerate qr-space-use.svg too. */
const SPACE_PROMO = `<div class="ev-promo">
  <h3>Host your event here</h3>
  <p>Rooms at Lake Michigan College, including the Todd Center, can be requested for meetings, trainings, and community events.</p>
  <div class="qr"><img src="qr-space-use.svg" alt="QR code to request a space">
    <div><b>Scan with your phone camera to request a space.</b><div class="url">lakemichigancollege.edu/<wbr>community/<wbr>space-use</div></div></div>
</div>`;
function eventRowHTML(e, i){
    const room = roomFromLocation(e.location);
    const time = e.start == null ? "All day" : fmtTime(e.start);
    const until = e.end != null ? `until ${fmtTime(e.end)}` : "";
    return `<button class="ev${e.now ? " now" : ""}${room ? "" : " noroom"}" data-ev="${i}" ${room ? "" : "tabindex=\"-1\""}>
    <div class="ev-time"><b>${esc(time)}</b><span>${e.now ? "Now" + (e.end != null ? ", until " + fmtTime(e.end) : "") : esc(until)}</span></div>
    <div class="ev-body"><div class="ev-title">${esc(e.title)}</div>
      ${e.location ? `<div class="ev-loc">${esc(e.location)}${room ? '<span class="ev-map">Map</span>' : ""}</div>` : ""}
      ${e.details ? `<div class="ev-det">${esc(e.details)}</div>` : ""}</div>
  </button>`;
}
/* Events with a Todd Center room open that room on the map. */
function bindEventRows(box, list){
    box.querySelectorAll(".ev").forEach(b => b.addEventListener("click", () => {
        const e = list[+b.dataset.ev]; const room = roomFromLocation(e.location);
        if (!room) return;
        go({view:"detail", item:{kind:"place", name:e.title, title:[e.start!=null?fmtTime(e.start)+(e.end!=null?" to "+fmtTime(e.end):""):"", e.details].filter(Boolean).join(". "), room:"TC-"+room}});
    }));
}
function renderEvents(){
    const box = $("#events"); if (!box) return;
    const list = todaysEvents();
    const todayKey = new Date().toLocaleDateString("en-CA");
    const today = EVENTS.filter(e => e.date === new Date().toDateString()).length;
    const covered = EVENTS_CSV_URL || calendarDates.includes(todayKey);
    let h = "";
    if (!eventsLoaded || !covered){
        h = `<div class="ev-empty">${eventsLoaded || eventsError ? "Today's events aren't available right now." : "Loading today's events..."}</div>`;
    } else if (!list.length){
        h = `<div class="ev-empty">${today ? "That's all for today." : "No events are scheduled in the Todd Center today."}</div>${SPACE_PROMO}`;
    } else {
        h = list.map(eventRowHTML).join("");
    }
    box.innerHTML = h;
    bindEventRows(box, list);
    const st = $("#events-status");
    if (st) st.textContent = eventsError && eventsLoaded ? "Showing the last saved list" : "";
}

/* Events come from events.json, which a GitHub Action fills from the
   LMC calendar. If EVENTS_CSV_URL is set in data.js, a Google Sheet is used instead. */
let calendarDates = [];
let eventsLoaded = false;
async function loadEvents(){
    try {
        if (EVENTS_CSV_URL){
            const url = EVENTS_CSV_URL + (EVENTS_CSV_URL.includes("?") ? "&" : "?") + "_=" + Date.now();
            const res = await fetch(url, {cache:"no-store"});
            if (!res.ok) throw new Error("HTTP " + res.status);
            const text = await res.text();
            if (/^\s*</.test(text)) throw new Error("The link did not return CSV. Use File > Share > Publish to web > CSV.");
            EVENTS = rowsToEvents(parseCSV(text));
        } else {
            const res = await fetch("events.json?_=" + Date.now(), {cache:"no-store"});
            if (!res.ok) throw new Error("events.json HTTP " + res.status);
            const j = await res.json();
            calendarDates = Array.isArray(j.dates) ? j.dates : [];
            EVENTS = (j.events || []).map(e => {
                const d = parseDate(e.date);
                return d ? {date: d.toDateString(), start: parseTime(e.start), end: parseTime(e.end), title: e.title || "", location: e.location || "", details: e.details || ""} : null;
            }).filter(Boolean);
        }
        eventsLoaded = true; eventsUpdated = new Date(); eventsError = "";
        try { localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify({at:eventsUpdated.toISOString(), events:EVENTS, dates:calendarDates})); } catch(_){}
    } catch (err){
        eventsError = String(err.message || err);
        console.warn("Events load failed:", eventsError);
        if (!eventsLoaded){
            try {
                const c = JSON.parse(localStorage.getItem(EVENTS_CACHE_KEY) || "null");
                if (c && Array.isArray(c.events)){ EVENTS = c.events; calendarDates = c.dates || []; eventsUpdated = new Date(c.at); eventsLoaded = true; }
            } catch(_){}
        }
    }
    renderEvents();
}


/* =========================================================
   UPCOMING EVENTS CALENDAR
   upcoming.json is filled nightly by the "Update upcoming events"
   Action (about two months ahead). Today and tomorrow come from
   events.json, which is fresher.
   ========================================================= */
const pad2 = n => String(n).padStart(2, "0");
const dayKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const evKey = e => e.key || dayKey(new Date(e.date));
let UPCOMING = [], upcomingDates = [];
async function loadUpcoming(){
    if (EVENTS_CSV_URL) return;   // a Google Sheet already holds every date
    try {
        const res = await fetch("upcoming.json?_=" + Date.now(), {cache:"no-store"});
        if (!res.ok) throw new Error("upcoming.json HTTP " + res.status);
        const j = await res.json();
        upcomingDates = Array.isArray(j.dates) ? j.dates : [];
        UPCOMING = (j.events || []).map(e => {
            const d = parseDate(e.date);
            return d ? {key: dayKey(d), date: d.toDateString(), start: parseTime(e.start), end: parseTime(e.end), title: e.title || "", location: e.location || "", details: e.details || ""} : null;
        }).filter(Boolean);
        try { localStorage.setItem("toddKioskUpcoming", JSON.stringify({events:UPCOMING, dates:upcomingDates})); } catch(_){}
    } catch (err){
        console.warn("Upcoming events load failed:", err.message || err);
        if (!UPCOMING.length){
            try { const c = JSON.parse(localStorage.getItem("toddKioskUpcoming") || "null"); if (c){ UPCOMING = c.events || []; upcomingDates = c.dates || []; } } catch(_){}
        }
    }
    if (current && current.view === "calendar") render();
}


/* Every known event by day, and which days the data actually covers. */
function eventsByDay(){
    const map = {}, add = e => (map[evKey(e)] = map[evKey(e)] || []).push(e);
    let covered;
    if (EVENTS_CSV_URL){ EVENTS.forEach(add); covered = () => true; }
    else {
        const near = new Set(calendarDates);
        UPCOMING.filter(e => !near.has(e.key)).forEach(add);
        EVENTS.forEach(add);
        const all = new Set([...calendarDates, ...upcomingDates]);
        covered = k => all.has(k);
    }
    Object.values(map).forEach(l => l.sort((a,b) => (a.start ?? -1) - (b.start ?? -1)));
    return {map, covered};
}

function renderCalendar(){
    show("cal");
    const {map, covered} = eventsByDay();
    const now = new Date(), todayK = dayKey(now);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastKey = EVENTS_CSV_URL ? Object.keys(map).sort().pop() : [...calendarDates, ...upcomingDates].sort().pop();
    const last = lastKey ? parseDate(lastKey) : now;
    const maxMonth = new Date(Math.max(+thisMonth, +new Date(last.getFullYear(), last.getMonth(), 1)));
    if (!current.month) current.month = dayKey(thisMonth);
    if (!current.day) current.day = todayK;
    const m = parseDate(current.month), y = m.getFullYear(), mo = m.getMonth();
    const monthName = m.toLocaleDateString([], {month:"long", year:"numeric"});
    const days = new Date(y, mo + 1, 0).getDate(), lead = new Date(y, mo, 1).getDay();

    let cells = "";
    for (let i = 0; i < lead; i++) cells += `<span class="cday blank"></span>`;
    for (let d = 1; d <= days; d++){
        const date = new Date(y, mo, d), k = dayKey(date), n = (map[k] || []).length;
        const off = k < todayK || !covered(k);
        const label = date.toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"}) + (off ? "" : n ? `, ${n} event${n > 1 ? "s" : ""}` : ", no events");
        cells += `<button class="cday${k === todayK ? " today" : ""}" data-day="${k}" aria-pressed="${k === current.day}" aria-label="${esc(label)}" ${off ? "disabled" : ""}>
      <span>${d}</span>${n && !off ? `<span class="cnt">${n}</span>` : ""}</button>`;
    }
    const lastShown = lastKey ? parseDate(lastKey).toLocaleDateString([], {month:"long", day:"numeric"}) : "";
    const note = !lastKey ? "Upcoming events will appear after the next nightly update."
        : `Red numbers show how many events are on that day. The calendar runs through ${esc(lastShown)}.`;

    const sel = parseDate(current.day), list = covered(current.day) ? (map[current.day] || []) : null;
    const selName = current.day === todayK ? "Today" : sel.toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"});
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const shown = (list || []).map(e => ({...e, now: current.day === todayK && e.start != null && e.start <= nowMins && (e.end == null || e.end > nowMins)}));
    const dayBody = list === null ? `<div class="ev-empty">Events for this day aren't available yet.</div>`
        : shown.length ? shown.map(eventRowHTML).join("")
            : `<div class="ev-empty">No events are scheduled in the Todd Center on this day.</div>${SPACE_PROMO}`;

    $("#cal").innerHTML = `<div class="calcard">
      <div class="calnav">
        <button id="cal-prev" ${+m <= +thisMonth ? "disabled" : ""} aria-label="Previous month">&lsaquo; Prev</button>
        <h3>${esc(monthName)}</h3>
        <button id="cal-next" ${+m >= +maxMonth ? "disabled" : ""} aria-label="Next month">Next &rsaquo;</button>
      </div>
      <div class="calweek" aria-hidden="true">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(w => `<span>${w}</span>`).join("")}</div>
      <div class="calgrid">${cells}</div>
      <p class="calnote">${note}</p>
    </div>
    <div class="events-panel"><div class="ev-head"><h2>${esc(selName)}</h2></div><div class="ev-list" id="cal-day" aria-live="polite">${dayBody}</div></div>`;
    bindEventRows($("#cal-day"), shown);
    const step = dir => { current.month = dayKey(new Date(y, mo + dir, 1)); render(); };
    $("#cal-prev").addEventListener("click", () => step(-1));
    $("#cal-next").addEventListener("click", () => step(1));
    document.querySelectorAll(".cday[data-day]").forEach(b => b.addEventListener("click", () => { current.day = b.dataset.day; render(); }));
}


/* Auto-update: reload when index.html or data.js changes on the server */
/* Kiosk version: update this and CHANGELOG.md with every release. */
const KIOSK_VERSION = "2.8.0";

const UPDATE_CHECK_MINUTES = 15;
let updatePending = false, siteSig = null;
function hashText(t){ let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0; return h + ":" + t.length; }
const isIdle = () => !$("#attract").classList.contains("hidden");
async function checkForUpdate(){
    if (location.protocol === "file:") return;
    try {
        const texts = await Promise.all(["index.html","data.js"].map(f =>
            fetch(f + "?_=" + Date.now(), {cache:"no-store"}).then(r => { if (!r.ok) throw new Error(f + " " + r.status); return r.text(); })));
        const sig = hashText(texts.join("\n"));
        if (siteSig === null) siteSig = sig;
        else if (sig !== siteSig){ updatePending = true; if (isIdle()) location.reload(); }
    } catch (err){ console.warn("Update check failed:", err.message || err); }
}


function showContact(){
    const link = typeof VIDEO_LINK === "string" ? VIDEO_LINK : "";
    const svg = qrSVG(link, "QR code for " + link);
    if (!svg) return false;
    let contact = $("#contact")
    contact.innerHTML = `<div class="card"><div class="qrbox">${svg}</div><div>
    <h2>${esc(typeof VIDEO_LINK_TITLE === "string" ? VIDEO_LINK_TITLE : "Contact Lake Michigan College")}</h2>
    <p>Scan with your phone camera to contact Lake Michigan College.</p>
    <p class="url">${esc(link.replace(/^https?:\/\/(www\.)?/, "").replace(/\//g, "/\u200b"))}</p>
    <button class="close" data-close>Close</button></div></div>`;
    contact.classList.remove("hidden");
    return true;
}
const hideContact = () => $("#contact").classList.add("hidden");



/* Full screen: browsers only allow it right after a touch, so ask on every touch
   until it sticks. A reload or a swipe out drops it; the next touch brings it back. */
function goFullscreen(){
    if (typeof KIOSK_FULLSCREEN !== "undefined" && !KIOSK_FULLSCREEN) return;
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try { const p = req.call(el, {navigationUI:"hide"}); if (p && p.catch) p.catch(() => {}); } catch(_){}
}
["pointerup","keydown"].forEach(ev => document.addEventListener(ev, goFullscreen, {capture:true}));

/* Physical keyboard support (for testing on a laptop) */
document.addEventListener("keydown", e => {
    if (!current || current.view !== "search") return;
    if (e.key === "Backspace") query = query.slice(0,-1);
    else if (e.key === "Escape") query = "";
    else if (/^[a-z0-9 \-]$/i.test(e.key) && query.length < 40) query += e.key.toLowerCase();
    else return;
    renderSearch();
});

function afterLoad() {
    document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => {
        const v = b.dataset.go;
        if (v === "search") query = "";
        go({view: v, prog: v === "programs" ? "Business" : undefined});
    }));
    document.querySelectorAll("[data-place]").forEach(b => b.addEventListener("click", () => {
        const item = PLACES.find(p => p.id === b.dataset.place);
        go({view: "detail", item: {...item, kind: "place", bkey: "todd", campus: BH, buildingName: "Todd Center"}});
    }));
    $("#back").addEventListener("click", back);
    $("#home").addEventListener("click", goHome);


    rebuildAll();
    Object.entries(ROOMS).forEach(([k, v]) => { BUILDINGS.todd.rooms[k] = v; });

    checkForUpdate().then();
    setInterval(checkForUpdate, UPDATE_CHECK_MINUTES * 60 * 1000);
    /* Safety net: reload once a night at 3 AM if nobody is using the kiosk */
    setInterval(() => { const d = new Date(); if (d.getHours() === 3 && d.getMinutes() === 0 && isIdle()) location.reload(); }, 60 * 1000);

    loadBuildings().then(() => {
        if (current && (current.view === "detail" || current.view === "map")) render();
    });
    loadDirectory().then();
    setInterval(loadDirectory, 60 * 60 * 1000);

    loadEvents().then();
    setInterval(loadEvents, EVENTS_REFRESH_MINUTES * 60 * 1000);
    setInterval(renderEvents, 60 * 1000);

    loadUpcoming().then();
    setInterval(loadUpcoming, 60 * 60 * 1000);

    /* Clock */
    function tick(){
        const d = new Date();
        const t = d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
        const ds = d.toLocaleDateString([], {weekday:"long", month:"long", day:"numeric"});
        $("#time").textContent = t; $("#date").textContent = ds;
        $("#timeA").textContent = t; $("#dateA").textContent = ds;
    }
    tick(); setInterval(tick, 10000);

    document.getElementById("kiosk-version").textContent = "v" + KIOSK_VERSION;

    ["pointerdown","keydown"].forEach(ev => document.addEventListener(ev, resetIdle, {passive:true}));
    /* Start screen video: plays only while the start screen shows. Touching it shows
       a QR code for VIDEO_LINK; touching anywhere else starts the kiosk. */

    let VIDEO_SRC = typeof ATTRACT_VIDEO === "string" ? ATTRACT_VIDEO : "";
    let vid = $("#video");
    let videoPaused = false;

    let attract = $("#attract");

    if (VIDEO_SRC){
        vid.src = VIDEO_SRC;
        vid.addEventListener("error", () => { console.warn("Start screen video could not play:", VIDEO_SRC); attract.classList.remove("has-video"); });
        attract.classList.add("has-video");
    }

    function playVideo(){ if (VIDEO_SRC && !videoPaused) vid.play().catch(() => {}); }
    function setVideoPaused(p){ videoPaused = p; $("#a-pause").textContent = p ? "Play video" : "Pause video"; if (p) vid.pause(); else playVideo(); }
    function showAttract(){ hideContact(); attract.classList.remove("hidden"); playVideo(); }
    function hideAttract(){ hideContact(); attract.classList.add("hidden"); vid.pause(); }

    /* Idle reset to attract screen */
    let idleTimer;
    function resetIdle(){
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { goHome(); setVideoPaused(false); showAttract(); if (updatePending) location.reload(); }, IDLE_SECONDS*1000);
    }


    attract.addEventListener("pointerdown", e => {
        e.preventDefault();
        if (e.target.closest("#a-pause")){ setVideoPaused(!videoPaused); return; }
        if (e.target.closest("#contact")){ if (e.target.closest("[data-close]") || !e.target.closest(".card")) hideContact(); return; }
        if (e.target.closest("#a-video") && showContact()) return;
        hideAttract(); resetIdle();
    });
    playVideo();
    document.addEventListener("contextmenu", e => e.preventDefault());
    buildKeyboard();
    goHome();

}


addEventListener("load", afterLoad);