(() => {
  const state = {
    activities: [],
    lastActivityId: '',
    editingActivityId: '',
    removedByActivity: new Map()
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.includes('/rpc/save_guide_activity') && init?.body) {
      init = { ...init, body: filterSaveBody(init.body) };
    }
    const response = await originalFetch(input, init);
    if (url.includes('/rpc/get_guide_initial_data') || url.includes('/rpc/save_guide_activity')) {
      response.clone().json().then(data => {
        if (Array.isArray(data?.activities)) state.activities = data.activities;
      }).catch(() => {});
    }
    return response;
  };

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open],[data-detail],[data-primary]');
    if (opener) state.lastActivityId = opener.dataset.open || opener.dataset.detail || opener.dataset.primary || state.lastActivityId;
    if (event.target.closest('#editActivityBtn')) state.editingActivityId = state.lastActivityId;
    if (event.target.closest('#addActivityBtn')) state.editingActivityId = '';
    const removeButton = event.target.closest('[data-existing-file-remove]');
    if (removeButton) toggleAttachment(removeButton.dataset.existingFileRemove || '');
  }, true);

  const observer = new MutationObserver(() => decorateExistingFiles());
  document.addEventListener('DOMContentLoaded', () => {
    const box = document.getElementById('activityExistingFiles');
    if (box) observer.observe(box, { childList: true, subtree: true });
  });

  function filterSaveBody(body) {
    let payload;
    try { payload = JSON.parse(String(body)); } catch { return body; }
    const activity = payload?.p_activity;
    if (!activity?.id || !Array.isArray(activity.attachments)) return body;
    const removed = state.removedByActivity.get(String(activity.id));
    if (!removed?.size) return body;
    payload.p_activity = {
      ...activity,
      attachments: activity.attachments.filter(file => !removed.has(getAttachmentKey(file)))
    };
    return JSON.stringify(payload);
  }

  function decorateExistingFiles() {
    const box = document.getElementById('activityExistingFiles');
    if (!box || !state.editingActivityId || box.dataset.decorating === '1') return;
    const activity = state.activities.find(row => String(row.id) === String(state.editingActivityId));
    const files = orderedAttachments(activity?.attachments);
    const rows = Array.from(box.querySelectorAll('.file-name-line'));
    if (!files.length || !rows.length) return;
    box.dataset.decorating = '1';
    rows.forEach((row, index) => {
      const file = files[index];
      if (!file || row.querySelector('[data-existing-file-remove]')) return;
      const key = getAttachmentKey(file);
      const removed = getRemovedSet().has(key);
      row.classList.toggle('marked-remove', removed);
      const text = row.querySelector('.file-name-text');
      if (text && removed && !text.querySelector('em')) text.insertAdjacentHTML('beforeend', '<em>삭제 예정</em>');
      if (text && !removed) text.querySelector('em')?.remove();
      const actions = document.createElement('div');
      actions.className = 'file-actions';
      Array.from(row.querySelectorAll('.file-mini-link')).forEach(link => actions.appendChild(link));
      const button = document.createElement('button');
      button.className = 'file-remove-btn';
      button.type = 'button';
      button.dataset.existingFileRemove = key;
      button.textContent = removed ? '되돌리기' : '삭제';
      actions.appendChild(button);
      row.appendChild(actions);
    });
    box.dataset.decorating = '0';
  }

  function toggleAttachment(key) {
    if (!key) return;
    const removed = getRemovedSet();
    if (removed.has(key)) removed.delete(key);
    else removed.add(key);
    const box = document.getElementById('activityExistingFiles');
    if (!box) return;
    box.querySelectorAll('[data-existing-file-remove]').forEach(button => {
      const isRemoved = removed.has(button.dataset.existingFileRemove || '');
      button.textContent = isRemoved ? '되돌리기' : '삭제';
      const row = button.closest('.file-name-line');
      row?.classList.toggle('marked-remove', isRemoved);
      const text = row?.querySelector('.file-name-text');
      if (isRemoved && text && !text.querySelector('em')) text.insertAdjacentHTML('beforeend', '<em>삭제 예정</em>');
      if (!isRemoved) text?.querySelector('em')?.remove();
    });
  }

  function getRemovedSet() {
    const id = String(state.editingActivityId || '');
    if (!state.removedByActivity.has(id)) state.removedByActivity.set(id, new Set());
    return state.removedByActivity.get(id);
  }

  function orderedAttachments(value) {
    const list = normalizeAttachments(value);
    const pdf = list.filter(file => file.kind === 'pdf' || isPdfFile(file));
    const image = list.filter(file => file.kind === 'image' || isImageFile(file));
    const other = list.filter(file => file.kind !== 'pdf' && file.kind !== 'image' && !isPdfFile(file) && !isImageFile(file));
    return [...pdf, ...image, ...other];
  }

  function normalizeAttachments(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(normalizeAttachment);
    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed.map(normalizeAttachment) : [];
    } catch {
      return [];
    }
  }

  function normalizeAttachment(file) {
    file = file || {};
    const name = String(file.name || '파일');
    const url = String(file.webViewLink || file.url || '');
    const mimeType = String(file.mimeType || file.type || guessMimeType(name));
    return {
      kind: String(file.kind || (mimeType.includes('pdf') ? 'pdf' : mimeType.startsWith('image/') ? 'image' : 'other')),
      fileId: String(file.fileId || file.id || ''),
      name,
      mimeType,
      size: Number(file.size) || 0,
      webViewLink: url,
      downloadUrl: String(file.downloadUrl || url)
    };
  }

  function getAttachmentKey(file) {
    const normalized = normalizeAttachment(file);
    return [normalized.fileId, normalized.webViewLink, normalized.downloadUrl, normalized.name, normalized.size].filter(value => value !== '').join('|');
  }

  function getFileExt(name) {
    const value = String(name || '').toLowerCase();
    const index = value.lastIndexOf('.');
    return index >= 0 ? value.slice(index + 1) : '';
  }

  function isImageFile(file) {
    const mime = String(file?.mimeType || '').toLowerCase();
    return mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(getFileExt(file?.name));
  }

  function isPdfFile(file) {
    const mime = String(file?.mimeType || '').toLowerCase();
    return mime.includes('pdf') || getFileExt(file?.name) === 'pdf';
  }

  function guessMimeType(name) {
    const lower = String(name || '').toLowerCase();
    if (/\.pdf$/.test(lower)) return 'application/pdf';
    if (/\.png$/.test(lower)) return 'image/png';
    if (/\.jpe?g$/.test(lower)) return 'image/jpeg';
    if (/\.gif$/.test(lower)) return 'image/gif';
    if (/\.webp$/.test(lower)) return 'image/webp';
    return 'application/octet-stream';
  }
})();
