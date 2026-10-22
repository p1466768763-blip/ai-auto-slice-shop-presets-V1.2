/* Frontend publishing prototype. No production publishing requests are made. */
const clipPublishDrafts = new Map();
let currentClipPublish = null;
const publishStorageKey = item => 'live-slice-prototype-copy:publish:' + item.task.id + ':' + item.index;
const publishIcon = (name, extra = '') => `<img class="publish-icon ${extra}" src="assets/icons/${name}.svg" alt="" aria-hidden="true">`;

function readClipPublishDraft(item) {
  const key = publishStorageKey(item);
  if (clipPublishDrafts.has(key)) return clipPublishDrafts.get(key);
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch {}
  const draft = {
    productId: item.productId || '', title: '', topics: [], cart: false,
    vertical: '', horizontal: '', channels: [], timing: 'now', scheduledAt: '',
    ...((saved && saved.version === 1) ? saved : {}), version: 1
  };
  draft.title = String(draft.title || '');
  draft.productId = String(draft.productId || '');
  draft.topics = Array.isArray(draft.topics) ? draft.topics.filter(v => typeof v === 'string').slice(0,10) : [];
  draft.channels = Array.isArray(draft.channels) ? draft.channels.filter(v => ['主页视频','千川素材'].includes(v)) : [];
  draft.timing = draft.timing === 'scheduled' ? 'scheduled' : 'now';
  for (const ratio of ['vertical','horizontal']) if (!/^data:image\/(png|jpeg|webp);base64,/.test(draft[ratio] || '')) draft[ratio] = '';
  clipPublishDrafts.set(key, draft);
  return draft;
}

function syncDemoPublishRecord(item, draft) {
  if (!draft.submittedAt) return;
  const published = draft.submission || draft;
  item.task.clips[item.index].published = published.timing !== 'scheduled';
  item.task.clips[item.index].productId = published.productId;
  const id = 'demo-' + item.task.id + '-' + item.index;
  const row = [id, published.title, published.channels.map(channel=>channel==='主页视频'?'主页':channel==='千川素材'?'千川':channel).join(' / '), published.timing === 'scheduled' ? published.scheduledAt.replace('T',' ') + ':00' : draft.submittedAt, published.timing === 'scheduled' ? '待定时发布（演示）' : '已发布（演示）', published.timing === 'scheduled' ? '0%' : '100%', '本地演示', item.task.id + '-' + item.index];
  const index = data.record.rows.findIndex(r => r[0] === id);
  if (index >= 0) data.record.rows[index] = row; else data.record.rows.unshift(row);
}

