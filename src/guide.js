import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const BUCKET = 'guide-files';
const ADMIN_KEY = 'SAIL_GUIDE_ADMIN_CODE';
const APP = {
  areas: [],
  activities: [],
  currentAreaId: '',
  selectedActivity: null,
  editingArea: null,
  editingActivity: null,
  isAdmin: false,
  search: '',
  gradeFilter: '',
  featuredOnly: false,
  tagFilter: '',
  printImages: []
};
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
  $('closePrintViewBtn')?.addEventListener('click', () => hideModal('printViewModal'));
  $('openPrimaryBtn')?.addEventListener('click', () => openPrimary(APP.selectedActivity));
  $('editActivityBtn')?.addEventListener('click', openEditActivityModal);
  $('deleteActivityBtn')?.addEventListener('click', deleteCurrentActivity);
  $('cancelAreaBtn')?.addEventListener('click', () => hideModal('areaModal'));
  $('saveAreaBtn')?.addEventListener('click', saveArea);
  $('cancelActivityBtn')?.addEventListener('click', () => hideModal('activityModal'));
  $('saveActivityBtn')?.addEventListener('click', saveActivity);
  $('guideSearchInput')?.addEventListener('input', event => { APP.search = event.target.value.trim(); renderSelectedAreaHero(); renderActivityList(); });
  $('guideGradeFilter')?.addEventListener('change', event => { APP.gradeFilter = event.target.value; renderSelectedAreaHero(); renderActivityList(); });
  $('guideFeaturedOnly')?.addEventListener('change', event => { APP.featuredOnly = event.target.checked; renderSelectedAreaHero(); renderActivityList(); });
  $('guideClearFilters')?.addEventListener('click', clearFilters);
  $('activityPdfFilesInput')?.addEventListener('change', renderUploadPreview);
  $('activityImageFilesInput')?.addEventListener('change', renderUploadPreview);
  $('printAllImagesBtn')?.addEventListener('click', printAllImages);
  $('downloadAllImagesBtn')?.addEventListener('click', downloadAllImages);
  $('openAllImagesBtn')?.addEventListener('click', openAllImages);
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
  APP.activities = Array.isArray(data?.activities) ? data.activities.map(normalizeActivity) : [];
  if (!APP.currentAreaId && APP.areas.length) APP.currentAreaId = getSortedAreas()[0].id;
  renderAdminState();
  renderAreaTabs();
  renderSelectedAreaHero();
  renderActivityList();
}

