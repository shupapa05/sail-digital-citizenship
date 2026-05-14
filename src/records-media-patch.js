import { getMonthlyHistory } from './api.js';
import { STORAGE_BUCKET, SUPABASE_URL } from './config.js';

const PATCH_KEY = '__SAIL_RECORDS_MEDIA_PATCHED__';

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;

  injectStyle();
  observeRecordsPage();
  setTimeout(enhanceRecordsPage, 300);
}

function injectStyle() {
  if (document.querySelector('#recordsMediaPatchStyles')) return;

  const style = document.createElement('style');
  style.id = 'recordsMediaPatchStyles';
  style.textContent = `
    .record-rich-item{display:grid;gap:10px;padding:14px;border:1px solid #d9e5f4;border-radius:16px;background:#fff}
    .record-rich-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center}
    .record-rich-title{color:#07192f;font-weight:900}
    .record-rich-point{color:#3264df;font-weight:900}
    .record-rich-note{margin:0;background:#f8fbff;border:1px solid #d9e5f4;border-radius:12px;padding:10px;line-height:1.5;color:#334155;white-space:pre-wrap}
    .record-rich-note.empty{color:#64748b}
    .record-rich-photo-wrap{display:grid;gap:8px}
    .record-rich-photo{display:block;width:min(240px,100%)}
    .record-rich-photo img{display:block;width:100%;height:148px;object-fit:cover;border-radius:12px;border:1px solid #d9e5f4;background:#eef6ff}
    .record-rich-photo-open{width:max-content;color:#3264df;font-weight:900;text-decoration:none}
    .record-rich-photo-open:hover{text-decoration:underline}
  `;

  document.head.appendChild(style);
}

function observeRecordsPage() {
  new MutationObserver(() => {
    setTimeout(enhanceRecordsPage, 50);
  }).observe(document.body, { childList: true, subtree: true });
}

function isRecordsScreen() {
  const title = document.querySelector('.section-head h1')?.textContent || '';
  return title.includes('기록');
}

function parseYearMonthFromTitle(text) {
  const match = String(text || '').match(/(\d{4})\D+(\d{1,2})\D*기록/);
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]) };
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function safePhotoUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : '';
}

function publicStorageUrl(fileId) {
  const path = String(fileId || '').trim();
  if (!path || !SUPABASE_URL || !STORAGE_BUCKET) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

function photoUrlOf(item) {
  return safePhotoUrl(
    item?.photo_url ||
    item?.photoUrl ||
    item?.proof_photo_url ||
    item?.proofPhotoUrl ||
    publicStorageUrl(item?.photo_file_id || item?.photoFileId || item?.proof_photo_file_id || item?.proofPhotoFileId)
  );
}

function missionDate(item) {
  return item?.date || item?.mission_date || item?.created_at || item?.createdAt || '';
}

function missionTitle(item) {
  return item?.mission_title || item?.mission_id || '실천 기록';
}

function noteText(item) {
  return String(item?.note || item?.memo || '').trim();
}

function renderItem(item) {
  const date = esc(missionDate(item));
  const title = esc(missionTitle(item));
  const point = Number(item?.total_point || 0);
  const note = noteText(item);
  const photo = photoUrlOf(item);

  return `
    <article class="record-rich-item">
      <div class="record-rich-head">
        <strong class="record-rich-title">${date} · ${title}</strong>
        <span class="record-rich-point">${point}점</span>
      </div>
      <p class="record-rich-note ${note ? '' : 'empty'}">${note ? esc(note) : '메모 없음'}</p>
      ${photo ? `
        <div class="record-rich-photo-wrap">
          <a class="record-rich-photo" href="${esc(photo)}" target="_blank" rel="noopener noreferrer">
            <img src="${esc(photo)}" alt="실천 사진">
          </a>
          <a class="record-rich-photo-open" href="${esc(photo)}" target="_blank" rel="noopener noreferrer">사진 크게 보기</a>
        </div>
      ` : ''}
    </article>
  `;
}

async function enhanceRecordsPage() {
  if (!isRecordsScreen()) return;

  const list = document.querySelector('.record-list');
  if (!list || list.dataset.mediaEnhanced === '1') return;

  list.dataset.mediaEnhanced = '1';

  const studentId = localStorage.getItem('SAIL_STUDENT_ID') || '';
  if (!studentId) return;

  const titleText = document.querySelector('.section-head h1')?.textContent || '';
  const { year, month } = parseYearMonthFromTitle(titleText);

  try {
    const result = await getMonthlyHistory(studentId, year, month);
    const items = Array.isArray(result?.items) ? result.items : [];

    if (!items.length) return;

    list.innerHTML = items.map(renderItem).join('');
  } catch {
    // Keep existing list if enhancement fails.
  }
}
