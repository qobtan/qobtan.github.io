const SUPA_URL = 'https://aiqfiiuozweqbqlgivqj.supabase.co';
const SUPA_ANON = 'sb_publishable_POz8lTd9lNj2xId7tzghHQ_dkEbX3n9';
const $ = s => document.querySelector(s);
const nat = { get: () => { try { return (window.AndroidFCM && AndroidFCM.getPin) ? AndroidFCM.getPin() : ''; } catch (e) { return ''; } }, set: v => { try { if (window.AndroidFCM && AndroidFCM.savePin) AndroidFCM.savePin(v); } catch (e) {} } };
let PIN = localStorage.getItem('adminpin') || nat.get() || '';
let rows = [];

const H = () => ({ apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'x-admin-pin': PIN });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, opts) {
  const r = await fetch(SUPA_URL + path, Object.assign({ headers: H() }, opts || {}));
  return r;
}
async function checkPin(p) {
  const r = await fetch(SUPA_URL + '/rest/v1/rpc/check_pin', {
    method: 'POST',
    headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p })
  });
  if (!r.ok) return false;
  return (await r.json()) === true;
}



function showSec(s) {
  if (!['orders', 'products', 'profit', 'materials', 'settings'].includes(s)) s = 'orders';
  document.querySelectorAll('.tabsec').forEach(e => e.classList.toggle('on', e.id === 'sec-' + s));
  document.querySelectorAll('#bnav button').forEach(b => b.classList.toggle('on', b.dataset.sec === s));
  try { localStorage.setItem('admsec', s); } catch (e) {}
  window.scrollTo(0, 0);
}
document.querySelectorAll('#bnav button').forEach(b => b.addEventListener('click', () => { showSec(b.dataset.sec); if (b.dataset.sec === 'orders') loadOrders(); if (b.dataset.sec === 'profit') loadProfit(); if (b.dataset.sec === 'materials') loadMats(); if (b.dataset.sec === 'products') loadStock(); }));
function enterPanel() { $('#bnav').hidden = false; const s0 = (new URLSearchParams(location.search).get('tab')) || 'orders'; showSec(s0); if (s0 === 'profit') loadProfit(); if (s0 === 'materials') loadMats(); loadStock(); }

