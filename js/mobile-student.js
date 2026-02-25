// =============================================
// 塾生ポートフォリオ — Mobile Student Detail
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    initMobileStudent();
});

async function initMobileStudent() {
    const params = new URLSearchParams(window.location.search);
    const studentId = params.get('id');

    if (!studentId) {
        showMobileNotFound();
        return;
    }

    const student = await fetchStudent(studentId);
    if (!student) {
        showMobileNotFound();
        return;
    }

    document.title = `${student.name} — ECCベストワン藍住`;

    // Drive link
    const driveLink = document.getElementById('mDriveLink');
    if (student.driveFolder) {
        driveLink.href = student.driveFolder;
    } else {
        driveLink.style.display = 'none';
    }

    renderMobileDetail(student);
}

function showMobileNotFound() {
    document.getElementById('mStudentContent').innerHTML = `
    <div class="m-empty" style="padding: 80px 20px;">
      <div class="m-empty-icon">😕</div>
      <div>生徒が見つかりません</div>
      <a href="mobile.html" style="display: inline-block; margin-top: 16px; padding: 8px 20px; background: var(--gradient-primary); color: white; border-radius: 8px; font-size: 0.85rem; font-weight: 600;">← 一覧に戻る</a>
    </div>
  `;
}

function renderMobileDetail(student) {
    const content = document.getElementById('mStudentContent');

    // Avatar
    const avatarHtml = student.avatarUrl
        ? `<div class="m-detail-avatar"><img src="${student.avatarUrl}" alt="${student.name}"></div>`
        : `<div class="m-detail-avatar" style="background: ${student.iconColor || '#6C63FF'}">${student.name.charAt(0)}</div>`;

    const gradeInfo = student.school ? `${student.grade || ''} ／ ${student.school}` : (student.grade || '');

    // Subjects tags
    const subjectTags = (student.subjects || []).map(s =>
        `<span class="m-tag" data-subject="${s}" style="padding: 3px 10px; font-size: 0.72rem;">${s}</span>`
    ).join('');

    // Profile section
    const profileHtml = buildProfileSection(student);

    // Learning History
    const historyHtml = buildHistorySection(student);

    // Documents
    const docsHtml = buildDocumentsSection(student);

    // Schooling
    const schoolingHtml = buildSchoolingSection(student);

    content.innerHTML = `
    <!-- Hero -->
    <div class="m-detail-hero">
      ${avatarHtml}
      <div>
        <div class="m-detail-name">${student.name}</div>
        <div class="m-detail-meta">
          ${student.grade ? `<span>🎓 ${student.grade}</span>` : ''}
          ${student.school ? `<span>🏠 ${student.school}</span>` : ''}
        </div>
        ${subjectTags ? `<div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px;">${subjectTags}</div>` : ''}
      </div>
    </div>

    ${profileHtml}
    ${historyHtml}
    ${docsHtml}
    ${schoolingHtml}
  `;

    // Setup accordion
    content.querySelectorAll('.m-section-header').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            const body = header.nextElementSibling;
            if (body) body.classList.toggle('collapsed');
        });
    });
}

// --- Profile ---
function buildProfileSection(student) {
    const items = [
        { label: '氏名', value: student.name },
        { label: 'フリガナ', value: student.nameKana || '—' },
        { label: '学年', value: student.grade || '—' },
        { label: '学校', value: student.school || '—' },
        { label: '入塾日', value: student.enrollDate ? formatMobileDate(student.enrollDate) : '—' },
    ];

    let html = `
    <div class="m-section">
      <div class="m-section-header">👤 プロファイル</div>
      <div class="m-section-body">
        <div class="m-profile-grid">
          ${items.map(i => `
            <div class="m-profile-item">
              <div class="m-profile-label">${i.label}</div>
              <div class="m-profile-value">${i.value}</div>
            </div>
          `).join('')}
        </div>
        ${student.memo ? `
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-glass);">
            <div class="m-profile-label">メモ</div>
            <div class="m-profile-value" style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.7; margin-top: 4px;">${student.memo}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
    return html;
}

// --- Learning History ---
function buildHistorySection(student) {
    const history = student.learningHistory || [];
    if (history.length === 0) {
        return `
      <div class="m-section">
        <div class="m-section-header">📈 学習歴</div>
        <div class="m-section-body">
          <div class="m-empty" style="padding: 12px 0;"><div class="m-empty-icon" style="font-size: 1.5rem;">📝</div>学習歴はまだありません</div>
        </div>
      </div>
    `;
    }

    const timelineItems = history.map(h => `
    <div class="m-timeline-item">
      <div class="m-timeline-dot"></div>
      <div class="m-timeline-date">${h.date ? formatMobileDate(h.date) : ''}</div>
      <div class="m-timeline-event">${h.event}</div>
    </div>
  `).join('');

    return `
    <div class="m-section">
      <div class="m-section-header">📈 学習歴</div>
      <div class="m-section-body">
        <div class="m-timeline">${timelineItems}</div>
      </div>
    </div>
  `;
}

// --- Documents ---
function buildDocumentsSection(student) {
    const docs = student.documents || {};
    const categories = [
        { key: 'meetings', icon: '📝', label: '面談' },
        { key: 'grades', icon: '📊', label: '成績' },
        { key: 'homework', icon: '📋', label: '宿題' },
    ];

    let allDocs = [];
    categories.forEach(cat => {
        const items = docs[cat.key] || [];
        items.forEach(d => {
            allDocs.push({ ...d, icon: cat.icon, catLabel: cat.label });
        });
    });

    if (allDocs.length === 0) {
        return `
      <div class="m-section">
        <div class="m-section-header">📁 書類</div>
        <div class="m-section-body">
          <div class="m-empty" style="padding: 12px 0;"><div class="m-empty-icon" style="font-size: 1.5rem;">📄</div>書類はまだありません</div>
        </div>
      </div>
    `;
    }

    const docItems = allDocs.map(d => `
    <a href="${d.url}" target="_blank" class="m-doc-item">
      <span class="m-doc-icon">${d.icon}</span>
      <div class="m-doc-info">
        <div class="m-doc-title">${d.title}</div>
        <div class="m-doc-date">${d.date ? formatMobileDate(d.date) : ''}</div>
      </div>
      <span class="m-doc-cat">${d.catLabel}</span>
    </a>
  `).join('');

    return `
    <div class="m-section">
      <div class="m-section-header">📁 書類 <span style="font-size: 0.72rem; font-weight: 400; color: var(--text-muted); margin-left: 4px;">(${allDocs.length})</span></div>
      <div class="m-section-body">
        <div class="m-doc-list">${docItems}</div>
      </div>
    </div>
  `;
}

// --- Schooling Results ---
function buildSchoolingSection(student) {
    const results = student.schoolingResults || [];

    if (results.length === 0) {
        return `
      <div class="m-section">
        <div class="m-section-header">🏫 スクーリング</div>
        <div class="m-section-body">
          <div class="m-empty" style="padding: 12px 0;"><div class="m-empty-icon" style="font-size: 1.5rem;">🏫</div>スクーリング結果はまだありません</div>
        </div>
      </div>
    `;
    }

    const items = results.map(r => `
    <a href="${r.url}" target="_blank" class="m-result-item">
      <span style="font-size: 1rem;">📋</span>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 0.85rem; font-weight: 500;">${r.title}</div>
        <div style="font-size: 0.65rem; color: var(--text-muted);">${r.date ? formatMobileDate(r.date) : ''}</div>
      </div>
      <span style="color: var(--text-muted); font-size: 0.8rem;">›</span>
    </a>
  `).join('');

    return `
    <div class="m-section">
      <div class="m-section-header">🏫 スクーリング <span style="font-size: 0.72rem; font-weight: 400; color: var(--text-muted); margin-left: 4px;">(${results.length})</span></div>
      <div class="m-section-body">
        <div class="m-result-list">${items}</div>
      </div>
    </div>
  `;
}

// --- Utility ---
function formatMobileDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}/${(d.getMonth() + 1)}/${d.getDate()}`;
}
