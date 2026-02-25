// =============================================
// 塾生ポートフォリオ — LP (Landing Page) Logic
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  initLP();
});

async function initLP() {
  showLoading();
  const students = await fetchAllStudents();
  window._students = students;
  hideLoading();
  renderHeroStats(students);
  renderFilterBar(students);
  renderStudentCards(students);
}

// --- Loading ---
function showLoading() {
  document.getElementById('studentsGrid').innerHTML = `
    <div class="loading-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
      <div class="loading-spinner"></div>
      <div style="color: var(--text-muted); margin-top: 16px; font-size: 0.9rem;">データを読み込んでいます...</div>
    </div>
  `;
}
function hideLoading() { }

// --- Hero Stats ---
function renderHeroStats(students) {
  const container = document.getElementById('heroStats');
  const isGraduated = s => s.grade && s.grade.includes('卒業');
  const isJunior = s => s.grade && s.grade.includes('ジュニア');
  const activeStudents = students.filter(s => !isGraduated(s) && !isJunior(s));
  const graduatedStudents = students.filter(isGraduated);
  const juniorStudents = students.filter(isJunior);
  const gradeSet = new Set(activeStudents.map(s => s.grade).filter(Boolean));
  const subjectSet = new Set(activeStudents.flatMap(s => s.subjects || []));

  container.innerHTML = `
    <div class="hero-stat">
      <div class="hero-stat-value">${activeStudents.length}</div>
      <div class="hero-stat-label">塾生数</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat-value">${gradeSet.size}</div>
      <div class="hero-stat-label">学年</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat-value">${subjectSet.size}</div>
      <div class="hero-stat-label">科目数</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat-value">${juniorStudents.length}</div>
      <div class="hero-stat-label">ジュニア</div>
    </div>
    <div class="hero-stat">
      <div class="hero-stat-value">${graduatedStudents.length}</div>
      <div class="hero-stat-label">卒業生</div>
    </div>
  `;
}

// --- Filter Bar ---
function renderFilterBar(students) {
  const container = document.getElementById('filterBar');
  const grades = [...new Set(students.map(s => s.grade).filter(g => g && !g.includes('卒業') && !g.includes('ジュニア')))];

  // 学年を低学年順にソート（小→中→高）
  const gradeOrder = (g) => {
    const m = g.match(/^(小|中|高)(\d+)/);
    if (!m) return 999;
    const prefix = { '小': 0, '中': 100, '高': 200 }[m[1]] || 300;
    return prefix + parseInt(m[2]);
  };
  grades.sort((a, b) => gradeOrder(a) - gradeOrder(b));

  let html = `<button class="filter-btn active" data-filter="all">すべて</button>`;
  grades.forEach(grade => {
    html += `<button class="filter-btn" data-filter="${grade}">${grade}</button>`;
  });
  html += `<button class="filter-btn" data-filter="ジュニア">ジュニア</button>`;
  html += `<button class="filter-btn" data-filter="卒業生">卒業生</button>`;

  container.innerHTML = html;

  container.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
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
      renderStudentCards(filtered);
    });
  });
}

// --- Student Cards ---
function renderStudentCards(students) {
  const container = document.getElementById('studentsGrid');

  if (!students || students.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">該当する塾生がいません</div>
      </div>
    `;
    return;
  }

  container.innerHTML = students.map((student, i) => {
    const avatarSrc = student.avatarUrl || '';
    const iconHtml = avatarSrc
      ? `<div class="student-icon" style="background: transparent; overflow: hidden;"><img src="${avatarSrc}" alt="${student.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"></div>`
      : `<div class="student-icon" style="background: ${student.iconColor || '#6C63FF'}">${student.name.charAt(0)}</div>`;

    const gradeInfo = student.school
      ? `${student.grade || ''} ／ ${student.school}`
      : (student.grade || '');

    return `
    <a href="student.html?id=${student.id}" class="student-card animate-in" style="animation-delay: ${i * 0.08}s">
      ${iconHtml}
      <div class="student-name">${student.name}</div>
      <div class="student-grade">${gradeInfo}</div>
      <div class="student-subjects">
        ${(student.subjects || []).map(s => `<span class="subject-tag" data-subject="${s}">${s}</span>`).join('')}
      </div>
    </a>
  `;
  }).join('');
}