// ===== الأرباح =====
let PF = { orders: [], costs: {}, dcost: 0, per: 'today' };
const cairoDay = d => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
const addDays = (k, n) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const egp = n => (Math.round(n * 100) / 100).toLocaleString('en-US') + ' ج.م';
function orderCalc(o) {
  let sales = 0, cost = 0, missing = 0, qty = 0;
  (o.items || []).forEach(i => {
    const q = +i.qty || 0, p = +i.price || 0; qty += q; sales += q * p;
    const c = PF.costs[String(i.id)];
    if (c === undefined) { missing++; } else { cost += q * (+c); }
  });
  const fee = +o.delivery_fee || 0;
  return { sales, cost, fee, dcost: PF.dcost, missing, qty, profit: sales - cost + fee - PF.dcost };
}
function periodRange(per) {
  const t = cairoDay(new Date());
  if (per === 'today') return [t, t];
  if (per === 'yday') { const y = addDays(t, -1); return [y, y]; }
  if (per === 'week') return [addDays(t, -6), t];
  return [t.slice(0, 8) + '01', t];
}
function sumRange(from, to, statuses) {
  const r = { n: 0, sales: 0, cost: 0, fee: 0, dcost: 0, profit: 0, missing: 0, qty: 0, prod: {} };
  PF.orders.forEach(o => {
    const k = cairoDay(o.created_at);
    if (k < from || k > to || !statuses.includes(o.status)) return;
    const c = orderCalc(o); r.n++; r.sales += c.sales; r.cost += c.cost; r.fee += c.fee; r.dcost += c.dcost; r.profit += c.profit; r.missing += c.missing; r.qty += c.qty;
    (o.items || []).forEach(i => { r.prod[i.name] = (r.prod[i.name] || 0) + (+i.qty || 0); });
  });
  return r;
}
async function loadProfit() {
  const box = $('#profit');
  if (!box.dataset.ready) box.innerHTML = '<div class="hint2">بيحسب...</div>';
  const [o, c, mm] = await Promise.all([rpc('admin_list_orders', { p_pin: PIN }).catch(() => null), rpc('admin_get_costs', { p_pin: PIN }).catch(() => null), rpc('admin_get_materials', { p_pin: PIN }).catch(() => null)]);
  PF.mats = mm && mm.ok && Array.isArray(mm.data) ? mm.data : [];
  if (!o || !o.ok || !Array.isArray(o.data) || !c || !c.ok || !c.data) { box.innerHTML = '<div class="msg err">مشكلة في تحميل الحسابات — جرّب تاني</div>'; return; }
  PF.orders = o.data; PF.costs = c.data.costs || {}; PF.dcost = +c.data.delivery_cost || 0;
  if (!(rows && rows.length)) { try { const pr = await api('/rest/v1/products?select=id,name,price&order=sort.asc'); rows = await pr.json(); } catch (e) {} }
  box.dataset.ready = '1'; renderProfit();
}
function renderProfit() {
  const box = $('#profit'); const per = PF.per;
  const [from, to] = periodRange(per);
  const done = sumRange(from, to, ['delivered']);
  const pend = sumRange(from, to, ['new', 'confirmed', 'shipping']);
  const days = (new Date(to + 'T12:00:00Z') - new Date(from + 'T12:00:00Z')) / 864e5 + 1;
  const pf = addDays(from, -days), pt = addDays(from, -1);
  const prev = sumRange(pf, pt, ['delivered']);
  const margin = done.sales + done.fee > 0 ? done.profit / (done.sales + done.fee) * 100 : 0;
  const missingProducts = (rows || []).filter(p => PF.costs[String(p.id)] === undefined);
  let cls = 'none', vt = 'لسه مفيش طلبات اتسلّمت في الفترة دي', vs = 'أول ما تسلّم طلب هيظهر مكسبه هنا';
  if (done.n) {
    if (done.profit <= 0) { cls = 'bad'; vt = 'خسران ❌ راجع الأسعار والتكلفة'; }
    else if (margin < 15) { cls = 'warn'; vt = 'مكسبك قليل ⚠️ فكّر ترفّع الأسعار شوية'; }
    else { cls = 'good'; vt = 'شغلك ماشي صح ✅ كمّل'; }
    vs = done.n + ' طلب اتسلّم · نسبة المكسب ' + Math.round(margin) + '%';
  }
  const cmpTxt = per === 'today' || per === 'yday' ? 'إمبارح' : 'الفترة اللي قبلها';
  const cmp = prev.n || done.n ? (done.profit >= prev.profit ? '▲ أحسن من ' : '▼ أقل من ') + cmpTxt + ' (' + egp(prev.profit) + ')' : '';
  const today = cairoDay(new Date()); const bars = [];
  let mx = 1; for (let i = 6; i >= 0; i--) { const k = addDays(today, -i); const s = sumRange(k, k, ['delivered']); bars.push([k, s.profit]); mx = Math.max(mx, Math.abs(s.profit)); }
  const dn = k => new Date(k + 'T12:00:00Z').toLocaleDateString('ar-EG', { weekday: 'short', timeZone: 'UTC' });
  const matSpent = (PF.mats || []).filter(m => m.kind === 'buy' && String(m.day) >= from && String(m.day) <= to).reduce((s, m) => s + +m.price, 0);
  const top = Object.entries(done.prod).sort((x, y) => y[1] - x[1]).slice(0, 3);
  const chips = [['today', 'النهاردة'], ['yday', 'إمبارح'], ['week', 'آخر ٧ أيام'], ['month', 'الشهر ده']].map(f => `<button type="button" class="ochip ${per === f[0] ? 'on' : ''}" data-pf="${f[0]}">${f[1]}</button>`).join('');
  box.innerHTML = `<div class="pchips">${chips}</div>
  <div class="pv ${cls}"><div class="vt">${vt}</div><div class="vp">${egp(done.profit)}</div><div class="vs">${vs}</div>${cmp ? `<div class="vs" style="margin-top:6px">${cmp}</div>` : ''}</div>
  ${missingProducts.length ? `<div class="pwarn">⚠️ ناقص تكلفة ${missingProducts.length} منتج، فالمكسب مش دقيق. اكتب سعر الشراء لكل منتج من القسم اللي تحت.</div>` : ''}
  ${matSpent ? `<div class="pwarn" style="background:#eef3fa;border-color:#c9d6e8;color:#0b2a4a">📦 اشتريت خامات في الفترة دي بـ ${egp(matSpent)}. المبلغ ده مش متخصوم من المكسب فوق عشان التكلفة متتحسبش مرتين. لو سعر شراء المنتج مش شامل الأكياس والعبوات، ضيفها على تكلفة المنتج.</div>` : ''}
  <div class="pgrid">
    <div class="pst"><span>المبيعات</span><b>${egp(done.sales)}</b></div>
    <div class="pst"><span>تكلفة البضاعة</span><b>${egp(done.cost)}</b></div>
    <div class="pst"><span>خدمة التوصيل (من العملاء)</span><b>${egp(done.fee)}</b></div>
    <div class="pst"><span>تكلفة التوصيل عليك</span><b>${egp(done.dcost)}</b></div>
    <div class="pst"><span>قطع اتباعت</span><b>${done.qty}</b></div>
    <div class="pst"><span>لسه ماتسلمتش</span><b>${pend.n} طلب</b><span>مكسب متوقع ${egp(pend.profit)}</span></div>
  </div>
  <div class="pcard"><b style="font-size:14px;color:#0b2a4a">مكسب آخر ٧ أيام</b>
    <div class="pbars">${bars.map(b => `<div class="pbar"><em>${b[1] ? Math.round(b[1]) : ''}</em><i class="${b[1] < 0 ? 'neg' : ''}" style="height:${Math.max(2, Math.abs(b[1]) / mx * 90)}%"></i><span>${dn(b[0])}</span></div>`).join('')}</div></div>
  ${top.length ? `<div class="pcard"><b style="font-size:14px;color:#0b2a4a">الأكتر مبيعًا في الفترة</b>${top.map((t, i) => `<div class="crow"><div class="cn">${i + 1}. ${esc(t[0])}</div><b>${t[1]} قطعة</b></div>`).join('')}</div>` : ''}
  <div class="pcard"><b style="font-size:15px;color:#0b2a4a">سعر الشراء (التكلفة) لكل منتج</b>
    <div class="hint2" style="margin:4px 0 8px">اكتب كام بتشتري القطعة. بيتحفظ لوحده. الحسابات بتتحسب على التكلفة الحالية.</div>
    ${(rows || []).map(p => { const c = PF.costs[String(p.id)]; return `<div class="crow"><div class="cn">${esc(p.name)}<small>سعر البيع ${+p.price} ج.م</small></div><input type="number" inputmode="decimal" min="0" class="cin ${c === undefined ? 'miss' : ''}" data-cid="${p.id}" value="${c === undefined ? '' : +c}" placeholder="التكلفة"></div>`; }).join('')}
    <div class="crow" style="border-top:2px solid #f5c945;margin-top:6px"><div class="cn">تكلفة التوصيل عليك للطلب<small>اللي بتدفعه للمندوب أو البنزين. صفر لو مفيش.</small></div><input type="number" inputmode="decimal" min="0" class="cin" data-cid="delivery" value="${PF.dcost}"></div>
  </div>`;
}
document.addEventListener('click', e => { const c = e.target.closest && e.target.closest('[data-pf]'); if (c) { PF.per = c.dataset.pf; renderProfit(); } });
document.addEventListener('change', async e => {
  const el = e.target; if (!el.classList || !el.classList.contains('cin')) return;
  const id = el.dataset.cid; const v = el.value === '' ? null : +el.value;
  if (v === null || isNaN(v) || v < 0) return;
  el.classList.remove('miss', 'ok');
  const r = id === 'delivery' ? await rpc('admin_set_delivery_cost', { p_pin: PIN, p_cost: v }).catch(() => null) : await rpc('admin_set_cost', { p_pin: PIN, p_id: +id, p_cost: v }).catch(() => null);
  if (r && r.ok && r.data === true) { if (id === 'delivery') PF.dcost = v; else PF.costs[id] = v; el.classList.add('ok'); clearTimeout(PF.t); PF.t = setTimeout(() => { const keep = window.scrollY; renderProfit(); window.scrollTo(0, keep); }, 1200); }
  else { el.style.borderColor = '#d93025'; }
});

