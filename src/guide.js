import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const BUCKET = 'guide-files';
const ADMIN_KEY = 'SAIL_GUIDE_ADMIN_CODE';
const APP = { areas: [], activities: [], currentAreaId: '', selectedActivity: null, editingArea: null, editingActivity: null, isAdmin: false };
const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', init);

function init() {
  bindEvents();
  APP.isAdmin = Boolean(localStorage.getItem(ADMIN_KEY));
  loadInitialData();
}

function bindEvents() {
  $('adminLoginBtn')?.addEventListener('click', loginAdmin);
  $('adminLogoutBtn')?.addEventListener('click', logoutAdmin);
  $('addAreaBtn')?.addEventListener('click', () => openAreaModal());
  $('addActivityBtn')?.addEventListener('click', () => openActivityModal());
  $('closeDetailBtn')?.addEventListener('click', () => hideModal('activityDetailModal'));
  $('openPrimaryBtn')?.addEventListener('click', () => openPrimary(APP.selectedActivity));
  $('editActivityBtn')?.addEventListener('click', openEditActivityModal);
  $('deleteActivityBtn')?.addEventListener('click', deleteCurrentActivity);
  $('cancelAreaBtn')?.addEventListener('click', () => hideModal('areaModal'));
  $('saveAreaBtn')?.addEventListener('click', saveArea);
  $('cancelActivityBtn')?.addEventListener('click', () => hideModal('activityModal'));
  $('saveActivityBtn')?.addEventListener('click', saveActivity);
  document.querySelectorAll('.modal-mask').forEach(mask => mask.addEventListener('click', event => {
    if (event.target === mask) mask.classList.remove('show');
  }));
}

async function loadInitialData() {
  try {
    setData(await rpc('get_guide_initial_data', {}));
  } catch (error) {
    console.error(error);
    showToast(error.message || '데이터 불러오기 실패');
  }
}

function setData(data) {
  APP.areas = Array.isArray(data?.areas) ? data.areas.slice() : [];
  APP.activities = Array.isArray(data?.activities) ? data.activities.slice() : [];
  if (!APP.currentAreaId && APP.areas.length) APP.currentAreaId = getSortedAreas()[0].id;
  renderAdminState();
  renderAreaTabs();
  renderSelectedAreaHero();
  renderActivityList();
}

async function loginAdmin() {
  const code = prompt('교사 관리코드를 입력하세요.', localStorage.getItem(ADMIN_KEY) || '');
  if (!code) return;
  try {
    const ok = await rpc('is_guide_admin', { p_code: code.trim() });
    if (!ok) return showToast('관리코드가 올바르지 않습니다');
    localStorage.setItem(ADMIN_KEY, code.trim());
    APP.isAdmin = true;
    renderAdminState();
    renderAreaTabs();
    showToast('관리모드가 열렸습니다');
  } catch (error) {
    console.error(error);
    showToast(error.message || '관리모드 확인 실패');
  }
}

function logoutAdmin() {
  localStorage.removeItem(ADMIN_KEY);
  APP.isAdmin = false;
  renderAdminState();
  renderAreaTabs();
  showToast('관리모드를 종료했습니다');
}

function renderAdminState() {
  $('adminLoginBtn')?.classList.toggle('hidden', APP.isAdmin);
  $('adminLogoutBtn')?.classList.toggle('hidden', !APP.isAdmin);
  $('libraryAdminActions')?.classList.toggle('hidden', !APP.isAdmin);
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !APP.isAdmin));
}

