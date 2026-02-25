// =============================================
// 塾生ポートフォリオ — Mobile LP Logic
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    initMobileLP();
});

async function initMobileLP() {
    const students = await fetchAllStudents();
    window._students = students;
    renderMobileStats(students);
    renderMobileFilters(students);
    renderMobileStudentList(students);
}

// --- Stats ---
function renderMobileStats(students) {
    const container = document.getElementById('mStats');
    const isGraduated = s => s.grade && s.grade.includes('卒業');
    const isJunior = s => s.grade && s.grade.includes('ジュニア');
    const active = students.filter(s => !isGraduated(s) && !isJunior(s));
    const grads = students.filter(isGraduated);
    const juniors = students.filter(isJunior);

    container.innerHTML = `
    <div class="m-stat"><div class="m-stat-value">${active.length}</div><div class="m-stat-label">塾生</div></div>
    <div class="m-stat"><div class="m-stat-value">${new Set(active.map(s => s.grade).filter(Boolean)).size}</div><div class="m-stat-label">学年</div></div>
    <div class="m-stat"><div class="m-stat-value">${new Set(active.flatMap(s => s.subjects || [])).size}</div><div class="m-stat-label">科目</div></div>
    <div class="m-stat"><div class="m-stat-value">${juniors.length}</div><div class="m-stat-label">ジュニア</div></div>
    <div class="m-stat"><div class="m-stat-value">${grads.length}</div><div class="m-stat-label">卒業生</div></div>
  `;
}

// --- Filters ---
function renderMobileFilters(students) {
    const container = document.getElementById('mFilters');
    const grades = [...new Set(students.map(s => s.grade).filter(g => g && !g.includes('卒業') && !g.includes('ジュニア')))];

    const gradeOrder = (g) => {
        const normalized = g.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
        const m = normalized.match(/^(小学?|中学?|高校?)\D*(\d*)/);
        if (!m) return 999;
        const prefixMap = { '小': 0, '小学': 0, '中': 100, '中学': 100, '高': 200, '高校': 200 };
        return (prefixMap[m[1]] ?? 300) + (m[2] ? parseInt(m[2]) : 0);
    };
    grades.sort((a, b) => gradeOrder(a) - gradeOrder(b));

    let html = `<button class="m-filter-chip active" data-filter="all">すべて</button>`;
    grades.forEach(g => { html += `<button class="m-filter-chip" data-filter="${g}">${g}</button>`; });
    html += `<button class="m-filter-chip" data-filter="ジュニア">ジュニア</button>`;
    html += `<button class="m-filter-chip" data-filter="卒業生">卒業生</button>`;
    container.innerHTML = html;

    container.querySelectorAll('.m-filter-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.m-filter-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            let filtered;
            if (filter === 'all') {
                filtered = window._students;
            } else if (filter === '卒業生') {
                filtered = window._students.filter(s => s.grade && s.grade.includes('卒業'));
            } else if (filter === 'ジュニア') {
                filtered = window._students.filter(s => s.grade && s.grade.includes('ジュニア'));
            } else {
                filtered = window._students.filter(s => s.grade === filter);
            }
            renderMobileStudentList(filtered);
        });
    });
}

// --- Student List ---
function renderMobileStudentList(students) {
    const container = document.getElementById('mStudentList');

    if (!students || students.length === 0) {
        container.innerHTML = `
      <div class="m-empty">
        <div class="m-empty-icon">🔍</div>
        <div>該当する塾生がいません</div>
      </div>
    `;
        return;
    }

    container.innerHTML = students.map((s, i) => {
        const avatarHtml = s.avatarUrl
            ? `<div class="m-student-avatar"><img src="${s.avatarUrl}" alt="${s.name}"></div>`
            : `<div class="m-student-avatar" style="background: ${s.iconColor || '#6C63FF'}">${s.name.charAt(0)}</div>`;

        const gradeInfo = s.school ? `${s.grade || ''} ／ ${s.school}` : (s.grade || '');
        const tags = (s.subjects || []).map(sub => `<span class="m-tag" data-subject="${sub}">${sub}</span>`).join('');

        return `
    <a href="m-student.html?id=${s.id}" class="m-student-item m-animate" style="animation-delay: ${i * 0.04}s">
      ${avatarHtml}
      <div class="m-student-info">
        <div class="m-student-name">${s.name}</div>
        <div class="m-student-meta">${gradeInfo}</div>
        ${tags ? `<div class="m-student-tags">${tags}</div>` : ''}
      </div>
      <span class="m-student-arrow">›</span>
    </a>`;
    }).join('');
}
