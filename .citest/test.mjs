// SR Handicraft admin panel + website, end to end, on Firebase emulators (no real data touched)
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
mkdirSync('shots', { recursive: true })
const B = 'http://127.0.0.1:4000', P = 'demo-sr', FS = `http://127.0.0.1:8080/v1/projects/${P}/databases/(default)/documents`
const SUPER = 'deependrasinghbaghel30@gmail.com', CLIENT = 'client@example.com'
const res = [], errs = []; let n = 0
const sleep = ms => new Promise(r => setTimeout(r, ms))
const assert = (c, m) => { if (!c) throw new Error(m) }
const val = v => 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'arrayValue' in v ? (v.arrayValue.values || []).map(val) : 'mapValue' in v ? obj(v.mapValue.fields || {}) : null
const obj = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, val(v)]))
const H = { Authorization: 'Bearer owner' }
async function all(col) { const r = await (await fetch(`${FS}/${col}?pageSize=300`, { headers: H })).json(); return (r.documents || []).map(d => ({ _id: decodeURIComponent(d.name.split('/').pop()), ...obj(d.fields || {}) })) }
async function get(path) { const r = await fetch(`${FS}/${path}`, { headers: H }); return r.ok ? obj((await r.json()).fields || {}) : null }
async function until(fn, what, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return } catch {} await sleep(400) } throw new Error('timed out: ' + what) }
const JPG = { name: 'w.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64') }

await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: SUPER, password: 'Super@12345' }) })
const br = await chromium.launch()
async function page(vp = { width: 412, height: 900 }) {
  const ctx = await br.newContext({ viewport: vp })
  await ctx.route('https://api.cloudinary.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ secure_url: `${B}/wardrobe-1.jpg` }) }))
  const p = await ctx.newPage()
  p.on('dialog', d => d.accept())
  p.on('pageerror', e => errs.push('JS: ' + String(e).slice(0, 200)))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) errs.push(m.text().slice(0, 200)) })
  return p
}
async function step(name, p, fn) { n++; try { await fn(); res.push('✅ ' + name) } catch (e) { res.push('❌ ' + name + ' — ' + String(e.message || e).split('\n')[0].slice(0, 250)); await p.screenshot({ path: `shots/${n}-fail.png`, fullPage: true }).catch(() => {}) } }
const toast = (p, re) => p.locator('#toast').filter({ hasText: re }).waitFor({ timeout: 20000 })
async function login(p, email, pw) {
  await p.goto(B + '/admin.html?emu'); await p.fill('#le', email); await p.fill('#lp', pw); await p.click('#lb')
  await p.locator('.tabs').waitFor({ timeout: 20000 })
}

const a = await page()
await step('Owner logs in to the admin panel', a, () => login(a, SUPER, 'Super@12345'))
await step('One-time import copies the website (products, photos, categories)', a, async () => {
  await a.click('#imp'); await toast(a, /Imported/)
  const ps = await all('products'); assert(ps.length === 19, 'products ' + ps.length)
  assert(ps.find(x => x._id === '4').img.length === 3, 'product photos not imported')
  const c = await get('site/config'); assert(c.photos.hero.length >= 3 && c.cats.length === 2 && c.customWork.length === 6, 'config incomplete')
  await a.screenshot({ path: 'shots/products.png', fullPage: true })
})
await step('Categories: add "Wardrobes" under Storage', a, async () => {
  await a.click('[data-tab="cats"]')
  const i = a.locator('input[placeholder^="New sub-category in Storage"]'); await i.fill('Wardrobes')
  await i.locator('xpath=following-sibling::button').click(); await a.getByText('Wardrobes').first().waitFor()
  await a.click('#csave'); await toast(a, /Categories saved/)
  const c = await get('site/config'); assert(c.cats[0].groups.find(g => g.name === 'Storage').subs.includes('Wardrobes'), 'not saved')
})
await step('Add a product with photos, size, description, featured', a, async () => {
  await a.click('[data-tab="products"]'); await a.click('#addp')
  await a.fill('#pn', 'Diamond Carved 4 Door Wardrobe'); await a.selectOption('#ps', 'furniture|Wardrobes'); await a.fill('#pp', '72,999')
  await a.fill('#pz', '72 x 24 x 84 in'); await a.fill('#pd', 'Hand carved diamond pattern doors.')
  const [fc] = await Promise.all([a.waitForEvent('filechooser'), a.click('#padd')]); await fc.setFiles([JPG, { ...JPG, name: 'x.jpg' }])
  await toast(a, /2 photo\(s\) added/)
  await a.check('#pf'); await a.click('#psave'); await toast(a, /Product added/)
  const p = (await all('products')).find(x => x.name === 'Diamond Carved 4 Door Wardrobe')
  assert(p && p.price === 72999 && p.sub === 'Wardrobes' && p.img.length === 2 && p.featured === true && p.type === 'wardrobe' && p.id === 50, 'saved wrong: ' + JSON.stringify(p))
})
await step('Edit: hide a product and reorder its photos', a, async () => {
  await a.locator('.pc', { hasText: 'Sheesham Study Table' }).click()
  await a.locator('[data-mv="0|1"]').click(); await a.check('#ph'); await a.click('#psave'); await toast(a, /Saved/)
  const p = await get('products/29'); assert(p.hidden === true && p.img[0] === 'study-2.jpg', 'edit wrong ' + JSON.stringify(p.img))
})
await step('Website photos: add to "Made to your size", caption custom work, save', a, async () => {
  await a.click('[data-tab="photos"]')
  const [fc] = await Promise.all([a.waitForEvent('filechooser'), a.locator('[data-add="promo_custom"]').click()]); await fc.setFiles([JPG])
  await toast(a, /Added/)
  await a.locator('[data-key="customWork"] [data-cap="0"]').fill('Diamond carved wardrobe for a Baner home')
  await a.click('#phs'); await toast(a, /Saved/)
  const c = await get('site/config'); assert(c.photos.promo_custom.length === 4 && c.customWork[0].cap === 'Diamond carved wardrobe for a Baner home', 'photos not saved')
  await a.screenshot({ path: 'shots/photos.png', fullPage: true })
})
await step('Team: owner adds the client with a temporary password', a, async () => {
  await a.click('[data-tab="team"]'); await a.fill('#te', CLIENT); await a.fill('#tp', 'Client@123'); await a.click('#tb'); await toast(a, /Added/)
  assert(await get('admins/' + encodeURIComponent(CLIENT)), 'admin doc missing')
})