function getAdminCode() { return localStorage.getItem(ADMIN_KEY) || ''; }
function getSortedAreas() { return APP.areas.slice().sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'ko')); }
function getAreaKey(name) {
  const value = String(name || '').trim().replace(/\s+/g, '').replace(/[()]/g, '').toUpperCase();
  if (['S', 'SAFE', '안전', '안전영역', '안전SAFE'].includes(value)) return 'SAFE';
  if (['A', 'ACCOUNTABILITY', '책임', '책임영역', '책임ACCOUNTABILITY'].includes(value)) return 'ACCOUNTABILITY';
  if (['I', 'INTEGRITY', '윤리', '윤리영역', '윤리INTEGRITY'].includes(value)) return 'INTEGRITY';
  if (['L', 'LISTEN', '소통', '소통영역', '소통LISTEN'].includes(value)) return 'LISTEN';
  return value;
}
function getAreaLabel(name) { const key = getAreaKey(name); return key === 'SAFE' ? '안전(Safe)' : key === 'ACCOUNTABILITY' ? '책임(Accountability)' : key === 'INTEGRITY' ? '윤리(Integrity)' : key === 'LISTEN' ? '소통(Listen)' : name || '-'; }
function getAreaColorClass(name) { const key = getAreaKey(name); return key === 'SAFE' ? 'area-safe' : key === 'ACCOUNTABILITY' ? 'area-accountability' : key === 'INTEGRITY' ? 'area-integrity' : key === 'LISTEN' ? 'area-listen' : 'area-default'; }
function currentArea() { return APP.areas.find(area => String(area.id) === String(APP.currentAreaId)) || null; }
function currentRows() { return APP.activities.filter(row => String(row.areaId) === String(APP.currentAreaId)).sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'ko')); }

function renderAreaTabs() {
  const box = $('areaTabs');
  if (!box) return;
  const areas = getSortedAreas();
  if (!areas.length) { box.innerHTML = '<div class="empty-box">영역이 없습니다</div>'; return; }
  box.innerHTML = areas.map(area => `
    <button class="area-block ${getAreaColorClass(area.name)}${String(area.id) === String(APP.currentAreaId) ? ' active' : ''}" type="button" data-area="${escAttr(area.id)}">
      <span>${esc(getAreaLabel(area.name))}</span>
      ${APP.isAdmin ? `<button class="btn small" type="button" data-edit-area="${escAttr(area.id)}">수정</button>` : ''}
    </button>`).join('');
  box.querySelectorAll('[data-area]').forEach(button => button.addEventListener('click', event => {
    const edit = event.target.closest('[data-edit-area]');
    if (edit) { event.stopPropagation(); openAreaModal(edit.dataset.editArea); return; }
    APP.currentAreaId = button.dataset.area;
    renderAreaTabs(); renderSelectedAreaHero(); renderActivityList();
  }));
}

function renderSelectedAreaHero() {
  const area = currentArea();
  const rows = currentRows();
  $('selectedAreaDesc').textContent = area ? `${getAreaLabel(area.name)} 영역 프로그램 목록입니다.` : '영역을 클릭하면 프로그램 목록이 아래에 표시됩니다.';
  $('selectedAreaCount').textContent = `프로그램 ${rows.length}개`;
}

function renderActivityList() {
  const box = $('activityList');
  if (!box) return;
  const rows = currentRows();
  if (!rows.length) { box.innerHTML = '<div class="empty-box">이 영역에 등록된 프로그램이 없습니다.</div>'; return; }
  box.innerHTML = rows.map((activity, index) => {
    const links = parseLinks(activity.links);
    const attachments = normalizeAttachments(activity.attachments);
    const desc = String(activity.description || activity.defaultMemo || '설명이 아직 없습니다.').trim();
    return `<article class="activity-card" data-open="${escAttr(activity.id)}"><div><h3>${index + 1}. ${esc(activity.title || '이름 없는 프로그램')}</h3><p>${esc(desc)}</p><div class="activity-meta"><span class="meta-badge">링크 ${links.length}개</span><span class="meta-badge">첨부 ${attachments.length}개</span></div></div><div class="activity-actions"><button class="btn light small" type="button" data-detail="${escAttr(activity.id)}">상세 보기</button><button class="btn primary small" type="button" data-primary="${escAttr(activity.id)}">바로 활용</button></div></article>`;
  }).join('');
  box.querySelectorAll('[data-open],[data-detail]').forEach(el => el.addEventListener('click', () => openActivityDetailById(el.dataset.open || el.dataset.detail)));
  box.querySelectorAll('[data-primary]').forEach(el => el.addEventListener('click', event => { event.stopPropagation(); openPrimaryById(el.dataset.primary); }));
}

function openActivityDetailById(id) {
  const found = APP.activities.find(row => String(row.id) === String(id));
  if (!found) return;
  APP.selectedActivity = found;
  $('activityDetailArea').textContent = getAreaLabel(found.areaName || found.areaId || '-');
  $('activityDetailTitle').textContent = found.title || '-';
  $('activityDetailDescription').textContent = found.description || '-';
  $('activityDetailMemo').textContent = found.defaultMemo || '-';
  $('activityDetailExtra').innerHTML = renderLinks(found.links) + renderAttachments(found.attachments);
  renderAdminState();
  showModal('activityDetailModal');
}

