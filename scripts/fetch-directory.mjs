// Pulls the LMC employee directory into directory.json for the kiosk.
// Runs nightly in GitHub Actions. Node 22+, no dependencies.
import fs from "node:fs";

const BASE = "https://www.lakemichigancollege.edu/directory";
const OUT = process.env.OUT || "directory.json";
const MAX_PAGES = 80;

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url){
  for (let i = 0; i < 3; i++){
    try {
      const r = await fetch(url, {headers:{"User-Agent":"LMC Todd Center kiosk (github.com/kyleleroykelly/todd-center-kiosk)"}});
      if (r.ok) return await r.text();
      throw new Error(r.status + " " + url);
    } catch (e){ if (i === 2) throw e; await sleep(2000 * (i + 1)); }
  }
}
const decode = s => (s || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ").trim();

function parse(html){
  const cards = html.split('class="directory-results-single"').slice(1);
  return cards.map(c => {
    c = c.split('class="directory-result-modal modal"')[0];   // card only, not the bio pop-up
    const name = decode((c.match(/<h3 class="directory-result-name">\s*<a[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
    const title = decode((c.match(/<h3 class="directory-result-name">[\s\S]*?<small>([\s\S]*?)<\/small>/) || [])[1]);
    const dept = decode((c.match(/innerText == '([^']*)'/) || [])[1]);
    const where = decode((c.match(/<address class="directory-result-campus">([\s\S]*?)<\/address>/) || [])[1]);
    const email = (c.match(/href="mailto:([^"]+)"/) || [])[1] || "";
    const phone = decode((c.match(/href="tel:[^"]*"[^>]*>([\s\S]*?)<\/a>/) || [])[1]);
    const id = (c.match(/href="#modal-([^"]+)"/) || [])[1] || "";
    const parts = where.split(",").map(s => s.trim()).filter(Boolean);
    return name ? {id, name, title, dept, campus: parts[0] || "", building: parts[1] || "", room: parts.slice(2).join(", "), email, phone} : null;
  }).filter(Boolean);
}

const all = [];
for (let p = 0; p < MAX_PAGES; p++){
  const entries = parse(await get(`${BASE}?page=${p}`));
  if (!entries.length) break;
  all.push(...entries);
  await sleep(300);
}
if (all.length < 100) throw new Error(`Only ${all.length} directory entries found. The directory page format may have changed, so directory.json was not updated.`);

const seen = new Set();
const entries = all.filter(e => { const k = e.id || e.name + e.email; if (seen.has(k)) return false; seen.add(k); return true; })
  .sort((a, b) => a.name.localeCompare(b.name));
const body = {source: BASE, count: entries.length, entries};
let prev = null;
try { prev = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch {}
if (prev && JSON.stringify(prev.entries) === JSON.stringify(entries)){
  console.log(`No changes: ${entries.length} directory entries`);
} else {
  fs.writeFileSync(OUT, JSON.stringify({...body, updated: new Date().toISOString()}, null, 1) + "\n");
  console.log(`Wrote ${entries.length} directory entries to ${OUT}`);
}