async function adminFcm() {
  try {
    if (!window.AndroidFCM || !PIN) return;
    const t = AndroidFCM.token(); if (!t) return;
    await fetch(SUPA_URL + '/rest/v1/rpc/admin_save_fcm', { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_pin: PIN, p_fcm: t }) });
  } catch (e) {}
}
async function enter() {
  const p = $('#pin').value.trim();
  $('#pinmsg').className = 'msg'; $('#pinmsg').textContent = '...';
  if (!p) { $('#pinmsg').textContent = 'اكتب الرقم السري'; return; }
  const ok = await checkPin(p).catch(() => false);
  if (!ok) { $('#pinmsg').className = 'msg err'; $('#pinmsg').textContent = 'الرقم غلط أو مفيش اتصال'; return; }
  PIN = p; localStorage.setItem('adminpin', p); nat.set(p);
  $('#pinbox').hidden = true; $('#panel').hidden = false; enterPanel();
  load(); loadOrders(); adminFcm(); setTimeout(adminFcm, 4000);
}

async function load() {
  const r = await api('/rest/v1/products?select=*&order=sort.asc');
  if (!r.ok) { $('#list').innerHTML = '<div class="pcard msg err">مشكلة في التحميل — جرّب تاني</div>'; return; }
  rows = await r.json();
  renderList();
}
let STK = {};
async function loadStock() {
  const r = await rpc('admin_get_stock', { p_pin: PIN }).catch(() => null);
  if (r && r.ok && r.data && typeof r.data === 'object') STK = r.data;
  if ($('#list')) renderList();
}
const stkOf = id => (STK[String(id)] === undefined ? null : +STK[String(id)]);
function lowCount() { return (rows || []).filter(p => { const s = stkOf(p.id); return s !== null && s < 3; }).length; }
function renderList() {
  const q = ($('#psearch').value || '').trim().toLowerCase();
  const list = rows.filter(p => !q || (p.name || '').toLowerCase().includes(q));
  $('#pcount').textContent = list.length + ' منتج';
  const lc = lowCount(); const nb = $('#nblow'); if (nb) { nb.hidden = !lc; nb.textContent = lc; }
  const lw = $('#lowwarn'); if (lw) { lw.hidden = !lc; lw.textContent = '⚠️ ' + lc + ' منتج المخزون بتاعه أقل من ٣ قطع: ' + (rows || []).filter(p => { const s = stkOf(p.id); return s !== null && s < 3; }).map(p => p.name).join('، '); }
  $('#list').innerHTML = list.map(p => { const sk = stkOf(p.id); const low = sk !== null && sk < 3; return `<button class="pli ${low ? 'low' : ''}" type="button" data-open="${p.id}"><img src="${esc(p.img || 'logo.jpg')}" alt=""><span class="pn">${esc(p.name)}${p.detail ? `<small>${esc(p.detail)}</small>` : ''}<small class="stk ${low ? 'lowt' : ''}">${sk === null ? 'المخزون: مش مسجل' : (low ? '⚠️ ' : '') + 'المخزون: ' + sk + ' قطعة'}</small></span><b>${+p.price || 0} <em>ج</em></b><i>‹</i></button>`; }).join('') || '<div class="pempty">مفيش منتج بالاسم ده</div>';
}
function openEdit(id) {
  const p = rows.find(x => x.id === id); if (!p) return;
  let o = $('#pedit');
  if (!o) { o = document.createElement('div'); o.id = 'pedit'; document.body.appendChild(o); }
  o.innerHTML = `<div class="phead"><button type="button" id="pclose">‹ رجوع للمنتجات</button></div>` + card(p);
  o.hidden = false; o.scrollTop = 0; document.body.style.overflow = 'hidden';
}
function closeEdit() { const o = $('#pedit'); if (o) o.hidden = true; document.body.style.overflow = ''; renderList(); }
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-open]'); if (b) openEdit(+b.dataset.open);
  if (e.target.closest && e.target.closest('#pclose')) closeEdit();
});

