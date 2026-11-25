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
  if (!['orders', 'products', 'settings'].includes(s)) s = 'orders';
  document.querySelectorAll('.tabsec').forEach(e => e.classList.toggle('on', e.id === 'sec-' + s));
  document.querySelectorAll('#bnav button').forEach(b => b.classList.toggle('on', b.dataset.sec === s));
  try { localStorage.setItem('admsec', s); } catch (e) {}
  window.scrollTo(0, 0);
}
document.querySelectorAll('#bnav button').forEach(b => b.addEventListener('click', () => { showSec(b.dataset.sec); if (b.dataset.sec === 'orders') loadOrders(); }));
function enterPanel() { $('#bnav').hidden = false; showSec((new URLSearchParams(location.search).get('tab')) || 'orders'); }
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
  $('#list').innerHTML = rows.map(card).join('');
}

function card(p) {
  const pts = Array.isArray(p.pts) ? p.pts.join('\n') : '';
  return `<div class="pcard" data-id="${p.id}">
  <div class="prow">
    ${p.img ? `<img src="${esc(p.img)}" alt="">` : '<img src="logo.jpg" alt="">'}
    <div class="pbody">
      <label class="lbl" style="margin-top:0">الاسم</label>
      <input type="text" class="f-name" value="${esc(p.name)}">
    </div>
  </div>
  <label class="lbl">السعر (ج.م)</label>
  <input type="number" class="f-price" min="0" step="1" value="${+p.price || 0}">
  <label class="lbl">تفاصيل قصيرة (مثال: 4 لتر) — اختياري</label>
  <input type="text" class="f-detail" value="${esc(p.detail || '')}">
  <label class="lbl">الوصف الأول — اختياري</label>
  <textarea class="f-intro" rows="2">${esc(p.intro || '')}</textarea>
  <label class="lbl">نقاط الوصف (كل نقطة في سطر) — اختياري</label>
  <textarea class="f-pts" rows="3">${esc(pts)}</textarea>
  <input type="file" class="f-img" accept="image/*" hidden>
  <button class="filebtn" type="button" data-act="img">تغيير الصورة من الموبايل</button>
  <span class="hint2 imgstat"></span>
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
    p_pts: el.querySelector('.f-pts').value.split('\n').map(s => s.trim()).filter(Boolean)
  };
  if (!body.p_name) { msg.className = 'msg err'; msg.textContent = 'الاسم مطلوب'; return; }
  msg.className = 'msg'; msg.textContent = 'بيحفظ...';
  const r = await rpc('admin_update_product', Object.assign({ p_pin: PIN, p_id: id }, body)).catch(() => null);
  const changed = r && r.ok && Array.isArray(r.data) ? r.data.length : 0;
  if (changed > 0) {
    const row = rows.find(x => x.id === id);
    if (row) Object.assign(row, { name: body.p_name, price: body.p_price, detail: body.p_detail, intro: body.p_intro, pts: body.p_pts });
    msg.className = 'msg ok'; msg.textContent = 'اتحفظ — ظهر في المتجر فورًا';
  } else { msg.className = 'msg err'; msg.textContent = 'فشل الحفظ — اتأكد من الرقم السري'; }
}

async function delCard(el) {
  const id = +el.dataset.id;
  const name = el.querySelector('.f-name').value;
  if (!confirm('تمسح "' + name + '" نهائي؟')) return;
  const r = await rpc('admin_delete_product', { p_pin: PIN, p_id: id }).catch(() => null);
  if (r && r.ok && r.data === true) { el.remove(); rows = rows.filter(x => x.id !== id); }
  else { const msg = el.querySelector('.msg'); msg.className = 'msg err'; msg.textContent = 'فشل الحذف — اتأكد من الرقم السري'; }
}

async function addNew() {
  const maxId = rows.reduce((m, p) => Math.max(m, p.id), 0);
  const maxSort = rows.reduce((m, p) => Math.max(m, p.sort || 0), 0);
  const body = { p_pin: PIN, p_id: maxId + 1, p_sort: maxSort + 10, p_name: 'منتج جديد', p_price: 0, p_detail: '', p_intro: '', p_pts: [], p_img: '' };
  const r = await rpc('admin_add_product', body).catch(() => null);
  if (r && r.ok && Array.isArray(r.data) && r.data.length) load(); else alert('فشل الإضافة — اتأكد من الرقم السري');
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
  stat.textContent = ' بيترفع...';
  const url = await shrinkImage(file);
  if (!url) { stat.textContent = ' الصورة مش مدعومة'; return; }
  const r2 = await rpc('admin_update_product', { p_pin: PIN, p_id: id, p_img: url }).catch(() => null);
  if (r2 && r2.ok && Array.isArray(r2.data) && r2.data.length) {
    stat.textContent = ' الصورة اتحدثت';
    const img = el.querySelector('.prow img'); if (img) img.src = url;
    const row = rows.find(x => x.id === id); if (row) row.img = url;
  } else stat.textContent = ' فشل حفظ الصورة — اتأكد من الرقم السري';
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
  if (!(PIN && st === 'ok')) { try { $('#pinmsg').textContent = 'v42 | app:' + (window.AndroidFCM && AndroidFCM.getPin ? 'v3' : 'old/none') + ' | saved:' + (PIN ? 'yes' : 'no') + ' | check:' + st; } catch (e) {} }
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
  if (c) { OFIL = c.dataset.f; renderOrders(); return; }
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
