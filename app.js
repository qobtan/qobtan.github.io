const SUPA_URL = 'https://aiqfiiuozweqbqlgivqj.supabase.co';
const SUPA_ANON = 'sb_publishable_POz8lTd9lNj2xId7tzghHQ_dkEbX3n9';
let PRODUCTS = window.PRODUCTS || [];
const WA = '201028540358';
const $ = s => document.querySelector(s);
const view = $('#view');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};
let cart = store.get('cart', {});
let info = store.get('info', { name: '', phone: '', address: '' });
let CAT = 'منظفات';
let tab = /tab=orders/.test(location.search) ? 'orders' : 'shop', q = '', det = null;
const money = n => n + ' ج.م';
let FEE = store.get('fee', 25);
let CREDIT = 0, CREDPH = '', REVS = store.get('revs', null), IMGS = store.get('rimgs', []), IMGD = {};
const disc = () => CREDIT > 0 ? FEE : 0;
const grand = () => total() + FEE - disc();
const rp = async (n, b) => { try { const r = await fetch(SUPA_URL + '/rest/v1/rpc/' + n, { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return r.ok ? await r.json() : null; } catch (e) { return null; } };
(function () { const m = /[?&]ref=([A-Za-z0-9]+)/.exec(location.search); if (m) { try { localStorage.setItem('refcode', JSON.stringify(m[1].toUpperCase())); } catch (e) {} } })();
async function loadCredit() { const ph = (info.phone || '').replace(/\D/g, ''); if (ph.length < 10 || ph === CREDPH) return; CREDPH = ph; const r = await rp('ref_credit', { p_phone: ph }); const n = r && r.available > 0 ? 1 : 0; if (n !== CREDIT) { CREDIT = n; if (tab === 'cart' && det === null) render(true); } }
let PAY = store.get('pay', 'cash'); if (PAY !== 'vodafone') PAY = 'cash';
let VF = store.get('vf', '01028540358');
const vfLine = () => `للدفع عبر فودافون كاش، حوّل إجمالي طلبك على الرقم التالي، ونتشرف بخدمتك 🌹<div style="margin-top:6px"><b dir="ltr">${esc(VF)}</b> <button type="button" class="vfcopy" data-copy="${esc(VF)}">نسخ</button></div>`;
const payLabel = p => p === 'vodafone' ? 'فودافون كاش' : 'كاش عند الاستلام';
const THX = 'سعداء بخدمة حضرتك 🌹';
async function loadFee() { try { const r = await fetch(SUPA_URL + '/rest/v1/app_settings?select=key,value&key=in.(delivery_fee,vodafone_number)', { headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON } }); const d = await r.json(); if (!Array.isArray(d)) return; d.forEach(x => { if (x.key === 'delivery_fee') { const v = parseFloat(x.value); if (!isNaN(v)) { FEE = v; store.set('fee', v); } } if (x.key === 'vodafone_number') { VF = (x.value || '').trim(); store.set('vf', VF); } }); render(true); } catch (e) {} }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ck = (p, c) => c ? p.id + '~' + c : '' + p.id;
let SEL = '';
const lines = () => { const out = []; for (const k in cart) { const q = cart[k]; if (!(q > 0)) continue; const i = k.indexOf('~'); const id = +(i < 0 ? k : k.slice(0, i)); const c = i < 0 ? '' : k.slice(i + 1); const p = PRODUCTS.find(x => x.id === id); if (!p || !(p.price > 0)) continue; if (p.opts ? !p.opts.choices.includes(c) : c) continue; out.push({ k, p, c, q, id, name: c ? `${p.name} (${p.opts.title}: ${c})` : p.name, price: p.price, img: p.img }); } return out; };
const count = () => lines().reduce((s, l) => s + l.q, 0);
const total = () => lines().reduce((s, l) => s + l.q * l.price, 0);
const pq = p => lines().filter(l => l.id === p.id).reduce((s, l) => s + l.q, 0);
function change(k, d) { cart[k] = Math.max(0, (cart[k] || 0) + d); store.set('cart', cart); render(true); }
function badge() { const b = $('#badge'); b.hidden = count() === 0; b.textContent = count(); const ob = $('#obadge'); if (ob) { const n = MYDATA ? MYDATA.length : MYO.length; ob.hidden = n === 0; ob.textContent = n; } }
function ctl(p, isDet) {
  if (p.price <= 0) return '';
  if (p.opts) {
    if (!isDet) { const n = pq(p); return `<button class="add" data-open="${p.id}">${n ? 'في السلة (' + n + ') ‹' : 'اختار ' + esc(p.opts.title)}</button>`; }
    const k = SEL ? ck(p, SEL) : '', n = k ? (cart[k] || 0) : 0;
    const chips = `<div class="opts"><div class="ot">${esc(p.opts.title)} <i>(لازم تختار)</i></div><div class="och">${p.opts.choices.map(c => `<button type="button" class="chip${SEL === c ? ' on' : ''}" data-sel="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`;
    return chips + (!SEL ? `<button class="add dis" type="button" disabled>اختار ${esc(p.opts.title)} الأول</button>` : n === 0 ? `<button class="add" data-add="${esc(k)}">أضف للسلة</button>` : `<div class="step"><button data-dec="${esc(k)}" aria-label="نقص">−</button><bdi>${n}</bdi><button data-inc="${esc(k)}" aria-label="زود">+</button></div>`);
  }
  const n = cart[p.id] || 0;
  return n === 0 ? `<button class="add" data-add="${p.id}">أضف للسلة</button>`
    : `<div class="step"><button data-dec="${p.id}" aria-label="نقص">−</button><bdi>${n}</bdi><button data-inc="${p.id}" aria-label="زود">+</button></div>`;
}
function cardHtml(p) {
  return `<div class="card${pq(p) > 0 ? ' in' : ''}" data-open="${p.id}"><div class="pw">${p.img ? `<img src="${p.img}" alt="${esc(p.name)}">` : '<div class="ph"></div>'}</div>
  <div class="t">${esc(p.name)}</div>${(()=>{const l=p.desc?String(p.desc.intro||'').split('\n').map(s=>s.trim()).filter(Boolean)[0]||'':'';return l?`<div class="ds">${esc(l.replace(/^[✓•]\s*/,''))}</div>`:''})()}${p.detail && p.price > 0 ? `<div class="sz">${esc(p.detail)}</div>` : ''}<div class="more">التفاصيل ‹</div><div class="pr">${p.price > 0 ? `<b>${p.price}</b> ج.م` : '<span class="soon">السعر قريبًا</span>'}</div>${ctl(p)}</div>`;
}
function shop() {
  view.innerHTML = `<div class="search"><input type="search" id="q" placeholder="دوّر على منتج..." value="${esc(q)}"></div>
  <div class="cats" id="cats">${['منظفات', 'عطور'].map(c => `<button type="button" class="cat${CAT === c ? ' on' : ''}" data-cat="${c}">${c === 'منظفات' ? 'منظفات 🧴' : 'عطور وبخور 🪔'}</button>`).join('')}</div><div class="sec"><span>منتجاتنا</span><em id="cnt"></em></div><div class="grid" id="grid"></div><div id="empty"></div>${count() ? `<div class="bar"><div><span>${count()} قطعة</span><b>${money(total())}</b></div><button class="go" data-tab="cart">كمّل الطلب</button></div>` : ''}`;
  shopGrid();
  $('#q').addEventListener('input', e => { q = e.target.value; shopGrid(); });
  $('#cats').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (!b) return; CAT = b.dataset.cat; document.querySelectorAll('#cats .cat').forEach(x => x.classList.toggle('on', x.dataset.cat === CAT)); shopGrid(); });
}
function shopGrid() {
  const list = PRODUCTS.filter(p => (CAT === 'الكل' || (p.cat || 'منظفات') === CAT) && (!q.trim() || p.name.includes(q.trim())));
  $('#grid').innerHTML = list.map(cardHtml).join('');
  $('#cnt').textContent = list.length + ' منتج';
  $('#empty').innerHTML = list.length ? '' : '<div class="empty">مفيش منتج بالاسم ده</div>';
}
function waLink() {
  const L = lines();
  const msg = ['طلب جديد من تطبيق منظفات القبطان', ...L.map(l => `${l.q} × ${l.name} = ${money(l.price * l.q)}`),
    `إجمالي المنتجات: ${money(total())}`, `خدمة توصيل: ${money(FEE - disc())}`, `الإجمالي: ${money(grand())}`, `الدفع: ${payLabel(PAY)}`, `الاسم: ${info.name.trim()}`, `التليفون: ${info.phone.trim()}`, `العنوان (الفيوم): ${info.address.trim()}`, THX].join('\n');
  return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
}
function ready() { return lines().length > 0 && info.name.trim() && info.phone.trim() && info.address.trim(); }
function cartView() {
  const L = lines();
  view.innerHTML = `<div class="sec"><span>سلتك</span><em>${count()} قطعة</em></div>` + (L.length === 0 ? '<div class="empty">السلة فاضية<br><button class="go" data-tab="shop">ارجع للمنتجات</button></div>' : `
  <div class="lines">${L.map(l => `<div class="l2">${l.img ? `<img src="${l.img}" alt="">` : ''}<div class="li"><b>${esc(l.p.name)}</b>${l.c ? `<span class="lo">${esc(l.p.opts.title)}: ${esc(l.c)}</span>` : ''}<span>${l.q} × ${money(l.price)}</span><span class="lt">${money(l.price * l.q)}</span></div>
  <div class="step"><button data-dec="${esc(l.k)}">−</button><bdi>${l.q}</bdi><button data-inc="${esc(l.k)}">+</button></div></div>`).join('')}</div>
  <div class="sum"><div><span>عدد القطع</span><b>${count()}</b></div><div><span>إجمالي المنتجات</span><b>${money(total())}</b></div><div><span>خدمة توصيل${disc() ? ' (توصيل مجاني - دعوة أصدقاء)' : ''}</span><b>${money(FEE - disc())}</b></div><div class="gt"><span>الإجمالي</span><b>${money(grand())}</b></div></div><div class="thx" style="text-align:center;color:#0b2a4a;font-weight:700;margin:8px 0">${THX}</div>
  ${refNote()}<div class="sec"><span>بيانات التوصيل</span><em>الفيوم</em></div>
  <label class="f"><span>الاسم</span><input type="text" id="f-name" value="${esc(info.name)}" autocomplete="name"></label>
  <label class="f"><span>رقم التليفون</span><input type="tel" id="f-phone" value="${esc(info.phone)}" autocomplete="tel"></label>
  <label class="f"><span>العنوان بالتفصيل</span><input type="text" id="f-address" value="${esc(info.address)}" autocomplete="street-address"></label>
  <div class="f"><span>طريقة الدفع</span><div class="pay"><button type="button" class="pb${PAY === 'cash' ? ' on' : ''}" data-pay="cash">كاش عند الاستلام</button><button type="button" class="pb${PAY === 'vodafone' ? ' on' : ''}" data-pay="vodafone">فودافون كاش</button></div></div>
  ${PAY === 'vodafone' && VF ? `<div class="vfnote">${vfLine()}</div>` : ''}
  <div id="sendbox"></div><div class="note">الطلب بيوصل لمنظفات القبطان على طول، ومش بيتأكد غير لما يكلموك.</div>`);
  if (L.length) {
    const upd = () => { $('#sendbox').innerHTML = ready() ? `<button class="wa" id="place" type="button" style="width:100%;border:0;cursor:pointer;font-family:inherit">ابعت الطلب</button><div class="msg-p" id="pmsg" style="text-align:center;margin-top:8px;font-size:13px"></div>` : '<div class="hint">اكتب الاسم والتليفون والعنوان عشان زرار الإرسال يظهر.</div>'; };
    for (const [id, k] of [['f-name', 'name'], ['f-phone', 'phone'], ['f-address', 'address']]) $('#' + id).addEventListener('input', e => { info[k] = e.target.value; store.set('info', info); upd(); });
    upd();
  }
}