function card(p) {
  const desc = [(p.intro || '').trim()].concat(Array.isArray(p.pts) ? p.pts.map(s => '✓ ' + s) : []).filter(Boolean).join('\n');
  return `<div class="pcard" data-id="${p.id}">
  <div class="prow">
    ${p.img ? `<img src="${esc(p.img)}" alt="">` : '<img src="logo.jpg" alt="">'}
    <div class="pbody">
      <button class="photobtn" type="button" data-act="img">📷 تغيير الصورة</button>
      <span class="hint2 imgstat"></span>
      <input type="file" class="f-img" accept="image/*" hidden>
    </div>
  </div>
  <label class="lbl">الاسم</label>
  <input type="text" class="f-name" value="${esc(p.name)}">
  <label class="lbl">السعر (ج.م)</label>
  <input type="number" class="f-price" min="0" step="1" value="${+p.price || 0}">
  <label class="lbl">تفاصيل قصيرة (مثال: 4 لتر) — اختياري</label>
  <input type="text" class="f-detail" value="${esc(p.detail || '')}">
  <label class="lbl">المخزون (عدد القطع الموجودة) — بيظهرلك إنت بس</label>
  <input type="number" inputmode="numeric" min="0" step="1" class="f-stock" data-sid="${p.id}" value="${stkOf(p.id) === null ? '' : stkOf(p.id)}" placeholder="اكتب العدد اللي معاك">
  <label class="lbl">وصف المنتج</label>
  <textarea class="f-intro" rows="7" placeholder="اكتب وصف المنتج هنا. كل سطر هيظهر لوحده للعميل، وابدأ السطر بعلامة ✓ لو عايزه نقطة.">${esc(desc)}</textarea>
  <button class="abtn" type="button" data-act="save">حفظ التعديلات</button>
  <button class="abtn danger" type="button" data-act="del">حذف المنتج</button>
  <div class="msg"></div>
</div>`;
}

async function rpc(name, payload) {
  const r = await fetch(SUPA_URL + '/rest/v1/rpc/' + name, {
    method: 'POST',
    headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let data = null;
  try { data = await r.json(); } catch (e) {}
  return { ok: r.ok, status: r.status, data };
}

async function saveCard(el) {
  const id = +el.dataset.id;
  const msg = el.querySelector('.msg');
  const body = {
    p_name: el.querySelector('.f-name').value.trim(),
    p_price: +el.querySelector('.f-price').value || 0,
    p_detail: el.querySelector('.f-detail').value.trim(),
    p_intro: el.querySelector('.f-intro').value.trim(),
    p_pts: []
  };
  if (!body.p_name) { msg.className = 'msg err'; msg.textContent = 'الاسم مطلوب'; return; }
  msg.className = 'msg'; msg.textContent = 'بيحفظ...';
  const r = await rpc('admin_update_product', Object.assign({ p_pin: PIN, p_id: id }, body)).catch(() => null);
  const changed = r && r.ok && Array.isArray(r.data) ? r.data.length : 0;
  if (changed > 0) {
    const row = rows.find(x => x.id === id);
    if (row) Object.assign(row, { name: body.p_name, price: body.p_price, detail: body.p_detail, intro: body.p_intro, pts: [] });
    msg.className = 'msg ok'; msg.textContent = 'اتحفظ — ظهر في المتجر فورًا';
  } else { msg.className = 'msg err'; msg.textContent = 'فشل الحفظ — اتأكد من الرقم السري'; }
}

async function delCard(el) {
  const id = +el.dataset.id;
  const name = el.querySelector('.f-name').value;
  if (!confirm('تمسح "' + name + '" نهائي؟')) return;
  const r = await rpc('admin_delete_product', { p_pin: PIN, p_id: id }).catch(() => null);
  if (r && r.ok && r.data === true) { rows = rows.filter(x => x.id !== id); closeEdit(); }
  else { const msg = el.querySelector('.msg'); msg.className = 'msg err'; msg.textContent = 'فشل الحذف — اتأكد من الرقم السري'; }
}

async function addNew() {
  const maxId = rows.reduce((m, p) => Math.max(m, p.id), 0);
  const maxSort = rows.reduce((m, p) => Math.max(m, p.sort || 0), 0);
  const body = { p_pin: PIN, p_id: maxId + 1, p_sort: maxSort + 10, p_name: 'منتج جديد', p_price: 0, p_detail: '', p_intro: '', p_pts: [], p_img: '' };
  const r = await rpc('admin_add_product', body).catch(() => null);
  if (r && r.ok && Array.isArray(r.data) && r.data.length) { await load(); openEdit(maxId + 1); } else alert('فشل الإضافة — اتأكد من الرقم السري');
}


function shrinkImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const rd = new FileReader();
    rd.onerror = () => resolve(null);
    rd.onload = () => { img.onload = () => {
      const max = 600;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(img.src);
      resolve(cv.toDataURL('image/jpeg', 0.82));
    }; img.onerror = () => resolve(null); img.src = rd.result; };
    rd.readAsDataURL(file);
  });
}

