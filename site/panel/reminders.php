<?php
$PAGE_TITLE = 'یادآورها — بریک کالا';
$PAGE_HEAD  = 'یادآورها';
$PAGE_SUB   = 'تازه‌ترین در بالا';
$NAV = 'reminders';
require __DIR__ . '/_shell.php';
?>
  <div class="pc">
    <div class="pc-h">
      <h3>یادآورها</h3>
      <span class="sp"></span>
      <div class="tabs" id="tabs">
        <button aria-selected="true" data-f="open">انجام نشده</button>
        <button aria-selected="false" data-f="done">انجام شده</button>
        <button aria-selected="false" data-f="all">همه</button>
      </div>
    </div>
    <div class="pc-b">
      <form class="rem-add" id="addF" style="margin:0 0 14px">
        <input class="inp" id="addT" type="text" placeholder="یادآور تازه…" autocomplete="off">
        <button class="btn pri" type="submit">افزودن</button>
      </form>
      <div id="list"><div class="empty">در حال بارگذاری…</div></div>
    </div>
  </div>
<script>
window.__page = function () {
  var esc = UI.esc, el = UI.el, filter = 'open', all = [];
  var WEEK = 7 * 86400;

  function load() {
    return API.get('reminders.php?a=list').then(function (r) { all = r.items; draw(); });
  }
  function draw() {
    var box = document.getElementById('list');
    var list = all.filter(function (x) {
      return filter === 'all' ? true : filter === 'done' ? x.done : !x.done;
    });
    box.innerHTML = '';
    if (!list.length) {
      box.appendChild(el('div', 'empty', '<b>موردی نیست</b>' +
        (filter === 'open' ? 'همهٔ یادآورها انجام شده‌اند.' : 'یادآوری در این دسته نیست.')));
      return;
    }
    var now = Date.now() / 1000;
    list.forEach(function (x) {
      var late = !x.done && (now - (x.createdAt || now)) > WEEK;
      var row = el('div', 'rem' + (x.done ? ' done' : '') + (late ? ' late' : ''));
      row.style.borderBottom = '1px solid var(--line)';
      row.style.borderRadius = '0';
      var tick = el('button', 'tick');
      tick.type = 'button';
      tick.title = x.done ? 'برداشتن تیک' : 'انجام شد';
      tick.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-6"/></svg>';
      tick.addEventListener('click', function () {
        API.post('reminders.php?a=update', { id: x.id, done: !x.done }).then(load)
          .catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });
      });
      var t = el('div', 't');
      t.innerHTML = esc(x.text) + '<small>' + UI.ago(x.createdAt) +
        (x.done && x.doneAt ? ' · انجام شده ' + UI.ago(x.doneAt) : '') +
        (late ? ' — بیش از یک هفته باز مانده' : '') + '</small>';
      var acts = el('div');
      acts.style.cssText = 'display:flex;gap:6px;flex:none';
      var bEdit = el('button', 'btn xs ghost', 'ویرایش');
      bEdit.type = 'button';
      bEdit.addEventListener('click', function () {
        var body = UI.modal('ویرایش یادآور',
          '<div class="f"><label>متن</label><textarea class="inp" id="et" rows="3"></textarea></div>', [
          { label: 'ذخیره', pri: true, act: function (b) {
              return API.post('reminders.php?a=update', { id: x.id, text: b.querySelector('#et').value })
                .then(load).catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });
            } },
          { label: 'انصراف' }
        ]);
        body.querySelector('#et').value = x.text;
      });
      var bDel = el('button', 'btn xs ghost', 'حذف');
      bDel.type = 'button';
      bDel.addEventListener('click', function () {
        UI.confirm('حذف یادآور', 'این یادآور حذف شود؟', 'حذف کن').then(function (yes) {
          if (!yes) return;
          API.post('reminders.php?a=delete', { id: x.id }).then(load)
            .catch(function (e) { UI.toast(e.message, { kind: 'bad' }); });
        });
      });
      acts.appendChild(bEdit); acts.appendChild(bDel);
      row.appendChild(tick); row.appendChild(t); row.appendChild(acts);
      box.appendChild(row);
    });
  }
  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    filter = b.dataset.f;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', String(x === b)); });
    draw();
  });
  document.getElementById('addF').addEventListener('submit', function (e) {
    e.preventDefault();
    var i = document.getElementById('addT'), text = i.value.trim();
    if (!text) return;
    i.value = '';
    API.post('reminders.php?a=add', { text: text }).then(load)
      .catch(function (err) { UI.toast(err.message, { kind: 'bad' }); i.value = text; });
  });
  load();
};
</script>
<?php require __DIR__ . '/_foot.php'; ?>