async function loginAdmin() {
  const code = prompt('교사 관리코드를 입력하세요.', localStorage.getItem(ADMIN_KEY) || '');
  if (!code) return false;
  try {
    const ok = await rpc('is_guide_admin', { p_code: code.trim() });
    if (!ok) {
      showToast('관리코드가 올바르지 않습니다');
      return false;
    }
    localStorage.setItem(ADMIN_KEY, code.trim());
    APP.isAdmin = true;
    renderAdminState();
    renderAreaTabs();
    showToast('관리모드가 열렸습니다');
    return true;
  } catch (error) {
    console.error(error);
    showToast(error.message || '관리모드 확인 실패');
    return false;
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
  document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', !APP.isAdmin));
}

function getAdminCode() { return localStorage.getItem(ADMIN_KEY) || ''; }
function getSortedAreas() { return APP.areas.slice().sort((a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'ko')); }
function getAreaKey(name) { const value = String(name || '').trim().replace(/\s+/g, '').replace(/[()]/g, '').toUpperCase(); if (['S','SAFE','안전','안전영역','안전SAFE'].includes(value)) return 'SAFE'; if (['A','ACCOUNTABILITY','책임','책임영역','책임ACCOUNTABILITY'].includes(value)) return 'ACCOUNTABILITY'; if (['I','INTEGRITY','윤리','윤리영역','윤리INTEGRITY'].includes(value)) return 'INTEGRITY'; if (['L','LISTEN','소통','소통영역','소통LISTEN'].includes(value)) return 'LISTEN'; return value; }
function getAreaLabel(name) { const key = getAreaKey(name); return key === 'SAFE' ? '안전(Safe)' : key === 'ACCOUNTABILITY' ? '책임(Accountability)' : key === 'INTEGRITY' ? '윤리(Integrity)' : key === 'LISTEN' ? '소통(Listen)' : name || '-'; }
function getAreaColorClass(name) { const key = getAreaKey(name); return key === 'SAFE' ? 'area-safe' : key === 'ACCOUNTABILITY' ? 'area-accountability' : key === 'INTEGRITY' ? 'area-integrity' : key === 'LISTEN' ? 'area-listen' : 'area-default'; }
function currentArea() { return APP.areas.find(area => String(area.id) === String(APP.currentAreaId)) || null; }
function currentRows() { return APP.activities.filter(row => String(row.areaId) === String(APP.currentAreaId)).sort(sortActivities); }

function sortActivities(a, b) {
  if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
  return (Number(a.sort) || 0) - (Number(b.sort) || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'ko');
}

function getVisibleRows() {
  const search = APP.search.toLowerCase();
  return currentRows().filter(activity => {
    if (APP.gradeFilter && String(activity.gradeBand || '') !== APP.gradeFilter) return false;
    if (APP.featuredOnly && !activity.featured) return false;
    if (APP.tagFilter && !getTags(activity).includes(APP.tagFilter)) return false;
    if (!search) return true;
    const haystack = [activity.title, activity.description, activity.defaultMemo, activity.links, activity.areaName, activity.gradeBand, getTags(activity).join(' ')].join(' ').toLowerCase();
    return haystack.includes(search);
  });
}

function clearFilters() {
  APP.search = '';
  APP.gradeFilter = '';
  APP.featuredOnly = false;
  APP.tagFilter = '';
  if ($('guideSearchInput')) $('guideSearchInput').value = '';
  if ($('guideGradeFilter')) $('guideGradeFilter').value = '';
  if ($('guideFeaturedOnly')) $('guideFeaturedOnly').checked = false;
  renderSelectedAreaHero();
  renderActivityList();
}

function renderAreaTabs() {
  const box = $('areaTabs');
  if (!box) return;
  const areas = getSortedAreas();
  if (!areas.length) {
    box.innerHTML = '<div class="empty-box">영역이 없습니다</div>';
    return;
  }
  box.innerHTML = areas.map(area => `
    <div class="area-block ${getAreaColorClass(area.name)}${String(area.id) === String(APP.currentAreaId) ? ' active' : ''}" role="button" tabindex="0" data-area="${escAttr(area.id)}">
      <span>${esc(getAreaLabel(area.name))}</span>
      ${APP.isAdmin ? `<button class="btn small area-edit-btn" type="button" data-edit-area="${escAttr(area.id)}">수정</button>` : ''}
    </div>`).join('');
  box.querySelectorAll('[data-area]').forEach(block => {
    block.addEventListener('click', event => {
      const edit = event.target.closest('[data-edit-area]');
      if (edit) {
        event.stopPropagation();
        openAreaModal(edit.dataset.editArea);
        return;
      }
      APP.currentAreaId = block.dataset.area;
      renderAreaTabs();
      renderSelectedAreaHero();
      renderActivityList();
    });
    block.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') block.click();
    });
  });
}

function renderSelectedAreaHero() {
  const area = currentArea();
  const all = currentRows();
  const visible = getVisibleRows();
  if ($('selectedAreaDesc')) $('selectedAreaDesc').textContent = area ? `${getAreaLabel(area.name)} 영역 프로그램 목록입니다.` : '영역을 클릭하면 프로그램 목록이 아래에 표시됩니다.';
  if ($('selectedAreaCount')) $('selectedAreaCount').textContent = visible.length === all.length ? `프로그램 ${all.length}개` : `표시 ${visible.length}개 / 전체 ${all.length}개`;
}

