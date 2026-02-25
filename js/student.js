// =============================================
// 塾生ポートフォリオ — Student Detail Page Logic
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  initStudentPage();
});

async function initStudentPage() {
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get('id');

  if (!studentId) {
    showNotFound();
    return;
  }

  showPageLoading();
  const student = await fetchStudent(studentId);

  if (!student) {
    showNotFound();
    return;
  }

  document.title = `${student.name} — 塾生ポートフォリオ`;

  const driveLink = document.getElementById('driveLink');
  if (student.driveFolder) {
    driveLink.href = student.driveFolder;
  }

  renderStudentHero(student);
  renderProfile(student);
  renderSubjects(student);
  renderLearningHistory(student);
  renderDocuments(student);
  renderSchoolingResults(student);
}

// --- Loading ---
function showPageLoading() {
  document.getElementById('studentHero').innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div class="loading-spinner"></div>
      <div style="color: var(--text-muted); margin-top: 16px; font-size: 0.9rem;">読み込み中...</div>
    </div>
  `;
}

// --- Not Found ---
function showNotFound() {
  document.getElementById('studentContent').innerHTML = `
    <div class="empty-state" style="padding: 80px 20px;">
      <div class="empty-state-icon">😕</div>
      <div class="empty-state-text">生徒が見つかりませんでした</div>
      <a href="index.html" class="header-back-btn" style="margin-top: 20px; display: inline-flex;">← 一覧に戻る</a>
    </div>
  `;
}

// --- Student Hero ---
function renderStudentHero(student) {
  const avatarSrc = student.avatarUrl || '';
  const hasAvatar = !!avatarSrc;
  const initial = student.name.charAt(0);
  const iconContent = hasAvatar
    ? `<img src="${avatarSrc}" alt="${student.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'; this.parentElement.textContent='${initial}';">`
    : initial;

  document.getElementById('studentHero').innerHTML = `
    <div class="student-hero animate-in">
      <div class="student-hero-icon" id="avatarIcon"
        style="background: ${hasAvatar ? 'transparent' : (student.iconColor || '#6C63FF')}; position: relative; cursor: pointer; user-select: none; -webkit-user-select: none;"
        title="タップ: カメラ撮影 / 長押し: 写真選択">
        ${iconContent}
        <div style="position: absolute; bottom: -2px; right: -2px; background: var(--bg-card); border: 2px solid var(--border-glass); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
          📷
        </div>
      </div>
      <div class="student-hero-info">
        <h1 class="student-hero-name">${student.name}</h1>
        <div class="student-hero-meta">
          <span>🎓 ${student.grade || '未設定'}</span>
          ${student.school ? `<span>🏫 ${student.school}</span>` : ''}
          ${student.enrollDate ? `<span>📅 入塾日: ${formatDate(student.enrollDate)}</span>` : ''}
        </div>
      </div>
    </div>
    <input type="file" id="avatarCameraInput" accept="image/*" capture="environment" style="display:none;">
    <input type="file" id="avatarFileInput" accept="image/*" style="display:none;">
    <div id="avatarUploadProgress" style="display: none; text-align: center; margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">
      <div class="loading-spinner" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></div>
      アバターをアップロード中...
    </div>
  `;

  // イベント登録
  setupAvatarEvents(student.id);
}

// --- アバター: タップ/長押しイベント ---
function setupAvatarEvents(studentId) {
  const icon = document.getElementById('avatarIcon');
  const cameraInput = document.getElementById('avatarCameraInput');
  const fileInput = document.getElementById('avatarFileInput');

  let pressTimer = null;
  let longPressed = false;

  // タッチ開始 / マウスダウン → 長押し判定開始
  const onStart = (e) => {
    longPressed = false;
    pressTimer = setTimeout(() => {
      longPressed = true;
      fileInput.click(); // 長押し → ファイル選択
    }, 500);
  };

  // タッチ終了 / マウスアップ → 短タップならカメラ
  const onEnd = (e) => {
    clearTimeout(pressTimer);
    if (!longPressed) {
      e.preventDefault();
      cameraInput.click(); // シングルタップ → カメラ
    }
  };

  // タッチキャンセル
  const onCancel = () => {
    clearTimeout(pressTimer);
    longPressed = false;
  };

  // タッチイベント
  icon.addEventListener('touchstart', onStart, { passive: true });
  icon.addEventListener('touchend', onEnd);
  icon.addEventListener('touchcancel', onCancel);
  icon.addEventListener('touchmove', onCancel);

  // マウスイベント（PC用）
  icon.addEventListener('mousedown', onStart);
  icon.addEventListener('mouseup', onEnd);
  icon.addEventListener('mouseleave', onCancel);

  // コンテキストメニュー防止（長押し時）
  icon.addEventListener('contextmenu', (e) => e.preventDefault());

  // ファイル選択後のアップロード
  cameraInput.addEventListener('change', (e) => uploadAvatar(e, studentId));
  fileInput.addEventListener('change', (e) => uploadAvatar(e, studentId));
}

// --- アバターアップロード ---
async function uploadAvatar(event, studentId) {
  const file = event.target.files[0];
  if (!file) return;

  // サイズチェック（5MB）
  if (file.size > 5 * 1024 * 1024) {
    showStudentToast('画像サイズが5MBを超えています', 'error');
    event.target.value = '';
    return;
  }

  const progress = document.getElementById('avatarUploadProgress');
  progress.style.display = 'block';

  try {
    // 画像をリサイズ（最大400px）してbase64に変換
    const base64 = await resizeAndConvert(file, 400);

    const result = await postToAPI({
      action: 'uploadFile',
      studentId: studentId,
      category: 'avatar',
      title: 'avatar_' + studentId,
      fileName: 'avatar_' + studentId + '.jpg',
      mimeType: 'image/jpeg',
      fileData: base64
    });

    if (result.success) {
      // 生徒データにアバターURLを保存
      const updateResult = await postToAPI({
        action: 'updateStudent',
        student: { id: studentId, avatarUrl: result.url }
      });

      if (updateResult.success) {
        showStudentToast('アバターを更新しました', 'success');
        clearCache();
        const student = await fetchStudent(studentId);
        if (student) renderStudentHero(student);
      }
    } else {
      showStudentToast('アップロードに失敗しました', 'error');
    }
  } catch (err) {
    showStudentToast('アバターエラー: ' + err.message, 'error');
  }

  progress.style.display = 'none';
  event.target.value = '';
}

// --- 画像リサイズ（Canvas使用） ---
function resizeAndConvert(file, maxSize) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        // 正方形にクロップ
        const size = Math.min(w, h);
        const sx = (w - size) / 2;
        const sy = (h - size) / 2;

        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize);

        // base64（data:...を除いた部分）
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Profile ---
function renderProfile(student) {
  document.getElementById('profileSection').innerHTML = `
    <div class="section-header animate-in" style="animation-delay: 0.1s">
      <div class="section-icon" style="background: rgba(108, 99, 255, 0.15); color: var(--accent-purple);">👤</div>
      <h2 class="section-title">プロファイル</h2>
      <button onclick="toggleEditMode('${student.id}')" id="editProfileBtn"
        style="margin-left: auto; padding: 6px 14px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-secondary); cursor: pointer; font-size: 0.8rem; font-family: var(--font-primary); transition: all 0.2s;">
        ✏️ 編集
      </button>
    </div>

    <!-- 表示モード -->
    <div class="profile-card animate-in" style="animation-delay: 0.15s" id="profileDisplay">
      <div class="profile-grid">
        <div class="profile-item">
          <span class="profile-label">氏名</span>
          <span class="profile-value">${student.name}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">フリガナ</span>
          <span class="profile-value">${student.nameKana || '―'}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">学年</span>
          <span class="profile-value">${student.grade || '―'}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">学校</span>
          <span class="profile-value">${student.school || '―'}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">入塾日</span>
          <span class="profile-value">${student.enrollDate ? formatDate(student.enrollDate) : '―'}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">受講科目</span>
          <span class="profile-value">${(student.subjects || []).join(', ') || '―'}</span>
        </div>
        <div class="profile-item">
          <span class="profile-label">Driveフォルダ</span>
          <span class="profile-value">${student.driveFolder
      ? '<a href="' + student.driveFolder + '" target="_blank" style="color: var(--accent-blue);">📁 開く</a>'
      : '<button onclick="createDriveFolder(\'' + student.id + '\', \'' + escapeAttr(student.name) + '\')" style="padding: 4px 12px; background: var(--gradient-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">📁 フォルダを作成</button>'
    }</span>
        </div>
        ${student.memo ? `
        <div class="profile-item profile-memo">
          <span class="profile-label">メモ</span>
          <span class="profile-value">${student.memo}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- 編集モード -->
    <div class="profile-card" style="display: none;" id="profileEdit">
      <form onsubmit="saveProfileEdit(event, '${student.id}')">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">氏名</label>
            <input type="text" id="editName" value="${student.name || ''}" required
              style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">フリガナ</label>
            <input type="text" id="editNameKana" value="${student.nameKana || ''}"
              style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">学年</label>
            <input type="text" id="editGrade" value="${student.grade || ''}"
              style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">学校</label>
            <input type="text" id="editSchool" value="${student.school || ''}"
              style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">入塾日</label>
            <input type="date" id="editEnrollDate" value="${student.enrollDate || ''}"
              style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
          </div>
          <div>
            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">アイコンカラー</label>
            <input type="color" id="editIconColor" value="${student.iconColor || '#6C63FF'}"
              style="width: 100%; height: 38px; padding: 4px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; cursor: pointer;">
          </div>
        </div>
        <div style="margin-top: 12px;">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px;">受講科目</label>
          <div id="subjectButtons" style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${['数学', '英語', '国語', '理科', '社会', '英検', '化学', '化学基礎', '物理', '物理基礎'].map(s => {
      const active = (student.subjects || []).includes(s);
      return `<button type="button" class="subject-toggle-btn${active ? ' active' : ''}" data-subject="${s}" onclick="toggleSubjectBtn(this)"
                style="padding: 5px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: var(--font-primary);
                ${active ? 'background: var(--accent-purple); color: white; border: 1px solid var(--accent-purple);' : 'background: var(--bg-glass); color: var(--text-secondary); border: 1px solid var(--border-glass);'}">${s}</button>`;
    }).join('')}
            <button type="button" onclick="addCustomSubject()" style="padding: 5px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 500; cursor: pointer; background: var(--bg-glass); color: var(--text-muted); border: 1px dashed var(--border-glass); font-family: var(--font-primary); transition: all 0.2s;">＋ その他</button>
          </div>
          <div id="customSubjects" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
            ${(student.subjects || []).filter(s => !['数学', '英語', '国語', '理科', '社会', '英検', '化学', '化学基礎', '物理', '物理基礎'].includes(s)).map(s =>
      `<span class="subject-toggle-btn active custom-subject" data-subject="${s}" style="padding: 5px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 500; background: var(--accent-purple); color: white; border: 1px solid var(--accent-purple); display: inline-flex; align-items: center; gap: 4px;">${s} <span onclick="this.parentElement.remove()" style="cursor: pointer; font-size: 0.7rem;">✕</span></span>`
    ).join('')}
          </div>
        </div>
        <div style="margin-top: 12px;">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">Google DriveフォルダURL</label>
          <input type="url" id="editDriveFolder" value="${student.driveFolder || ''}" placeholder="https://drive.google.com/..."
            style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
        </div>
        <div style="margin-top: 12px;">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">メモ</label>
          <textarea id="editMemo" placeholder="特記事項..."
            style="width: 100%; min-height: 60px; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem; resize: vertical;">${student.memo || ''}</textarea>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button type="submit"
            style="padding: 8px 20px; background: var(--gradient-primary); border: none; border-radius: 6px; color: white; font-weight: 600; cursor: pointer; font-family: var(--font-primary); font-size: 0.85rem;">
            💾 保存
          </button>
          <button type="button" onclick="toggleEditMode('${student.id}')"
            style="padding: 8px 20px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-secondary); cursor: pointer; font-family: var(--font-primary); font-size: 0.85rem;">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  `;
}

// --- Edit Mode Toggle ---
function toggleEditMode(studentId) {
  const display = document.getElementById('profileDisplay');
  const edit = document.getElementById('profileEdit');
  const btn = document.getElementById('editProfileBtn');

  if (edit.style.display === 'none') {
    display.style.display = 'none';
    edit.style.display = 'block';
    btn.innerHTML = '✕ 閉じる';
    btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    btn.style.color = '#ef4444';
  } else {
    display.style.display = 'block';
    edit.style.display = 'none';
    btn.innerHTML = '✏️ 編集';
    btn.style.borderColor = 'var(--border-glass)';
    btn.style.color = 'var(--text-secondary)';
  }
}

// --- Save Profile Edit ---
async function saveProfileEdit(event, studentId) {
  event.preventDefault();

  const studentData = {
    id: studentId,
    name: document.getElementById('editName').value.trim(),
    nameKana: document.getElementById('editNameKana').value.trim(),
    grade: document.getElementById('editGrade').value.trim(),
    school: document.getElementById('editSchool').value.trim(),
    enrollDate: document.getElementById('editEnrollDate').value,
    iconColor: document.getElementById('editIconColor').value,
    subjects: getSelectedSubjects(),
    driveFolder: document.getElementById('editDriveFolder').value.trim(),
    memo: document.getElementById('editMemo').value.trim()
  };

  const result = await postToAPI({ action: 'updateStudent', student: studentData });

  if (result.success) {
    showStudentToast('プロフィールを更新しました', 'success');
    clearCache();
    const student = await fetchStudent(studentId);
    if (student) {
      document.title = `${student.name} — 塾生ポートフォリオ`;
      renderStudentHero(student);
      renderProfile(student);
      renderSubjects(student);
      // Driveリンク更新
      const driveLink = document.getElementById('driveLink');
      if (student.driveFolder) driveLink.href = student.driveFolder;
    }
  } else {
    showStudentToast('更新に失敗しました: ' + (result.error || ''), 'error');
  }
}

// --- Subjects ---
function renderSubjects(student) {
  const subjects = student.subjects || [];
  if (subjects.length === 0) {
    document.getElementById('subjectsSection').innerHTML = `
      <div class="section-header animate-in" style="animation-delay: 0.2s">
        <div class="section-icon" style="background: rgba(255, 107, 157, 0.15); color: var(--accent-pink);">📚</div>
        <h2 class="section-title">受講科目</h2>
      </div>
      <div class="empty-state animate-in" style="animation-delay: 0.25s; padding: 16px 0;">
        <div class="empty-state-text" style="font-size: 0.85rem;">プロフィール編集から科目を追加できます</div>
      </div>
    `;
    return;
  }

  document.getElementById('subjectsSection').innerHTML = `
    <div class="section-header animate-in" style="animation-delay: 0.2s">
      <div class="section-icon" style="background: rgba(255, 107, 157, 0.15); color: var(--accent-pink);">📚</div>
      <h2 class="section-title">受講科目</h2>
    </div>
    <div class="subjects-list animate-in" style="animation-delay: 0.25s">
      ${subjects.map(s => `<span class="subject-badge subject-tag" data-subject="${s}">${s}</span>`).join('')}
    </div>
  `;
}

// --- Learning History ---
function renderLearningHistory(student) {
  const history = student.learningHistory || [];
  if (history.length === 0) {
    document.getElementById('historySection').innerHTML = `
      <div class="section-header animate-in" style="animation-delay: 0.3s">
        <div class="section-icon" style="background: rgba(0, 212, 170, 0.15); color: var(--accent-cyan);">📈</div>
        <h2 class="section-title">学習歴</h2>
      </div>
      <div class="empty-state animate-in" style="animation-delay: 0.35s">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">学習歴はまだ登録されていません</div>
      </div>
    `;
    return;
  }

  const items = history.map(item => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-date">${formatDate(item.date)}</div>
      <div class="timeline-event">${item.event}</div>
    </div>
  `).join('');

  document.getElementById('historySection').innerHTML = `
    <div class="section-header animate-in" style="animation-delay: 0.3s">
      <div class="section-icon" style="background: rgba(0, 212, 170, 0.15); color: var(--accent-cyan);">📈</div>
      <h2 class="section-title">学習歴</h2>
    </div>
    <div class="timeline animate-in" style="animation-delay: 0.35s">
      ${items}
    </div>
  `;
}

