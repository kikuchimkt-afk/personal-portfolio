// =============================================
// 塾生ポートフォリオ — Google Apps Script (Code.gs)
// =============================================
// このコードをGoogle Sheetsの Apps Script エディタに貼り付けてください。
// 手順:
//   1. Google Sheets を開く
//   2. 拡張機能 → Apps Script
//   3. このコードを貼り付けて保存
//   4. デプロイ → 新しいデプロイ → ウェブアプリ
//      - 実行するユーザー: 自分
//      - アクセスできるユーザー: 全員
//   5. 発行されたURLを data.js の GAS_API_URL に設定
// =============================================

// --- GET リクエスト（データ取得） ---
function doGet(e) {
  try {
    const action = e.parameter.action || 'getAll';

    let result;
    switch (action) {
      case 'getAll':
        result = getAllStudents();
        break;
      case 'getStudent':
        result = getStudent(e.parameter.id);
        break;
      default:
        result = { error: 'Unknown action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Drive HTMLコンテンツ取得 (DriveApp版 + キャッシュ) ---
function fetchDriveHtml(fileId) {
  // キャッシュチェック（最大6時間保存）
  var cache = CacheService.getScriptCache();
  var cached = cache.get('html_' + fileId);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    var item = DriveApp.getFileById(fileId);
    var mimeType = item.getMimeType();

    // HTMLファイルの場合: CSS/JSをインライン化して返す
    if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
      var content = item.getBlob().getDataAsString();

      // 同フォルダ内のファイルを取得してCSS/JSをインライン化
      try {
        var parents = item.getParents();
        if (parents.hasNext()) {
          var folder = parents.next();
          var siblingFiles = {};
          var filesIter = folder.getFiles();
          while (filesIter.hasNext()) {
            var f = filesIter.next();
            siblingFiles[f.getName()] = f;
          }

          // <link href="xxx.css"> → <style>...</style> にインライン化
          content = content.replace(/<link\s+[^>]*href="([^"]+\.css)"[^>]*>/gi, function(match, cssFile) {
            if (siblingFiles[cssFile]) {
              try {
                return '<style>' + siblingFiles[cssFile].getBlob().getDataAsString() + '</style>';
              } catch(e) {}
            }
            return match;
          });

          // <script src="xxx.js"></script> → <script>...</script> にインライン化
          content = content.replace(/<script\s+[^>]*src="([^"]+\.js)"[^>]*><\/script>/gi, function(match, jsFile) {
            if (siblingFiles[jsFile]) {
              try {
                return '<script>' + siblingFiles[jsFile].getBlob().getDataAsString() + '<\/script>';
              } catch(e) {}
            }
            return match;
          });

          // <a href="xxx.html"> → data属性にファイルIDを埋め込み
          content = content.replace(/(<a\s+[^>]*?)href="([^"]+\.html)"([^>]*>)/gi, function(match, before, htmlFile, after) {
            if (siblingFiles[htmlFile]) {
              var fId = siblingFiles[htmlFile].getId();
              return before + 'href="#" data-drive-id="' + fId + '" data-file-name="' + htmlFile + '"' + after;
            }
            return match;
          });
        }
      } catch(inlineErr) {
        // CSS/JSインライン化に失敗してもHTMLはそのまま返す
      }

      var result = { success: true, html: content };
      // キャッシュ保存（最大100KB、6時間 = 21600秒）
      try {
        var json = JSON.stringify(result);
        if (json.length < 100000) {
          cache.put('html_' + fileId, json, 21600);
        }
      } catch(cacheErr) {}
      return result;
    }

    return { success: false, error: 'HTMLファイルではありません (type: ' + mimeType + ')' };
  } catch (e1) {
    // フォルダの場合
    try {
      var folder = DriveApp.getFolderById(fileId);
      var files = folder.getFiles();
      var fileList = [];
      while (files.hasNext()) {
        var f = files.next();
        fileList.push({ name: f.getName(), id: f.getId(), mime: f.getMimeType() });
      }
      return { success: true, isFolder: true, folderName: folder.getName(), files: fileList };
    } catch (e2) {
      return { success: false, error: 'ファイルにアクセスできません: ' + e1.message };
    }
  }
}