function renderActivityList() {
  const box = $('activityList');
  if (!box) return;
  renderTagQuickFilters();
  const rows = getVisibleRows();
  if (!rows.length) {
    box.innerHTML = '<div class="empty-box">조건에 맞는 프로그램이 없습니다.</div>';
    return;
  }
  box.innerHTML = rows.map((activity, index) => {
    const links = parseLinks(activity.links);
    const files = splitMaterials(activity.attachments);
    const desc = String(activity.description || activity.defaultMemo || '설명이 아직 없습니다.').trim();
    const tags = getTags(activity);
    return `<article class="activity-card" data-open="${escAttr(activity.id)}">
      <div>
        <div class="card-badges">${activity.featured ? '<span class="badge-featured">추천</span>' : ''}${activity.gradeBand ? `<span class="meta-badge">${esc(activity.gradeBand)}</span>` : ''}</div>
        <h3>${index + 1}. ${esc(activity.title || '이름 없는 프로그램')}</h3>
        <p>${esc(desc)}</p>
        ${tags.length ? `<div class="card-tags">${tags.slice(0, 4).map(tag => `<span>${esc(tag)}</span>`).join('')}</div>` : ''}
        <div class="activity-meta"><span class="meta-badge">링크 ${links.length}개</span><span class="meta-badge">PDF ${files.pdf.length}개</span><span class="meta-badge">그림 ${files.image.length}개</span></div>
      </div>
      <div class="activity-actions"><button class="btn light small" type="button" data-detail="${escAttr(activity.id)}">상세 보기</button><button class="btn primary small" type="button" data-primary="${escAttr(activity.id)}">바로 활용</button></div>
    </article>`;
  }).join('');
  box.querySelectorAll('[data-open],[data-detail]').forEach(el => el.addEventListener('click', () => openActivityDetailById(el.dataset.open || el.dataset.detail)));
  box.querySelectorAll('[data-primary]').forEach(el => el.addEventListener('click', event => { event.stopPropagation(); openPrimaryById(el.dataset.primary); }));
}

function renderTagQuickFilters() {
  const box = $('tagQuickFilters');
  if (!box) return;
  const tags = [...new Set(currentRows().flatMap(getTags))].sort((a, b) => a.localeCompare(b, 'ko')).slice(0, 18);
  if (!tags.length) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `<button class="tag-chip ${APP.tagFilter ? '' : 'active'}" type="button" data-tag="">전체 태그</button>${tags.map(tag => `<button class="tag-chip ${APP.tagFilter === tag ? 'active' : ''}" type="button" data-tag="${escAttr(tag)}">#${esc(tag)}</button>`).join('')}`;
  box.querySelectorAll('[data-tag]').forEach(button => button.addEventListener('click', () => {
    APP.tagFilter = button.dataset.tag || '';
    renderSelectedAreaHero();
    renderActivityList();
  }));
}

function openActivityDetailById(id) {
  const found = APP.activities.find(row => String(row.id) === String(id));
  if (!found) return;
  APP.selectedActivity = found;
  $('activityDetailArea').textContent = getAreaLabel(found.areaName || found.areaId || '-');
  $('activityDetailTitle').textContent = found.title || '-';
  $('activityDetailDescription').textContent = found.description || '-';
  $('activityDetailMemo').textContent = found.defaultMemo || '-';
  $('activityDetailMeta').innerHTML = renderActivityMeta(found);
  $('activityDetailExtra').innerHTML = renderLinks(found.links) + renderMaterials(found.attachments);
  renderAdminState();
  showModal('activityDetailModal');
}

function renderActivityMeta(activity) {
  const chips = [];
  if (activity.featured) chips.push('<span class="badge-featured">추천 자료</span>');
  if (activity.gradeBand) chips.push(`<span class="meta-badge">${esc(activity.gradeBand)}</span>`);
  getTags(activity).forEach(tag => chips.push(`<span class="tag-chip static">#${esc(tag)}</span>`));
  return chips.join('');
}

