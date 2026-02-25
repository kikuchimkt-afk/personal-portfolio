// =============================================
// 塾生ポートフォリオ — 管理画面ロジック
// =============================================

let _currentStudentId = null;
let _allStudents = [];

document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

async function initAdmin() {
    checkAPIStatus();
    _allStudents = await fetchAllStudents();
    renderStudentList();
}

// --- API Status ---
function checkAPIStatus() {
    const el = document.getElementById('apiStatus');
    if (GAS_API_URL === 'YOUR_GAS_WEB_APP_URL') {
        el.style.background = 'rgba(245, 158, 11, 0.15)';
        el.style.border = '1px solid rgba(245, 158, 11, 0.3)';
        el.style.color = '#f59e0b';
        el.innerHTML = '⚠️ GAS APIが未設定です。<code>js/data.js</code> の <code>GAS_API_URL</code> にデプロイURLを設定してください。現在はフォールバックデータで動作しています。';
    } else {
        el.style.background = 'rgba(5, 150, 105, 0.15)';
        el.style.border = '1px solid rgba(5, 150, 105, 0.3)';
        el.style.color = '#059669';
        el.innerHTML = '✅ GAS APIに接続済み';
    }
}

// --- Student List ---
function renderStudentList() {
    const container = document.getElementById('studentList');
    if (_allStudents.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-text">塾生はまだ登録されていません</div></div>';
        return;
    }

    container.innerHTML = _allStudents.map(s => `
    <div class="student-list-item ${_currentStudentId === s.id ? 'active' : ''}" onclick="selectStudent('${s.id}')">
      <div class="student-list-icon" style="background: ${s.iconColor || '#6C63FF'}">${s.name.charAt(0)}</div>
      <div>
        <div class="student-list-name">${s.name}</div>
        <div class="student-list-grade">${s.grade} ／ ${s.school || ''}</div>
      </div>
    </div>
  `).join('');
}

// --- Select Student ---
function selectStudent(id) {
    _currentStudentId = id;
    const student = _allStudents.find(s => s.id === id);
    if (!student) return;

    renderStudentList();
    showEditArea(student);
}

// --- Show Add Form ---
function showAddStudentForm() {
    _currentStudentId = null;
    renderStudentList();

    document.getElementById('formMode').value = 'add';
    document.getElementById('editTitle').textContent = '新規生徒登録';
    document.getElementById('deleteStudentBtn').style.display = 'none';

    // Clear form
    ['fName', 'fNameKana', 'fGrade', 'fSchool', 'fEnrollDate', 'fSubjects', 'fDriveFolder', 'fMemo'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('fIconColor').value = '#6C63FF';

    document.getElementById('editArea').style.display = 'block';
    showTab('profile');
    renderTabs(['profile']);
}

// --- Show Edit Area ---
function showEditArea(student) {
    document.getElementById('formMode').value = 'edit';
    document.getElementById('editTitle').textContent = `${student.name} の情報`;
    document.getElementById('deleteStudentBtn').style.display = 'inline-flex';

    // Fill form
    document.getElementById('fName').value = student.name || '';
    document.getElementById('fNameKana').value = student.nameKana || '';
    document.getElementById('fGrade').value = student.grade || '';
    document.getElementById('fSchool').value = student.school || '';
    document.getElementById('fEnrollDate').value = student.enrollDate || '';
    document.getElementById('fIconColor').value = student.iconColor || '#6C63FF';
    document.getElementById('fSubjects').value = (student.subjects || []).join(',');
    document.getElementById('fDriveFolder').value = student.driveFolder || '';
    document.getElementById('fMemo').value = student.memo || '';

    document.getElementById('editArea').style.display = 'block';
    renderTabs(['profile', 'documents', 'history', 'schooling']);
    showTab('profile');

    renderDocsList(student);
    renderHistoryList(student);
    renderSchoolingList(student);
}

// --- Tabs ---
function renderTabs(tabIds) {
    const labels = { profile: '👤 プロフィール', documents: '📁 書類', history: '📈 学習歴', schooling: '🏫 スクーリング' };
    document.getElementById('editTabs').innerHTML = tabIds.map(id =>
        `<button class="tab" data-tab="${id}" onclick="showTab('${id}')">${labels[id]}</button>`
    ).join('');
}

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    const tabBtn = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    const tabContent = document.getElementById('tab-' + tabId);
    if (tabContent) tabContent.classList.add('active');
}