function openPrimaryById(id) { openPrimary(APP.activities.find(row => String(row.id) === String(id)) || null); }
function openPrimary(activity) {
  if (!activity) return showToast('프로그램 정보가 없습니다');
  const links = parseLinks(activity.links);
  if (links[0]?.url) { window.open(links[0].url, '_blank'); return; }
  const attachments = normalizeAttachments(activity.attachments);
  const url = getAttachmentOpenUrl(attachments[0]) || getAttachmentDownloadUrl(attachments[0]);
  if (url) { window.open(url, '_blank'); return; }
  showToast('바로 열 수 있는 링크나 첨부파일이 없습니다');
}

function renderLinks(raw) {
  const links = parseLinks(raw);
  if (!links.length) return '';
  return `<div class="detail-section"><div class="detail-label">링크</div><div class="detail-link-list">${links.map(item => `<a href="${escAttr(item.url)}" target="_blank" rel="noopener" class="detail-link-item">${esc(item.label || item.url)}</a>`).join('')}</div></div>`;
}

function renderAttachments(value) {
  const list = normalizeAttachments(value);
  if (!list.length) return '';
  return `<div class="detail-section"><div class="detail-label">첨부파일</div><div class="detail-attach-list">${list.map(file => {
    const name = file.name || '파일';
    const openUrl = getAttachmentOpenUrl(file);
    const downUrl = getAttachmentDownloadUrl(file);
    const previewUrl = getAttachmentPreviewUrl(file);
    let type = '파일';
    let preview = '<div class="attach-preview-empty">미리보기를 지원하지 않는 파일입니다. 새 창으로 열거나 다운로드하세요.</div>';
    if (isImageFile(file) && previewUrl) { type = '이미지'; preview = `<img class="attach-preview-image" src="${escAttr(previewUrl)}" alt="${escAttr(name)}">`; }
    else if ((isPdfFile(file) || isOfficeFile(file) || isHangulFile(file)) && previewUrl) { type = isPdfFile(file) ? 'PDF' : isHangulFile(file) ? '한글 문서' : '문서'; preview = `<iframe class="attach-preview-frame" src="${escAttr(previewUrl)}" loading="lazy"></iframe>`; }
    return `<div class="attach-preview-box"><div class="attach-preview-head"><div><div class="attach-preview-name">${esc(name)}</div><div class="attach-preview-type">${esc(type)}</div></div><div class="attach-actions">${openUrl ? `<a href="${escAttr(openUrl)}" target="_blank" rel="noopener" class="detail-attach-item">열기</a>` : ''}${downUrl ? `<a href="${escAttr(downUrl)}" target="_blank" rel="noopener" class="detail-attach-item">다운로드</a>` : ''}</div></div>${preview}</div>`;
  }).join('')}</div></div>`;
}

function openAreaModal(areaId = '') {
  if (!APP.isAdmin) return loginAdmin();
  APP.editingArea = null;
  $('areaModalTitle').textContent = '영역 추가'; $('areaNameInput').value = ''; $('areaSortInput').value = '';
  if (areaId) {
    const area = APP.areas.find(row => String(row.id) === String(areaId));
    if (area) { APP.editingArea = area; $('areaModalTitle').textContent = '영역 수정'; $('areaNameInput').value = area.name || ''; $('areaSortInput').value = String(area.sort || ''); }
  }
  showModal('areaModal');
}

async function saveArea() {
  if (!APP.isAdmin) return loginAdmin();
  const data = { id: APP.editingArea ? APP.editingArea.id : '', name: $('areaNameInput').value.trim(), sort: $('areaSortInput').value.trim() };
  if (!data.name) return showToast('영역 이름을 입력하세요');
  await withButton($('saveAreaBtn'), '저장 중...', async () => { const res = await rpc('save_guide_area', { p_admin_code: getAdminCode(), p_area: data }); if (data.id) APP.currentAreaId = data.id; setData(res); hideModal('areaModal'); showToast('영역이 저장되었습니다'); });
}