function openPrimaryById(id) { openPrimary(APP.activities.find(row => String(row.id) === String(id)) || null); }
function openPrimary(activity) {
  if (!activity) return showToast('프로그램 정보가 없습니다');
  const files = splitMaterials(activity.attachments);
  if (files.image.length) {
    openPrintView(activity, files.image);
    return;
  }
  if (files.pdf[0]) {
    window.open(getAttachmentOpenUrl(files.pdf[0]), '_blank');
    return;
  }
  const link = parseLinks(activity.links)[0]?.url;
  if (link) {
    window.open(link, '_blank');
    return;
  }
  showToast('바로 열 수 있는 자료가 없습니다');
}

function openPrintView(activity, images) {
  APP.printImages = images.slice();
  $('printViewSub').textContent = `${activity.title || '활동'} 그림자료 ${images.length}개`;
  $('printViewList').innerHTML = images.map((file, index) => {
    const url = getAttachmentOpenUrl(file);
    const down = getAttachmentDownloadUrl(file) || url;
    return `<article class="print-item"><div class="print-item-head"><div><b>${index + 1}. ${esc(file.name || '활동 그림자료')}</b><span>바로 출력하거나 다운로드할 수 있습니다.</span></div><div class="print-item-actions"><button class="btn primary small" type="button" data-print-image="${escAttr(url)}">바로 출력</button>${down ? `<a class="btn light small" href="${escAttr(down)}" target="_blank" rel="noopener" download>다운로드</a>` : ''}${url ? `<a class="btn light small" href="${escAttr(url)}" target="_blank" rel="noopener">새 창 열기</a>` : ''}</div></div><img class="print-preview-image" src="${escAttr(getAttachmentPreviewUrl(file) || url)}" alt="${escAttr(file.name || '활동 그림자료')}"></article>`;
  }).join('');
  $('printViewList').querySelectorAll('[data-print-image]').forEach(button => button.addEventListener('click', () => printImage(button.dataset.printImage)));
  showModal('printViewModal');
}