async function uploadImg(el, file) {
  const id = +el.dataset.id;
  const stat = el.querySelector('.imgstat');
  stat.className = 'hint2 imgstat'; stat.textContent = 'بيترفع...';
  const url = await shrinkImage(file);
  if (url) { const pi = el.querySelector('.prow img'); if (pi) pi.src = url; }
  if (!url) { stat.textContent = 'الصورة مش مدعومة'; return; }
  const r2 = await rpc('admin_update_product', { p_pin: PIN, p_id: id, p_img: url }).catch(() => null);
  if (r2 && r2.ok && Array.isArray(r2.data) && r2.data.length) {
    stat.textContent = '✅ الصورة اتغيرت واتحفظت';
    const img = el.querySelector('.prow img'); if (img) img.src = url;
    const row = rows.find(x => x.id === id); if (row) row.img = url;
  } else stat.textContent = '❌ فشل حفظ الصورة — جرّب تاني';
}

async function changePin() {
  const o = $('#oldpin').value.trim(), n = $('#newpin').value.trim();
  const m = $('#pin2msg');
  if (n.length < 4) { m.className = 'msg err'; m.textContent = 'الرقم الجديد لازم ٤ أرقام أو أكتر'; return; }
  const r = await fetch(SUPA_URL + '/rest/v1/rpc/set_pin', {
    method: 'POST',
    headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ old_pin: o, new_pin: n })
  });
  const ok = r.ok && (await r.json()) === true;
  if (ok) { PIN = n; localStorage.setItem('adminpin', n); nat.set(n); m.className = 'msg ok'; m.textContent = 'الرقم اتغير — خده بالرقم الجديد'; $('#oldpin').value = ''; $('#newpin').value = ''; }
  else { m.className = 'msg err'; m.textContent = 'الرقم الحالي غلط'; }
}

$('#enter').addEventListener('click', enter);
$('#pin').addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });
$('#logout').addEventListener('click', () => { localStorage.removeItem('adminpin'); nat.set(''); location.reload(); });
$('#addnew').addEventListener('click', addNew);
$('#psearch').addEventListener('input', renderList);
$('#changepin').addEventListener('click', changePin);
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const el = b.closest('.pcard');
  if (b.dataset.act === 'save') saveCard(el);
  else if (b.dataset.act === 'del') delCard(el);
  else if (b.dataset.act === 'img') el.querySelector('.f-img').click();
});
document.addEventListener('change', e => {
  if (e.target.classList && e.target.classList.contains('f-img') && e.target.files.length) {
    uploadImg(e.target.closest('.pcard'), e.target.files[0]);
  }
});
(async () => {
  let st = 'net';
  if (PIN) { try { const rr = await checkPin(PIN); st = rr ? 'ok' : 'bad'; } catch (e) { st = 'net'; } }
  if (PIN && st === 'net') st = 'ok';
  if (!(PIN && st === 'ok')) { try { $('#pinmsg').textContent = 'v44 | app:' + (window.AndroidFCM && AndroidFCM.getPin ? 'v3' : 'old/none') + ' | saved:' + (PIN ? 'yes' : 'no') + ' | check:' + st; } catch (e) {} }
  if (PIN && st === 'ok') {
    $('#pinbox').hidden = true; $('#panel').hidden = false; enterPanel(); load(); loadOrders(); adminFcm(); setTimeout(adminFcm, 4000);
  }
})();