// --- Documents ---
function renderDocuments(student) {
  const docs = student.documents;
  if (!docs) {
    document.getElementById('documentsSection').innerHTML = '';
    return;
  }

  const categories = [
    { key: 'meetings', title: '📝 面談内容', items: docs.meetings || [] },
    { key: 'grades', title: '📊 成績', items: docs.grades || [] },
    { key: 'homework', title: '📋 宿題', items: docs.homework || [] }
  ];

  const grids = categories.map(cat => {
    const listItems = cat.items.map(item => `
      <div class="doc-item" style="display: flex; align-items: center;">
        <a href="${item.url}" target="_blank" rel="noopener" style="display: flex; align-items: center; flex: 1; text-decoration: none; color: inherit; gap: 8px;">
          <span class="doc-icon">📄</span>
          <div class="doc-info">
            <div class="doc-title">${item.title}</div>
            <div class="doc-date">${formatDate(item.date)}</div>
          </div>
          <span class="doc-arrow">→</span>
        </a>
        <button onclick="renameDoc('${student.id}', '${cat.key}', '${escapeAttr(item.title)}')"
          style="background: rgba(59,130,246,0.12); border: none; color: #3b82f6; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; margin-left: 8px; white-space: nowrap;"
          title="名前を変更">✏️</button>
        <button onclick="deleteDoc('${student.id}', '${cat.key}', '${escapeAttr(item.title)}')"
          style="background: rgba(239,68,68,0.15); border: none; color: #ef4444; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; margin-left: 4px; white-space: nowrap;"
          title="削除">🗑</button>
      </div>
    `).join('');

    const emptyOrList = cat.items.length === 0
      ? `<div class="empty-state" style="padding: 16px 0;"><div class="empty-state-text" style="font-size: 0.8rem;">登録なし</div></div>`
      : `<div class="doc-list">${listItems}</div>`;

    return `
      <div class="doc-category">
        <div class="doc-category-title">${cat.title}</div>
        ${emptyOrList}
      </div>
    `;
  }).join('');

  document.getElementById('documentsSection').innerHTML = `
    <div class="section-header animate-in" style="animation-delay: 0.4s">
      <div class="section-icon" style="background: rgba(59, 130, 246, 0.15); color: var(--accent-blue);">📁</div>
      <h2 class="section-title">各種書類</h2>
      ${student.driveFolder ? `<a href="${student.driveFolder}" target="_blank" style="margin-left: auto; font-size: 0.8rem; color: var(--text-muted);">Google Driveで開く →</a>` : ''}
    </div>
    <div class="documents-grid animate-in" style="animation-delay: 0.45s">
      ${grids}
    </div>

    <!-- ファイルアップロードフォーム -->
    <div class="animate-in" style="animation-delay: 0.5s; margin-top: 20px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-sm);">
      <h3 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary);">📤 ファイルをアップロード</h3>
      <div id="docDropZone" style="border: 2px dashed var(--border-glass); border-radius: var(--radius-md); padding: 24px 16px; text-align: center; transition: all 0.2s ease; cursor: pointer; margin-bottom: 12px;">
        <div style="font-size: 2rem; margin-bottom: 8px; opacity: 0.5;">📂</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">ここにファイルをドラッグ＆ドロップ</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">または下のボタンからファイルを選択</div>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end;">
        <div style="flex: 0 0 auto;">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">カテゴリ</label>
          <select id="uploadCategory" style="padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
            <option value="meetings">📝 面談内容</option>
            <option value="grades">📊 成績</option>
            <option value="homework">📋 宿題</option>
          </select>
        </div>
        <div style="flex: 1; min-width: 150px;">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">タイトル（任意）</label>
          <input type="text" id="uploadTitle" placeholder="自動でファイル名を使用" style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
        </div>
        <label style="padding: 8px 16px; background: var(--gradient-primary); color: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
          📁 ファイルを選択
          <input type="file" id="docFileInput" onchange="uploadDocFile('${student.id}')" style="display: none;" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt">
        </label>
        <label style="padding: 8px 16px; background: linear-gradient(135deg, #38b2ac, #319795); color: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
          📷 カメラ
          <input type="file" id="docCameraInput" onchange="uploadDocFile('${student.id}')" style="display: none;" accept="image/*" capture="environment">
        </label>
        <button type="button" onclick="pasteFromClipboard('${student.id}')" style="padding: 8px 16px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
          📋 ペースト
        </button>
      </div>
      <div id="uploadProgress" style="display: none; margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
        <div class="loading-spinner" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></div>
        アップロード中...
      </div>
      <div style="margin-top: 6px; font-size: 0.7rem; color: var(--text-muted);">
        ※ PDF, Word, Excel, 画像等に対応（最大50MB）。生徒のDriveフォルダにアップロードされます。<br>
        💡 ドロップゾーンでCtrl+Vでスクリーンショットも貼り付けできます。
      </div>
    </div>
  `;

  // ドロップゾーンのイベント設定
  requestAnimationFrame(() => {
    setupDropZone('docDropZone', 'docFileInput', (file) => uploadDocFile(student.id, file));
    // ペーストイベント設定（ドロップゾーンとページ全体）
    const dropZone = document.getElementById('docDropZone');
    if (dropZone) {
      dropZone.setAttribute('tabindex', '0');
      dropZone.addEventListener('paste', (e) => handlePasteEvent(e, student.id));
      dropZone.addEventListener('focus', () => { dropZone.style.borderColor = 'var(--accent-purple)'; });
      dropZone.addEventListener('blur', () => { dropZone.style.borderColor = 'var(--border-glass)'; });
    }
  });
}

