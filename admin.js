const SUPA_URL = 'https://aiqfiiuozweqbqlgivqj.supabase.co';
const SUPA_ANON = 'sb_publishable_POz8lTd9lNj2xId7tzghHQ_dkEbX3n9';
const $ = s => document.querySelector(s);
let PIN = sessionStorage.getItem('adminpin') || '';
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

async function enter() {
  const p = $('#pin').value.trim();
  $('#pinmsg').className = 'msg'; $('#pinmsg').textContent = '...';
  if (!p) { $('#pinmsg').textContent = 'اكتب الرقم السري'; return; }
  const ok = await checkPin(p).catch(() => false);
  if (!ok) { $('#pinmsg').className = 'msg err'; $('#pinmsg').textContent = 'الرقم غلط أو مفيش اتصال'; return; }
  PIN = p; sessionStorage.setItem('adminpin', p);
  $('#pinbox').hidden = true; $('#panel').hidden = false;
  load();
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
  if (ok) { PIN = n; sessionStorage.setItem('adminpin', n); m.className = 'msg ok'; m.textContent = 'الرقم اتغير — خده بالرقم الجديد'; $('#oldpin').value = ''; $('#newpin').value = ''; }
  else { m.className = 'msg err'; m.textContent = 'الرقم الحالي غلط'; }
}

$('#enter').addEventListener('click', enter);
$('#pin').addEventListener('keydown', e => { if (e.key === 'Enter') enter(); });
$('#logout').addEventListener('click', () => { sessionStorage.removeItem('adminpin'); location.reload(); });
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
  if (PIN && await checkPin(PIN).catch(() => false)) {
    $('#pinbox').hidden = true; $('#panel').hidden = false; load();
  }
})();
