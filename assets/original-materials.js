function materialSessionKey(task) {
  return String(task.liveSession && task.liveSession !== '待识别直播场次' ? task.liveSession : task.id);
}

let captureControlObserver;
function syncCaptureControlSize() {
  captureControlObserver?.disconnect();
  const config = document.querySelector('.highlight-auto-config');
  const button = document.getElementById('highlightUploadBtn');
  if (!config || !button) return;
  const update = () => button.style.setProperty('--capture-control-height', config.getBoundingClientRect().height + 'px');
  captureControlObserver = new ResizeObserver(update);
  captureControlObserver.observe(config); update();
}

function visibleUncutMaterialTasks() {
  const f = highlightClipFilters;
  return highlightTasks.filter(task => !task.clips.length)
    .filter(task => !f.taskId || String(task.id) === f.taskId)
    .filter(task => !f.date || task.created.startsWith(f.date))
    .filter(task => !f.productId || getTaskProductId(task) === f.productId)
    .filter(task => !f.hostName || String(task.hostName || '').toLowerCase().includes(f.hostName.toLowerCase()));
}

function openOriginalMaterials(session) {
  if (document.getElementById('originalMaterialsMask')) return;
  const task = highlightTasks.find(item => String(item.id) === String(session))
    || highlightTasks.find(item => session == null || materialSessionKey(item) === String(session));
  if (!task) { toast('这场直播暂无原始素材'); return; }
  let changed = false;
  const restoreFocus = document.activeElement;
  const shell = document.querySelector('.shell'), previousInert = shell.inert;
  const previousOverflow = document.body.style.overflow;
  const mask = document.createElement('div');
  mask.id = 'originalMaterialsMask'; mask.className = 'original-materials-mask';
  mask.innerHTML = '<section class="original-materials-dialog" role="dialog" aria-modal="true" aria-labelledby="originalMaterialsTitle"><header class="original-materials-heading"><div><h2 id="originalMaterialsTitle">原始录屏</h2><p id="originalMaterialsSession"></p></div><button type="button" class="original-materials-close" aria-label="关闭原始录屏">×</button></header><div class="original-materials-body"><div class="original-materials-detail"></div></div></section>';
  document.body.append(mask); shell.inert = true; document.body.style.overflow = 'hidden';
  const close = () => {
    mask.querySelector('video')?.pause(); mask.remove();
    shell.inert = previousInert; document.body.style.overflow = previousOverflow;
    document.removeEventListener('keydown', onKey);
    if (changed) renderHighlight();
    if (restoreFocus?.isConnected) restoreFocus.focus();
    else document.querySelector('#aiHighlightTab')?.focus();
  };
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const nodes = [...mask.querySelectorAll('button:not([disabled]),a[href],video[controls],[tabindex="0"]')].filter(el => el.getClientRects().length);
    if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1)?.focus(); }
    else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0]?.focus(); }
  };
  const render = () => {
    mask.querySelector('video')?.pause();
    const sessionLabel = task.liveSession && task.liveSession !== '待识别直播场次'
      ? (task.liveStart || '').slice(0, 10) + ' · ' + (task.liveStart || '').slice(11, 16) + ' — ' + (task.liveEnd ? task.liveEnd.slice(11, 16) : '进行中')
      : '手动上传 · 直播场次待识别';
    mask.querySelector('#originalMaterialsSession').textContent = sessionLabel;
    const sourceUrl = task.sourceVideoUrl || task.recordingUrl || task.videoUrl || '';
    const name = task.name && task.name !== '--' ? task.name : '直播录屏';
    const fields = [['素材名称', name], ['素材来源', task.manual ? '手动上传' : '自动录制'], ['直播场次', task.liveSession || '待识别直播场次'], ['直播时间', sessionLabel], ['创建时间', task.created], ['主播', task.hostName || '待识别'], ['任务 ID', task.id], ['素材编号', taskNumber(task)], ['分段编号', task.sectionId || '—'], ['已生成切片', task.clips.length + ' 条'], ['创建人', task.creator || '—'], ['店铺预设', task.preset || '未记录']];
    if (task.sourceSize != null) fields.push(['文件大小', (task.sourceSize / 1024 / 1024).toFixed(2) + ' MB']);
    mask.querySelector('.original-materials-detail').innerHTML = '<section class="original-preview" aria-label="原始录屏预览">' + (sourceUrl
      ? '<video controls playsinline preload="metadata" src="' + escapeHtml(sourceUrl) + '" aria-label="' + escapeHtml(name) + '"></video>'
      : '<div class="original-preview-empty"><span aria-hidden="true">▷</span><b>原始录屏预览</b><p>暂无可播放的录屏文件</p></div>') + '</section><div class="original-materials-meta"><section class="original-info"><div class="original-info-heading"><h3>基本信息</h3>' + '<span class="original-status ' + (task.status.includes('完成') ? 'done' : task.status.includes('失败') ? 'failed' : 'running') + '">' + materialStatus(task) + '</span>' + '</div><dl>' + fields.map(([label, value]) => '<div><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>').join('') + '</dl></section><footer class="original-material-actions"><button type="button" class="reset" data-source-download' + (sourceUrl ? '' : ' disabled') + '>下载原片</button><button type="button" class="reset" data-source-retry' + (task.status.includes('执行中') ? ' disabled' : '') + '>重新生成切片</button><button type="button" class="original-delete" data-source-delete>删除素材</button><button type="button" class="search" data-source-clips' + (task.clips.length ? '' : ' disabled') + '>查看生成切片</button></footer></div>';
    const viewClips = () => { close(); openMaterialClips(String(task.id)); };
    mask.querySelector('[data-source-clips]').onclick = viewClips;
    mask.querySelector('[data-source-download]').onclick = () => { const link = document.createElement('a'); link.href = sourceUrl; link.download = name; document.body.append(link); link.click(); link.remove(); };
    mask.querySelector('[data-source-retry]').onclick = () => { task.status = '执行中'; changed = true; render(); mask.querySelector('[data-source-clips]:not([disabled])')?.focus(); toast('已重新提交生成切片'); };
    mask.querySelector('[data-source-delete]').onclick = () => {
      if (!confirm('确定删除这份原始素材及其生成的切片吗？')) return;
      const index = highlightTasks.indexOf(task); if (index >= 0) highlightTasks.splice(index, 1);
      changed = true;
      if (task.sourceVideoUrl?.startsWith('blob:')) URL.revokeObjectURL(task.sourceVideoUrl);
      [...highlightSelectedClips].filter(key => key.startsWith(task.id + '-')).forEach(key => highlightSelectedClips.delete(key));
      if (highlightClipFilters.taskId === String(task.id)) highlightClipFilters.taskId = '';
      close();
      toast('已删除原始素材及其生成的切片');
    };
  };
  mask.querySelector('.original-materials-close').onclick = close;
  mask.onclick = e => { if (e.target === mask) close(); };
  document.addEventListener('keydown', onKey); render(); mask.querySelector('.original-materials-close').focus();
}