// --- POST リクエスト（データ書き込み） ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let result;
    switch (action) {
      case 'addStudent':
        result = addStudent(data.student);
        break;
      case 'updateStudent':
        result = updateStudent(data.student);
        break;
      case 'deleteStudent':
        result = deleteStudent(data.id);
        break;
      case 'addDocument':
        result = addDocument(data.document);
        break;
      case 'deleteDocument':
        result = deleteDocument(data.rowIndex);
        break;
      case 'addHistory':
        result = addHistory(data.history);
        break;
      case 'deleteHistory':
        result = deleteHistory(data.rowIndex);
        break;
      case 'addSchooling':
        result = addSchooling(data.schooling);
        break;
      case 'deleteSchooling':
        result = deleteSchooling(data.rowIndex);
        break;
      case 'uploadFile':
        result = uploadFileToDrive(data);
        break;
      case 'deleteDocByKey':
        result = deleteDocByKey(data.studentId, data.category, data.title);
        break;
      case 'renameDoc':
        result = renameDoc(data.studentId, data.category, data.oldTitle, data.newTitle);
        break;
      case 'deleteSchoolingByKey':
        result = deleteSchoolingByKey(data.studentId, data.title);
        break;
      case 'serveHtml':
        result = fetchDriveHtml(data.fileId);
        break;
      case 'createFolder':
        result = createStudentFolder(data);
        break;
      case 'bulkCreateFolders':
        result = bulkCreateFolders();
        break;
      default:
        result = { error: 'Unknown action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================================
// データ取得関数
// =============================================

// --- アバターURLをdata URIに変換 ---
function getAvatarDataUri(avatarUrl) {
  if (!avatarUrl) return '';
  // 既にdata URIの場合はそのまま返す
  if (avatarUrl.startsWith('data:')) return avatarUrl;
  // Drive URLの場合はファイルを読んでbase64に変換
  try {
    var fileId = extractDriveFileId(avatarUrl);
    if (!fileId) fileId = extractDriveFolderId(avatarUrl);
    if (fileId) {
      var file = DriveApp.getFileById(fileId);
      var blob = file.getBlob();
      var base64 = Utilities.base64Encode(blob.getBytes());
      var mimeType = blob.getContentType() || 'image/jpeg';
      return 'data:' + mimeType + ';base64,' + base64;
    }
  } catch (e) {
    // エラー時は空文字列を返す
  }
  return '';
}

function getAllStudents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 生徒データ
  const studentsSheet = ss.getSheetByName('生徒');
  const students = sheetToObjects(studentsSheet);

  // 書類データ
  const docsSheet = ss.getSheetByName('書類');
  const docs = sheetToObjects(docsSheet);

  // 学習歴データ
  const historySheet = ss.getSheetByName('学習歴');
  const histories = sheetToObjects(historySheet);

  // スクーリングデータ
  const schoolingSheet = ss.getSheetByName('スクーリング');
  const schoolings = sheetToObjects(schoolingSheet);

  // リレーション結合
  const result = students.map(student => {
    const studentDocs = docs.filter(d => d.studentId === student.id);
    const studentHistory = histories.filter(h => h.studentId === student.id);
    const studentSchooling = schoolings.filter(s => s.studentId === student.id);

    return {
      id: student.id,
      name: student.name,
      nameKana: student.nameKana,
      grade: student.grade,
      school: student.school,
      enrollDate: formatDateStr(student.enrollDate),
      iconColor: student.iconColor || '#6C63FF',
      memo: student.memo || '',
      subjects: student.subjects ? student.subjects.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [],
      driveFolder: student.driveFolder || '',
      avatarUrl: getAvatarDataUri(student.avatarUrl),
      learningHistory: studentHistory
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(h => ({
          date: formatDateStr(h.date),
          event: h.event
        })),
      documents: {
        meetings: studentDocs.filter(d => d.category === 'meetings').map(d => ({
          title: d.title,
          date: formatDateStr(d.date),
          url: d.url
        })),
        grades: studentDocs.filter(d => d.category === 'grades').map(d => ({
          title: d.title,
          date: formatDateStr(d.date),
          url: d.url
        })),
        homework: studentDocs.filter(d => d.category === 'homework').map(d => ({
          title: d.title,
          date: formatDateStr(d.date),
          url: d.url
        }))
      },
      schoolingResults: studentSchooling.map(s => ({
        title: s.title,
        date: formatDateStr(s.date),
        url: s.url
      }))
    };
  });

  return { success: true, data: result };
}

function getStudent(id) {
  const allData = getAllStudents();
  if (!allData.success) return allData;
  const student = allData.data.find(s => s.id === id);
  if (!student) return { success: false, error: '生徒が見つかりません' };
  return { success: true, data: student };
}

// =============================================
// データ書き込み関数
// =============================================

function addStudent(student) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('生徒');

  // ID生成（ひらがな名前からハイフン区切り、または手動指定）
  const id = student.id || generateId(student.name);

  // 重複チェック
  const existing = sheetToObjects(sheet);
  if (existing.some(s => s.id === id)) {
    return { success: false, error: 'このIDは既に存在します' };
  }

  // Driveフォルダ自動作成
  let driveFolder = student.driveFolder || '';
  if (!driveFolder) {
    try {
      const folderResult = createStudentFolder({ studentId: id, name: student.name || id });
      if (folderResult.success) {
        driveFolder = folderResult.folderUrl;
      }
    } catch (e) {
      // フォルダ作成失敗しても生徒追加は続行
    }
  }

  sheet.appendRow([
    id,
    student.name || '',
    student.nameKana || '',
    student.grade || '',
    student.school || '',
    student.enrollDate || '',
    student.iconColor || '#6C63FF',
    student.memo || '',
    (student.subjects || []).join(','),
    driveFolder
  ]);

  return { success: true, id: id, driveFolder: driveFolder };
}