// =============================================
// CRUD Operations
// =============================================

// --- Save Student ---
async function saveStudent(e) {
    e.preventDefault();
    const mode = document.getElementById('formMode').value;
    const studentData = {
        name: document.getElementById('fName').value.trim(),
        nameKana: document.getElementById('fNameKana').value.trim(),
        grade: document.getElementById('fGrade').value.trim(),
        school: document.getElementById('fSchool').value.trim(),
        enrollDate: document.getElementById('fEnrollDate').value,
        iconColor: document.getElementById('fIconColor').value,
        subjects: document.getElementById('fSubjects').value.split(',').map(s => s.trim()).filter(Boolean),
        driveFolder: document.getElementById('fDriveFolder').value.trim(),
        memo: document.getElementById('fMemo').value.trim()
    };

    if (mode === 'edit' && _currentStudentId) {
        studentData.id = _currentStudentId;
        const result = await postToAPI({ action: 'updateStudent', student: studentData });
        if (result.success) {
            showToast('生徒情報を更新しました', 'success');
        } else {
            showToast('更新に失敗しました: ' + (result.error || ''), 'error');
        }
    } else {
        const result = await postToAPI({ action: 'addStudent', student: studentData });
        if (result.success) {
            const folderMsg = result.driveFolder ? '（Driveフォルダ自動作成済み）' : '';
            showToast('生徒を追加しました' + folderMsg, 'success');
            _currentStudentId = result.id;
        } else {
            showToast('追加に失敗しました: ' + (result.error || ''), 'error');
        }
    }

    clearCache();
    _allStudents = await fetchAllStudents();
    renderStudentList();
    if (_currentStudentId) selectStudent(_currentStudentId);
}

// --- Delete Student ---
async function deleteCurrentStudent() {
    if (!_currentStudentId) return;
    if (!confirm('この生徒と関連データをすべて削除しますか？')) return;

    const result = await postToAPI({ action: 'deleteStudent', id: _currentStudentId });
    if (result.success) {
        showToast('生徒を削除しました', 'success');
        _currentStudentId = null;
        document.getElementById('editArea').style.display = 'none';
        clearCache();
        _allStudents = await fetchAllStudents();
        renderStudentList();
    } else {
        showToast('削除に失敗しました', 'error');
    }
}

// --- Documents ---
function renderDocsList(student) {
    const docs = student.documents || {};
    const all = [
        ...(docs.meetings || []).map(d => ({ ...d, category: 'meetings', catLabel: '📝 面談' })),
        ...(docs.grades || []).map(d => ({ ...d, category: 'grades', catLabel: '📊 成績' })),
        ...(docs.homework || []).map(d => ({ ...d, category: 'homework', catLabel: '📋 宿題' }))
    ];

    if (all.length === 0) {
        document.getElementById('docsList').innerHTML = '<div class="empty-state" style="padding: 16px 0;"><div class="empty-state-text" style="font-size: 0.85rem;">書類はまだ登録されていません</div></div>';
        return;
    }

    document.getElementById('docsList').innerHTML = all.map(d => `
    <div class="data-table-item">
      <span style="font-size: 0.75rem; padding: 2px 8px; border-radius: 100px; background: var(--bg-card); color: var(--text-muted);">${d.catLabel}</span>
      <div class="data-table-info">
        <div class="data-table-title">${d.title}</div>
        <div class="data-table-sub">${d.date || ''}</div>
      </div>
      <a href="${d.url}" target="_blank" style="font-size: 0.8rem;">開く</a>
    </div>
  `).join('');
}

async function addDocumentEntry(e) {
    e.preventDefault();
    if (!_currentStudentId) { showToast('先に生徒を選択してください', 'error'); return; }

    const doc = {
        studentId: _currentStudentId,
        category: document.getElementById('dCategory').value,
        title: document.getElementById('dTitle').value.trim(),
        date: document.getElementById('dDate').value,
        url: document.getElementById('dUrl').value.trim()
    };

    const result = await postToAPI({ action: 'addDocument', document: doc });
    if (result.success) {
        showToast('書類を追加しました', 'success');
        document.getElementById('docForm').reset();
        clearCache();
        _allStudents = await fetchAllStudents();
        const student = _allStudents.find(s => s.id === _currentStudentId);
        if (student) renderDocsList(student);
    } else {
        showToast('追加に失敗しました', 'error');
    }
}