// --- Schooling Results ---
function renderSchoolingResults(student) {
  const results = student.schoolingResults || [];

  const items = results.map(item => `
    <div class="result-item" style="display: flex; align-items: center;">
      <a href="${item.url}" target="_blank" rel="noopener" style="display: flex; align-items: center; flex: 1; text-decoration: none; color: inherit; gap: 8px;">
        <span class="result-icon">🌐</span>
        <div class="result-info">
          <div class="result-title">${item.title}</div>
          <div class="result-date">${formatDate(item.date)}</div>
        </div>
        <span class="result-arrow">→</span>
      </a>
      <button onclick="openSchoolingPreview('${escapeAttr(item.url)}', '${escapeAttr(item.title)}')"
        style="background: rgba(59,130,246,0.15); border: none; color: #3b82f6; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; margin-left: 8px; white-space: nowrap;"
        title="プレビュー">👁</button>
      <button onclick="deleteSchoolingEntry('${student.id}', '${escapeAttr(item.title)}')"
        style="background: rgba(239,68,68,0.15); border: none; color: #ef4444; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; margin-left: 4px; white-space: nowrap;"
        title="削除">🗑</button>
    </div>
  `).join('');

  const emptyState = results.length === 0 ? `
    <div class="empty-state animate-in" style="animation-delay: 0.55s">
      <div class="empty-state-icon">📝</div>
      <div class="empty-state-text">スクーリング結果はまだ登録されていません</div>
    </div>
  ` : `
    <div class="results-list animate-in" style="animation-delay: 0.55s">
      ${items}
    </div>
  `;

  document.getElementById('schoolingSection').innerHTML = `
    <div class="section-header animate-in" style="animation-delay: 0.5s">
      <div class="section-icon" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-orange);">🏫</div>
      <h2 class="section-title">スクーリング結果</h2>
    </div>
    ${emptyState}

    <!-- スクーリング結果アップロード -->
    <div class="animate-in" style="animation-delay: 0.6s; margin-top: 20px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-sm);">
      <h3 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary);">📤 スクーリング結果をアップロード</h3>
      <div id="schoolingDropZone" style="border: 2px dashed var(--border-glass); border-radius: var(--radius-md); padding: 24px 16px; text-align: center; transition: all 0.2s ease; cursor: pointer; margin-bottom: 12px;">
        <div style="font-size: 2rem; margin-bottom: 8px; opacity: 0.5;">📂</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">ここにファイルをドラッグ＆ドロップ</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">または下のボタンからファイルを選択</div>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end;">
        <div style="flex: 1; min-width: 150px;">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">タイトル（任意）</label>
          <input type="text" id="schoolingUploadTitle" placeholder="自動でファイル名を使用" style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
        </div>
        <label style="padding: 8px 16px; background: var(--gradient-primary); color: white; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
          📁 ファイルを選択
          <input type="file" id="schoolingFileInput" onchange="uploadSchoolingFile('${student.id}')" style="display: none;" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt">
        </label>
      </div>
      <div id="schoolingUploadProgress" style="display: none; margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
        <div class="loading-spinner" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px;"></div>
        アップロード中...
      </div>
    </div>

    <!-- URL で直接登録 -->
    <div class="animate-in" style="animation-delay: 0.65s; margin-top: 12px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: var(--radius-sm);">
      <h3 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--text-secondary);">🔗 URLで結果を登録</h3>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end;">
        <div style="flex: 1; min-width: 120px;">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">タイトル</label>
          <input type="text" id="schoolingUrlTitle" placeholder="例: Vテスト 第1回結果" style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
        </div>
        <div style="flex: 2; min-width: 200px;">
          <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">URL</label>
          <input type="url" id="schoolingUrlInput" placeholder="https://..." style="width: 100%; padding: 8px 12px; background: var(--bg-glass); border: 1px solid var(--border-glass); border-radius: 6px; color: var(--text-primary); font-family: var(--font-primary); font-size: 0.85rem;">
        </div>
        <button onclick="addSchoolingByUrl('${student.id}')"
          style="padding: 8px 16px; background: var(--gradient-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; white-space: nowrap;">
          ✚ 登録
        </button>
      </div>
      <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">
        ※ Google Drive・Google Sites等のURLを登録すると、ページ内でプレビューできます。
      </div>
    </div>
  `;

  // ドロップゾーンのイベント設定
  requestAnimationFrame(() => {
    setupDropZone('schoolingDropZone', 'schoolingFileInput', (file) => uploadSchoolingFile(student.id, file));
  });
}

