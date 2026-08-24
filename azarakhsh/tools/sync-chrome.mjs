/**
 * آذرخش · همگام‌سازی اسکلت مشترک
 * ------------------------------------------------------------------
 * نوار فرمان، پابرگ، داک، شیت‌ها، اسپرایت آیکون و پوشش‌ها در همهٔ
 * صفحه‌ها یکسان‌اند و بین این نشانه‌ها قرار دارند:
 *
 *     <!-- az:head -->  …  <!-- /az:head -->
 *     <!-- az:bar -->   …  <!-- /az:bar -->
 *
 * index.html مرجع است. یک بار آنجا ویرایش کنید و این را اجرا کنید:
 *
 *     node tools/sync-chrome.mjs
 *
 * حالت «فعال» منو از data-page روی <body> می‌آید، پس این اسکریپت
 * چیزی از حالت هر صفحه را خراب نمی‌کند.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'index.html';
const BLOCKS = ['head', 'sprite', 'bar', 'footer', 'dock', 'sheets', 'overlay'];

const slice = (html, name) => {
  const open = `<!-- az:${name} -->`;
  const close = `<!-- /az:${name} -->`;
  const a = html.indexOf(open);
  const b = html.indexOf(close, a);
  if (a < 0 || b < 0) return null;
  return { a, b: b + close.length, text: html.slice(a, b + close.length) };
};

const src = readFileSync(join(ROOT, SOURCE), 'utf8');
const master = {};
for (const name of BLOCKS) {
  const s = slice(src, name);
  if (!s) { console.error(`✗ بلوک «${name}» در ${SOURCE} پیدا نشد.`); process.exit(1); }
  master[name] = s.text;
}

const pages = readdirSync(ROOT).filter(f => f.endsWith('.html') && f !== SOURCE);
let touched = 0;

for (const file of pages) {
  const path = join(ROOT, file);
  let html = readFileSync(path, 'utf8');
  let changed = 0;

  for (const name of BLOCKS) {
    const s = slice(html, name);
    if (!s) { console.warn(`  · ${file}: بلوک «${name}» ندارد، رد شد.`); continue; }
    if (s.text === master[name]) continue;
    html = html.slice(0, s.a) + master[name] + html.slice(s.b);
    changed++;
  }

  if (changed) { writeFileSync(path, html); touched++; console.log(`✓ ${file} — ${changed} بلوک به‌روز شد`); }
}

console.log(touched ? `\n${touched} صفحه هم‌گام شد.` : '\nهمهٔ صفحه‌ها از قبل هم‌گام بودند.');
