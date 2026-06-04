/* MakeImageSmall — shared landing-page compressor engine
   Runs 100% in the browser. No uploads. Reads window.MIS_CFG = { quality, targetKB } */
(function () {
  var CFG = window.MIS_CFG || {};
  var startQ = (CFG.quality || 82) / 100;
  var targetBytes = CFG.targetKB ? CFG.targetKB * 1024 : 0;

  var drop = document.getElementById('mis-drop');
  var input = document.getElementById('mis-input');
  var list = document.getElementById('mis-list');
  var controls = document.getElementById('mis-controls');
  var summary = document.getElementById('mis-summary');
  var qInput = document.getElementById('mis-q');
  var qVal = document.getElementById('mis-qval');
  var allBtn = document.getElementById('mis-all');
  var clearBtn = document.getElementById('mis-clear');
  if (!drop || !input) return;

  if (qInput) { qInput.value = CFG.quality || 82; }
  if (qVal) { qVal.textContent = CFG.quality || 82; }

  var items = [];
  var uid = 0;

  function fmt(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }
  function isHeic(file) {
    return /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  var heicReady = null;
  function ensureHeic() {
    if (!heicReady) heicReady = loadScript('https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js');
    return heicReady;
  }
  var zipReady = null;
  function ensureZip() {
    if (!zipReady) zipReady = loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    return zipReady;
  }

  async function encode(bitmap, q) {
    var canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0);
    return await new Promise(function (res) { canvas.toBlob(res, 'image/webp', q); });
  }

  async function compress(file) {
    var srcBlob = file;
    if (isHeic(file)) {
      await ensureHeic();
      var out = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
      srcBlob = Array.isArray(out) ? out[0] : out;
    }
    var bitmap = await createImageBitmap(srcBlob);
    var q = startQ;
    var blob = await encode(bitmap, q);
    if (targetBytes) {
      while (blob.size > targetBytes && q > 0.3) {
        q -= 0.07;
        blob = await encode(bitmap, q);
      }
    }
    bitmap.close && bitmap.close();
    return blob;
  }

  function render() {
    list.innerHTML = '';
    var totalIn = 0, totalOut = 0, done = 0;
    items.forEach(function (it) {
      totalIn += it.file.size;
      var row = document.createElement('div');
      row.className = 'mis-item';
      var name = it.file.name.replace(/\.[^.]+$/, '') + '.webp';
      var sizes;
      if (it.blob) {
        totalOut += it.blob.size; done++;
        var pct = Math.round((1 - it.blob.size / it.file.size) * 100);
        sizes = '<span class="mis-orig">' + fmt(it.file.size) + '</span><span class="mis-arrow">&rarr;</span>' +
          '<span class="mis-new">' + fmt(it.blob.size) + '</span>' +
          '<span class="mis-save">' + (pct >= 0 ? '\u2212' + pct + '%' : '+' + Math.abs(pct) + '%') + '</span>';
      } else {
        sizes = '<span class="mis-working">Compressing\u2026</span>';
      }
      row.innerHTML =
        '<div class="mis-meta"><div class="mis-name">' + name + '</div>' +
        '<div class="mis-sizes">' + sizes + '</div></div>';
      var btn = document.createElement('button');
      btn.className = 'mis-dl';
      btn.textContent = 'Download';
      btn.disabled = !it.blob;
      btn.onclick = function () { downloadOne(it); };
      row.appendChild(btn);
      list.appendChild(row);
    });
    controls.hidden = items.length === 0;
    if (done > 0) {
      summary.hidden = false;
      var saved = Math.round((1 - totalOut / totalIn) * 100);
      summary.innerHTML = '<strong>' + done + ' image' + (done > 1 ? 's' : '') + '</strong> compressed &middot; ' +
        fmt(totalIn) + ' &rarr; ' + fmt(totalOut) + ' &middot; <strong>' + saved + '% smaller</strong>';
    } else {
      summary.hidden = true;
    }
  }

  function downloadOne(it) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(it.blob);
    a.download = it.file.name.replace(/\.[^.]+$/, '') + '.webp';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  async function downloadAll() {
    var ready = items.filter(function (i) { return i.blob; });
    if (!ready.length) return;
    if (ready.length === 1) return downloadOne(ready[0]);
    await ensureZip();
    var zip = new window.JSZip();
    ready.forEach(function (it) {
      zip.file(it.file.name.replace(/\.[^.]+$/, '') + '.webp', it.blob);
    });
    var blob = await zip.generateAsync({ type: 'blob' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'makeimagesmall-compressed.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  async function recompressAll() {
    startQ = (parseInt(qInput.value, 10)) / 100;
    for (var i = 0; i < items.length; i++) { items[i].blob = null; }
    render();
    for (var j = 0; j < items.length; j++) {
      try { items[j].blob = await compress(items[j].file); } catch (e) { items[j].blob = null; }
      render();
    }
  }

  async function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList).filter(function (f) {
      return f.type.indexOf('image/') === 0 || isHeic(f);
    });
    files.forEach(function (f) { items.push({ id: ++uid, file: f, blob: null }); });
    render();
    for (var i = 0; i < items.length; i++) {
      if (items[i].blob) continue;
      try { items[i].blob = await compress(items[i].file); } catch (e) { items[i].blob = null; }
      render();
    }
  }

  drop.addEventListener('click', function () { input.click(); });
  drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', function () { addFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('mis-over'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('mis-over'); });
  });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
  if (qInput) {
    qInput.addEventListener('input', function () { qVal.textContent = qInput.value; });
    var t;
    qInput.addEventListener('change', function () { clearTimeout(t); t = setTimeout(recompressAll, 80); });
  }
  if (allBtn) allBtn.addEventListener('click', downloadAll);
  if (clearBtn) clearBtn.addEventListener('click', function () { items = []; render(); });
})();