// =============================================
// ファイルアップロード・削除 操作
// =============================================

// --- URL でスクーリング結果を登録 ---
async function addSchoolingByUrl(studentId) {
  const titleInput = document.getElementById('schoolingUrlTitle');
  const urlInput = document.getElementById('schoolingUrlInput');
  const title = titleInput.value.trim();
  const url = urlInput.value.trim();

  if (!title) {
    showStudentToast('タイトルを入力してください', 'error');
    titleInput.focus();
    return;
  }
  if (!url) {
    showStudentToast('URLを入力してください', 'error');
    urlInput.focus();
    return;
  }

  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${('0' + (today.getMonth() + 1)).slice(-2)}-${('0' + today.getDate()).slice(-2)}`;

    const result = await postToAPI({
      action: 'addSchooling',
      schooling: {
        studentId: studentId,
        title: title,
        date: dateStr,
        url: url
      }
    });

    if (result.success) {
      showStudentToast('スクーリング結果を登録しました', 'success');
      titleInput.value = '';
      urlInput.value = '';
      clearCache();
      const student = await fetchStudent(studentId);
      if (student) renderSchoolingResults(student);
    } else {
      showStudentToast('登録に失敗しました: ' + (result.error || ''), 'error');
    }
  } catch (err) {
    showStudentToast('登録エラー: ' + err.message, 'error');
  }
}

// --- 書類アップロード ---
async function uploadDocFile(studentId, droppedFile) {
  const fileInput = document.getElementById('docFileInput');
  const cameraInput = document.getElementById('docCameraInput');
  const file = droppedFile || fileInput.files[0] || (cameraInput && cameraInput.files[0]);
  if (!file) return;

  // サイズチェック（10MB）
  if (file.size > 50 * 1024 * 1024) {
    showStudentToast('ファイルサイズが50MBを超えています', 'error');
    fileInput.value = '';
    return;
  }

  const category = document.getElementById('uploadCategory').value;
  const title = document.getElementById('uploadTitle').value.trim() || file.name;
  const progress = document.getElementById('uploadProgress');
  progress.style.display = 'block';

  try {
    const base64 = await fileToBase64(file);
    const result = await postToAPI({
      action: 'uploadFile',
      studentId: studentId,
      category: category,
      title: title,
      fileName: file.name,
      mimeType: file.type,
      fileData: base64
    });

    if (result.success) {
      showStudentToast('ファイルをアップロードしました', 'success');
      document.getElementById('uploadTitle').value = '';
      // ページ再読み込みして最新データを表示
      clearCache();
      const student = await fetchStudent(studentId);
      if (student) {
        renderDocuments(student);
        renderSchoolingResults(student);
      }
    } else {
      showStudentToast('アップロードに失敗しました: ' + (result.error || ''), 'error');
    }
  } catch (err) {
    showStudentToast('アップロードエラー: ' + err.message, 'error');
  }

  progress.style.display = 'none';
  fileInput.value = '';
  if (cameraInput) cameraInput.value = '';
}

// --- クリップボードペースト ---
async function pasteFromClipboard(studentId) {
  try {
    const items = await navigator.clipboard.read();
    let imageBlob = null;
    for (const item of items) {
      const imageType = item.types.find(t => t.startsWith('image/'));
      if (imageType) {
        imageBlob = await item.getType(imageType);
        break;
      }
    }
    if (!imageBlob) {
      showStudentToast('クリップボードに画像がありません', 'error');
      return;
    }
    const file = new File([imageBlob], 'paste_' + Date.now() + '.png', { type: imageBlob.type });
    uploadDocFile(studentId, file);
  } catch (err) {
    showStudentToast('ペーストエラー: ' + err.message, 'error');
  }
}

function handlePasteEvent(e, studentId) {
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      e.preventDefault();
      const blob = items[i].getAsFile();
      if (blob) {
        const file = new File([blob], 'paste_' + Date.now() + '.png', { type: blob.type });
        uploadDocFile(studentId, file);
      }
      return;
    }
  }
}

// --- スクーリング結果アップロード ---
async function uploadSchoolingFile(studentId, droppedFile) {
  const fileInput = document.getElementById('schoolingFileInput');
  const file = droppedFile || fileInput.files[0];
  if (!file) return;

  if (file.size > 50 * 1024 * 1024) {
    showStudentToast('ファイルサイズが50MBを超えています', 'error');
    fileInput.value = '';
    return;
  }

  const title = document.getElementById('schoolingUploadTitle').value.trim() || file.name;
  const progress = document.getElementById('schoolingUploadProgress');
  progress.style.display = 'block';

  try {
    const base64 = await fileToBase64(file);
    const result = await postToAPI({
      action: 'uploadFile',
      studentId: studentId,
      category: 'schooling',
      title: title,
      fileName: file.name,
      mimeType: file.type,
      fileData: base64
    });

    if (result.success) {
      // スクーリングシートにも追加
      await postToAPI({
        action: 'addSchooling',
        schooling: {
          studentId: studentId,
          title: title,
          date: new Date().toISOString().split('T')[0],
          url: result.url
        }
      });

      showStudentToast('スクーリング結果をアップロードしました', 'success');
      document.getElementById('schoolingUploadTitle').value = '';
      clearCache();
      const student = await fetchStudent(studentId);
      if (student) {
        renderDocuments(student);
        renderSchoolingResults(student);
      }
    } else {
      showStudentToast('アップロードに失敗しました: ' + (result.error || ''), 'error');
    }
  } catch (err) {
    showStudentToast('アップロードエラー: ' + err.message, 'error');
  }

  progress.style.display = 'none';
  fileInput.value = '';
}

// --- 書類タイトル変更 ---
async function renameDoc(studentId, category, oldTitle) {
  const newTitle = prompt('新しいタイトルを入力してください', oldTitle);
  if (!newTitle || newTitle === oldTitle) return;

  showStudentToast('タイトルを変更中...', 'success');
  const result = await postToAPI({
    action: 'renameDoc',
    studentId: studentId,
    category: category,
    oldTitle: oldTitle,
    newTitle: newTitle
  });

  if (result.success) {
    showStudentToast('タイトルを変更しました', 'success');
    clearCache();
    const student = await fetchStudent(studentId);
    if (student) renderDocuments(student);
  } else {
    showStudentToast('変更に失敗しました: ' + (result.error || ''), 'error');
  }
}

// --- 書類削除 ---
async function deleteDoc(studentId, category, title) {
  if (!confirm(`「${title}」を削除しますか？`)) return;

  const result = await postToAPI({
    action: 'deleteDocByKey',
    studentId: studentId,
    category: category,
    title: title
  });

  if (result.success) {
    showStudentToast('書類を削除しました', 'success');
    clearCache();
    const student = await fetchStudent(studentId);
    if (student) renderDocuments(student);
  } else {
    showStudentToast('削除に失敗しました', 'error');
  }
}

// --- スクーリング結果削除 ---
async function deleteSchoolingEntry(studentId, title) {
  if (!confirm(`「${title}」を削除しますか？`)) return;

  // スクーリングシートから削除
  await postToAPI({
    action: 'deleteSchoolingByKey',
    studentId: studentId,
    title: title
  });

  // 書類シートからも削除（schoolingカテゴリがある場合）
  await postToAPI({
    action: 'deleteDocByKey',
    studentId: studentId,
    category: 'schooling',
    title: title
  });

  showStudentToast('スクーリング結果を削除しました', 'success');
  clearCache();
  const student = await fetchStudent(studentId);
  if (student) renderSchoolingResults(student);
}

// --- Drive フォルダ作成 ---
async function createDriveFolder(studentId, studentName) {
  showStudentToast('フォルダを作成中...', 'success');

  try {
    const result = await postToAPI({
      action: 'createFolder',
      studentId: studentId,
      name: studentName
    });

    if (result.success) {
      showStudentToast('Driveフォルダを作成しました', 'success');
      clearCache();
      const student = await fetchStudent(studentId);
      if (student) {
        renderProfile(student);
      }
    } else {
      showStudentToast('フォルダ作成に失敗しました: ' + (result.error || ''), 'error');
    }
  } catch (err) {
    showStudentToast('フォルダ作成エラー: ' + err.message, 'error');
  }
}

// --- ドラッグ＆ドロップ ヘルパー ---
function setupDropZone(dropZoneId, fileInputId, onDropFile) {
  const zone = document.getElementById(dropZoneId);
  const fileInput = document.getElementById(fileInputId);
  if (!zone || !fileInput) return;

  // クリックでファイル選択を開く
  zone.addEventListener('click', () => fileInput.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.style.borderColor = 'var(--accent-pink)';
    zone.style.background = 'rgba(242, 167, 179, 0.08)';
  });

  zone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.style.borderColor = 'var(--border-glass)';
    zone.style.background = 'transparent';
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.style.borderColor = 'var(--border-glass)';
    zone.style.background = 'transparent';

    const files = e.dataTransfer.files;
    if (files.length === 0) return;
    onDropFile(files[0]);
  });
}

// --- ユーティリティ ---
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- 教科選択ヘルパー ---
function getSelectedSubjects() {
  const selected = [];
  // プリセットボタンから選択中のものを収集
  document.querySelectorAll('#subjectButtons .subject-toggle-btn.active').forEach(btn => {
    selected.push(btn.dataset.subject);
  });
  // カスタム教科を収集
  document.querySelectorAll('#customSubjects .custom-subject').forEach(el => {
    selected.push(el.dataset.subject);
  });
  return selected;
}

function addCustomSubject() {
  const name = prompt('教科名を入力してください:');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  // 既に選択済みか確認
  const existing = getSelectedSubjects();
  if (existing.includes(trimmed)) {
    showStudentToast('既に追加されています', 'error');
    return;
  }
  const container = document.getElementById('customSubjects');
  const span = document.createElement('span');
  span.className = 'subject-toggle-btn active custom-subject';
  span.dataset.subject = trimmed;
  span.style.cssText = 'padding: 5px 14px; border-radius: 100px; font-size: 0.8rem; font-weight: 500; background: var(--accent-purple); color: white; border: 1px solid var(--accent-purple); display: inline-flex; align-items: center; gap: 4px;';
  span.innerHTML = trimmed + ' <span onclick="this.parentElement.remove()" style="cursor: pointer; font-size: 0.7rem;">✕</span>';
  container.appendChild(span);
}

function toggleSubjectBtn(btn) {
  btn.classList.toggle('active');
  if (btn.classList.contains('active')) {
    btn.style.background = 'var(--accent-purple)';
    btn.style.color = 'white';
    btn.style.borderColor = 'var(--accent-purple)';
  } else {
    btn.style.background = 'var(--bg-glass)';
    btn.style.color = 'var(--text-secondary)';
    btn.style.borderColor = 'var(--border-glass)';
  }
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function showStudentToast(message, type) {
  const existing = document.querySelector('.student-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `student-toast`;
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; padding: 14px 24px;
    border-radius: 8px; color: white; font-weight: 500; z-index: 200;
    animation: fadeInUp 0.3s ease; font-size: 0.9rem;
    background: ${type === 'success' ? '#059669' : '#ef4444'};
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- Utility ---
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// =============================================
// Schooling Preview Modal
// =============================================

// フロントエンド側HTMLキャッシュ
const _driveHtmlCache = new Map();

// --- Drive URLからファイルIDを抽出 ---
function extractDriveFileId(url) {
  if (!url) return null;
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return openMatch[1];
  return null;
}

// --- Drive HTMLを取得（キャッシュ付き） ---
async function fetchDriveHtmlCached(fileId) {
  if (_driveHtmlCache.has(fileId)) {
    return _driveHtmlCache.get(fileId);
  }
  const result = await postToAPI({ action: 'serveHtml', fileId: fileId });
  if (result.success) {
    _driveHtmlCache.set(fileId, result);
  }
  return result;
}

// --- iframeにリンクハンドラを設定 ---
function setupIframeLinkHandlers(iframe) {
  iframe.onload = () => {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.querySelectorAll('a[data-drive-id]').forEach(a => {
        a.style.cursor = 'pointer';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const fId = a.getAttribute('data-drive-id');
          const fName = a.getAttribute('data-file-name') || '';
          loadDriveFileInModal(fId, fName);
        });
      });
    } catch (e) {
      // cross-origin制限の場合は無視
    }
  };
}

// --- プレビューモーダルを開く ---
async function openSchoolingPreview(url, title) {
  // 既存のモーダルがあれば削除
  const existing = document.getElementById('previewModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'previewModal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9999; display: flex; flex-direction: column;
    animation: fadeIn 0.2s ease;
  `;

  modal.innerHTML = `
    <div style="display: flex; align-items: center; padding: 12px 20px; background: rgba(20, 20, 30, 0.95); border-bottom: 1px solid var(--border-glass);">
      <span style="font-size: 1rem; font-weight: 600; color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        🏫 ${title || 'プレビュー'}
      </span>
      <a href="${url}" target="_blank" rel="noopener"
        style="padding: 6px 14px; background: rgba(59,130,246,0.2); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); border-radius: 6px; font-size: 0.8rem; font-weight: 600; text-decoration: none; margin-right: 8px; white-space: nowrap;">
        ↗ 新しいタブで開く
      </a>
      <button onclick="closeSchoolingPreview()"
        style="padding: 6px 14px; background: rgba(239,68,68,0.2); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; white-space: nowrap;">
        ✕ 閉じる
      </button>
    </div>
    <div id="previewBody" style="flex: 1; position: relative;">
      <div id="previewLoading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--text-muted);">
        <div class="loading-spinner" style="width: 32px; height: 32px; margin: 0 auto 12px;"></div>
        ページを読み込んでいます...
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // ESCキーで閉じる
  modal._escHandler = (e) => {
    if (e.key === 'Escape') closeSchoolingPreview();
  };
  document.addEventListener('keydown', modal._escHandler);

  // 背景クリックで閉じる
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSchoolingPreview();
  });

  // Drive URLかどうかチェック
  const driveId = extractDriveFileId(url);

  if (driveId) {
    try {
      const result = await fetchDriveHtmlCached(driveId);
      const loading = document.getElementById('previewLoading');
      const body = document.getElementById('previewBody');

      if (result.success && result.html) {
        if (loading) loading.style.display = 'none';
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: white;';
        iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms';
        iframe.srcdoc = result.html;
        setupIframeLinkHandlers(iframe);
        body.appendChild(iframe);

        // 「新しいタブで開く」をBlob URLに差し替え（ナビスクリプト付き）
        updateOpenInNewTabBtn(modal, result.html);

      } else if (result.success && result.isFolder) {
        if (loading) loading.style.display = 'none';
        renderFolderList(body, result);

      } else {
        if (loading) loading.innerHTML = `<p style="color: #ef4444;">${result.error || 'コンテンツを読み込めませんでした'}</p>`;
      }
    } catch (err) {
      const loading = document.getElementById('previewLoading');
      if (loading) loading.innerHTML = `<p style="color: #ef4444;">エラー: ${err.message}</p>`;
    }
  } else {
    // Drive以外のURLはiframeで直接表示
    const body = document.getElementById('previewBody');
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: white;';
    iframe.onload = () => {
      const loading = document.getElementById('previewLoading');
      if (loading) loading.style.display = 'none';
    };
    iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms';
    body.appendChild(iframe);
  }
}

// --- 「新しいタブで開く」ボタンを更新 ---
function updateOpenInNewTabBtn(modal, html) {
  // ナビスクリプト: クリック→GASからHTML取得→自身も含めた新Blob URLへ遷移
  const navScript = `<script data-nav="true">
(function() {
  var GAS_URL = '${GAS_API_URL}';
  document.addEventListener('click', async function(e) {
    var a = e.target.closest('a[data-drive-id]');
    if (!a) return;
    e.preventDefault();
    document.body.style.opacity = '0.5';
    document.body.style.transition = 'opacity 0.3s';
    try {
      var res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'serveHtml', fileId: a.getAttribute('data-drive-id') })
      });
      var r = await res.json();
      if (r.success && r.html) {
        var nav = document.querySelector('script[data-nav]');
        var newHtml = r.html.replace('<\\/body>', nav.outerHTML + '<\\/body>');
        var blob = new Blob([newHtml], {type: 'text/html'});
        window.location.href = URL.createObjectURL(blob);
      } else {
        document.body.style.opacity = '1';
        alert(r.error || 'エラー');
      }
    } catch(err) {
      document.body.style.opacity = '1';
      alert('読み込めませんでした');
    }
  });
})();
<\/script>`;
  const blobHtml = html.replace('</body>', navScript + '</body>');
  const blob = new Blob([blobHtml], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  const openBtn = modal.querySelector('a[target="_blank"]');
  if (openBtn) openBtn.href = blobUrl;
}

// --- フォルダ一覧を描画 ---
function renderFolderList(body, result) {
  const listDiv = document.createElement('div');
  listDiv.style.cssText = 'padding: 24px; max-width: 600px; margin: 0 auto;';
  listDiv.innerHTML = `
    <h2 style="color: var(--text-primary); margin-bottom: 16px;">📁 ${result.folderName}</h2>
    <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">プレビューするファイルを選択してください：</p>
    <div id="folderFileList"></div>
  `;
  body.appendChild(listDiv);
  const listContainer = listDiv.querySelector('#folderFileList');
  result.files.forEach(f => {
    const icon = f.mime === 'text/html' ? '🌐' : '📄';
    const item = document.createElement('div');
    item.style.cssText = 'padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.2s; color: var(--text-primary);';
    item.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span><span style="flex: 1;">${f.name}</span>`;
    item.onmouseenter = () => item.style.background = 'rgba(108,99,255,0.15)';
    item.onmouseleave = () => item.style.background = 'rgba(255,255,255,0.05)';
    if (f.mime === 'text/html') {
      item.onclick = () => loadDriveFileInModal(f.id, f.name);
    }
    listContainer.appendChild(item);
  });
}

