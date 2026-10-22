/* Each library card contains its own preview and subtitle editor. */
const inlineClipSubtitleDrafts = new Map();
const inlineSubtitleKey = item => 'live-slice-prototype-copy:subtitles:' + item.task.id + ':' + item.index;
const inlineSubtitleExamples = ['这款商品的细节给大家看一下','近距离看看面料和做工','日常搭配也很合适','这里是我们今天介绍的重点','可以根据自己的需要来选择','再给大家展示一下整体效果','商品信息可以在页面中查看','感兴趣的朋友可以了解一下'];

function inlineClipSubtitleState(item) {
  const key = inlineSubtitleKey(item);
  if (inlineClipSubtitleDrafts.has(key)) return inlineClipSubtitleDrafts.get(key);
  const clip = item.task.clips[item.index];
  let draft = {version:1,enabled:true,example:true,lines:[...inlineSubtitleExamples]}, error = '';
  if (Array.isArray(clip.subtitles)) draft = {version:1,enabled:true,example:false,lines:clip.subtitles.map(line => typeof line === 'string' ? line : String(line.text ?? ''))};
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && saved.version === 1 && typeof saved.enabled === 'boolean' && Array.isArray(saved.lines) && saved.lines.every(line => typeof line === 'string')) draft = {version:1,enabled:saved.enabled,example:saved.example === true,lines:[...saved.lines]};
  } catch { error = '未能读取本地字幕，请检查内容后再保存。'; }
  const state = {draft,savedSnapshot:JSON.stringify(draft),selected:0,message:error,error:!!error};
  inlineClipSubtitleDrafts.set(key,state);
  return state;
}

function renderInlineClipCard(item) {
  const clipKey = item.task.id + '-' + item.index;
  const selected = highlightSelectedClips.has(clipKey);
  const product = item.productId ? getManagedProducts(item.task.preset || currentDefaultPreset).find(product => product.id === item.productId) : null;
  const state = inlineClipSubtitleState(item), suffix = encodeURIComponent(clipKey);
  return `<article class="clip-card clip-editor-card${selected ? ' is-selected' : ''}" data-card-key="${escapeHtml(clipKey)}" data-inline-task="${escapeHtml(item.task.id)}" data-inline-clip="${item.index}" aria-label="视频">
    <header class="clip-editor-heading"><div class="clip-editor-product"><strong>${escapeHtml(product?.name || item.productId || '')}</strong><span class="clip-editor-duration">${escapeHtml(item.duration)}</span><span class="clip-editor-status${item.published ? ' published' : ''}">${item.published ? '已发布' : '未发布'}</span></div>${highlightBatchMode ? `<label class="clip-editor-select"><input type="checkbox" class="highlight-select" data-clip-key="${escapeHtml(clipKey)}" aria-label="选择视频 ${escapeHtml(item.clipNumber)}"${selected ? ' checked' : ''}>选择此视频</label>` : ''}</header>
    <div class="subtitle-editor-body clip-inline-body">
      <div class="subtitle-preview-pane"><div class="subtitle-preview-frame"><video class="clip-inline-video" poster="${escapeHtml(clipCover(item))}" preload="metadata" playsinline controls aria-label="视频预览"><source src="${escapeHtml(item.videoUrl || item.task.videoUrl || '')}" type="video/mp4"></video><img class="clip-inline-poster" src="${escapeHtml(clipCover(item))}" alt="当前视频的演示封面" loading="lazy" width="900" height="1600"><span class="subtitle-preview-label">视频预览</span><div class="subtitle-preview-copy"></div></div></div>
      <section class="subtitle-edit-pane" aria-label="${escapeHtml(item.clipNumber)} 字幕编辑">
        <div class="subtitle-edit-head"><div><h3>字幕设置</h3></div><label class="subtitle-switch"><input class="inline-subtitle-enabled" type="checkbox" ${state.draft.enabled ? 'checked' : ''}>启用字幕</label></div>
        <p id="inline-subtitle-hint-${suffix}" class="subtitle-editor-hint">${state.draft.example ? '当前为示例字幕，可逐条修改文字。' : '点击字幕可预览并修改文字，自动定位视频第一帧。'}</p>
        <div class="subtitle-edit-list" aria-describedby="inline-subtitle-hint-${suffix}"></div><div class="subtitle-save-status" role="status" aria-live="polite"></div>
        <div class="subtitle-edit-foot"><button type="button" class="reset inline-subtitle-edit">继续编辑</button><button type="button" class="subtitle-save-btn inline-subtitle-publish">前往发布</button><button type="button" class="reset inline-subtitle-export">导出草稿</button></div>
      </section>
    </div>
  </article>`;
}

