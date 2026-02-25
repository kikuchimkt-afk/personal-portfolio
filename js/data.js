// =============================================
// 塾生ポートフォリオ — データ層 (GAS API連携)
// =============================================
// GAS WebアプリのURLを設定してください。
// GASのデプロイ後に発行されるURLをここに貼り付けます。
// =============================================

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwjs1QK-v6abtUb3opKDJnhIQAvzYu70VdLbUOJp_rp1Nd5LTLOHDuVL5DyWw8F0siV/exec';

// --- データキャッシュ ---
let _studentsCache = null;

// --- 全生徒データ取得 ---
async function fetchAllStudents() {
    if (_studentsCache) return _studentsCache;

    try {
        const response = await fetch(GAS_API_URL + '?action=getAll');
        const result = await response.json();

        if (result.success) {
            _studentsCache = result.data;
            return result.data;
        } else {
            console.error('API Error:', result.error);
            showConnectionError('データ取得に失敗しました: ' + (result.error || ''));
            return [];
        }
    } catch (error) {
        console.warn('GAS API接続失敗:', error.message);
        showConnectionError('サーバーに接続できません。しばらくしてからリロードしてください。');
        return [];
    }
}

// --- 特定生徒データ取得 ---
async function fetchStudent(id) {
    const students = await fetchAllStudents();
    return students.find(s => s.id === id) || null;
}

// --- データ書き込み（POST） ---
async function postToAPI(data) {
    try {
        const response = await fetch(GAS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('POST Error:', error);
        return { success: false, error: error.message };
    }
}

// --- キャッシュクリア ---
function clearCache() {
    _studentsCache = null;
}

// --- 接続エラー表示 ---
function showConnectionError(message) {
    const grid = document.getElementById('studentsGrid') || document.getElementById('mStudentList');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div style="font-size: 2.5rem; margin-bottom: 12px;">⚠️</div>
                <div style="font-size: 1rem; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px;">接続エラー</div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">${message}</div>
                <button onclick="location.reload()" style="padding: 8px 20px; background: var(--gradient-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-family: var(--font-primary);">🔄 リロード</button>
            </div>
        `;
    }
}

// --- Google Driveフォルダリンク ---
const DRIVE_FOLDERS = {
    folder1: "https://drive.google.com/open?id=1NbE--Vl6MkomJNAkNJjKpJj-Bj7HFlsg&usp=drive_fs",
    folder2: "https://drive.google.com/open?id=1gzVjIqVFvpohsp6OQPPjfUJpPBb-KTv7&usp=drive_fs"
};