// --- モーダル内にDriveファイルを読み込み ---
async function loadDriveFileInModal(fileId, fileName) {
  const body = document.getElementById('previewBody');
  if (!body) return;
  body.innerHTML = `
    <div id="previewLoading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--text-muted);">
      <div class="loading-spinner" style="width: 32px; height: 32px; margin: 0 auto 12px;"></div>
      ${fileName || 'ページ'} を読み込んでいます...
    </div>
  `;
  try {
    const result = await fetchDriveHtmlCached(fileId);
    if (result.success && result.html) {
      body.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: white;';
      iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms';
      iframe.srcdoc = result.html;
      setupIframeLinkHandlers(iframe);
      body.appendChild(iframe);

      // Blob URLも更新
      const modal = document.getElementById('previewModal');
      if (modal) updateOpenInNewTabBtn(modal, result.html);
    } else {
      body.innerHTML = `<p style="color: #ef4444; text-align: center; margin-top: 40px;">${result.error || 'コンテンツを読み込めませんでした'}</p>`;
    }
  } catch (err) {
    body.innerHTML = `<p style="color: #ef4444; text-align: center; margin-top: 40px;">エラー: ${err.message}</p>`;
  }
}

// --- プレビューモーダルを閉じる ---
function closeSchoolingPreview() {
  const modal = document.getElementById('previewModal');
  if (modal) {
    if (modal._escHandler) {
      document.removeEventListener('keydown', modal._escHandler);
    }
    modal.remove();
    document.body.style.overflow = '';
  }
}

