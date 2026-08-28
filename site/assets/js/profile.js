/* =====================================================================
   My profile — the name the panel calls you, and the face beside it.
   ===================================================================== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  var MAX = 256;                 // the avatar is never shown larger than this

  function paint(p) {
    $('fName').value  = p.name  || '';
    $('fTitle').value = p.title || '';
    $('fPhone').value = p.phone || '';
    $('fEmail').value = p.email || '';
    $('fNote').value  = p.note  || '';
    $('avLetter').textContent = (p.name || p.u || '؟').trim().charAt(0);
    setPhoto(p.photo);
    $('pFacts').innerHTML =
      '<span>نام کاربری<b class="ltr">' + UI.esc(p.u) + '</b></span>' +
      (p.since ? '<span>عضو از<b>' + Jalali.html(Jalali.stamp(new Date(p.since * 1000))) + '</b></span>' : '');
  }

  function setPhoto(has) {
    var box = $('avBig');
    box.classList.toggle('has', !!has);
    box.style.backgroundImage = has
      ? 'url(/api/profile.php?a=avatar&t=' + Date.now() + ')'
      : '';
    $('avDrop').style.display = has ? '' : 'none';
  }

  /* Shrink in the browser: the server never has to deal with a 6 MB
     photograph straight off a phone camera. */
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject(new Error('فایل خوانده نشد.')); };
      fr.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('این فایل یک تصویر نیست.')); };
        img.onload = function () {
          var side = Math.min(img.width, img.height);          // square crop, centred
          var cv = document.createElement('canvas');
          cv.width = cv.height = MAX;
          var cx = cv.getContext('2d');
          cx.imageSmoothingQuality = 'high';
          cx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, MAX, MAX);
          resolve(cv.toDataURL('image/jpeg', 0.86));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  window.__page = function () {
    return API.get('profile.php?a=get').then(function (r) {
      paint(r.profile);

      $('pForm').addEventListener('submit', function (e) {
        e.preventDefault();
        API.post('profile.php?a=save', {
          name: $('fName').value, title: $('fTitle').value,
          phone: $('fPhone').value, email: $('fEmail').value, note: $('fNote').value
        }).then(function (res) {
          paint(res.profile);
          UI.toast('مشخصات ذخیره شد.', { kind: 'good' });
          var chip = document.querySelector('.who .nm b');
          if (chip) chip.textContent = res.profile.name;
        }).catch(function (err) { UI.toast(err.message, { kind: 'bad' }); });
      });

      $('avPick').addEventListener('click', function () { $('avFile').click(); });
      $('avFile').addEventListener('change', function () {
        var f = $('avFile').files && $('avFile').files[0];
        if (!f) return;
        $('avFile').value = '';
        shrink(f)
          .then(function (dataUrl) { return API.post('profile.php?a=photo', { photo: dataUrl }); })
          .then(function () {
            setPhoto(true);
            UI.toast('عکس پروفایل ثبت شد.', { kind: 'good' });
            var av = document.querySelector('.who .av');
            if (av) { av.classList.add('img'); av.style.backgroundImage = 'url(/api/profile.php?a=avatar&t=' + Date.now() + ')'; }
          })
          .catch(function (err) { UI.toast(err.message, { kind: 'bad' }); });
      });

      $('avDrop').addEventListener('click', function () {
        UI.confirm('حذف عکس', 'عکس پروفایل شما حذف شود؟', 'حذف کن').then(function (yes) {
          if (!yes) return;
          API.post('profile.php?a=unphoto', {}).then(function () {
            setPhoto(false);
            var av = document.querySelector('.who .av');
            if (av) { av.classList.remove('img'); av.style.backgroundImage = ''; }
            UI.toast('عکس حذف شد.');
          }).catch(function (err) { UI.toast(err.message, { kind: 'bad' }); });
        });
      });
    });
  };
})();