function detailView(p) {
  const n = cart[p.id] || 0;
  const rows = [['السعر', p.price > 0 ? money(p.price) : 'هيتأكد قريبًا']];
  if (p.detail) rows.push(['تفاصيل', p.detail]);
  view.innerHTML = `<button class="back" data-back="1">› رجوع للمنتجات</button>
  <div class="dimg">${p.img ? `<img src="${p.img}" alt="${esc(p.name)}">` : '<div class="ph"></div>'}</div>
  <h2 class="dt">${esc(p.name)}</h2><div class="dp">${p.price > 0 ? `<b>${p.price}</b> ج.م` : '<span class="soon">السعر قريبًا</span>'}</div>
  ${p.desc ? `<div class="dd">${String(p.desc.intro || '').split('\n').map(s => s.trim()).filter(Boolean).map(s => /^[✓•]/.test(s) ? `<p class="ck"><i>✓</i>${esc(s.replace(/^[✓•]\s*/, ''))}</p>` : `<p>${esc(s)}</p>`).join('')}${p.desc.pts.map(t => `<p class="ck"><i>✓</i>${esc(t)}</p>`).join('')}</div>` : ''}
  <div class="sum">${rows.map(r => `<div><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('')}</div>
  <div class="dctl">${ctl(p, true)}</div><button class="shr" data-share="${p.id}">مشاركة المنتج</button>${count() ? `<div class="bar"><div><span>${count()} قطعة</span><b>${money(total())}</b></div><button class="go" data-tab="cart">كمّل الطلب</button></div>` : ''}`;
}
function openP(id) { det = id; SEL = ''; history.pushState({ d: id }, ''); render(); scrollTo(0, 0); }
function closeP() { det = null; render(); }
addEventListener('popstate', () => { if (det !== null) closeP(); });
let MYO = store.get('myorders', []);
let MYDATA = null, MYERR = false;
const RATE = {};
async function sendRate(id, btn) {
  const m = $('#rm-' + id), n = RATE[id], ref = MYO.find(o => o.id === id);
  if (!n) { m.textContent = 'اختار عدد النجوم الأول'; m.style.color = '#b3261e'; return; }
  if (!ref) return;
  btn.disabled = true; btn.textContent = 'بيتبعت...';
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/rpc/rate_order', { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: id, p_token: ref.token, p_rating: n, p_comment: ($('#rc-' + id) || {}).value || '' }) });
    const ok = await r.json();
    if (!r.ok) throw new Error('x');
    MYO = MYO.filter(o => o.id !== id); store.set('myorders', MYO); MYDATA = (MYDATA || []).filter(o => o.id !== id);
    const card = document.querySelector('[data-rate="' + id + '"]');
    if (card) card.innerHTML = '<div class="rt" style="text-align:center;font-weight:700;color:#0b2a4a">' + (ok ? 'شكرًا على تقييمك ' + '★'.repeat(n) : 'اتسجّل تقييم الطلب ده قبل كده') + '<br>' + THX + '</div>';
    setTimeout(() => { if (tab === 'orders') render(true); badge(); }, 2500);
  } catch (e) { btn.disabled = false; btn.textContent = 'ابعت التقييم'; m.textContent = 'مفيش اتصال. جرّب تاني.'; m.style.color = '#b3261e'; }
}
const MYST = { new: 'استلمنا طلبك', confirmed: 'اتأكد طلبك', shipping: 'في الطريق ليك' };
const MYSTEPS = ['new', 'confirmed', 'shipping'];
async function loadMyOrders() {
  fcmSync();
  if (!MYO.length) { MYDATA = []; MYERR = false; if (tab === 'orders') render(true); badge(); return; }
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/rpc/my_orders', { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_refs: MYO }) });
    const d = await r.json();
    if (!r.ok || !Array.isArray(d)) throw new Error('x');
    MYDATA = d; MYERR = false;
    const alive = new Set(d.map(o => o.id));
    const keep = MYO.filter(o => alive.has(o.id));
    if (keep.length !== MYO.length) { MYO = keep; store.set('myorders', MYO); }
  } catch (e) { MYERR = true; }
  badge(); if (tab === 'orders' && !det) { const y = scrollY; render(true); scrollTo(0, y); }
}
const fmtDate = s => { try { return new Date(s).toLocaleString('ar-EG', { weekday: 'short', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

const VAPID = 'BF7ApvD2DmsAO2DFWle6vjJAb0OwRMxrap55nxCvBgSzRwkWaQciiNu2mdDWG6NBJeFn0GIUN3oaA9UFNKx_RGU';
const u8 = s => { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...b].map(c => c.charCodeAt(0))); };
const canPush = () => !window.AndroidFCM && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
async function pushSave(ref) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(VAPID) });
  const r = await fetch(SUPA_URL + '/rest/v1/rpc/save_push', { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: ref.id, p_token: ref.token, p_sub: sub.toJSON() }) });
  return r.ok && (await r.json()) === true;
}
async function enablePush(btn) {
  const say = (t) => { let m = btn.parentNode.querySelector('.pm'); if (!m) { m = document.createElement('div'); m.className = 'pm'; m.style.cssText = 'margin-top:10px;font-size:13px;color:#ffd9d9;line-height:1.7'; btn.parentNode.appendChild(m); } m.innerHTML = t; };
  try {
    let perm = Notification.permission;
    if (perm === 'denied') { say('الإشعارات متقفولة للموقع ده في المتصفح. افتح القفل 🔒 جنب عنوان الموقع فوق، اختار «الأذونات» أو «إعدادات الموقع»، وخلّي «الإشعارات» = سماح، وبعدين اضغط الزرار تاني.'); return; }
    perm = await Notification.requestPermission();
    if (perm === 'denied') { say('اتقفلت الإشعارات. افتح القفل 🔒 جنب عنوان الموقع، «الأذونات»، وخلّي الإشعارات = سماح، وجرّب تاني.'); return; }
    if (perm !== 'granted') { say('ما اخترتش «سماح». اضغط الزرار تاني واختار «سماح».'); return; }
    let ok = 0, err = '';
    for (const o of MYO) { try { if (await pushSave(o)) ok++; } catch (e) { err = (e && e.name ? e.name : 'x') + ': ' + (e && e.message ? e.message : ''); } }
    if (!ok) { say('الإذن اتفعّل بس التسجيل ما كملش (' + esc(err.slice(0, 80)) + '). جرّب تاني بعد شوية.'); return; }
    store.set('pushon', 1); JUST && (JUST.askPush = false); btn.parentNode.innerHTML = '🔔 تمام، هنبعتلك إشعار مع كل خطوة في طلبك';
  } catch (e) { say('حصلت مشكلة (' + esc(((e && e.name) || '') + ' ' + ((e && e.message) || '')).slice(0, 90) + ').'); }
}

async function fcmSync() {
  try {
    if (!window.AndroidFCM) return;
    const t = AndroidFCM.token(); if (!t) return;
    const done = store.get('fcmdone', {});
    for (const o of MYO) {
      const k = o.id + ':' + t.slice(-12);
      if (done[k]) continue;
      const r = await fetch(SUPA_URL + '/rest/v1/rpc/save_fcm', { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: o.id, p_token: o.token, p_fcm: t }) });
      if (r.ok && (await r.json()) === true) { done[k] = 1; store.set('fcmdone', done); }
    }
  } catch (e) {}
}
let JUST = null;
function ordersView() {
  let h = (JUST ? '<div class="empty" style="padding:14px 0 4px"><b style="font-size:20px">✅ الطلب اتبعت</b><br>رقم طلبك #' + JUST.id + '<br>الإجمالي ' + money(JUST.gt) + ' (شامل التوصيل)<br>' + THX + '<br>' + (JUST.pay === 'vodafone' ? (VF ? '<div class="vfnote" style="margin:10px 0">' + vfLine() + '</div>' : '') : 'هنكلمك على رقمك لتأكيد الطلب والتوصيل.') + (JUST.askPush ? '<div class="pushc"><b>🔔 عايز تعرف حالة طلبك أول بأول؟</b><span>فعّل الإشعارات وهنبعتلك رسالة لما الطلب يتأكد، يخرج للتوصيل، ويوصل.</span><button type="button" class="go" data-push="1">فعّل الإشعارات</button></div>' : '') + '</div>' : '') + '<div class="sec"><span>طلباتي</span><em>' + (MYDATA ? MYDATA.length + ' طلب' : '') + '</em></div>';
  if (MYDATA === null) h += '<div class="empty">بنحمّل طلباتك...</div>';
  else if (!MYDATA.length) h += '<div class="empty">' + (MYERR ? 'مفيش اتصال دلوقتي. جرّب تاني بعد شوية.' : 'مفيش طلبات شغالة دلوقتي.') + '<br><button class="go" data-tab="shop">ابدأ اطلب</button></div>';
  else {
    if (MYERR) h += '<div class="note">مفيش اتصال دلوقتي، الحالة ممكن تكون مش آخر تحديث.</div>';
    h += MYDATA.map(o => {
      if (o.status === 'delivered') return '<div class="mo rate" data-rate="' + o.id + '"><div class="mh"><b>طلب #' + o.id + '</b><span class="mst s-delivered">اتسلّم ✓</span></div><div class="rt">وصلك طلبك. قيّم خدمتنا</div><div class="stars" data-for="' + o.id + '">' + [1,2,3,4,5].map(n => '<button type="button" class="star" data-star="' + n + '" data-oid="' + o.id + '" aria-label="' + n + '">★</button>').join('') + '</div><input type="text" class="rc" id="rc-' + o.id + '" maxlength="300" placeholder="تعليق قصير (اختياري)"><div class="rmsg" id="rm-' + o.id + '"></div><div class="rbtns"><button type="button" class="go" data-sendrate="' + o.id + '">ابعت التقييم</button><button type="button" class="go ghost" data-skiprate="' + o.id + '">مش دلوقتي</button></div></div>';
      const idx = Math.max(0, MYSTEPS.indexOf(o.status));
      const SI = [['📥', 'استلمنا'], ['✅', 'اتأكد'], ['🚚', 'في الطريق'], ['🎁', 'وصل']];
      const steps = SI.map((s, i) => '<div class="stp' + (i < idx ? ' done' : i === idx ? ' cur' : '') + '"><i>' + (i < idx ? '✓' : s[0]) + '</i><span>' + s[1] + '</span></div>').join('');
      const its = (o.items || []).map(it => { const p = PRODUCTS.find(x => x.id === it.id); return '<div class="l3">' + (p && p.img ? '<img src="' + p.img + '" alt="">' : '<div class="ph"></div>') + '<div class="li3"><b>' + esc(it.name) + '</b><span class="q">الكمية ' + it.qty + ' × ' + money(it.price) + '</span></div><div class="lt3">' + money(it.qty * it.price) + '</div></div>'; }).join('');
      return '<div class="mo2"><div class="mh2"><div><small>رقم الطلب</small><b>#' + o.id + '</b></div><span class="chip s-' + esc(o.status) + '">' + esc(MYST[o.status] || o.status) + '</span></div><div class="md2">🗓 ' + esc(fmtDate(o.created_at)) + '</div><div class="stps2" style="--n:' + idx + '">' + steps + '</div><div class="sh">المنتجات</div><div class="lines3">' + its + '</div><div class="sum2"><div><span>إجمالي المنتجات</span><b>' + money(+o.subtotal || (+o.total - +o.delivery_fee)) + '</b></div><div><span>خدمة التوصيل</span><b>' + money(+o.delivery_fee) + '</b></div><div class="gt2"><span>الإجمالي</span><b>' + money(+o.total) + '</b></div></div><div class="pay2">' + (o.payment === 'vodafone' ? '📱' : '💵') + ' الدفع: ' + payLabel(o.payment) + '</div></div>';
    }).join('') + '<div class="thx" style="text-align:center;color:#0b2a4a;font-weight:700;margin:12px 0">' + THX + '</div>';
  }
  view.innerHTML = h;
}
function render(keepScroll) { badge(); syncRevTab(); document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); const y = scrollY; if (det !== null && tab === 'shop') detailView(PRODUCTS.find(p => p.id === det)); else tab === 'shop' ? shop() : tab === 'reviews' ? reviewsView() : tab === 'orders' ? ordersView() : tab === 'invite' ? inviteView() : (cartView(), loadCredit()); if (keepScroll) scrollTo(0, y); }
async function placeOrder(btn) {
  if (!ready()) return;
  const L = lines();
  const items = L.map(l => ({ id: l.id, name: l.name, qty: l.q, price: l.price, opt: l.c || undefined }));
  const msg = $('#pmsg'); btn.disabled = true; btn.textContent = 'بيتبعت...';
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/rpc/place_order_v2', { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_name: info.name.trim(), p_phone: info.phone.trim(), p_address: info.address.trim(), p_city: 'الفيوم', p_payment: PAY, p_items: items, p_total: grand() }) });
    const res = await r.json();
    const id = res && res.id;
    if (!r.ok || typeof id !== 'number' || !res.token) throw new Error('x');
    MYO = MYO.filter(o => o.id !== id); MYO.unshift({ id: id, token: res.token }); store.set('myorders', MYO); MYDATA = null;
    let dsc = 0; try { const rc = store.get('refcode', ''); if (rc) { await rp('ref_apply', { p_code: rc, p_order_id: id, p_token: res.token }); store.set('refcode', ''); } if (CREDIT > 0) { const u = await rp('ref_use_credit', { p_order_id: id, p_token: res.token }); if (u && u.ok) dsc = +u.discount || 0; CREDIT = 0; CREDPH = ''; } } catch (e) {}
    const wl = waLink(); const gt = total() + FEE - dsc; const payP = PAY; try { if (localStorage.getItem('mute') !== '1') { const oa = new Audio('order.mp3'); oa.play().catch(() => {}); } } catch (e) {}
    cart = {}; store.set('cart', cart); badge();
    JUST = { id: id, gt: gt, pay: payP, askPush: false }; if (canPush()) { if (Notification.permission === 'granted') pushSave({ id: id, token: res.token }).catch(() => {}); else if (Notification.permission === 'default') JUST.askPush = true; } tab = 'orders'; det = null; render(); scrollTo(0, 0); loadMyOrders();
  } catch (err) {
    btn.disabled = false; btn.textContent = 'ابعت الطلب';
    msg.style.color = '#b3261e'; msg.innerHTML = 'مفيش اتصال أو حصلت مشكلة. جرّب تاني، أو ابعت الطلب على واتساب: <a href="' + waLink() + '" target="_blank" rel="noopener" style="color:#1a9a52;font-weight:700">واتساب</a>';
  }
}
document.addEventListener('click', e => {
  const pl = e.target.closest('#place');
  if (pl) { placeOrder(pl); return; }
  const wa = e.target.closest('a.wa');
  if (wa && /Android/i.test(navigator.userAgent)) { e.preventDefault(); location.href = wa.href; return; }
  const t = e.target.closest('button');
  if (!t) { const c = e.target.closest('[data-open]'); if (c) openP(+c.dataset.open); return; }
  if (t.dataset.back) { history.back(); }
  else if (t.dataset.share) { const p = PRODUCTS.find(x => x.id === +t.dataset.share); const txt = p.name + (p.price > 0 ? ' - ' + money(p.price) : '') + '\nمنظفات القبطان (توصيل داخل الفيوم)'; if (navigator.share) navigator.share({ title: p.name, text: txt, url: location.origin + location.pathname }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(txt + '\n' + location.origin + location.pathname)); }
  else if (t.dataset.star) { const id = +t.dataset.oid, n = +t.dataset.star; RATE[id] = n; document.querySelectorAll('.star[data-oid="' + id + '"]').forEach(b => b.classList.toggle('on', +b.dataset.star <= n)); }
  else if (t.dataset.skiprate) { const id = +t.dataset.skiprate; MYO = MYO.filter(o => o.id !== id); store.set('myorders', MYO); MYDATA = (MYDATA || []).filter(o => o.id !== id); render(true); }
  else if (t.dataset.push) { enablePush(t); }
  else if (t.dataset.sendrate) { sendRate(+t.dataset.sendrate, t); }
  else if (t.dataset.pay) { PAY = t.dataset.pay; store.set('pay', PAY); render(true); }
  else if (t.dataset.copy) { try { navigator.clipboard.writeText(t.dataset.copy); t.textContent = 'اتنسخ ✓'; } catch (e) { t.textContent = t.dataset.copy; } }
  else if (t.dataset.tab) { det = null; JUST = null; tab = t.dataset.tab; render(); scrollTo(0, 0); if (tab === 'orders') loadMyOrders(); }
  else if (t.dataset.open) openP(+t.dataset.open);
  else if (t.dataset.sel) { SEL = t.dataset.sel; render(true); }
  else if (t.dataset.add) change(t.dataset.add, 1);
  else if (t.dataset.inc) change(t.dataset.inc, 1);
  else if (t.dataset.dec) change(t.dataset.dec, -1);
});

const cachedLive = store.get('liveProducts', null);
if (Array.isArray(cachedLive) && cachedLive.length) PRODUCTS = cachedLive;
render(); loadRevData(); if (tab === 'orders') loadMyOrders();
async function liveProducts() {
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/products?select=*&order=sort.asc', { headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON } });
    if (!r.ok) return;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return;
    PRODUCTS = rows.map(x => ({ id: x.id, name: x.name, detail: x.detail || '', price: +x.price || 0, img: x.img || '', cat: x.cat || 'منظفات', opts: (x.opts && Array.isArray(x.opts.choices) && x.opts.choices.length) ? { title: x.opts.title || 'الاختيار', choices: x.opts.choices.map(String) } : null, desc: (x.intro || (Array.isArray(x.pts) && x.pts.length)) ? { intro: x.intro || '', pts: Array.isArray(x.pts) ? x.pts : [] } : null }));
    store.set('liveProducts', PRODUCTS);
    render(true);
  } catch (e) {}
}
liveProducts();
(function () { try { let did = localStorage.getItem('did'); if (!did) { did = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12)); localStorage.setItem('did', did); } fetch(SUPA_URL + '/rest/v1/rpc/app_ping', { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_id: did }) }).catch(() => {}); } catch (e) {} })();
loadFee();

/* bgm */
let BG = null;
function bgmMuted() { try { return localStorage.getItem('mute') === '1'; } catch (e) { return false; } }
const BGM_ON = true;
function startBgm() {
  if (!BGM_ON) return;
  try {
    if (!BG) { BG = new Audio('bgm.mp3'); BG.loop = true; BG.volume = 0.4; }
    if (bgmMuted()) { BG.pause(); return; }
    BG.play().catch(() => {});
  } catch (e) {}
}
function bgmSync() { if (!BG) return; if (bgmMuted()) BG.pause(); else BG.play().catch(() => {}); }
(function () { const f = () => { if (document.getElementById('salatSplash')) return; startBgm(); ['pointerdown', 'touchstart', 'keydown'].forEach(t => removeEventListener(t, f, true)); }; ['pointerdown', 'touchstart', 'keydown'].forEach(t => addEventListener(t, f, true)); })();
document.addEventListener('visibilitychange', () => { if (!BG) return; if (document.hidden) BG.pause(); else bgmSync(); });
/* salatSplash */
(function () {
  const s = document.createElement('div');
  s.id = 'salatSplash';
  s.setAttribute('style', 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%,#123a63,#071b31);transition:opacity .7s ease;opacity:1;cursor:pointer');
  const bar = '<div style="width:70px;height:2px;margin:0 auto 22px;background:#f5c945;border-radius:2px"></div>';
  const bar2 = '<div style="width:70px;height:2px;margin:22px auto 0;background:#f5c945;border-radius:2px"></div>';
  const show = (t, sub) => { s.innerHTML = '<div style="text-align:center;padding:24px">' + bar + '<div style="font-size:32px;font-weight:800;color:#f5c945;line-height:1.7;font-family:inherit">' + t + '</div>' + bar2 + '<div style="margin-top:18px;font-size:14px;color:#d9e2ee">' + sub + '</div></div>'; };
  show('صلّي على النبي محمد ﷺ', 'منظفات القبطان');
  document.body.appendChild(s);
  let closed = false, timer = null, started = false;
  const close = () => { if (closed) return; closed = true; if (started) setTimeout(startBgm, 0); s.style.opacity = '0'; s.style.pointerEvents = 'none'; setTimeout(() => s.remove(), 800); };
  s.addEventListener('click', close);
  try {
    const a1 = new Audio('salat.mp3'), a2 = new Audio('welcome.mp3'); a1.preload = 'auto'; a2.preload = 'auto';
    a1.onplaying = () => { if (started) return; started = true; clearTimeout(timer); timer = setTimeout(close, 15000); };
    a1.onended = () => { if (!closed) show('أهلاً وسهلاً بكم', 'في منظفات القبطان'); a2.play().catch(() => {}); };
    a2.onended = () => { setTimeout(close, 500); startBgm(); };
    const go = () => { a1.play().catch(() => {}); };
    a1.play().catch(() => {
      const once = () => { go(); ['pointerdown', 'touchstart', 'keydown'].forEach(t => removeEventListener(t, once, true)); };
      ['pointerdown', 'touchstart', 'keydown'].forEach(t => addEventListener(t, once, true));
    });
  } catch (e) {}
  timer = setTimeout(() => { if (!started) close(); }, 3800);
})();

/* uiSounds */
(function () {
  let ctx = null, muted = false;
  try { muted = localStorage.getItem('mute') === '1'; } catch (e) {}
  const AC = window.AudioContext || window.webkitAudioContext;
  const get = () => { if (!AC) return null; if (!ctx) { try { ctx = new AC(); } catch (e) { return null; } } if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; };
  const tone = (c, f, t0, dur, vol, type, f2) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  };
  const play = kind => {
    if (muted) return; const c = get(); if (!c) return; const t = c.currentTime + 0.005;
    if (kind === 'add') { tone(c, 660, t, 0.09, 0.12, 'sine'); tone(c, 990, t + 0.07, 0.14, 0.12, 'sine'); }
    else if (kind === 'ok') { tone(c, 523, t, 0.12, 0.12, 'sine'); tone(c, 659, t + 0.1, 0.12, 0.12, 'sine'); tone(c, 784, t + 0.2, 0.22, 0.12, 'sine'); }
    else if (kind === 'minus') { tone(c, 520, t, 0.05, 0.1, 'triangle', 360); }
    else if (kind === 'tab') { tone(c, 700, t, 0.05, 0.09, 'triangle', 520); }
    else { tone(c, 900, t, 0.035, 0.1, 'triangle', 600); }
  };
  window.uiSound = play;
  const kindOf = el => {
    if (el.closest('#salatSplash')) return null;
    if (el.closest('#place')) return 'tick';
    if (el.closest('[data-add]')) return 'add';
    const b = el.closest('button, .pay button, .vfcopy, a, [data-tab], [data-d], [data-det], .card');
    if (!b) return null;
    if (b.dataset && b.dataset.tab) return 'tab';
    if (b.textContent.trim() === '−' || b.textContent.trim() === '-') return 'minus';
    return 'tick';
  };
  let dx = 0, dy = 0, moved = false, down = false;
  addEventListener('pointerdown', e => { dx = e.clientX; dy = e.clientY; moved = false; down = true; }, true);
  addEventListener('pointermove', e => { if (down && (Math.abs(e.clientX - dx) > 8 || Math.abs(e.clientY - dy) > 8)) moved = true; }, true);
  addEventListener('pointercancel', () => { moved = true; down = false; }, true);
  addEventListener('scroll', () => { moved = true; }, true);
  addEventListener('pointerup', () => { down = false; }, true);
  addEventListener('click', e => { if (moved) { moved = false; return; } if (e.target.closest && e.target.closest('#muteBtn')) return; const k = e.target.closest ? kindOf(e.target) : null; if (k) play(k); }, true);
  const m = document.createElement('button');
  m.id = 'muteBtn'; m.type = 'button'; m.setAttribute('aria-label', 'الصوت');
  m.setAttribute('style', 'position:fixed;top:10px;left:10px;z-index:50;width:34px;height:34px;border-radius:50%;border:1px solid rgba(245,201,69,.6);background:rgba(7,27,49,.55);color:#f5c945;font-size:16px;line-height:1;padding:0;cursor:pointer');
  const paint = () => { m.textContent = '🎵'; m.classList.toggle('off', muted); m.setAttribute('aria-pressed', muted ? 'true' : 'false'); };
  paint();
  m.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('mute', muted ? '1' : '0'); } catch (e) {} paint(); bgmSync(); if (!muted) play('tick'); });
  (document.querySelector('.hero') || document.body).appendChild(m);
})();

/* myOrdersRefresh */
loadMyOrders();
setInterval(() => { if (!document.hidden) loadMyOrders(); }, 45000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadMyOrders(); });

/* ===== دعوة صديق ===== */
let INV = null, INVBUSY = false;
const refNote = () => { const rc = store.get('refcode', ''); return rc && !MYO.length ? '<div class="vfnote" style="margin-bottom:12px">🎁 كود دعوة صديقك <b dir="ltr">' + esc(rc) + '</b> متسجل. أول طلب ليك هيحسبه له.</div>' : ''; };
async function loadInvite() {
  const ph = (info.phone || '').replace(/\D/g, ''); if (ph.length < 10 || INVBUSY) return; INVBUSY = true;
  const r = await rp('ref_get_code', { p_phone: ph }); INVBUSY = false; INV = r && r.code ? r : false; if (tab === 'invite') inviteView();
}
function inviteView() {
  const ph = (info.phone || '').replace(/\D/g, '');
  const link = location.origin + location.pathname + '?ref=' + (INV && INV.code || '');
  const txt = 'جرّب تطبيق منظفات القبطان، توصيل لحد البيت في الفيوم 🧴\nاستخدم كود الدعوة ' + (INV && INV.code || '') + ' عند أول طلب.\n' + link;
  let h = '<div class="invh"><div class="invi">🎁</div><h2>ادعو 3 أصحاب واكسب توصيل مجاني</h2><p>كل 3 أصحاب يطلبوا أول أوردر بكودك ويستلموه، توصيلك الجاي ببلاش (' + money(0) + ' بدل ' + money(FEE) + ').</p></div>';
  if (ph.length < 10) h += '<label class="f"><span>اكتب رقم تليفونك عشان نطلعلك كودك</span><input type="tel" id="inv-phone" placeholder="01xxxxxxxxx"></label><button class="go" id="inv-go" type="button" style="width:100%">هات كودي</button>';
  else if (INV === null) { h += '<div class="hint">بنحضّر كودك...</div>'; loadInvite(); }
  else if (INV === false) h += '<div class="hint">مفيش اتصال دلوقتي. جرّب تاني.</div><button class="go" id="inv-retry" type="button">إعادة المحاولة</button>';
  else {
    h += '<div class="invc"><small>كودك</small><b dir="ltr">' + esc(INV.code) + '</b><button type="button" class="vfcopy" data-copy="' + esc(INV.code) + '">نسخ</button></div>'
      + '<a class="wa" id="inv-wa" href="https://wa.me/?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener">ابعت الدعوة على واتساب</a>'
      + '<div class="invp"><div class="invpt">تقدّمك للتوصيل المجاني: <b>' + (INV.progress || 0) + ' من 3</b></div><div class="invbar"><i style="width:' + Math.round((INV.progress || 0) / 3 * 100) + '%"></i></div>' + (INV.available > 0 ? '<div class="invok">🎉 عندك ' + INV.available + ' توصيل مجاني، هيتطبق تلقائي على طلبك الجاي</div>' : '') + '</div>'
      + '<div class="invs"><div><b>' + INV.invited + '</b><span>صحاب طلبوا بكودك</span></div><div><b>' + INV.delivered + '</b><span>طلباتهم اتسلمت</span></div><div><b>' + INV.available + '</b><span>توصيل مجاني متاح</span></div><div><b>' + INV.used + '</b><span>توصيل مجاني اتستخدم</span></div></div>'
      + '<div class="note">كل صديق بيتحسب لما أول أوردر ليه يتسلم. كل 3 أصحاب = توصيل مجاني على طلبك الجاي، بيتطبق تلقائي. مينفعش تستخدم كودك لنفسك، وكل صديق ليه مرة واحدة بس.</div>';
  }
  if (!MYO.length) h += '<div class="sec" style="display:block;margin-top:22px"><span style="display:block;font-size:17px;color:#fff;font-weight:700">عندك كود من صديق؟</span></div><div style="display:flex;gap:8px"><input type="text" id="inv-code" dir="ltr" placeholder="مثال: QA1B2C3" value="' + esc(store.get('refcode', '')) + '" style="flex:1;padding:14px;border-radius:14px;border:1.5px solid #e1e8f2;font-size:16px;text-transform:uppercase"><button class="go" id="inv-save" type="button">حفظ</button></div><div class="note" id="inv-msg"></div>';
  view.innerHTML = h;
}
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'inv-go') { const v = ($('#inv-phone').value || '').replace(/\D/g, ''); if (v.length < 10) return; info.phone = v; store.set('info', info); INV = null; inviteView(); }
  else if (b.id === 'inv-retry') { INV = null; inviteView(); }
  else if (b.id === 'inv-save') { const v = ($('#inv-code').value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); store.set('refcode', v); $('#inv-msg').textContent = v ? 'اتسجل الكود ✓ هيتحسب لصاحبك مع أول طلب ليك.' : 'اتمسح الكود.'; }
});
document.addEventListener('change', e => { if (e.target.id === 'f-phone') { info.phone = e.target.value; store.set('info', info); CREDPH = ''; loadCredit(); } });

/* ===== آراء عملائنا ===== */

const starsH = n => '<span class="rv-st">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></span>';
function revHtml() {
  const hasT = REVS && REVS.count, hasI = IMGS && IMGS.length; if (!hasT && !hasI) return '';
  const dt = x => { try { return new Date(x).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }); } catch (e) { return ''; } };
  let h = '<div class="rv">';
  if (hasT) h += '<div class="rv-h"><h3>آراء عملائنا</h3><div class="rv-a"><b>' + REVS.avg + '</b> ' + starsH(Math.round(REVS.avg)) + '<small>من ' + REVS.count + ' تقييم</small></div></div><div class="rv-l">' + REVS.items.map(r => '<div class="rv-c">' + starsH(r.rating) + (r.comment ? '<p>' + esc(r.comment) + '</p>' : '') + '<small>' + esc(r.name) + ' · ' + dt(r.created_at) + '</small></div>').join('') + '</div>';
  else h += '<div class="rv-h"><h3>آراء عملائنا</h3></div>';
  if (hasI) h += (hasT ? '<div class="rg-t">صور من رسايل عملائنا</div>' : '') + '<div class="rg">' + IMGS.map(id => '<button type="button" class="rg-b" data-rimg="' + id + '"><img alt="رأي عميل" data-rid="' + id + '"' + (IMGD[id] ? ' src="' + IMGD[id] + '"' : '') + '></button>').join('') + '</div>';
  return h + '</div>';
}
function fillImgs() { document.querySelectorAll('#revs img[data-rid]').forEach(im => { const id = im.dataset.rid; if (IMGD[id]) { if (!im.src) im.src = IMGD[id]; return; } if (im.dataset.ld) return; im.dataset.ld = 1; rp('get_review_img', { p_id: +id }).then(v => { if (typeof v === 'string' && v) { IMGD[id] = v; im.src = v; } }); }); }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-rimg]'); if (!b) return; const src = IMGD[b.dataset.rimg] || (b.querySelector('img') || {}).src; if (!src) return; const o = document.createElement('div'); o.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:rgba(7,27,49,.94);display:flex;align-items:center;justify-content:center;padding:12px;cursor:zoom-out'); o.innerHTML = '<img src="' + src + '" style="max-width:100%;max-height:100%;border-radius:12px;box-shadow:0 0 0 2px #d9a93a">'; o.onclick = () => o.remove(); document.body.appendChild(o); });
function syncRevTab() { const b = document.querySelector('.tabs [data-tab=reviews]'); if (!b) return; const has = !!((REVS && REVS.count) || (IMGS && IMGS.length)); b.hidden = !has; if (!has && tab === 'reviews') { tab = 'shop'; render(); } }
function reviewsView() { view.innerHTML = '<div id="revs">' + (revHtml() || '<div class="empty">لسه مفيش آراء.</div>') + '</div>'; fillImgs(); }
function loadRevData() {
  if (loadRevData.busy) return; loadRevData.busy = true; let n = 2; const done = () => { if (--n === 0) loadRevData.busy = false; };
  const upd = () => { syncRevTab(); if (tab === 'reviews') reviewsView(); };
  rp('get_review_imgs', {}).then(l => { done(); if (Array.isArray(l)) { const o = JSON.stringify(IMGS); IMGS = l; store.set('rimgs', l); if (JSON.stringify(l) !== o) upd(); else syncRevTab(); } });
  rp('get_reviews', {}).then(r => { done(); if (r && typeof r.count === 'number') { const old = JSON.stringify(REVS); REVS = r; store.set('revs', r); if (JSON.stringify(r) !== old) upd(); else syncRevTab(); } });
}

/* ===== سحب للتحديث ===== */
(function () {
  const ind = document.createElement('div'); ind.id = 'ptr'; ind.innerHTML = '<i></i><span>اسحب للتحديث</span>'; document.body.appendChild(ind);
  const sp = ind.querySelector('span'); let y0 = 0, dy = 0, on = false, busy = false; const TH = 80;
  const set = (d, txt) => { ind.style.transform = 'translate(-50%,' + (d - 70) + 'px)'; ind.style.opacity = Math.min(1, d / 40); ind.querySelector('i').style.transform = 'rotate(' + (d * 4) + 'deg)'; if (txt) sp.textContent = txt; };
  addEventListener('touchstart', e => { if (busy || e.touches.length !== 1) return; if ((window.scrollY || document.documentElement.scrollTop || 0) > 0 || document.querySelector('[style*="z-index:99999"]')) { on = false; return; } y0 = e.touches[0].clientY; dy = 0; on = true; }, { passive: true });
  addEventListener('touchmove', e => { if (!on || busy) return; const d = e.touches[0].clientY - y0; if (d <= 0) { dy = 0; set(0); return; } if ((window.scrollY || 0) > 0) { on = false; set(0); return; } dy = Math.min(d * 0.5, 110); if (e.cancelable) e.preventDefault(); ind.classList.remove('go'); set(dy, dy >= TH ? 'سيب للتحديث' : 'اسحب للتحديث'); }, { passive: false });
  const end = async () => {
    if (!on || busy) return; on = false;
    if (dy < TH) { ind.style.transition = 'transform .25s,opacity .25s'; set(0); setTimeout(() => { ind.style.transition = ''; }, 300); return; }
    busy = true; ind.style.transition = 'transform .2s'; set(TH - 20, 'بيتحدّث...'); ind.classList.add('go');
    const t0 = Date.now();
    try { loadRevData.busy = false; CREDPH = ''; const jobs = [liveProducts(), loadFee(), loadRevData(), loadMyOrders()]; try { jobs.push(navigator.serviceWorker.getRegistrations().then(rg => Promise.all(rg.map(r => r.update().catch(() => {}))))); } catch (e) {} await Promise.race([Promise.all(jobs.map(p => Promise.resolve(p).catch(() => {}))), new Promise(r => setTimeout(r, 6000))]); } catch (e) {}
    const left = 800 - (Date.now() - t0); if (left > 0) await new Promise(r => setTimeout(r, left));
    sp.textContent = 'تم التحديث ✓'; ind.classList.remove('go'); await new Promise(r => setTimeout(r, 450));
    ind.style.transition = 'transform .3s,opacity .3s'; set(0); setTimeout(() => { ind.style.transition = ''; busy = false; }, 350);
  };
  addEventListener('touchend', end, { passive: true }); addEventListener('touchcancel', end, { passive: true });
})();

(function(){const n=document.querySelector('.tabs');if(!n)return;const f=()=>n.classList.toggle('stuck',(window.scrollY||0)>110);addEventListener('scroll',f,{passive:true});f();})();