function openClipPublish(index, source, origin = 'highlight') {
  const returnToEditor = origin === 'online-edit';
  const backLabel = returnToEditor ? '返回在线编辑页' : '返回成片编辑';
  const item = allHighlightClips().find(clip => String(clip.task.id) === String(source) && clip.index === Number(index));
  if (!item) { toast('未找到这条视频'); return; }
  if ($('#hlClipDate')) readHighlightFilterInputs();
  capturePresetDraft();
  active = 'publish';
  mountAIWorkspace('highlight');
  document.body.classList.add('standalone-publish');
  $('#crumb').textContent = 'AI 直播切片 / 成片库 / 发布成片';
  const panel = $('#panel');
  const draft = readClipPublishDraft(item);
  const managed = getManagedProducts(item.task.preset || currentDefaultPreset);
  if (draft.productId && !managed.some(p => p.id === draft.productId)) { draft.productId = ''; draft.cart = false; }
  currentClipPublish = { item, draft };
  const recent = managed.find(p => p.id === item.productId) || managed.find(p => p.enabled);
  const subtitleKey = 'live-slice-prototype-copy:subtitles:' + item.task.id + ':' + item.index;
  let subtitles;
  try { subtitles = JSON.parse(localStorage.getItem(subtitleKey)); } catch {}
  const caption = subtitles?.enabled && Array.isArray(subtitles.lines) ? subtitles.lines.find(line => line.trim()) || '' : '';
  panel.innerHTML = `<section class="clip-publish-page" aria-labelledby="clipPublishTitle">
    <header class="publish-page-heading"><button type="button" class="publish-back" id="publishBack" aria-label="${backLabel}" title="${backLabel}">${publishIcon('arrow-left')}</button><h2 id="clipPublishTitle" tabindex="-1">发布成片<small>${escapeHtml(item.clipNumber)}</small></h2></header>
    <div class="publish-layout">
      <aside class="publish-card publish-preview-card" aria-label="视频预览">
        <div class="publish-preview-head"><h3>视频预览</h3><button class="publish-icon-button" id="publishFullscreen" aria-label="全屏预览">${publishIcon('maximize')}</button></div>
        <div class="publish-preview-media"><img src="${escapeHtml(clipCover(item))}" alt="当前成片的演示封面"><span class="publish-demo-label">演示封面</span>${caption ? `<div class="publish-caption-preview">${escapeHtml(caption)}</div>` : ''}</div>
        <button class="publish-subtitle-link" id="publishEditSubtitles">编辑字幕</button>
      </aside>
      <form class="publish-form" id="clipPublishForm" novalidate>
        <section class="publish-card" aria-labelledby="publishProductLabel">
          <div class="publish-card-title"><h3 id="publishProductLabel">关联商品：</h3></div>
          <div class="publish-related-products"><button type="button" class="publish-product-picker" id="publishChooseProduct">${publishIcon('plus')}<span>关联商品</span></button>
            ${recent ? `<div class="publish-recent"><span class="publish-recent-label">最近讲解</span><div class="publish-product-item"><div class="publish-product-text"><b>${escapeHtml(recent.name)}</b><small>货号：${escapeHtml(recent.sku || recent.id)}</small></div><button type="button" class="publish-text-button" id="publishAddRecent">添加到关联商品</button></div></div>` : '<p class="publish-preview-note">暂无商品，请先在店铺预设的商品管理中添加。</p>'}</div>
          <div class="publish-linked" id="publishLinked" hidden><span></span><button type="button" class="publish-text-button" id="publishRemoveProduct">移除</button></div>
          <label class="publish-cart" for="publishCart">是否可以挂车：<input class="publish-switch" type="checkbox" id="publishCart" ${draft.cart ? 'checked' : ''}></label>
          <p class="publish-field-error" id="publishProductError" role="status"></p>
        </section>
        <section class="publish-card"><div class="publish-card-title"><h3><label for="publishTitle"><span class="publish-required">*</span>标题：</label></h3><span class="publish-title-source" id="publishTitleSource"></span><button type="button" class="publish-text-button" id="publishUseProduct">使用</button></div>
          <div class="publish-input-row"><input id="publishTitle" maxlength="100" placeholder="请输入视频标题" value="${escapeHtml(draft.title)}" required aria-describedby="publishTitleError"><button type="button" class="publish-text-button" id="publishOptimize">AI优化</button></div><p class="publish-field-error" id="publishTitleError" role="status"></p>
        </section>
        <section class="publish-card"><div class="publish-card-title"><h3><label for="publishTopic">话题：</label></h3></div><div class="publish-topic-tags" id="publishTopics"></div>
          <div class="publish-topic-row"><input class="publish-topic-input" id="publishTopic" list="publishTopicOptions" placeholder="输入或选择话题" maxlength="30" value="${escapeHtml(draft.topicInput || '')}"><button type="button" id="publishAddTopic">添加</button></div><datalist id="publishTopicOptions"><option value="好物推荐"><option value="直播好物"><option value="新品推荐"><option value="日常穿搭"></datalist><p class="publish-field-error" id="publishTopicError" role="status"></p>
        </section>
        <section class="publish-card"><div class="publish-card-title"><h3>封面：</h3></div><button type="button" class="publish-upload-button" id="publishUploadCover">上传封面</button><input type="file" id="publishCoverFile" accept="image/png,image/jpeg,image/webp" hidden>
          <div class="publish-covers">${[['vertical','竖封面9:16'],['horizontal','横封面16:9']].map(([ratio,label]) => `<div class="publish-cover"><button type="button" class="publish-cover-slot" data-cover="${ratio}" aria-label="上传${label}">${publishIcon('plus')}<span>上传封面</span></button><span>${label}</span><button type="button" class="publish-cover-clear" data-clear-cover="${ratio}" hidden>移除封面</button></div>`).join('')}</div><p class="publish-field-error" id="publishCoverError" role="status"></p>
        </section>
        <section class="publish-card"><div class="publish-card-title"><h3 id="publishChannelsLabel"><span class="publish-required">*</span>发布渠道：</h3></div><div class="publish-choice-row" id="publishChannels" role="group" aria-labelledby="publishChannelsLabel" aria-describedby="publishChannelError">${['主页视频','千川素材'].map(channel => `<label><input name="publishChannel" type="checkbox" value="${channel}" ${draft.channels.includes(channel) ? 'checked' : ''}>${channel}</label>`).join('')}</div><p class="publish-field-error" id="publishChannelError" role="status"></p></section>
        <section class="publish-card"><div class="publish-card-title"><h3 id="publishTimingLabel"><span class="publish-required">*</span>发布时间：</h3></div><div class="publish-choice-row" role="group" aria-labelledby="publishTimingLabel"><label><input type="radio" name="publishTiming" value="now" ${draft.timing === 'now' ? 'checked' : ''}>立即发布</label><label><input type="radio" name="publishTiming" value="scheduled" ${draft.timing === 'scheduled' ? 'checked' : ''}>定时发布</label></div><input class="publish-schedule" type="datetime-local" id="publishScheduledAt" aria-label="定时发布时间" aria-describedby="publishTimingError" value="${escapeHtml(draft.scheduledAt)}" ${draft.timing !== 'scheduled' ? 'hidden' : ''}><p class="publish-field-error" id="publishTimingError" role="status"></p></section>
        <footer class="publish-footer"><p>原型演示，发布操作不会提交到真实平台。</p><div class="publish-footer-actions"><button type="button" class="reset" id="publishSaveDraft">保存草稿</button><button type="submit" class="publish-primary">发布</button></div></footer><div class="publish-status" id="publishStatus" role="status" aria-live="polite"></div>
      </form>
    </div>
  </section>`;
  const q = selector => panel.querySelector(selector);
  const currentProduct = () => managed.find(p => p.id === draft.productId);
  const collect = () => {
    draft.title = q('#publishTitle').value;
    draft.cart = !!draft.productId && q('#publishCart').checked;
    draft.channels = [...panel.querySelectorAll('[name="publishChannel"]:checked')].map(input => input.value);
    draft.timing = q('[name="publishTiming"]:checked').value;
    draft.scheduledAt = q('#publishScheduledAt').value;
    draft.topicInput = q('#publishTopic').value;
    return draft;
  };
  const showStatus = text => { q('#publishStatus').textContent = text; };
  const save = (quiet = false) => {
    collect();
    try { localStorage.setItem(publishStorageKey(item), JSON.stringify(draft)); }
    catch { showStatus('保存失败，浏览器存储空间不足或不可用。请移除封面后重试，当前内容仍保留。'); return false; }
    if (!quiet) showStatus('发布草稿已保存。');
    return true;
  };
  const drawProduct = () => {
    const product = currentProduct();
    q('#publishLinked').hidden = !product;
    q('#publishLinked span').textContent = product ? product.name + ' · ' + product.id : '';
    q('#publishTitleSource').textContent = (product || recent)?.name || '';
    q('#publishUseProduct').hidden = !(product || recent);
    q('#publishCart').disabled = !product;
    q('#publishProductError').textContent = '';
    if (!product) { draft.cart = false; q('#publishCart').checked = false; }
    if (q('#publishAddRecent')) { q('#publishAddRecent').disabled = product?.id === recent.id; q('#publishAddRecent').textContent = product?.id === recent.id ? '已关联' : '添加到关联商品'; }
  };
  const drawTopics = () => {
    q('#publishTopics').innerHTML = draft.topics.map((topic,i) => `<span class="publish-topic-tag">#${escapeHtml(topic)}<button type="button" data-remove-topic="${i}" aria-label="移除话题${escapeHtml(topic)}">${publishIcon('x')}</button></span>`).join('');
    panel.querySelectorAll('[data-remove-topic]').forEach(button => button.onclick = () => { draft.topics.splice(Number(button.dataset.removeTopic),1); drawTopics(); });
  };
  const drawCovers = () => {
    for (const ratio of ['vertical','horizontal']) {
      q(`[data-cover="${ratio}"]`).innerHTML = draft[ratio] ? `<img src="${draft[ratio]}" alt="${ratio === 'vertical' ? '竖' : '横'}封面预览">` : publishIcon('plus') + '<span>上传封面</span>';
      q(`[data-clear-cover="${ratio}"]`).hidden = !draft[ratio];
    }
  };
  q('#publishBack').onclick = () => {
    if (!save(true)) return;
    if (!returnToEditor) {
      currentClipPublish = null;
      const cleanUrl = new URL(location.href);
      ['publish_task','publish_clip','publish_from'].forEach(key => cleanUrl.searchParams.delete(key));
      history.replaceState(null,'',cleanUrl.href);
      renderHighlight();
      return;
    }
    const target = new URL('online-edit/index.html', document.baseURI);
    target.searchParams.set('task', item.task.id);
    target.searchParams.set('clip', item.index);
    window.location.href = target.href;
  };
  q('#publishSaveDraft').onclick = () => save();
  q('#clipPublishForm').oninput = collect;
  q('#clipPublishForm').onchange = collect;
  q('#publishEditSubtitles').onclick = () => { collect(); openSubtitleEditor(item.index,item.task.id); };
  q('#publishFullscreen').onclick = async () => {
    try { await q('.publish-preview-media').requestFullscreen(); } catch { toast('当前浏览器无法进入全屏预览'); }
  };
  q('#publishChooseProduct').onclick = () => {
    const dialog = document.createElement('dialog'); dialog.className = 'publish-product-dialog'; dialog.setAttribute('aria-labelledby','publishProductDialogTitle');
    dialog.innerHTML = `<header><h3 id="publishProductDialogTitle">关联商品</h3><button type="button" class="publish-icon-button" data-product-close aria-label="关闭商品选择">${publishIcon('x')}</button></header><label for="publishProductSelect">选择店铺商品</label><select id="publishProductSelect"><option value="">请选择商品</option>${managed.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === draft.productId ? 'selected' : ''}>${escapeHtml(p.name)} · ${escapeHtml(p.id)}</option>`).join('')}</select>${managed.length ? '' : '<p>暂无商品，请在店铺预设 → 商品管理中添加。</p>'}<p class="publish-field-error" id="publishProductSelectError" role="status"></p><div class="publish-footer-actions"><button type="button" class="reset" data-product-close>取消</button><button type="button" class="publish-primary" id="publishConfirmProduct">确认关联</button></div>`;
    document.body.append(dialog);dialog.showModal();
    dialog.querySelectorAll('[data-product-close]').forEach(b => b.onclick = () => dialog.close());
    dialog.onclose = () => { dialog.remove(); q('#publishChooseProduct').focus(); };
    dialog.querySelector('#publishConfirmProduct').onclick = () => {
      const value = dialog.querySelector('select').value;
      if (!managed.some(p => p.id === value)) { dialog.querySelector('#publishProductSelectError').textContent = '请选择一个商品。'; return; }
      draft.productId = value; drawProduct(); dialog.close();
    };
  };
  if (recent) q('#publishAddRecent').onclick = () => { draft.productId = recent.id; drawProduct(); };
  q('#publishRemoveProduct').onclick = () => { draft.productId = ''; drawProduct(); };
  q('#publishUseProduct').onclick = () => {
    q('#publishTitle').value = ((currentProduct() || recent)?.name || '').slice(0,100); collect();q('#publishTitle').focus();q('#publishTitleError').textContent = '';q('#publishTitle').removeAttribute('aria-invalid');
  };
  q('#publishOptimize').onclick = () => {
    const title = q('#publishTitle').value.trim();
    if (!title) { q('#publishTitleError').textContent = '请先填写标题。'; q('#publishTitle').focus(); return; }
    q('#publishTitle').value = title.replace(/\s+/g,' ').slice(0,100);collect();showStatus('已演示标题整理；AI优化服务尚未接入。');
  };
  const addTopic = () => {
    const input = q('#publishTopic'), value = input.value.trim().replace(/^#+/,'');
    if (!value) return true;
    if (draft.topics.includes(value)) { input.value = ''; return true; }
    if (draft.topics.length >= 10) { q('#publishTopicError').textContent = '最多添加 10 个话题。'; return false; }
    draft.topics.push(value); input.value = ''; q('#publishTopicError').textContent = ''; drawTopics(); return true;
  };
  q('#publishAddTopic').onclick = addTopic;
  q('#publishTopic').onkeydown = event => { if (event.key === 'Enter') { event.preventDefault(); addTopic(); } };
  let uploadRatio = 'vertical';
  panel.querySelectorAll('[data-cover]').forEach(button => button.onclick = () => { uploadRatio = button.dataset.cover; q('#publishCoverFile').click(); });
  q('#publishUploadCover').onclick = () => { uploadRatio = 'both'; q('#publishCoverFile').click(); };
  panel.querySelectorAll('[data-clear-cover]').forEach(button => button.onclick = () => { draft[button.dataset.clearCover] = ''; drawCovers(); });
  q('#publishCoverFile').onchange = async event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    const error = q('#publishCoverError'); error.textContent = '';
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { error.textContent = '请上传 JPG、PNG 或 WebP 图片。'; return; }
    if (file.size > 10 * 1024 * 1024) { error.textContent = '图片不能超过 10 MB。'; return; }
    try {
      const bitmap = await createImageBitmap(file);
      const ratios = uploadRatio === 'both' ? ['vertical','horizontal'] : [uploadRatio];
      for (const ratio of ratios) {
        const canvas = document.createElement('canvas'); canvas.width = ratio === 'vertical' ? 540 : 960; canvas.height = ratio === 'vertical' ? 960 : 540;
        const scale = Math.max(canvas.width / bitmap.width, canvas.height / bitmap.height);
        canvas.getContext('2d').drawImage(bitmap,(canvas.width-bitmap.width*scale)/2,(canvas.height-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);
        draft[ratio] = canvas.toDataURL('image/jpeg',.85);
      }
      bitmap.close();drawCovers();showStatus('封面已更新，按对应比例居中裁切。');
    } catch { error.textContent = '无法读取这张图片，请重新选择。'; }
  };
  panel.querySelectorAll('[name="publishTiming"]').forEach(input => input.onchange = () => { collect(); q('#publishScheduledAt').hidden = draft.timing !== 'scheduled'; });
  q('#clipPublishForm').onsubmit = event => {
    event.preventDefault(); if (!addTopic()) return; collect();
    const titleError = !draft.title.trim() ? '请输入视频标题。' : '';
    const channelError = !draft.channels.length ? '请至少选择一个发布渠道。' : '';
    const timingError = draft.timing === 'scheduled' && (!draft.scheduledAt || !Number.isFinite(new Date(draft.scheduledAt).getTime()) || new Date(draft.scheduledAt).getTime() <= Date.now()) ? '请选择晚于当前时间的发布时间。' : '';
    q('#publishTitleError').textContent = titleError; q('#publishChannelError').textContent = channelError; q('#publishTimingError').textContent = timingError;
    q('#publishTitle').setAttribute('aria-invalid',String(!!titleError));q('#publishChannels').setAttribute('aria-invalid',String(!!channelError));q('#publishScheduledAt').setAttribute('aria-invalid',String(!!timingError));
    if (titleError || channelError || timingError) { (titleError ? q('#publishTitle') : channelError ? q('[name="publishChannel"]') : q('#publishScheduledAt')).focus(); return; }
    const oldSubmittedAt = draft.submittedAt, oldSubmission = draft.submission;
    draft.submittedAt = new Date().toLocaleString('sv-SE');
    draft.submission = {title:draft.title,channels:[...draft.channels],timing:draft.timing,scheduledAt:draft.scheduledAt,productId:draft.productId};
    if (!save(true)) { if (oldSubmittedAt) draft.submittedAt = oldSubmittedAt; else delete draft.submittedAt; if(oldSubmission)draft.submission=oldSubmission;else delete draft.submission; return; }
    syncDemoPublishRecord(item,draft);
    q('#publishStatus').textContent = draft.timing === 'scheduled' ? '定时发布演示已记录。不会在后台执行真实发布。' : '发布演示已记录，可在发布记录中查看。未提交到真实平台。';
    q('#publishStatus').scrollIntoView({block:'nearest'});
    toast('已完成发布演示');
  };
  drawProduct();drawTopics();drawCovers();
  if (draft.submittedAt) showStatus('这条视频已有本地发布演示记录，可继续修改配置。');
  window.scrollTo(0,0);q('#clipPublishTitle').focus({preventScroll:true});
}

// Restore only this prototype's local demonstrations; never contact the live site.
for (const item of allHighlightClips()) {
  const draft = readClipPublishDraft(item);
  if (draft.submittedAt) syncDemoPublishRecord(item,draft);
}
document.addEventListener('clip-subtitles-saved', event => {
  const current = currentClipPublish;
  if (!current || active !== 'publish' || String(current.item.task.id) !== String(event.detail.taskId) || current.item.index !== event.detail.index) return;
  const media = document.querySelector('.publish-preview-media');
  if (!media) return;
  let preview = media.querySelector('.publish-caption-preview');
  if (!preview) { preview = document.createElement('div'); preview.className = 'publish-caption-preview'; media.append(preview); }
  preview.textContent = event.detail.enabled ? event.detail.lines.find(line => line.trim()) || '' : '';
  preview.hidden = !preview.textContent;
});
if (data.record.rows.some(r => r[0].startsWith('demo-'))) renderHighlight();
const publishDeepLink = new URLSearchParams(location.search);
if (publishDeepLink.has('publish_task') && publishDeepLink.has('publish_clip')) openClipPublish(publishDeepLink.get('publish_clip'),publishDeepLink.get('publish_task'),publishDeepLink.get('publish_from') || 'highlight');
