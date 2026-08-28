<?php
require dirname(__DIR__) . '/api/_boot.php';
require dirname(__DIR__) . '/_cfg.php';
if (current_user()) { header('Location: /panel/'); exit; }
users_all();                                   // seeds admin/admin on first run
$PAGE_TITLE = 'ورود به پنل — بریک کالا';
$PAGE_CSS = ['panel.css'];
require dirname(__DIR__) . '/_head.php';
?>
<body class="login">
<div class="pbg" role="presentation"></div>
<form class="login-box glass" id="lf" autocomplete="on">
  <div class="lg">
    <img src="/assets/img/logo.png" alt="">
    <b>ورود به پنل مدیریت</b>
    <small>بریک کالا</small>
  </div>
  <div class="grid">
    <div class="f">
      <label for="u">نام کاربری</label>
      <input class="inp ltr" id="u" name="username" type="text" autocomplete="username" required>
    </div>
    <div class="f">
      <label for="p">رمز عبور</label>
      <input class="inp ltr" id="p" name="password" type="password" autocomplete="current-password" required>
    </div>
  </div>
  <div class="login-err" id="err"></div>
  <button class="btn pri wide" id="go" type="submit" style="margin-top:16px;height:44px">ورود</button>
  <div class="login-foot">© 2026 Brickala</div>
</form>
<script src="/assets/js/core.js?v=<?= $ASSET_V ?>"></script>
<script>
API.boot();
var f = document.getElementById('lf'), err = document.getElementById('err'), go = document.getElementById('go');
f.addEventListener('submit', function (e) {
  e.preventDefault();
  err.classList.remove('on');
  go.disabled = true; go.textContent = 'در حال ورود…';
  API.post('auth.php?a=login', { u: document.getElementById('u').value, p: document.getElementById('p').value })
    .then(function (r) {
      go.textContent = 'خوش آمدید';
      location.href = r.mustChange ? '/panel/settings.php?first=1' : '/panel/';
    })
    .catch(function (e2) {
      err.textContent = e2.message; err.classList.add('on');
      go.disabled = false; go.textContent = 'ورود';
      document.getElementById('p').select();
    });
});
</script>
</body>
</html>