function renderAreaOptions() { $('activityAreaSelect').innerHTML = getSortedAreas().map(area => `<option value="${escAttr(area.id)}">${esc(getAreaLabel(area.name))}</option>`).join(''); }
function openActivityModal(activityId = '') {
  if (!APP.isAdmin) return loginAdmin();
  APP.editingActivity = null;
  $('activityModalTitle').textContent = '프로그램 추가';
  ['activityTitleInput','activityDescriptionInput','activityMemoInput','activityLinksInput','activityFilesInput','activitySortInput'].forEach(id => { $(id).value = ''; });
  $('activityColorSelect').value = 'blue'; $('activityExistingFiles').innerHTML = '첨부 없음'; renderAreaOptions(); $('activityAreaSelect').value = APP.currentAreaId || (($('activityAreaSelect').options[0] || {}).value || '');
  if (activityId) {
    const found = APP.activities.find(row => String(row.id) === String(activityId));
    if (found) { APP.editingActivity = found; $('activityModalTitle').textContent = '프로그램 수정'; $('activityAreaSelect').value = found.areaId || ''; $('activityTitleInput').value = found.title || ''; $('activityDescriptionInput').value = found.description || ''; $('activityMemoInput').value = found.defaultMemo || ''; $('activityLinksInput').value = found.links || ''; $('activitySortInput').value = String(found.sort || ''); $('activityColorSelect').value = found.color || 'blue'; $('activityExistingFiles').innerHTML = renderAttachmentNames(found.attachments); }
  }
  showModal('activityModal');
}
function openEditActivityModal() { if (!APP.selectedActivity) return; hideModal('activityDetailModal'); openActivityModal(APP.selectedActivity.id); }

async function saveActivity() {
  if (!APP.isAdmin) return loginAdmin();
  const areaId = $('activityAreaSelect').value;
  const title = $('activityTitleInput').value.trim();
  if (!areaId) return showToast('영역을 선택하세요');
  if (!title) return showToast('프로그램명을 입력하세요');
  await withButton($('saveActivityBtn'), '저장 중...', async () => {
    showToast('파일을 준비하고 있습니다');
    const attachments = [...(APP.editingActivity ? normalizeAttachments(APP.editingActivity.attachments) : []), ...(await uploadFiles('activityFilesInput'))];
    const data = { id: APP.editingActivity ? APP.editingActivity.id : '', areaId, title, description: $('activityDescriptionInput').value.trim(), defaultMemo: $('activityMemoInput').value.trim(), links: $('activityLinksInput').value.trim(), color: $('activityColorSelect').value || 'blue', sort: $('activitySortInput').value.trim(), attachments };
    const res = await rpc('save_guide_activity', { p_admin_code: getAdminCode(), p_activity: data });
    APP.currentAreaId = areaId; setData(res); hideModal('activityModal'); showToast('프로그램이 저장되었습니다');
  });
}

async function deleteCurrentActivity() {
  if (!APP.selectedActivity || !APP.isAdmin) return;
  if (!confirm('정말 이 프로그램을 삭제하시겠습니까?')) return;
  try { const res = await rpc('delete_guide_activity', { p_admin_code: getAdminCode(), p_activity_id: APP.selectedActivity.id }); APP.selectedActivity = null; setData(res); hideModal('activityDetailModal'); showToast('프로그램이 삭제되었습니다'); }
  catch (error) { console.error(error); showToast(error.message || '프로그램 삭제 실패'); }
}

async function uploadFiles(inputId) {
  const input = $(inputId);
  if (!input?.files?.length) return [];
  const uploaded = [];
  for (const file of Array.from(input.files)) {
    const ext = getFileExt(file.name) || 'file';
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file });
    if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data?.message || `${file.name} 업로드 실패`); }
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    uploaded.push(normalizeAttachment({ name: file.name, mimeType: file.type || guessMimeType(file.name), size: file.size || 0, url, webViewLink: url, previewUrl: url, downloadUrl: url, directImageUrl: url }));
  }
  return uploaded;
}