// --- History ---
function renderHistoryList(student) {
    const history = student.learningHistory || [];
    if (history.length === 0) {
        document.getElementById('historyList').innerHTML = '<div class="empty-state" style="padding: 16px 0;"><div class="empty-state-text" style="font-size: 0.85rem;">学習歴はまだ登録されていません</div></div>';
        return;
    }

    document.getElementById('historyList').innerHTML = history.map(h => `
    <div class="data-table-item">
      <div class="data-table-info">
        <div class="data-table-title">${h.event}</div>
        <div class="data-table-sub">${h.date || ''}</div>
      </div>
    </div>
  `).join('');
}

async function addHistoryEntry(e) {
    e.preventDefault();
    if (!_currentStudentId) { showToast('先に生徒を選択してください', 'error'); return; }

    const history = {
        studentId: _currentStudentId,
        date: document.getElementById('hDate').value,
        event: document.getElementById('hEvent').value.trim()
    };

    const result = await postToAPI({ action: 'addHistory', history: history });
    if (result.success) {
        showToast('学習歴を追加しました', 'success');
        document.getElementById('historyForm').reset();
        clearCache();
        _allStudents = await fetchAllStudents();
        const student = _allStudents.find(s => s.id === _currentStudentId);
        if (student) renderHistoryList(student);
    } else {
        showToast('追加に失敗しました', 'error');
    }
}

// --- Schooling ---
function renderSchoolingList(student) {
    const results = student.schoolingResults || [];
    if (results.length === 0) {
        document.getElementById('schoolingList').innerHTML = '<div class="empty-state" style="padding: 16px 0;"><div class="empty-state-text" style="font-size: 0.85rem;">スクーリング結果はまだ登録されていません</div></div>';
        return;
    }

    document.getElementById('schoolingList').innerHTML = results.map(s => `
    <div class="data-table-item">
      <div class="data-table-info">
        <div class="data-table-title">${s.title}</div>
        <div class="data-table-sub">${s.date || ''}</div>
      </div>
      <a href="${s.url}" target="_blank" style="font-size: 0.8rem;">開く</a>
    </div>
  `).join('');
}

async function addSchoolingEntry(e) {
    e.preventDefault();
    if (!_currentStudentId) { showToast('先に生徒を選択してください', 'error'); return; }

    const schooling = {
        studentId: _currentStudentId,
        title: document.getElementById('sTitle').value.trim(),
        date: document.getElementById('sDate').value,
        url: document.getElementById('sUrl').value.trim()
    };

    const result = await postToAPI({ action: 'addSchooling', schooling: schooling });
    if (result.success) {
        showToast('スクーリング結果を追加しました', 'success');
        document.getElementById('schoolingForm').reset();
        clearCache();
        _allStudents = await fetchAllStudents();
        const student = _allStudents.find(s => s.id === _currentStudentId);
        if (student) renderSchoolingList(student);
    } else {
        showToast('追加に失敗しました', 'error');
    }
}

// --- Toast ---
function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// =============================================
// Excel Import / Export
// =============================================

// --- ヘッダーマッピング（日本語 ↔ 内部キー） ---
const EXCEL_HEADERS = {
    'ID': 'id',
    '氏名': 'name',
    'フリガナ': 'nameKana',
    '学年': 'grade',
    '学校': 'school',
    '入塾日': 'enrollDate',
    'アイコンカラー': 'iconColor',
    'メモ': 'memo',
    '受講科目': 'subjects',
    'Driveフォルダ': 'driveFolder'
};

const EXCEL_HEADERS_REVERSE = Object.fromEntries(
    Object.entries(EXCEL_HEADERS).map(([k, v]) => [v, k])
);

