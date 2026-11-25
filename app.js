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
let tab = 'shop', q = '', det = null;
const money = n => n + ' ج.م';
let FEE = store.get('fee', 25);
const grand = () => total() + FEE;
let PAY = store.get('pay', 'cash'); if (PAY !== 'vodafone') PAY = 'cash';
let VF = store.get('vf', '01028540358');
const payLabel = p => p === 'vodafone' ? 'فودافون كاش' : 'كاش عند الاستلام';
const THX = 'سعداء بخدمة حضرتك 🌹';
async function loadFee() { try { const r = await fetch(SUPA_URL + '/rest/v1/app_settings?select=key,value&key=in.(delivery_fee,vodafone_number)', { headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON } }); const d = await r.json(); if (!Array.isArray(d)) return; d.forEach(x => { if (x.key === 'delivery_fee') { const v = parseFloat(x.value); if (!isNaN(v)) { FEE = v; store.set('fee', v); } } if (x.key === 'vodafone_number') { VF = (x.value || '').trim(); store.set('vf', VF); } }); render(true); } catch (e) {} }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lines = () => PRODUCTS.filter(p => p.price > 0 && cart[p.id] > 0);
const count = () => lines().reduce((s, p) => s + cart[p.id], 0);
const total = () => lines().reduce((s, p) => s + cart[p.id] * p.price, 0);
function change(id, d) { cart[id] = Math.max(0, (cart[id] || 0) + d); store.set('cart', cart); render(true); }
function badge() { const b = $('#badge'); b.hidden = count() === 0; b.textContent = count(); }
function ctl(p) {
  const n = cart[p.id] || 0;
  if (p.price <= 0) return '';
  return n === 0 ? `<button class="add" data-add="${p.id}">أضف للسلة</button>`
    : `<div class="step"><button data-dec="${p.id}" aria-label="نقص">−</button><bdi>${n}</bdi><button data-inc="${p.id}" aria-label="زود">+</button></div>`;
}
function cardHtml(p) {
  return `<div class="card${(cart[p.id] || 0) > 0 ? ' in' : ''}" data-open="${p.id}"><div class="pw">${p.img ? `<img src="${p.img}" alt="${esc(p.name)}">` : '<div class="ph"></div>'}${p.detail && p.price > 0 ? `<span class="tag">${esc(p.detail)}</span>` : ''}</div>
  <div class="t">${esc(p.name)}</div><div class="more">التفاصيل ‹</div><div class="pr">${p.price > 0 ? `<b>${p.price}</b> ج.م` : '<span class="soon">السعر قريبًا</span>'}</div>${ctl(p)}</div>`;
}
function shop() {
  view.innerHTML = `<div class="search"><input type="search" id="q" placeholder="دوّر على منتج..." value="${esc(q)}"></div>
  <div class="sec"><span>منتجاتنا</span><em id="cnt"></em></div><div class="grid" id="grid"></div><div id="empty"></div>${count() ? `<div class="bar"><div><span>${count()} قطعة</span><b>${money(total())}</b></div><button class="go" data-tab="cart">كمّل الطلب</button></div>` : ''}`;
  shopGrid();
  $('#q').addEventListener('input', e => { q = e.target.value; shopGrid(); });
}
function shopGrid() {
  const list = PRODUCTS.filter(p => !q.trim() || p.name.includes(q.trim()));
  $('#grid').innerHTML = list.map(cardHtml).join('');
  $('#cnt').textContent = list.length + ' منتج';
  $('#empty').innerHTML = list.length ? '' : '<div class="empty">مفيش منتج بالاسم ده</div>';
}
function waLink() {
  const L = lines();
  const msg = ['طلب جديد من تطبيق منظفات القبطان', ...L.map(p => `${cart[p.id]} × ${p.name} = ${money(p.price * cart[p.id])}`),
    `إجمالي المنتجات: ${money(total())}`, `خدمة توصيل: ${money(FEE)}`, `الإجمالي: ${money(grand())}`, `الدفع: ${payLabel(PAY)}`, `الاسم: ${info.name.trim()}`, `التليفون: ${info.phone.trim()}`, `العنوان (الفيوم): ${info.address.trim()}`, THX].join('\n');
  return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
}
function ready() { return lines().length > 0 && info.name.trim() && info.phone.trim() && info.address.trim(); }
function cartView() {
  const L = lines();
  view.innerHTML = `<div class="sec"><span>سلتك</span><em>${count()} قطعة</em></div>` + (L.length === 0 ? '<div class="empty">السلة فاضية<br><button class="go" data-tab="shop">ارجع للمنتجات</button></div>' : `
  <div class="lines">${L.map(p => `<div class="l2">${p.img ? `<img src="${p.img}" alt="">` : ''}<div class="li"><b>${esc(p.name)}</b><span>${cart[p.id]} × ${money(p.price)}</span><span class="lt">${money(p.price * cart[p.id])}</span></div>
  <div class="step"><button data-dec="${p.id}">−</button><bdi>${cart[p.id]}</bdi><button data-inc="${p.id}">+</button></div></div>`).join('')}</div>
  <div class="sum"><div><span>عدد القطع</span><b>${count()}</b></div><div><span>إجمالي المنتجات</span><b>${money(total())}</b></div><div><span>خدمة توصيل</span><b>${money(FEE)}</b></div><div class="gt"><span>الإجمالي</span><b>${money(grand())}</b></div></div><div class="thx" style="text-align:center;color:#0b2a4a;font-weight:700;margin:8px 0">${THX}</div>
  <div class="sec"><span>بيانات التوصيل</span><em>الفيوم</em></div>
  <label class="f"><span>الاسم</span><input type="text" id="f-name" value="${esc(info.name)}" autocomplete="name"></label>
  <label class="f"><span>رقم التليفون</span><input type="tel" id="f-phone" value="${esc(info.phone)}" autocomplete="tel"></label>
  <label class="f"><span>العنوان بالتفصيل</span><input type="text" id="f-address" value="${esc(info.address)}" autocomplete="street-address"></label>
  <div class="f"><span>طريقة الدفع</span><div class="pay"><button type="button" class="pb${PAY === 'cash' ? ' on' : ''}" data-pay="cash">كاش عند الاستلام</button><button type="button" class="pb${PAY === 'vodafone' ? ' on' : ''}" data-pay="vodafone">فودافون كاش</button></div></div>
  ${PAY === 'vodafone' ? `<div class="vfnote">هنكلمك على رقمك عشان نكمل التحويل بفودافون كاش.${VF ? `<br>رقم فودافون كاش: <b dir="ltr">${esc(VF)}</b> <button type="button" class="vfcopy" data-copy="${esc(VF)}">نسخ</button>` : ''}</div>` : ''}
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
  rows.push(['التوصيل', 'داخل الفيوم'], ['الدفع', 'كاش عند الاستلام']);
  view.innerHTML = `<button class="back" data-back="1">› رجوع للمنتجات</button>
  <div class="dimg">${p.img ? `<img src="${p.img}" alt="${esc(p.name)}">` : '<div class="ph"></div>'}</div>
  <h2 class="dt">${esc(p.name)}</h2><div class="dp">${p.price > 0 ? `<b>${p.price}</b> ج.م` : '<span class="soon">السعر قريبًا</span>'}</div>
  ${p.desc ? `<div class="dd"><p>${esc(p.desc.intro)}</p>${p.desc.pts.map(t => `<p class="ck"><i>✓</i>${esc(t)}</p>`).join('')}</div>` : ''}
  <div class="sum">${rows.map(r => `<div><span>${r[0]}</span><b>${esc(r[1])}</b></div>`).join('')}</div>
  <div class="dctl">${ctl(p)}</div><button class="shr" data-share="${p.id}">مشاركة المنتج</button>${count() ? `<div class="bar"><div><span>${count()} قطعة</span><b>${money(total())}</b></div><button class="go" data-tab="cart">كمّل الطلب</button></div>` : ''}`;
}
function openP(id) { det = id; history.pushState({ d: id }, ''); render(); scrollTo(0, 0); }
function closeP() { det = null; render(); }
addEventListener('popstate', () => { if (det !== null) closeP(); });
function render(keepScroll) { badge(); document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); const y = scrollY; if (det !== null && tab === 'shop') detailView(PRODUCTS.find(p => p.id === det)); else tab === 'shop' ? shop() : cartView(); if (keepScroll) scrollTo(0, y); }
async function placeOrder(btn) {
  if (!ready()) return;
  const L = lines();
  const items = L.map(p => ({ id: p.id, name: p.name, qty: cart[p.id], price: p.price }));
  const msg = $('#pmsg'); btn.disabled = true; btn.textContent = 'بيتبعت...';
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/rpc/place_order', { method: 'POST', headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_name: info.name.trim(), p_phone: info.phone.trim(), p_address: info.address.trim(), p_city: 'الفيوم', p_payment: PAY, p_items: items, p_total: grand() }) });
    const id = await r.json();
    if (!r.ok || typeof id !== 'number') throw new Error('x');
    const wl = waLink(); const gt = grand(); const payP = PAY; try { if (localStorage.getItem('mute') !== '1') { const oa = new Audio('order.mp3'); oa.play().catch(() => {}); } } catch (e) {}
    cart = {}; store.set('cart', cart); badge();
    view.innerHTML = `<div class="empty"><b style="font-size:20px">✅ الطلب اتبعت</b><br>رقم طلبك #${id}<br>الإجمالي ${money(gt)} (شامل التوصيل)<br>${THX}<br>${payP === 'vodafone' ? 'هنكلمك على رقمك عشان نكمل التحويل بفودافون كاش.' : 'هنكلمك على رقمك لتأكيد الطلب والتوصيل.'}<br><button class="go" data-tab="shop">رجوع للمنتجات</button></div>`;
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
  else if (t.dataset.pay) { PAY = t.dataset.pay; store.set('pay', PAY); render(true); }
  else if (t.dataset.copy) { try { navigator.clipboard.writeText(t.dataset.copy); t.textContent = 'اتنسخ ✓'; } catch (e) { t.textContent = t.dataset.copy; } }
  else if (t.dataset.tab) { det = null; tab = t.dataset.tab; render(); scrollTo(0, 0); }
  else if (t.dataset.add) change(+t.dataset.add, 1);
  else if (t.dataset.inc) change(+t.dataset.inc, 1);
  else if (t.dataset.dec) change(+t.dataset.dec, -1);
});