function parseLinks(text) { return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => { const parts = line.split('|').map(x => x.trim()).filter(Boolean); return parts.length === 1 ? { label: parts[0], url: parts[0] } : { label: parts[0], url: parts[1] }; }).filter(item => item.url && /^https?:\/\//i.test(item.url)); }
function normalizeAttachments(value) { if (!value) return []; if (Array.isArray(value)) return value.map(normalizeAttachment); try { const parsed = JSON.parse(String(value)); return Array.isArray(parsed) ? parsed.map(normalizeAttachment) : []; } catch { return []; } }
function normalizeAttachment(file) { file = file || {}; const name = String(file.name || '파일'); const url = String(file.webViewLink || file.url || ''); return { fileId: String(file.fileId || file.id || ''), name, mimeType: String(file.mimeType || file.type || guessMimeType(name)), size: Number(file.size) || 0, webViewLink: url, previewUrl: String(file.previewUrl || url), downloadUrl: String(file.downloadUrl || url), directImageUrl: String(file.directImageUrl || url) }; }
function renderAttachmentNames(value) { const list = normalizeAttachments(value); if (!list.length) return '첨부 없음'; return list.map(file => `<div class="file-name-line"><span class="file-name-text">${esc(file.name || '첨부파일')}</span>${getAttachmentOpenUrl(file) ? `<a class="file-mini-link" href="${escAttr(getAttachmentOpenUrl(file))}" target="_blank" rel="noopener">열기</a>` : ''}${getAttachmentDownloadUrl(file) ? `<a class="file-mini-link" href="${escAttr(getAttachmentDownloadUrl(file))}" target="_blank" rel="noopener">다운로드</a>` : ''}</div>`).join(''); }
function getFileExt(name) { const s = String(name || '').toLowerCase(); const i = s.lastIndexOf('.'); return i >= 0 ? s.slice(i + 1) : ''; }
function isImageFile(file) { const mime = String(file?.mimeType || '').toLowerCase(); return mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp'].includes(getFileExt(file?.name)); }
function isPdfFile(file) { const mime = String(file?.mimeType || '').toLowerCase(); return mime.includes('pdf') || getFileExt(file?.name) === 'pdf'; }
function isHangulFile(file) { const mime = String(file?.mimeType || '').toLowerCase(); const ext = getFileExt(file?.name); return ext === 'hwp' || ext === 'hwpx' || mime.includes('hwp') || mime.includes('hancom'); }
function isOfficeFile(file) { return ['doc','docx','xls','xlsx','ppt','pptx'].includes(getFileExt(file?.name)); }
function getAttachmentPreviewUrl(file) { if (!file) return ''; if (isImageFile(file)) return file.directImageUrl || file.previewUrl || file.webViewLink || file.url || ''; return file.previewUrl || file.webViewLink || file.url || ''; }
function getAttachmentOpenUrl(file) { if (!file) return ''; if (file.webViewLink) return file.webViewLink; if (file.url) return file.url; if (file.fileId) return `https://drive.google.com/file/d/${encodeURIComponent(file.fileId)}/view`; return ''; }
function getAttachmentDownloadUrl(file) { if (!file) return ''; if (file.downloadUrl) return file.downloadUrl; if (file.fileId) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(file.fileId)}`; return getAttachmentOpenUrl(file); }
function guessMimeType(name) { const lower = String(name || '').toLowerCase(); if (/\.pdf$/.test(lower)) return 'application/pdf'; if (/\.png$/.test(lower)) return 'image/png'; if (/\.jpe?g$/.test(lower)) return 'image/jpeg'; if (/\.gif$/.test(lower)) return 'image/gif'; if (/\.webp$/.test(lower)) return 'image/webp'; if (/\.hwp$/.test(lower)) return 'application/x-hwp'; if (/\.hwpx$/.test(lower)) return 'application/vnd.hancom.hwpx'; if (/\.docx?$/.test(lower)) return 'application/msword'; if (/\.xlsx?$/.test(lower)) return 'application/vnd.ms-excel'; if (/\.pptx?$/.test(lower)) return 'application/vnd.ms-powerpoint'; return 'application/octet-stream'; }

async function rpc(name, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error || '요청을 처리하지 못했습니다');
  return data;
}
async function withButton(button, label, work) { const old = button?.textContent || ''; if (button) { button.disabled = true; button.textContent = label; } try { return await work(); } catch (error) { console.error(error); showToast(error.message || '처리 실패'); } finally { if (button) { button.disabled = false; button.textContent = old; } } }
function showModal(id) { $(id)?.classList.add('show'); }
function hideModal(id) { $(id)?.classList.remove('show'); }
function showToast(message) { const el = $('toast'); if (!el) return; el.textContent = message || ''; el.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove('show'), 1800); }
function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escAttr(str) { return esc(str); }