function updateStudent(student) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('生徒');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');

  // avatarUrlカラムが無ければ追加
  let avatarCol = headers.indexOf('avatarUrl');
  if (avatarCol === -1) {
    const nextCol = headers.length + 1;
    sheet.getRange(1, nextCol).setValue('avatarUrl');
    avatarCol = headers.length;
    headers.push('avatarUrl');
  }

  // 更新対象フィールド一覧
  const fields = ['name', 'nameKana', 'grade', 'school', 'enrollDate', 'iconColor', 'memo', 'subjects', 'driveFolder', 'avatarUrl'];

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === student.id) {
      const row = i + 1;

      for (const field of fields) {
        // 送信データにフィールドが含まれている場合のみ更新（部分更新対応）
        if (student.hasOwnProperty(field)) {
          const col = headers.indexOf(field);
          if (col === -1) continue;

          let value = student[field];
          if (field === 'subjects' && Array.isArray(value)) {
            value = value.join(',');
          }
          if (field === 'iconColor' && !value) value = '#6C63FF';

          sheet.getRange(row, col + 1).setValue(value || '');
        }
      }

      return { success: true };
    }
  }

  return { success: false, error: '生徒が見つかりません' };
}

function deleteStudent(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 生徒シートから削除
  deleteRowsByStudentId(ss.getSheetByName('生徒'), 'id', id);
  // 関連データも削除
  deleteRowsByStudentId(ss.getSheetByName('書類'), 'studentId', id);
  deleteRowsByStudentId(ss.getSheetByName('学習歴'), 'studentId', id);
  deleteRowsByStudentId(ss.getSheetByName('スクーリング'), 'studentId', id);

  return { success: true };
}

function addDocument(doc) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('書類');
  sheet.appendRow([
    doc.studentId,
    doc.category,
    doc.title,
    doc.date || '',
    doc.url || ''
  ]);
  return { success: true };
}

function deleteDocument(rowIndex) {
  return deleteRowByIndex('書類', rowIndex);
}

function addHistory(history) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('学習歴');
  sheet.appendRow([
    history.studentId,
    history.date || '',
    history.event || ''
  ]);
  return { success: true };
}

function deleteHistory(rowIndex) {
  return deleteRowByIndex('学習歴', rowIndex);
}

function addSchooling(schooling) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('スクーリング');
  sheet.appendRow([
    schooling.studentId,
    schooling.title || '',
    schooling.date || '',
    schooling.url || ''
  ]);
  return { success: true };
}

function deleteSchooling(rowIndex) {
  return deleteRowByIndex('スクーリング', rowIndex);
}

// =============================================
// ユーティリティ関数
// =============================================

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const objects = [];

  for (let i = 1; i < data.length; i++) {
    const obj = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = data[i][j];
        if (data[i][j] !== '' && data[i][j] !== null) hasData = true;
      }
    }
    if (hasData) objects.push(obj);
  }

  return objects;
}

function formatDateStr(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = ('0' + (value.getMonth() + 1)).slice(-2);
    const d = ('0' + value.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
  return String(value);
}

function generateId(name) {
  // 名前からIDを生成（スペースをハイフンに、全角を半角に）
  return name
    .replace(/\s+/g, '-')
    .replace(/　/g, '-')
    .toLowerCase();
}

function deleteRowsByStudentId(sheet, columnName, id) {
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const col = headers.indexOf(columnName);
  if (col === -1) return;

  // 下から削除（インデックスずれ防止）
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][col] === id) {
      sheet.deleteRow(i + 1);
    }
  }
}