const c = await page()
await step('Client logs in, can edit, has no Team tab', c, async () => {
  await login(c, CLIENT, 'Client@123')
  assert(!(await c.locator('[data-tab="team"]').count()), 'client sees Team')
  await c.locator('.pc', { hasText: 'Sheesham Queen Size Bed' }).click(); await c.fill('#pp', '33999'); await c.click('#psave'); await toast(c, /Saved/)
  assert((await get('products/5')).price === 33999, 'client edit not saved')
})
await step('Stranger with a login but no access is refused', c, async () => {
  await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'x@example.com', password: 'Xxxx@1234' }) })
  const s = await page(); await s.goto(B + '/admin.html?emu'); await s.fill('#le', 'x@example.com'); await s.fill('#lp', 'Xxxx@1234'); await s.click('#lb')
  await s.getByText('No access').waitFor({ timeout: 15000 })
})
await step('Database rules: public cannot write products', c, async () => {
  const r = await fetch(`${FS}/products/999?key=fake`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { name: { stringValue: 'hack' } } }) })
  assert(r.status === 403, 'status ' + r.status)
})

const w = await page()
await step('Website shows the admin changes (new product first, hidden one gone, new menu item, price)', w, async () => {
  await w.goto(B + '/?emu#/'); await w.waitForTimeout(3500)
  const names = await w.locator('.rail .pc .nm').allInnerTexts()
  assert(names[0] === 'Diamond Carved 4 Door Wardrobe', 'first product: ' + names[0])
  assert(!names.includes('Sheesham Study Table'), 'hidden product still shown')
  await w.goto(B + '/?emu#/c/furniture/wardrobes'); await w.waitForTimeout(1200)
  await w.getByText('Diamond Carved 4 Door Wardrobe').first().waitFor()
  await w.goto(B + '/?emu#/p/5'); await w.waitForTimeout(800); await w.getByText('₹33,999').first().waitFor()
  await w.goto(B + '/?emu#/p/50'); await w.waitForTimeout(800); await w.getByText('72 x 24 x 84 in').waitFor(); await w.getByText('Hand carved diamond pattern doors.').waitFor()
  await w.goto(B + '/?emu#/page/custom'); await w.waitForTimeout(800); await w.getByText('Diamond carved wardrobe for a Baner home').waitFor()
  await w.screenshot({ path: 'shots/site.png' })
})
await step('Website reopens instantly from the saved copy', w, async () => {
  await w.goto(B + '/#/'); await w.waitForTimeout(800)   // no ?emu → no database, uses the phone's saved copy
  const names = await w.locator('.rail .pc .nm').allInnerTexts()
  assert(names[0] === 'Diamond Carved 4 Door Wardrobe', 'cached copy not used: ' + names[0])
})
await br.close()
const f = res.filter(r => r.startsWith('❌')).length
const out = [`SR ADMIN: ${res.length - f} passed, ${f} failed`, ...res, '', `ERRORS (${errs.length})`, ...[...new Set(errs)].slice(0, 15)].join('\n')
writeFileSync('report.txt', out); console.log(out)