const ST = { new: 'جديد', confirmed: 'اتأكد', shipping: 'في الطريق', delivered: 'تم التسليم', canceled: 'ملغي' };
let PIMG = {};
function imgOf(it) {
  const v = PIMG[it.id];
  if (!v) return 'logo.jpg';
  return v;
}
function waCust(phone, o) {
  let n = String(phone).replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.startsWith('0')) n = '20' + n.slice(1);
  const txt = 'أهلاً ' + o.customer_name + '، معاك منظفات القبطان بخصوص طلبك رقم ' + o.id + '.';
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(txt);
}
async function loadOrders() {
  const box = $('#orders'); if (!box.innerHTML.trim()) box.innerHTML = '<div class="hint2">بيحمّل...</div>';
  const r = await rpc('admin_list_orders', { p_pin: PIN }).catch(() => null);
  if (!r || !r.ok || !Array.isArray(r.data)) { box.innerHTML = '<div class="msg err">مشكلة في تحميل الطلبات</div>'; return; }
  if (!r.data.length) { box.innerHTML = '<div class="hint2">مفيش طلبات لسه.</div>'; return; }
  PIMG = {}; (rows || []).forEach(p => { PIMG[p.id] = p.img; });
  if (!rows.length) { try { const pr = await api('/rest/v1/products?select=id,img'); (await pr.json()).forEach(p => { PIMG[p.id] = p.img; }); } catch (e) {} }
  ORDS = r.data; renderOrders();
}
let ORDS = [], OFIL = 'active';
const OFILS = [['active', 'شغّالة'], ['new', 'جديد'], ['delivered', 'اتسلّم'], ['canceled', 'ملغي'], ['all', 'الكل']];
const NEXT = { new: ['confirmed', '✅ تأكيد الطلب'], confirmed: ['shipping', '🚚 خرج للتوصيل'], shipping: ['delivered', '📦 تم التسليم'] };
function ofilter(o) { return OFIL === 'all' ? true : OFIL === 'active' ? ['new', 'confirmed', 'shipping'].includes(o.status) : o.status === OFIL; }
function renderOrders() {
  const box = $('#orders');
  const data = ORDS;
  const cnt = k => data.filter(o => k === 'all' ? true : k === 'active' ? ['new', 'confirmed', 'shipping'].includes(o.status) : o.status === k).length;
  const newN = cnt('new'); { const nb = $('#nbnew'); if (nb) { nb.textContent = newN || ''; nb.hidden = !newN; } }
  const fmtD = s => { const d = new Date(s); return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) + ' · ' + d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' }); };
  const chips = '<div class="ochips">' + OFILS.map(f => `<button type="button" class="ochip ${OFIL === f[0] ? 'on' : ''}" data-f="${f[0]}">${f[1]}<i>${cnt(f[0])}</i></button>`).join('') + '</div>';
  const list = data.filter(ofilter);
  const stats = '';
  box.innerHTML = chips + (list.length ? list.map(o => {
    const its = o.items || [];
    const qty = its.reduce((s, i) => s + (+i.qty || 0), 0);
    const first = its[0] ? esc(its[0].name) : '';
    const more = its.length > 1 ? ` +${its.length - 1}` : '';
    const items = its.map(i => `<div class="oit"><img src="${esc(imgOf(i))}" alt=""><div class="oib"><b>${esc(i.name)}</b><span>${+i.qty} × ${+i.price} ج.م</span></div><div class="oil">${(+i.qty) * (+i.price)} ج.م</div></div>`).join('');
    const pay = o.payment === 'cash' ? '💵 كاش عند الاستلام' : o.payment === 'vodafone' ? '📱 فودافون كاش' : esc(o.payment);
    const nx = NEXT[o.status];
    return `<div class="oc st-${esc(o.status)}" data-oid="${o.id}">
    <div class="oc-h"><b class="oc-id">#${o.id}</b><span class="bd s-${esc(o.status)}">${esc(ST[o.status] || o.status)}</span><span class="oc-t">${esc(fmtD(o.created_at))}</span></div>
    <div class="oc-who">${esc(o.customer_name)}</div>
    <div class="oc-ad">📍 ${esc(o.address)}${o.city ? ' — ' + esc(o.city) : ''}</div>
    <div class="oc-ct"><a class="ob call" href="tel:${esc(o.phone)}">📞 ${esc(o.phone)}</a><a class="ob wa2" href="${esc(waCust(o.phone, o))}" target="_blank" rel="noopener">واتساب</a></div>
    <details class="oc-it"><summary>🧺 ${qty} قطعة — ${first}${more}</summary>${items}</details>
    <div class="oc-tot"><span class="pay">${pay}</span><span class="amt">${+o.total} <small>ج.م</small></span></div>
    ${+o.delivery_fee ? `<div class="oc-fee">منتجات ${+o.subtotal} + خدمة توصيل ${+o.delivery_fee}</div>` : ''}
    ${o.rating ? `<div class="oc-rt"><b>${'★'.repeat(o.rating)}${'☆'.repeat(5 - o.rating)}</b>${o.rating_comment ? `<span>${esc(o.rating_comment)}</span>` : ''}</div>` : ''}
    ${nx ? `<button type="button" class="oc-next" data-to="${nx[0]}">${nx[1]}</button>` : ''}
    <div class="oc-st"><label>تغيير الحالة</label><select class="ost">${Object.keys(ST).map(k => `<option value="${k}" ${k === o.status ? 'selected' : ''}>${ST[k]}</option>`).join('')}</select></div><div class="msg"></div></div>`;
  }).join('') : '<div class="hint2" style="padding:18px 4px;text-align:center">مفيش طلبات هنا.</div>');
}
document.addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('.ochip');
  if (c && c.dataset.f) { OFIL = c.dataset.f; renderOrders(); return; }
  const n = e.target.closest && e.target.closest('.oc-next');
  if (n) { const card = n.closest('.oc'); const sel = card.querySelector('.ost'); n.disabled = true; sel.value = n.dataset.to; sel.dispatchEvent(new Event('change', { bubbles: true })); }
});
document.addEventListener('change', async e => {
  if (!e.target.classList || !e.target.classList.contains('ost')) return;
  const el = e.target.closest('.ord'); const msg = el.querySelector('.msg');
  const r = await rpc('admin_set_order_status', { p_pin: PIN, p_id: +el.dataset.oid, p_status: e.target.value }).catch(() => null);
  if (r && r.ok && r.data === true) { msg.className = 'msg ok'; msg.textContent = 'اتحدّث'; el.classList.toggle('new', e.target.value === 'new'); const bd = el.querySelector('.bd'); bd.textContent = ST[e.target.value]; bd.className = 'bd s-' + e.target.value; setTimeout(loadOrders, 700); }
  else { msg.className = 'msg err'; msg.textContent = 'فشل التحديث'; }
});
$('#reloadord').addEventListener('click', loadOrders);