function deleteRowByIndex(sheetName, rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'シートが見つかりません' };

  const ri = parseInt(rowIndex);
  if (ri < 2 || ri > sheet.getLastRow()) {
    return { success: false, error: '無効な行インデックスです' };
  }

  sheet.deleteRow(ri);
  return { success: true };
}

// =============================================
// Google Drive フォルダ作成
// =============================================

const PARENT_FOLDER_ID = '1gzVjIqVFvpohsp6OQPPjfUJpPBb-KTv7';

function createStudentFolder(data) {
  try {
    const studentId = data.studentId;
    const studentName = data.name || studentId;

    // 既にフォルダが設定されているかチェック
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('生徒');
    const students = sheetToObjects(sheet);
    const student = students.find(s => s.id === studentId);

    if (student && student.driveFolder) {
      return { success: true, folderUrl: student.driveFolder, message: '既にフォルダが設定されています' };
    }

    // 親フォルダを取得
    const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);

    // 同名フォルダが既にあるかチェック
    const existingFolders = parentFolder.getFoldersByName(studentName);
    let folder;
    if (existingFolders.hasNext()) {
      folder = existingFolders.next();
    } else {
      folder = parentFolder.createFolder(studentName);
    }

    const folderUrl = 'https://drive.google.com/drive/folders/' + folder.getId();

    // 生徒シートの driveFolder を更新
    if (student) {
      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const idCol = headers.indexOf('id');
      const driveFolderCol = headers.indexOf('driveFolder');

      if (idCol !== -1 && driveFolderCol !== -1) {
        for (let i = 1; i < allData.length; i++) {
          if (allData[i][idCol] === studentId) {
            sheet.getRange(i + 1, driveFolderCol + 1).setValue(folderUrl);
            break;
          }
        }
      }
    }

    return { success: true, folderUrl: folderUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// --- 全生徒のDriveフォルダ一括作成 ---
function bulkCreateFolders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('生徒');
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const idCol = headers.indexOf('id');
    const nameCol = headers.indexOf('name');
    const driveFolderCol = headers.indexOf('driveFolder');

    if (idCol === -1 || nameCol === -1 || driveFolderCol === -1) {
      return { success: false, error: '必要なカラムが見つかりません' };
    }

    const parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    const created = [];

    for (let i = 1; i < allData.length; i++) {
      const id = allData[i][idCol];
      const name = allData[i][nameCol];
      const existingFolder = allData[i][driveFolderCol];

      if (!id || !name) continue;
      if (existingFolder && String(existingFolder).trim() !== '') continue;

      // フォルダ作成
      const existingFolders = parentFolder.getFoldersByName(name);
      let folder;
      if (existingFolders.hasNext()) {
        folder = existingFolders.next();
      } else {
        folder = parentFolder.createFolder(name);
      }

      const folderUrl = 'https://drive.google.com/drive/folders/' + folder.getId();
      sheet.getRange(i + 1, driveFolderCol + 1).setValue(folderUrl);
      created.push(name);
    }

    return { success: true, created: created, count: created.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// =============================================
// ファイルアップロード（Google Drive）
// =============================================

function uploadFileToDrive(data) {
  try {
    const studentId = data.studentId;
    const category = data.category;
    const title = data.title || data.fileName;
    const fileName = data.fileName;
    const fileBase64 = data.fileData;
    const date = data.date || Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');

    // base64 → Blob
    const decoded = Utilities.base64Decode(fileBase64);
    const blob = Utilities.newBlob(decoded, data.mimeType || 'application/octet-stream', fileName);

    // 生徒のDriveフォルダを取得
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const studentsSheet = ss.getSheetByName('生徒');
    const students = sheetToObjects(studentsSheet);
    const student = students.find(s => s.id === studentId);

    let folder;
    if (student && student.driveFolder) {
      // DriveフォルダURLからID抽出
      const folderId = extractDriveFolderId(student.driveFolder);
      if (folderId) {
        try {
          folder = DriveApp.getFolderById(folderId);
        } catch (e) {
          // フォルダアクセス失敗時は自動作成
          const created = createStudentFolder({ studentId: studentId, name: student.name || studentId });
          if (created.success) {
            folder = DriveApp.getFolderById(extractDriveFolderId(created.folderUrl));
          } else {
            folder = DriveApp.getRootFolder();
          }
        }
      } else {
        folder = DriveApp.getRootFolder();
      }
    } else {
      // フォルダ未設定 → 自動作成
      const studentName = student ? student.name : studentId;
      const created = createStudentFolder({ studentId: studentId, name: studentName });
      if (created.success) {
        folder = DriveApp.getFolderById(extractDriveFolderId(created.folderUrl));
      } else {
        folder = DriveApp.getRootFolder();
      }
    }

    // ファイルをアップロード
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // アバターの場合は直接表示可能なURLを返す
    let fileUrl;
    if (category === 'avatar') {
      fileUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    } else {
      fileUrl = file.getUrl();
    }

    // 書類シートに記録（アバターは記録しない）
    if (category !== 'avatar') {
      const docsSheet = ss.getSheetByName('書類');
      docsSheet.appendRow([studentId, category, title, date, fileUrl]);
    }

    return { success: true, url: fileUrl, title: title };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function extractDriveFolderId(url) {
  if (!url) return null;
  // パターン1: id=XXXXX
  let match = url.match(/[?&]id=([^&]+)/);
  if (match) return match[1];
  // パターン2: /folders/XXXXX
  match = url.match(/\/folders\/([^?&/]+)/);
  if (match) return match[1];
  return null;
}

// DriveファイルURLからファイルIDを抽出
function extractDriveFileId(url) {
  if (!url) return null;
  // パターン1: /file/d/XXXXX
  let match = url.match(/\/file\/d\/([^?&/]+)/);
  if (match) return match[1];
  // パターン2: id=XXXXX
  match = url.match(/[?&]id=([^&]+)/);
  if (match) return match[1];
  // パターン3: /open?id=XXXXX
  match = url.match(/\/open\?id=([^&]+)/);
  if (match) return match[1];
  return null;
}

// --- 書類タイトル変更（Drive連携） ---
function renameDoc(studentId, category, oldTitle, newTitle) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('書類');
  if (!sheet) return { success: false, error: 'シートが見つかりません' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('studentId');
  const catCol = headers.indexOf('category');
  const titleCol = headers.indexOf('title');
  const urlCol = headers.indexOf('url');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === studentId &&
        data[i][catCol] === category &&
        data[i][titleCol] === oldTitle) {
      // スプレッドシートのタイトルを更新
      sheet.getRange(i + 1, titleCol + 1).setValue(newTitle);

      // Google Driveのファイル名も変更
      try {
        const fileUrl = data[i][urlCol];
        const fileId = extractDriveFileId(fileUrl);
        if (fileId) {
          const file = DriveApp.getFileById(fileId);
          // 拡張子を保持
          const currentName = file.getName();
          const extMatch = currentName.match(/\.[^.]+$/);
          const ext = extMatch ? extMatch[0] : '';
          // 新しいタイトルに拡張子が含まれていなければ付与
          const newFileName = newTitle.match(/\.[^.]+$/) ? newTitle : newTitle + ext;
          file.setName(newFileName);
        }
      } catch (e) {
        // Driveの変更に失敗してもシートの変更は成功とする
      }

      return { success: true };
    }
  }
  return { success: false, error: '該当する書類が見つかりません' };
}

// --- 書類をキーで削除（Drive連携） ---
function deleteDocByKey(studentId, category, title) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('書類');
  if (!sheet) return { success: false, error: 'シートが見つかりません' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('studentId');
  const catCol = headers.indexOf('category');
  const titleCol = headers.indexOf('title');
  const urlCol = headers.indexOf('url');

  // 下から削除（インデックスずれ防止）
  let deleted = false;
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] === studentId &&
        data[i][catCol] === category &&
        data[i][titleCol] === title) {

      // Google Driveのファイルも削除（ゴミ箱へ移動）
      try {
        const fileUrl = data[i][urlCol];
        const fileId = extractDriveFileId(fileUrl);
        if (fileId) {
          DriveApp.getFileById(fileId).setTrashed(true);
        }
      } catch (e) {
        // Driveの削除に失敗してもシートからは削除する
      }

      sheet.deleteRow(i + 1);
      deleted = true;
      break; // 1件だけ削除
    }
  }

  if (deleted) return { success: true };
  return { success: false, error: '該当する書類が見つかりません' };
}

