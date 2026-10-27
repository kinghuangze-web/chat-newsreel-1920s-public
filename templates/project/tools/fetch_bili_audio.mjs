// Fallback for getting a requested record when yt-dlp is blocked (bilibili 412 / YouTube bot check).
// Prefer: ask the user to send the audio file. Use this only for the episode itself; never commit the audio.
//   node tools/fetch_bili_audio.mjs https://www.bilibili.com/video/BVxxxx audio/bgm_a.m4s
//   ffmpeg -i audio/bgm_a.m4s -ac 2 -ar 48000 audio/bgm_src.wav
// Needs playwright (or playwright-core) resolvable from the working dir (run it from $LIB), and either a CDP browser
// in AGENT_BROWSER_CDP (a logged-in/visible agent browser) or a local Chromium (PLAYWRIGHT_CHROME).
import fs from 'fs';
let pw; try { pw = await import('playwright'); } catch { pw = await import('playwright-core'); }
const [url, out = 'bgm_a.m4s'] = process.argv.slice(2);
if (!url) { console.error('usage: node fetch_bili_audio.mjs <bilibili video url> [out.m4s]'); process.exit(2); }
const b = process.env.AGENT_BROWSER_CDP ? await pw.chromium.connectOverCDP(process.env.AGENT_BROWSER_CDP)
  : await pw.chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME });
const ctx = b.contexts()[0] || await b.newContext();
const p = await ctx.newPage();
try {
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await p.waitForTimeout(4000);
  const info = await p.evaluate(() => { const a = window.__playinfo__?.data?.dash?.audio || []; a.sort((x, y) => y.bandwidth - x.bandwidth);
    return { title: document.title, url: a[0]?.baseUrl, n: a.length }; });
  console.log(info.title, '| audio streams:', info.n);
  if (!info.url) throw new Error('no dash audio in window.__playinfo__ (page layout changed or login needed)');
  const b64 = await p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'omit' }); const v = new Uint8Array(await r.arrayBuffer());
    let s = ''; for (let i = 0; i < v.length; i += 32768) s += String.fromCharCode(...v.subarray(i, i + 32768)); return btoa(s); }, info.url);
  fs.writeFileSync(out, Buffer.from(b64, 'base64')); console.log('saved', out);
} catch (e) { console.error(e.message); await p.close(); process.exit(1); }
await p.close(); process.exit(0);