function mountInlineClipEditors() {
  const items = new Map(allHighlightClips().map(item => [item.task.id + '-' + item.index,item]));
  document.querySelectorAll('.clip-editor-card[data-inline-task]').forEach(root => {
    const item = items.get(root.dataset.cardKey);
    if (!item) return;
    const state = inlineClipSubtitleState(item), list = root.querySelector('.subtitle-edit-list');
    const preview = root.querySelector('.subtitle-preview-copy'), status = root.querySelector('.subtitle-save-status');
    const video = root.querySelector('.clip-inline-video'), poster = root.querySelector('.clip-inline-poster');
    const drawStatus = () => { status.textContent = state.message; status.classList.toggle('is-error',state.error); };
    const resizeLine = input => { input.style.height = '0px'; input.style.height = Math.max(24,input.scrollHeight) + 'px'; };
    const updatePreview = () => {
      preview.textContent = state.draft.lines[state.selected] || '';
      preview.hidden = !state.draft.enabled || !preview.textContent;
      list.querySelectorAll('.subtitle-item').forEach((row,i) => row.classList.toggle('is-active',i === state.selected));
      if (video && video.currentTime) { video.currentTime = 0; video.pause(); }
    };
    const markChanged = () => {
      state.error = false;
      state.message = JSON.stringify(state.draft) === state.savedSnapshot ? '' : '有未保存的修改';
      drawStatus();
      clearTimeout(state.autoSaveTimer);
      if (state.message) state.autoSaveTimer = setTimeout(() => {
        try {
          localStorage.setItem(inlineSubtitleKey(item),JSON.stringify(state.draft));
          state.savedSnapshot = JSON.stringify(state.draft); state.message = '已自动保存'; state.error = false; drawStatus();
        } catch { state.error = true; state.message = '自动保存失败，当前修改仍保留。'; drawStatus(); }
      }, 500);
    };
    const focusSelected = () => {
      const input = list.querySelectorAll('[data-subtitle-line]')[state.selected] || list.querySelector('.subtitle-add-btn');
      input?.focus({preventScroll:true});
      if (input) { const row = input.closest('.subtitle-item') || input; const top = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop; if(top < list.scrollTop) list.scrollTop = top; else if(top + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = top + row.offsetHeight - list.clientHeight; }
    };
    const renderLines = () => {
      list.innerHTML = state.draft.lines.length ? state.draft.lines.map((text,i) => `<div class="subtitle-item${i === state.selected ? ' is-active' : ''}"><span class="subtitle-item-index">${i + 1}</span><textarea class="subtitle-line-text" rows="1" aria-label="第 ${i + 1} 条字幕" placeholder="输入字幕内容" data-subtitle-line="${i}">${escapeHtml(text)}</textarea><div class="subtitle-item-actions"><button type="button" class="subtitle-icon-btn" title="在本条后添加字幕" aria-label="在第 ${i + 1} 条字幕后添加" data-subtitle-add="${i}"><img class="subtitle-icon" src="assets/icons/plus.svg" alt="" aria-hidden="true"></button><button type="button" class="subtitle-icon-btn" title="删除这条字幕" aria-label="删除第 ${i + 1} 条字幕" data-subtitle-delete="${i}"><img class="subtitle-icon" src="assets/icons/trash.svg" alt="" aria-hidden="true"></button></div></div>`).join('') : '<div class="subtitle-edit-empty"><p>暂无字幕，点击“添加字幕”开始编辑。</p><button type="button" class="subtitle-add-btn" data-subtitle-add="-1">添加字幕</button></div>';
      list.querySelectorAll('[data-subtitle-line]').forEach(input => {
        resizeLine(input);
        input.onfocus = () => { state.selected = Number(input.dataset.subtitleLine); updatePreview(); };
        input.oninput = () => { state.selected = Number(input.dataset.subtitleLine); state.draft.lines[state.selected] = input.value; resizeLine(input); updatePreview(); markChanged(); };
        input.closest('.subtitle-item').onclick = event => { if (!event.target.closest('button')) input.focus(); };
      });
      list.querySelectorAll('[data-subtitle-add]').forEach(button => button.onclick = () => { state.selected = Number(button.dataset.subtitleAdd) + 1; state.draft.lines.splice(state.selected,0,''); renderLines(); markChanged(); focusSelected(); });
      list.querySelectorAll('[data-subtitle-delete]').forEach(button => button.onclick = () => { const removed = Number(button.dataset.subtitleDelete); state.draft.lines.splice(removed,1); state.selected = Math.max(0,Math.min(state.selected - (removed < state.selected ? 1 : 0),state.draft.lines.length - 1)); renderLines(); markChanged(); focusSelected(); });
      updatePreview();
    };
    const save = () => {
      try {
        localStorage.setItem(inlineSubtitleKey(item),JSON.stringify(state.draft));
        state.savedSnapshot = JSON.stringify(state.draft); state.error = false; state.message = '已保存当前视频的字幕'; drawStatus();
        document.dispatchEvent(new CustomEvent('clip-subtitles-saved',{detail:{origin:'inline',taskId:item.task.id,index:item.index,enabled:state.draft.enabled,example:state.draft.example,lines:[...state.draft.lines]}}));
        return true;
      } catch { state.error = true; state.message = '保存失败，请检查浏览器存储权限。当前修改仍保留。'; drawStatus(); return false; }
    };
    root.querySelector('.inline-subtitle-enabled').onchange = event => { state.draft.enabled = event.target.checked; updatePreview(); markChanged(); };
    const autoSave = () => { try { localStorage.setItem(inlineSubtitleKey(item),JSON.stringify(state.draft)); state.savedSnapshot = JSON.stringify(state.draft); state.message = '已自动保存'; state.error = false; drawStatus(); } catch { state.error = true; state.message = '自动保存失败，当前修改仍保留。'; drawStatus(); } };
    root.querySelector('.inline-subtitle-edit').onclick = () => {
      try { localStorage.setItem(inlineSubtitleKey(item),JSON.stringify(state.draft)); } catch {}
      const target = new URL('online-edit/index.html', document.baseURI);
      target.searchParams.set('task',item.task.id);
      target.searchParams.set('clip',item.index);
      window.location.href = target.href;
    };
    root.querySelector('.inline-subtitle-publish').onclick = () => { if (save()) openClipPublish(item.index,item.task.id); };
    root.querySelector('.inline-subtitle-export').onclick = () => { if (save()) toast('已保存当前编辑，导出剪映草稿（原型演示）'); };
    list.addEventListener('focusin', event => { if (event.target.matches('[data-subtitle-line]') && video) { video.pause(); try { video.currentTime = 0; } catch {} } });
    if (video && !video.currentSrc) { video.hidden = true; if (poster) poster.hidden = false; }
    renderLines(); drawStatus();
    let width = 0;
    const observer = new ResizeObserver(() => {
      if (!root.isConnected) { observer.disconnect(); return; }
      if (list.clientWidth && list.clientWidth !== width) { width = list.clientWidth; list.querySelectorAll('[data-subtitle-line]').forEach(resizeLine); }
    });
    observer.observe(root);
  });
}

// List-mode dialogs and the publication page share the same subtitle storage.
document.addEventListener('clip-subtitles-saved',event => {
  if (event.detail.origin === 'inline') return;
  const {taskId,index,enabled,lines} = event.detail;
  const key = 'live-slice-prototype-copy:subtitles:' + taskId + ':' + index;
  const state = inlineClipSubtitleDrafts.get(key);
  if (!state || !Array.isArray(lines)) return;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch {}
  state.draft = {version:1,enabled,example:saved?.example === true,lines:[...lines]};
  state.savedSnapshot = JSON.stringify(state.draft); state.selected = 0; state.message = '已保存当前视频的字幕'; state.error = false;
});