const cachedLive = store.get('liveProducts', null);
if (Array.isArray(cachedLive) && cachedLive.length) PRODUCTS = cachedLive;
render();
async function liveProducts() {
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/products?select=*&order=sort.asc', { headers: { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON } });
    if (!r.ok) return;
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return;
    PRODUCTS = rows.map(x => ({ id: x.id, name: x.name, detail: x.detail || '', price: +x.price || 0, img: x.img || '', desc: (x.intro || (Array.isArray(x.pts) && x.pts.length)) ? { intro: x.intro || '', pts: Array.isArray(x.pts) ? x.pts : [] } : null }));
    store.set('liveProducts', PRODUCTS);
    render(true);
  } catch (e) {}
}
liveProducts();
loadFee();

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
  const close = () => { if (closed) return; closed = true; s.style.opacity = '0'; s.style.pointerEvents = 'none'; setTimeout(() => s.remove(), 800); };
  s.addEventListener('click', close);
  try {
    const a1 = new Audio('salat.mp3'), a2 = new Audio('welcome.mp3'); a1.preload = 'auto'; a2.preload = 'auto';
    a1.onplaying = () => { if (started) return; started = true; clearTimeout(timer); timer = setTimeout(close, 15000); };
    a1.onended = () => { setTimeout(() => { if (!closed) show('أهلاً وسهلاً بكم', 'في منظفات القبطان'); a2.play().catch(() => {}); }, 3000); };
    a2.onended = () => setTimeout(close, 500);
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
  const paint = () => { m.textContent = muted ? '🔇' : '🔊'; };
  paint();
  m.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('mute', muted ? '1' : '0'); } catch (e) {} paint(); if (!muted) play('tick'); });
  document.body.appendChild(m);
})();
