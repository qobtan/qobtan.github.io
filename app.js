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
    `إجمالي المنتجات: ${money(total())}`, 'الدفع: كاش عند الاستلام', `الاسم: ${info.name.trim()}`, `التليفون: ${info.phone.trim()}`, `العنوان (الفيوم): ${info.address.trim()}`].join('\n');
  return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
}
function ready() { return lines().length > 0 && info.name.trim() && info.phone.trim() && info.address.trim(); }
function cartView() {
  const L = lines();
  view.innerHTML = `<div class="sec"><span>سلتك</span><em>${count()} قطعة</em></div>` + (L.length === 0 ? '<div class="empty">السلة فاضية<br><button class="go" data-tab="shop">ارجع للمنتجات</button></div>' : `
  <div class="lines">${L.map(p => `<div class="l2">${p.img ? `<img src="${p.img}" alt="">` : ''}<div class="li"><b>${esc(p.name)}</b><span>${cart[p.id]} × ${money(p.price)}</span><span class="lt">${money(p.price * cart[p.id])}</span></div>
  <div class="step"><button data-dec="${p.id}">−</button><bdi>${cart[p.id]}</bdi><button data-inc="${p.id}">+</button></div></div>`).join('')}</div>
  <div class="sum"><div><span>عدد القطع</span><b>${count()}</b></div><div><span>إجمالي المنتجات</span><b>${money(total())}</b></div><div><span>مصاريف التوصيل</span><span>هتتحدد قبل التأكيد</span></div></div>
  <div class="sec"><span>بيانات التوصيل</span><em>الفيوم</em></div>
  <label class="f"><span>الاسم</span><input type="text" id="f-name" value="${esc(info.name)}" autocomplete="name"></label>
  <label class="f"><span>رقم التليفون</span><input type="tel" id="f-phone" value="${esc(info.phone)}" autocomplete="tel"></label>
  <label class="f"><span>العنوان بالتفصيل</span><input type="text" id="f-address" value="${esc(info.address)}" autocomplete="street-address"></label>
  <div class="f"><span>طريقة الدفع</span><div class="pay"><b>كاش عند الاستلام</b><s>أونلاين (قريبًا)</s></div></div>
  <div id="sendbox"></div><div class="note">الطلب بيتبعت على واتساب لمنظفات القبطان، ومش بيتأكد غير لما يرد عليك.</div>`);
  if (L.length) {
    const upd = () => { $('#sendbox').innerHTML = ready() ? `<a class="wa" href="${waLink()}" target="_blank" rel="noopener">ابعت الطلب على واتساب</a>` : '<div class="hint">اكتب الاسم والتليفون والعنوان عشان زرار الإرسال يظهر.</div>'; };
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
document.addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) { const c = e.target.closest('[data-open]'); if (c) openP(+c.dataset.open); return; }
  if (t.dataset.back) { history.back(); }
  else if (t.dataset.share) { const p = PRODUCTS.find(x => x.id === +t.dataset.share); const txt = p.name + (p.price > 0 ? ' - ' + money(p.price) : '') + '\nمنظفات القبطان (توصيل داخل الفيوم)'; if (navigator.share) navigator.share({ title: p.name, text: txt, url: location.origin + location.pathname }).catch(() => {}); else window.open('https://wa.me/?text=' + encodeURIComponent(txt + '\n' + location.origin + location.pathname)); }
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