async function loadFeeAdmin() { try { const r = await fetch(SUPA_URL + '/rest/v1/app_settings?select=value&key=eq.delivery_fee', { headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON } }); const d = await r.json(); $('#feeval').value = d[0] ? d[0].value : 25; } catch (e) {} }
loadFeeAdmin();
$('#savefee').onclick = async () => { const m = $('#feemsg'); const v = parseFloat($('#feeval').value); if (isNaN(v) || v < 0) { m.className = 'msg err'; m.textContent = 'اكتب رقم صح'; return; }
  const r = await rpc('admin_set_fee', { p_pin: PIN, p_fee: v }).catch(() => null);
  if (r && r.ok) { m.className = 'msg ok'; m.textContent = 'اتحفظت: ' + v + ' ج.م'; } else { m.className = 'msg err'; m.textContent = 'مشكلة في الحفظ'; } };

async function loadVfAdmin() { try { const r = await fetch(SUPA_URL + '/rest/v1/app_settings?select=value&key=eq.vodafone_number', { headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON } }); const d = await r.json(); $('#vfval').value = d[0] ? d[0].value : ''; } catch (e) {} }
loadVfAdmin();
$('#savevf').onclick = async () => { const m = $('#vfmsg'); const v = $('#vfval').value.trim();
  const r = await rpc('admin_set_vf', { p_pin: PIN, p_num: v }).catch(() => null);
  if (r && r.ok) { m.className = 'msg ok'; m.textContent = v ? 'اتحفظ: ' + v : 'اتمسح — الرقم مش هيظهر للعميل'; } else { m.className = 'msg err'; m.textContent = 'مشكلة في الحفظ'; } };

setInterval(() => { try { if (!$('#panel').hidden && !(document.activeElement && /SELECT|INPUT|TEXTAREA/.test(document.activeElement.tagName)) && document.visibilityState === 'visible') loadOrders(); } catch (e) {} }, 30000);
document.addEventListener('visibilitychange', () => { try { if (document.visibilityState === 'visible' && !$('#panel').hidden) loadOrders(); } catch (e) {} });

document.addEventListener('change', async e => {
  const el = e.target; if (!el.classList || !el.classList.contains('f-stock')) return;
  const v = el.value === '' ? null : Math.floor(+el.value); if (v === null || isNaN(v) || v < 0) return;
  const r = await rpc('admin_set_stock', { p_pin: PIN, p_id: +el.dataset.sid, p_qty: v }).catch(() => null);
  if (r && r.ok && r.data === true) { STK[String(el.dataset.sid)] = v; el.style.borderColor = '#2bc16a'; } else el.style.borderColor = '#d93025';
});