// --- エクスポート ---
function exportToExcel() {
    if (_allStudents.length === 0) {
        showToast('エクスポートするデータがありません', 'error');
        return;
    }

    // 全カラム出力（未入力は空欄）
    const rows = _allStudents.map(s => ({
        'ID': s.id || '',
        '氏名': s.name || '',
        'フリガナ': s.nameKana || '',
        '学年': s.grade || '',
        '学校': s.school || '',
        '入塾日': s.enrollDate || '',
        'アイコンカラー': s.iconColor || '#6C63FF',
        'メモ': s.memo || '',
        '受講科目': (s.subjects || []).join(','),
        'Driveフォルダ': s.driveFolder || ''
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws['!cols'] = [
        { wch: 20 }, // ID
        { wch: 14 }, // 氏名
        { wch: 16 }, // フリガナ
        { wch: 10 }, // 学年
        { wch: 14 }, // 学校
        { wch: 12 }, // 入塾日
        { wch: 12 }, // アイコンカラー
        { wch: 30 }, // メモ
        { wch: 20 }, // 受講科目
        { wch: 40 }  // Driveフォルダ
    ];

    XLSX.utils.book_append_sheet(wb, ws, '生徒一覧');

    const now = new Date();
    const dateStr = `${now.getFullYear()}${('0' + (now.getMonth() + 1)).slice(-2)}${('0' + now.getDate()).slice(-2)}`;
    XLSX.writeFile(wb, `塾生データ_${dateStr}.xlsx`);

    showToast('Excelファイルをダウンロードしました', 'success');
}

// --- インポート ---
async function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast('Excelファイルを読み込み中...', 'success');

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (jsonRows.length === 0) {
                showToast('Excelファイルにデータがありません', 'error');
                return;
            }

            // ヘッダーを内部キーに変換
            const students = jsonRows.map(row => {
                const obj = {};
                for (const [jpKey, value] of Object.entries(row)) {
                    const internalKey = EXCEL_HEADERS[jpKey] || jpKey;
                    obj[internalKey] = value;
                }
                // 受講科目を配列に変換（入力があれば）
                if (typeof obj.subjects === 'string' && obj.subjects) {
                    obj.subjects = obj.subjects.split(',').map(s => s.trim()).filter(Boolean);
                }
                // 入塾日をフォーマット（入力があれば）
                if (obj.enrollDate instanceof Date) {
                    const y = obj.enrollDate.getFullYear();
                    const m = ('0' + (obj.enrollDate.getMonth() + 1)).slice(-2);
                    const d = ('0' + obj.enrollDate.getDate()).slice(-2);
                    obj.enrollDate = `${y}-${m}-${d}`;
                } else if (typeof obj.enrollDate === 'number') {
                    const excelDate = XLSX.SSF.parse_date_code(obj.enrollDate);
                    obj.enrollDate = `${excelDate.y}-${('0' + excelDate.m).slice(-2)}-${('0' + excelDate.d).slice(-2)}`;
                }
                return obj;
            });

            // 既存IDリスト
            const existingIds = new Set(_allStudents.map(s => s.id));

            let addCount = 0;
            let updateCount = 0;
            let errorCount = 0;

            for (const student of students) {
                if (!student.name) {
                    errorCount++;
                    continue;
                }

                // IDがなければ名前から生成
                if (!student.id) {
                    student.id = student.name.replace(/\s+/g, '-').replace(/　/g, '-').toLowerCase();
                }

                try {
                    if (existingIds.has(student.id)) {
                        // 更新
                        const result = await postToAPI({ action: 'updateStudent', student: student });
                        if (result.success) updateCount++;
                        else errorCount++;
                    } else {
                        // 新規追加
                        const result = await postToAPI({ action: 'addStudent', student: student });
                        if (result.success) {
                            addCount++;
                            existingIds.add(student.id);
                        } else errorCount++;
                    }
                } catch (err) {
                    errorCount++;
                }
            }

            // リスト更新
            clearCache();
            _allStudents = await fetchAllStudents();
            renderStudentList();

            let msg = `インポート完了: 追加 ${addCount}件、更新 ${updateCount}件`;
            if (errorCount > 0) msg += `、エラー ${errorCount}件`;
            showToast(msg, errorCount > 0 ? 'error' : 'success');

        } catch (err) {
            console.error('Import Error:', err);
            showToast('Excelファイルの読み込みに失敗しました: ' + err.message, 'error');
        }
    };

    reader.readAsArrayBuffer(file);
    // 同じファイルを再選択できるようにリセット
    event.target.value = '';
}
