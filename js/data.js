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
            return getFallbackData();
        }
    } catch (error) {
        console.warn('GAS API接続失敗。フォールバックデータを使用します:', error.message);
        return getFallbackData();
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

// --- Google Driveフォルダリンク ---
const DRIVE_FOLDERS = {
    folder1: "https://drive.google.com/open?id=1NbE--Vl6MkomJNAkNJjKpJj-Bj7HFlsg&usp=drive_fs",
    folder2: "https://drive.google.com/open?id=1gzVjIqVFvpohsp6OQPPjfUJpPBb-KTv7&usp=drive_fs"
};

// =============================================
// フォールバックデータ（GAS未接続時に使用）
// =============================================
function getFallbackData() {
    return [
        {
            id: "yamada-taro",
            name: "山田 太郎",
            nameKana: "やまだ たろう",
            grade: "中学3年",
            school: "相生中学校",
            enrollDate: "2024-04-01",
            iconColor: "#6C63FF",
            memo: "数学が得意。英語の長文読解に課題あり。志望校: 県立A高校",
            subjects: ["数学", "英語", "国語", "理科"],
            driveFolder: DRIVE_FOLDERS.folder1,
            learningHistory: [
                { date: "2024-04-01", event: "入塾（数学・英語）" },
                { date: "2024-06-15", event: "中間テスト対策開始" },
                { date: "2024-07-20", event: "夏期講習受講（国語追加）" },
                { date: "2024-09-10", event: "理科追加受講開始" },
                { date: "2024-11-01", event: "期末テスト対策開始" },
                { date: "2025-01-15", event: "冬期講習受講" },
                { date: "2025-03-01", event: "入試直前対策講座受講" }
            ],
            documents: {
                meetings: [
                    { title: "入塾面談", date: "2024-04-01", url: "#" },
                    { title: "第1回定期面談", date: "2024-07-10", url: "#" },
                    { title: "第2回定期面談", date: "2024-10-15", url: "#" },
                    { title: "第3回定期面談（進路相談）", date: "2025-01-20", url: "#" }
                ],
                grades: [
                    { title: "1学期中間テスト結果", date: "2024-06-20", url: "#" },
                    { title: "1学期期末テスト結果", date: "2024-07-15", url: "#" },
                    { title: "2学期中間テスト結果", date: "2024-11-10", url: "#" },
                    { title: "2学期期末テスト結果", date: "2024-12-20", url: "#" },
                    { title: "3学期実力テスト結果", date: "2025-02-05", url: "#" }
                ],
                homework: [
                    { title: "夏期講習課題一覧", date: "2024-07-20", url: "#" },
                    { title: "冬期講習課題一覧", date: "2025-01-05", url: "#" },
                    { title: "入試対策プリント", date: "2025-02-10", url: "#" }
                ]
            },
            schoolingResults: [
                { title: "Vテスト 第1回結果", url: "#", date: "2024-08-25" },
                { title: "Vテスト 第2回結果", url: "#", date: "2024-11-17" },
                { title: "模擬試験結果", url: "#", date: "2025-01-26" }
            ]
        },
        {
            id: "sato-hanako",
            name: "佐藤 花子",
            nameKana: "さとう はなこ",
            grade: "中学2年",
            school: "第一中学校",
            enrollDate: "2024-09-01",
            iconColor: "#FF6B9D",
            memo: "英語が得意。数学の図形問題に苦手意識あり。部活: バスケットボール部",
            subjects: ["数学", "英語"],
            driveFolder: DRIVE_FOLDERS.folder1,
            learningHistory: [
                { date: "2024-09-01", event: "入塾（数学・英語）" },
                { date: "2024-11-01", event: "期末テスト対策開始" },
                { date: "2025-01-10", event: "冬期講習受講" }
            ],
            documents: {
                meetings: [
                    { title: "入塾面談", date: "2024-09-01", url: "#" },
                    { title: "第1回定期面談", date: "2024-12-10", url: "#" }
                ],
                grades: [
                    { title: "2学期期末テスト結果", date: "2024-12-20", url: "#" },
                    { title: "3学期中間テスト結果", date: "2025-02-15", url: "#" }
                ],
                homework: [
                    { title: "冬期講習課題一覧", date: "2025-01-05", url: "#" }
                ]
            },
            schoolingResults: [
                { title: "Vテスト 第2回結果", url: "#", date: "2024-11-17" }
            ]
        },
        {
            id: "suzuki-ken",
            name: "鈴木 健",
            nameKana: "すずき けん",
            grade: "高校1年",
            school: "県立B高校",
            enrollDate: "2025-04-01",
            iconColor: "#00D4AA",
            memo: "高校入学を機に入塾。理系志望。英語の基礎力強化が必要。",
            subjects: ["数学", "英語", "物理"],
            driveFolder: DRIVE_FOLDERS.folder2,
            learningHistory: [
                { date: "2025-04-01", event: "入塾（数学・英語・物理）" },
                { date: "2025-06-01", event: "1学期中間テスト対策開始" }
            ],
            documents: {
                meetings: [
                    { title: "入塾面談", date: "2025-04-01", url: "#" }
                ],
                grades: [
                    { title: "入学時実力テスト結果", date: "2025-04-15", url: "#" }
                ],
                homework: [
                    { title: "GW課題一覧", date: "2025-04-28", url: "#" }
                ]
            },
            schoolingResults: []
        }
    ];
}