/* ===== الخامات ===== */
let MAT = [];
const todayK = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
async function loadMats() {
  const r = await rpc('admin_get_materials', { p_pin: PIN }).catch(() => null);
  if (!r || !r.ok || !Array.isArray(r.data)) { $('#matbox').innerHTML = '<div class="msg err">مشكلة في التحميل — جرّب تاني</div>'; return; }
  MAT = r.data; renderMats();
}
function matGroups() {
  const g = {};
  MAT.forEach(m => { const x = g[m.name] || (g[m.name] = { name: m.name, bought: 0, used: 0, spent: 0, log: [] }); if (m.kind === 'buy') { x.bought += +m.qty; x.spent += +m.price; } else x.used += +m.qty; x.log.push(m); });
  return Object.values(g).sort((p, q) => (q.log[0].day + q.log[0].id).localeCompare(p.log[0].day + p.log[0].id));
}
const nf = n => (Math.round(n * 100) / 100).toLocaleString('en-US');
function renderMats() {
  const mk = todayK().slice(0, 7);
  const total = MAT.filter(m => m.kind === 'buy').reduce((s, m) => s + +m.price, 0);
  const month = MAT.filter(m => m.kind === 'buy' && String(m.day).slice(0, 7) === mk).reduce((s, m) => s + +m.price, 0);
  const g = matGroups();
  const names = g.map(x => `<option value="${esc(x.name)}">`).join('');
  $('#matbox').innerHTML = `<div class="pgrid"><div class="pst"><span>صرفت على الخامات الشهر ده</span><b>${egp(month)}</b></div><div class="pst"><span>إجمالي اللي صرفته</span><b>${egp(total)}</b></div></div>
  <details class="pcard matform" id="matform"><summary>+ تسجيل شراء خامة جديد</summary>
    <label class="lbl">اسم الخامة (مثال: أكياس، عبوات فاضية، جراكن)</label><input type="text" id="m-name" list="m-names" autocomplete="off"><datalist id="m-names">${names}</datalist>
    <label class="lbl">العدد اللي جبته</label><input type="number" inputmode="decimal" min="0" id="m-qty">
    <label class="lbl">دفعت كام (الإجمالي بالجنيه)</label><input type="number" inputmode="decimal" min="0" id="m-price">
    <label class="lbl">التاريخ</label><input type="date" id="m-day" value="${todayK()}">
    <label class="lbl">اسم المورّد — اختياري</label><input type="text" id="m-sup">
    <button class="abtn" type="button" id="m-save">حفظ الشراء</button><div class="msg" id="m-msg"></div>
  </details>
  ${g.length ? g.map(x => { const rem = x.bought - x.used; return `<div class="pcard mat"><div class="mh"><b>${esc(x.name)}</b><span class="mrem ${rem <= 0 ? 'zero' : ''}">فاضل ${nf(rem)}</span></div>
    <div class="msub">اشتريت ${nf(x.bought)} · استخدمت ${nf(x.used)} · صرفت ${egp(x.spent)}${x.bought ? ' · متوسط ' + egp(x.spent / x.bought) + ' للواحد' : ''}</div>
    <div class="muse"><input type="number" inputmode="decimal" min="0" placeholder="استخدمت كام؟" data-mu="${esc(x.name)}"><button type="button" class="abtn sec" data-muse="${esc(x.name)}">− استخدمت</button><button type="button" class="abtn" data-mbuy="${esc(x.name)}">+ شراء</button></div>
    <details class="mlog"><summary>السجل (${x.log.length})</summary>${x.log.map(m => `<div class="crow"><div class="cn">${m.kind === 'buy' ? '➕ اشتريت ' : '➖ استخدمت '}${nf(+m.qty)}${m.kind === 'buy' ? ' بـ ' + egp(+m.price) : ''}<small>${esc(String(m.day))}${m.supplier ? ' · ' + esc(m.supplier) : ''}</small></div><button type="button" class="mdel" data-mdel="${m.id}">✕</button></div>`).join('')}</details></div>`; }).join('') : '<div class="pempty">لسه مسجلتش أي خامة. دوس "تسجيل شراء خامة جديد".</div>'}`;
}
async function matAdd(name, kind, qty, price, sup, day, msg) {
  if (!name || !(qty > 0)) { if (msg) { msg.className = 'msg err'; msg.textContent = 'اكتب الاسم والعدد'; } return false; }
  const r = await rpc('admin_add_material', { p_pin: PIN, p_name: name, p_kind: kind, p_qty: qty, p_price: price || 0, p_supplier: sup || '', p_day: day || todayK() }).catch(() => null);
  if (r && r.ok && r.data === true) { await loadMats(); return true; }
  if (msg) { msg.className = 'msg err'; msg.textContent = 'فشل الحفظ — جرّب تاني'; } return false;
}
document.addEventListener('click', async e => {
  const t = e.target; if (!t.closest) return;
  if (t.id === 'm-save') { await matAdd($('#m-name').value.trim(), 'buy', +$('#m-qty').value, +$('#m-price').value, $('#m-sup').value.trim(), $('#m-day').value, $('#m-msg')); return; }
  const u = t.closest('[data-muse]'); if (u) { const n = u.dataset.muse; const inp = [...document.querySelectorAll('[data-mu]')].find(i => i.dataset.mu === n); const q = +inp.value; if (!(q > 0)) { inp.style.borderColor = '#d93025'; return; } u.disabled = true; await matAdd(n, 'use', q, 0, '', todayK()); return; }
  const b = t.closest('[data-mbuy]'); if (b) { const f = $('#matform'); f.open = true; $('#m-name').value = b.dataset.mbuy; f.scrollIntoView({ behavior: 'smooth' }); $('#m-qty').focus(); return; }
  const d = t.closest('[data-mdel]'); if (d) { if (!confirm('تمسح السطر ده؟')) return; const r = await rpc('admin_del_material', { p_pin: PIN, p_id: +d.dataset.mdel }).catch(() => null); if (r && r.ok) loadMats(); }
});