function printImage(url) { printImagesInWindow([{ url, name: '활동자료' }]); }
function printAllImages() {
  const images = APP.printImages.map(file => ({ url: getAttachmentOpenUrl(file), name: file.name || '활동자료' })).filter(item => item.url);
  if (!images.length) return showToast('출력할 그림자료가 없습니다');
  printImagesInWindow(images);
}
function downloadAllImages() {
  const images = APP.printImages.map(file => ({ url: getAttachmentDownloadUrl(file) || getAttachmentOpenUrl(file), name: file.name || '활동자료' })).filter(item => item.url);
  if (!images.length) return showToast('다운로드할 그림자료가 없습니다');
  images.forEach((item, index) => setTimeout(() => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.name;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, index * 180));
}
function openAllImages() {
  const images = APP.printImages.map(file => getAttachmentOpenUrl(file)).filter(Boolean);
  if (!images.length) return showToast('열 그림자료가 없습니다');
  images.forEach((url, index) => setTimeout(() => window.open(url, '_blank'), index * 180));
}
function printImagesInWindow(images) {
  const valid = images.filter(item => item.url);
  if (!valid.length) return;
  const win = window.open('', '_blank');
  if (!win) return showToast('팝업이 차단되었습니다. 새 창 열기를 허용해주세요.');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>활동자료 출력</title><style>html,body{margin:0;padding:0;background:#fff}.page{break-after:page;page-break-after:always;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:12mm;box-sizing:border-box}img{display:block;max-width:100%;max-height:96vh;object-fit:contain}@media print{.page{height:100vh;min-height:0;padding:6mm}img{max-height:100%;width:100%}}</style></head><body>${valid.map(item => `<section class="page"><img src="${escAttr(item.url)}" alt="${escAttr(item.name)}"></section>`).join('')}<script>Promise.all(Array.from(document.images).map(function(img){return img.complete?Promise.resolve():new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){setTimeout(function(){window.print();},300);});<\/script></body></html>`);
  win.document.close();
}

function renderLinks(raw) {
  const links = parseLinks(raw);
  if (!links.length) return '';
  return `<div class="detail-section"><div class="detail-label">링크</div><div class="detail-link-list">${links.map(item => `<a href="${escAttr(item.url)}" target="_blank" rel="noopener" class="detail-link-item">${esc(item.label || item.url)}</a>`).join('')}</div></div>`;
}
function renderMaterials(value) {
  const files = splitMaterials(value);
  const sections = [];
  if (files.pdf.length) sections.push(`<div class="detail-section"><div class="detail-label">PDF 설명자료</div><div class="detail-attach-list">${files.pdf.map(file => renderMaterialCard(file, 'PDF 설명자료')).join('')}</div></div>`);
  if (files.image.length) sections.push(`<div class="detail-section"><div class="detail-label">활동 그림자료</div><div class="image-preview-grid">${files.image.map(file => renderMaterialCard(file, '활동 그림자료')).join('')}</div></div>`);
  if (files.other.length) sections.push(`<div class="detail-section"><div class="detail-label">기타 자료</div><div class="detail-attach-list">${files.other.map(file => renderMaterialCard(file, '기타 자료')).join('')}</div></div>`);
  return sections.join('');
}
function renderMaterialCard(file, label) {
  const name = file.name || '파일';
  const openUrl = getAttachmentOpenUrl(file);
  const downUrl = getAttachmentDownloadUrl(file);
  const previewUrl = getAttachmentPreviewUrl(file);
  let preview = '<div class="attach-preview-empty">미리보기를 지원하지 않는 파일입니다. 열기나 다운로드를 사용하세요.</div>';
  if (isImageFile(file) && previewUrl) preview = `<img class="attach-preview-image" src="${escAttr(previewUrl)}" alt="${escAttr(name)}">`;
  else if (isPdfFile(file) && previewUrl) preview = `<iframe class="attach-preview-frame" src="${escAttr(previewUrl)}" loading="lazy"></iframe>`;
  return `<div class="attach-preview-box"><div class="attach-preview-head"><div><div class="attach-preview-name">${esc(name)}</div><div class="attach-preview-type">${esc(label)}</div></div><div class="attach-actions">${openUrl ? `<a href="${escAttr(openUrl)}" target="_blank" rel="noopener" class="detail-attach-item">열기</a>` : ''}${downUrl ? `<a href="${escAttr(downUrl)}" target="_blank" rel="noopener" class="detail-attach-item" download>다운로드</a>` : ''}</div></div>${preview}</div>`;
}

async function openAreaModal(areaId = '') {
  if (!APP.isAdmin && !(await loginAdmin())) return;
  APP.editingArea = null;
  $('areaModalTitle').textContent = '영역 추가';
  $('areaNameInput').value = '';
  $('areaSortInput').value = '';
  if (areaId) {
    const area = APP.areas.find(row => String(row.id) === String(areaId));
    if (area) {
      APP.editingArea = area;
      $('areaModalTitle').textContent = '영역 수정';
      $('areaNameInput').value = area.name || '';
      $('areaSortInput').value = String(area.sort || '');
    }
  }
  showModal('areaModal');
}
async function saveArea() {
  if (!APP.isAdmin && !(await loginAdmin())) return;
  const data = { id: APP.editingArea ? APP.editingArea.id : '', name: $('areaNameInput').value.trim(), sort: $('areaSortInput').value.trim() };
  if (!data.name) return showToast('영역 이름을 입력하세요');
  await withButton($('saveAreaBtn'), '저장 중...', async () => {
    const res = await rpc('save_guide_area', { p_admin_code: getAdminCode(), p_area: data });
    if (data.id) APP.currentAreaId = data.id;
    setData(res);
    hideModal('areaModal');
    showToast('영역이 저장되었습니다');
  });
}

function renderAreaOptions() { $('activityAreaSelect').innerHTML = getSortedAreas().map(area => `<option value="${escAttr(area.id)}">${esc(getAreaLabel(area.name))}</option>`).join(''); }
async function openActivityModal(activityId = '') {
  if (!APP.isAdmin && !(await loginAdmin())) return;
  APP.editingActivity = null;
  $('activityModalTitle').textContent = '프로그램 등록';
  ['activityTitleInput','activityDescriptionInput','activityMemoInput','activityLinksInput','activityPdfFilesInput','activityImageFilesInput','activitySortInput','activityTagsInput'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  if ($('activityGradeBandSelect')) $('activityGradeBandSelect').value = '';
  if ($('activityFeaturedInput')) $('activityFeaturedInput').checked = false;
  $('activityColorSelect').value = 'blue';
  $('activityExistingFiles').innerHTML = '첨부 없음';
  renderUploadPreview();
  renderAreaOptions();
  $('activityAreaSelect').value = APP.currentAreaId || (($('activityAreaSelect').options[0] || {}).value || '');
  if (activityId) {
    const found = APP.activities.find(row => String(row.id) === String(activityId));
    if (found) {
      APP.editingActivity = found;
      $('activityModalTitle').textContent = '프로그램 수정';
      $('activityAreaSelect').value = found.areaId || '';
      $('activityTitleInput').value = found.title || '';
      $('activityDescriptionInput').value = found.description || '';
      $('activityMemoInput').value = found.defaultMemo || '';
      $('activityLinksInput').value = found.links || '';
      $('activitySortInput').value = String(found.sort || '');
      $('activityColorSelect').value = found.color || 'blue';
      if ($('activityGradeBandSelect')) $('activityGradeBandSelect').value = found.gradeBand || '';
      if ($('activityFeaturedInput')) $('activityFeaturedInput').checked = Boolean(found.featured);
      if ($('activityTagsInput')) $('activityTagsInput').value = getTags(found).join(', ');
      $('activityExistingFiles').innerHTML = renderAttachmentNames(found.attachments);
    }
  }
  showModal('activityModal');
}
function openEditActivityModal() { if (!APP.selectedActivity) return; hideModal('activityDetailModal'); openActivityModal(APP.selectedActivity.id); }
async function saveActivity() {
  if (!APP.isAdmin && !(await loginAdmin())) return;
  const areaId = $('activityAreaSelect').value;
  const title = $('activityTitleInput').value.trim();
  if (!areaId) return showToast('영역을 선택하세요');
  if (!title) return showToast('프로그램명을 입력하세요');
  await withButton($('saveActivityBtn'), '저장 중...', async () => {
    showToast('자료를 업로드하고 있습니다');
    const attachments = [...(APP.editingActivity ? normalizeAttachments(APP.editingActivity.attachments) : []), ...(await uploadFiles('activityPdfFilesInput', 'pdf')), ...(await uploadFiles('activityImageFilesInput', 'image'))];
    const data = {
      id: APP.editingActivity ? APP.editingActivity.id : '',
      areaId,
      title,
      description: $('activityDescriptionInput').value.trim(),
      defaultMemo: $('activityMemoInput').value.trim(),
      links: $('activityLinksInput').value.trim(),
      color: $('activityColorSelect').value || 'blue',
      sort: $('activitySortInput').value.trim(),
      gradeBand: $('activityGradeBandSelect')?.value || '',
      featured: Boolean($('activityFeaturedInput')?.checked),
      tags: parseTags($('activityTagsInput')?.value || ''),
      attachments
    };
    const res = await rpc('save_guide_activity', { p_admin_code: getAdminCode(), p_activity: data });
    APP.currentAreaId = areaId;
    setData(res);
    hideModal('activityModal');
    showToast('프로그램이 저장되었습니다');
  });
}
async function deleteCurrentActivity() {
  if (!APP.selectedActivity || !APP.isAdmin) return;
  if (!confirm('정말 이 프로그램을 삭제하시겠습니까?')) return;
  try {
    const res = await rpc('delete_guide_activity', { p_admin_code: getAdminCode(), p_activity_id: APP.selectedActivity.id });
    APP.selectedActivity = null;
    setData(res);
    hideModal('activityDetailModal');
    showToast('프로그램이 삭제되었습니다');
  } catch (error) {
    console.error(error);
    showToast(error.message || '프로그램 삭제 실패');
  }
}

function renderUploadPreview() {
  const box = $('uploadPreviewList');
  if (!box) return;
  const pdfs = Array.from($('activityPdfFilesInput')?.files || []);
  const images = Array.from($('activityImageFilesInput')?.files || []);
  if (!pdfs.length && !images.length) {
    box.innerHTML = '선택된 파일이 없습니다.';
    return;
  }
  const pdfHtml = pdfs.map(file => `<div class="upload-preview-item"><div class="upload-preview-icon">PDF</div><div><b>${esc(file.name)}</b><span>${formatBytes(file.size)}</span></div></div>`).join('');
  const imageHtml = images.map(file => `<div class="upload-preview-item"><img class="upload-preview-thumb" src="${escAttr(URL.createObjectURL(file))}" alt="${escAttr(file.name)}"><div><b>${esc(file.name)}</b><span>${formatBytes(file.size)}</span></div></div>`).join('');
  box.innerHTML = `<div class="upload-preview-grid">${pdfHtml}${imageHtml}</div>`;
}

async function uploadFiles(inputId, kind) {
  const input = $(inputId);
  if (!input?.files?.length) return [];
  const uploaded = [];
  for (const file of Array.from(input.files)) {
    const ext = getFileExt(file.name) || 'file';
    const path = `${kind}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
      body: file
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || `${file.name} 업로드 실패`);
    }
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    uploaded.push(normalizeAttachment({ kind, name: file.name, mimeType: file.type || guessMimeType(file.name), size: file.size || 0, url, webViewLink: url, previewUrl: url, downloadUrl: url, directImageUrl: url }));
  }
  return uploaded;
}

function normalizeActivity(activity) {
  return { ...activity, attachments: normalizeAttachments(activity.attachments), gradeBand: String(activity.gradeBand || ''), tags: parseTags(Array.isArray(activity.tags) ? activity.tags.join(',') : activity.tags || ''), featured: Boolean(activity.featured) };
}
function splitMaterials(value) { const list = normalizeAttachments(value); return { pdf: list.filter(file => file.kind === 'pdf' || isPdfFile(file)), image: list.filter(file => file.kind === 'image' || isImageFile(file)), other: list.filter(file => file.kind !== 'pdf' && file.kind !== 'image' && !isPdfFile(file) && !isImageFile(file)) }; }
function parseLinks(text) { return String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => { const parts = line.split('|').map(x => x.trim()).filter(Boolean); return parts.length === 1 ? { label: parts[0], url: parts[0] } : { label: parts[0], url: parts[1] }; }).filter(item => item.url && /^https?:\/\//i.test(item.url)); }
function parseTags(value) { return [...new Set(String(value || '').split(/[#,，、\s]+/).map(tag => tag.trim()).filter(Boolean))]; }
function getTags(activity) { return parseTags(Array.isArray(activity?.tags) ? activity.tags.join(',') : activity?.tags || ''); }
function normalizeAttachments(value) { if (!value) return []; if (Array.isArray(value)) return value.map(normalizeAttachment); try { const parsed = JSON.parse(String(value)); return Array.isArray(parsed) ? parsed.map(normalizeAttachment) : []; } catch { return []; } }
function normalizeAttachment(file) { file = file || {}; const name = String(file.name || '파일'); const url = String(file.webViewLink || file.url || ''); const mimeType = String(file.mimeType || file.type || guessMimeType(name)); return { kind: String(file.kind || (mimeType.includes('pdf') ? 'pdf' : mimeType.startsWith('image/') ? 'image' : 'other')), fileId: String(file.fileId || file.id || ''), name, mimeType, size: Number(file.size) || 0, webViewLink: url, previewUrl: String(file.previewUrl || url), downloadUrl: String(file.downloadUrl || url), directImageUrl: String(file.directImageUrl || url) }; }
function renderAttachmentNames(value) { const files = splitMaterials(value); const block = (title, list) => list.length ? `<div class="material-group"><b>${title}</b>${list.map(file => `<div class="file-name-line"><span class="file-name-text">${esc(file.name || '첨부파일')}</span>${getAttachmentOpenUrl(file) ? `<a class="file-mini-link" href="${escAttr(getAttachmentOpenUrl(file))}" target="_blank" rel="noopener">열기</a>` : ''}${getAttachmentDownloadUrl(file) ? `<a class="file-mini-link" href="${escAttr(getAttachmentDownloadUrl(file))}" target="_blank" rel="noopener" download>다운로드</a>` : ''}</div>`).join('')}</div>` : ''; const html = block('PDF 설명자료', files.pdf) + block('활동 그림자료', files.image) + block('기타 자료', files.other); return html || '첨부 없음'; }
function getFileExt(name) { const s = String(name || '').toLowerCase(); const i = s.lastIndexOf('.'); return i >= 0 ? s.slice(i + 1) : ''; }
function isImageFile(file) { const mime = String(file?.mimeType || '').toLowerCase(); return mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp'].includes(getFileExt(file?.name)); }
function isPdfFile(file) { const mime = String(file?.mimeType || '').toLowerCase(); return mime.includes('pdf') || getFileExt(file?.name) === 'pdf'; }
function getAttachmentPreviewUrl(file) { if (!file) return ''; if (isImageFile(file)) return file.directImageUrl || file.previewUrl || file.webViewLink || file.url || ''; return file.previewUrl || file.webViewLink || file.url || ''; }
function getAttachmentOpenUrl(file) { if (!file) return ''; if (file.webViewLink) return file.webViewLink; if (file.url) return file.url; if (file.fileId) return `https://drive.google.com/file/d/${encodeURIComponent(file.fileId)}/view`; return ''; }
function getAttachmentDownloadUrl(file) { if (!file) return ''; if (file.downloadUrl) return file.downloadUrl; if (file.fileId) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(file.fileId)}`; return getAttachmentOpenUrl(file); }
function guessMimeType(name) { const lower = String(name || '').toLowerCase(); if (/\.pdf$/.test(lower)) return 'application/pdf'; if (/\.png$/.test(lower)) return 'image/png'; if (/\.jpe?g$/.test(lower)) return 'image/jpeg'; if (/\.gif$/.test(lower)) return 'image/gif'; if (/\.webp$/.test(lower)) return 'image/webp'; return 'application/octet-stream'; }
function formatBytes(bytes) { const size = Number(bytes) || 0; if (size < 1024) return `${size}B`; if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`; return `${(size / 1024 / 1024).toFixed(1)}MB`; }
async function rpc(name, payload) { const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }); const text = await res.text(); const data = text ? JSON.parse(text) : null; if (!res.ok) throw new Error(data?.message || data?.error || '요청을 처리하지 못했습니다'); return data; }
async function withButton(button, label, work) { const old = button?.textContent || ''; if (button) { button.disabled = true; button.textContent = label; } try { return await work(); } catch (error) { console.error(error); showToast(error.message || '처리 실패'); } finally { if (button) { button.disabled = false; button.textContent = old; } } }
function showModal(id) { $(id)?.classList.add('show'); }
function hideModal(id) { $(id)?.classList.remove('show'); }
function showToast(message) { const el = $('toast'); if (!el) return; el.textContent = message || ''; el.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove('show'), 1800); }
function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escAttr(str) { return esc(str); }