// --- スクーリングをキーで削除 ---
function deleteSchoolingByKey(studentId, title) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('スクーリング');
  if (!sheet) return { success: false, error: 'シートが見つかりません' };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('studentId');
  const titleCol = headers.indexOf('title');

  let deleted = false;
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] === studentId && data[i][titleCol] === title) {
      sheet.deleteRow(i + 1);
      deleted = true;
      break;
    }
  }

  if (deleted) return { success: true };
  return { success: false, error: '該当するスクーリング結果が見つかりません' };
}

// =============================================
// 初期セットアップ関数（1回だけ実行）
// =============================================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 生徒シート
  let sheet = ss.getSheetByName('生徒');
  if (!sheet) {
    sheet = ss.insertSheet('生徒');
    sheet.appendRow(['id', 'name', 'nameKana', 'grade', 'school', 'enrollDate', 'iconColor', 'memo', 'subjects', 'driveFolder']);
    // サンプルデータ
    sheet.appendRow(['yamada-taro', '山田 太郎', 'やまだ たろう', '中学3年', '相生中学校', '2024-04-01', '#6C63FF', '数学が得意。英語の長文読解に課題あり。', '数学,英語,国語,理科', 'https://drive.google.com/open?id=1NbE--Vl6MkomJNAkNJjKpJj-Bj7HFlsg&usp=drive_fs']);
    sheet.appendRow(['sato-hanako', '佐藤 花子', 'さとう はなこ', '中学2年', '第一中学校', '2024-09-01', '#FF6B9D', '英語が得意。数学の図形問題に苦手意識あり。', '数学,英語', 'https://drive.google.com/open?id=1NbE--Vl6MkomJNAkNJjKpJj-Bj7HFlsg&usp=drive_fs']);
    sheet.appendRow(['suzuki-ken', '鈴木 健', 'すずき けん', '高校1年', '県立B高校', '2025-04-01', '#00D4AA', '高校入学を機に入塾。理系志望。', '数学,英語,物理', 'https://drive.google.com/open?id=1gzVjIqVFvpohsp6OQPPjfUJpPBb-KTv7&usp=drive_fs']);
  }

  // 書類シート
  sheet = ss.getSheetByName('書類');
  if (!sheet) {
    sheet = ss.insertSheet('書類');
    sheet.appendRow(['studentId', 'category', 'title', 'date', 'url']);
    // サンプルデータ
    sheet.appendRow(['yamada-taro', 'meetings', '入塾面談', '2024-04-01', '#']);
    sheet.appendRow(['yamada-taro', 'meetings', '第1回定期面談', '2024-07-10', '#']);
    sheet.appendRow(['yamada-taro', 'grades', '1学期中間テスト結果', '2024-06-20', '#']);
    sheet.appendRow(['yamada-taro', 'grades', '1学期期末テスト結果', '2024-07-15', '#']);
    sheet.appendRow(['yamada-taro', 'homework', '夏期講習課題一覧', '2024-07-20', '#']);
    sheet.appendRow(['sato-hanako', 'meetings', '入塾面談', '2024-09-01', '#']);
    sheet.appendRow(['sato-hanako', 'grades', '2学期期末テスト結果', '2024-12-20', '#']);
  }

  // 学習歴シート
  sheet = ss.getSheetByName('学習歴');
  if (!sheet) {
    sheet = ss.insertSheet('学習歴');
    sheet.appendRow(['studentId', 'date', 'event']);
    // サンプルデータ
    sheet.appendRow(['yamada-taro', '2024-04-01', '入塾（数学・英語）']);
    sheet.appendRow(['yamada-taro', '2024-07-20', '夏期講習受講（国語追加）']);
    sheet.appendRow(['yamada-taro', '2024-09-10', '理科追加受講開始']);
    sheet.appendRow(['sato-hanako', '2024-09-01', '入塾（数学・英語）']);
    sheet.appendRow(['sato-hanako', '2024-11-01', '期末テスト対策開始']);
    sheet.appendRow(['suzuki-ken', '2025-04-01', '入塾（数学・英語・物理）']);
  }

  // スクーリングシート
  sheet = ss.getSheetByName('スクーリング');
  if (!sheet) {
    sheet = ss.insertSheet('スクーリング');
    sheet.appendRow(['studentId', 'title', 'date', 'url']);
    // サンプルデータ
    sheet.appendRow(['yamada-taro', 'Vテスト 第1回結果', '2024-08-25', '#']);
    sheet.appendRow(['yamada-taro', 'Vテスト 第2回結果', '2024-11-17', '#']);
    sheet.appendRow(['sato-hanako', 'Vテスト 第2回結果', '2024-11-17', '#']);
  }

  SpreadsheetApp.getUi().alert('シートのセットアップが完了しました！');
}
