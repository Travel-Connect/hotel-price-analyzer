// グローバル変数
let originalData = [];
let filteredData = [];
let facilityNames = [];
let dateColumns = [];
let currentPage = 1;
const itemsPerPage = 20;
let currentChart = null;
let currentChartType = 'trend';

// 複数ファイル管理
let uploadedFiles = {};
let currentFileId = null;

// 日本の祝日データ（2024年）
const holidays = {
    '2024-01-01': '元日',
    '2024-01-08': '成人の日',
    '2024-02-11': '建国記念の日',
    '2024-02-12': '振替休日',
    '2024-02-23': '天皇誕生日',
    '2024-03-20': '春分の日',
    '2024-04-29': '昭和の日',
    '2024-05-03': '憲法記念日',
    '2024-05-04': 'みどりの日',
    '2024-05-05': 'こどもの日',
    '2024-05-06': '振替休日',
    '2024-07-15': '海の日',
    '2024-08-11': '山の日',
    '2024-08-12': '振替休日',
    '2024-09-16': '敬老の日',
    '2024-09-22': '秋分の日',
    '2024-09-23': '振替休日',
    '2024-10-14': 'スポーツの日',
    '2024-11-03': '文化の日',
    '2024-11-04': '振替休日',
    '2024-11-23': '勤労感謝の日'
};

// アラート設定
let priceAlerts = [];

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // 認証チェック
    checkAuthentication();
    initializeEventListeners();
    initializeDatePickers();
});

// 認証チェック
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.authenticated) {
            // ユーザー情報を表示
            document.getElementById('userInfo').style.display = 'flex';
            document.getElementById('userName').textContent = data.user.name;
            document.getElementById('userRole').textContent = getRoleDisplayName(data.user.role);
            
            // 権限に基づいて機能を制限
            applyPermissions(data.user.permissions);
        } else {
            // ログインページへリダイレクト
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = '/login.html';
    }
}

// ロール表示名
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': '管理者',
        'analyst': '分析担当',
        'viewer': '閲覧者'
    };
    return roleNames[role] || role;
}

// 権限適用
function applyPermissions(permissions) {
    // アップロード機能
    if (!permissions.includes('upload')) {
        document.querySelector('.upload-section').style.display = 'none';
    }
    
    // 編集機能
    if (!permissions.includes('edit')) {
        // フィルター編集を無効化
        document.querySelectorAll('input, select').forEach(el => {
            if (!el.classList.contains('readonly-allowed')) {
                el.disabled = true;
            }
        });
    }
    
    // アラート設定
    if (!permissions.includes('configure_alerts')) {
        const alertSection = document.getElementById('alertSection');
        if (alertSection) {
            alertSection.style.display = 'none';
        }
    }
}

// ログアウト
async function logout() {
    try {
        const response = await fetch('/api/auth/logout');
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/login.html?message=logout';
        }
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// イベントリスナーの設定
function initializeEventListeners() {
    // ファイルアップロード
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', handleFileUpload);
    
    // ドラッグ&ドロップ
    const uploadBox = document.querySelector('.upload-box');
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#3498db';
    });
    
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.style.borderColor = '#cbd5e0';
    });
    
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#cbd5e0';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // フィルター関連
    document.getElementById('applyFilter').addEventListener('click', applyFilters);
    document.getElementById('resetFilter').addEventListener('click', resetFilters);
    document.getElementById('selectAll').addEventListener('click', () => selectAllFacilities(true));
    document.getElementById('deselectAll').addEventListener('click', () => selectAllFacilities(false));
    
    // エクスポート
    document.getElementById('exportCsv').addEventListener('click', exportToCSV);
    document.getElementById('saveChart').addEventListener('click', saveChart);
    
    // チャートタブ
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentChartType = e.target.dataset.chart;
            updateChart();
        });
    });
    
    // 追加機能のイベントリスナー
    document.getElementById('compareBtn').addEventListener('click', compareFiles);
    document.getElementById('runPrediction').addEventListener('click', runPricePrediction);
    document.getElementById('addAlert').addEventListener('click', addPriceAlert);
    
    // 通知許可をリクエスト
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// 日付ピッカーの初期化
function initializeDatePickers() {
    flatpickr("#startDate", {
        locale: "ja",
        dateFormat: "Y-m-d",
        onChange: (selectedDates, dateStr) => {
            document.getElementById('endDate')._flatpickr.set('minDate', dateStr);
        }
    });
    
    flatpickr("#endDate", {
        locale: "ja",
        dateFormat: "Y-m-d",
        onChange: (selectedDates, dateStr) => {
            document.getElementById('startDate')._flatpickr.set('maxDate', dateStr);
        }
    });
}

// ファイルアップロード処理
function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleMultipleFiles(files);
    }
}

function handleFile(file) {
    handleMultipleFiles([file]);
}

// 複数ファイル処理
function handleMultipleFiles(files) {
    Array.from(files).forEach(async file => {
        const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        try {
            let processedData;
            
            // ファイル形式に応じて処理を分岐
            if (file.name.toLowerCase().endsWith('.csv')) {
                // CSV処理
                const csvData = await parseCSVFile(file);
                processedData = convertCSVToAppFormat(csvData);
            } else {
                // Excel処理
                const reader = new FileReader();
                const arrayBuffer = await new Promise((resolve, reject) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });
                
                const data = new Uint8Array(arrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                processedData = processFileData(jsonData);
            }
            
            uploadedFiles[fileId] = {
                name: file.name,
                data: processedData,
                uploadTime: new Date()
            };
            
            updateFileList();
            
            if (Object.keys(uploadedFiles).length === 1) {
                currentFileId = fileId;
                loadFileData(fileId);
            }
            
            if (Object.keys(uploadedFiles).length > 1) {
                showComparisonMode();
            }
        } catch (error) {
            console.error('ファイル処理エラー:', error);
            alert(`ファイル「${file.name}」の処理中にエラーが発生しました: ${error.message}`);
        }
    });
}

// CSV解析関数を追加
async function parseCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                // Shift-JISでデコード
                const decoder = new TextDecoder('shift-jis');
                const text = decoder.decode(e.target.result);
                
                // CSVをパース
                const rows = parseCSV(text);
                
                // ヘッダーマッピング
                const headers = rows[0];
                const headerMap = {};
                headers.forEach((header, index) => {
                    const cleanHeader = header.trim();
                    if (cleanHeader.includes('日時')) headerMap['timestamp'] = index;
                    else if (cleanHeader.includes('検索条件')) headerMap['searchCondition'] = index;
                    else if (cleanHeader.includes('ホテル名') || cleanHeader.includes('施設')) headerMap['hotelName'] = index;
                    else if (cleanHeader.includes('日付') && !cleanHeader.includes('日時')) headerMap['date'] = index;
                    else if (cleanHeader.includes('プラン')) headerMap['planName'] = index;
                    else if (cleanHeader.includes('部屋')) headerMap['roomType'] = index;
                    else if (cleanHeader.includes('料金') || cleanHeader.includes('価格')) headerMap['price'] = index;
                    else if (cleanHeader.includes('URL')) headerMap['url'] = index;
                });
                
                // データを変換
                const data = [];
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length < headers.length) continue;
                    
                    const record = {
                        timestamp: row[headerMap['timestamp']] || '',
                        searchCondition: row[headerMap['searchCondition']] || '',
                        hotelName: row[headerMap['hotelName']] || '',
                        date: row[headerMap['date']] || '',
                        planName: row[headerMap['planName']] || '',
                        roomType: row[headerMap['roomType']] || '',
                        price: parsePrice(row[headerMap['price']] || '0'),
                        url: row[headerMap['url']] || ''
                    };
                    
                    if (record.hotelName && record.date && record.price > 0) {
                        data.push(record);
                    }
                }
                
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
        reader.readAsArrayBuffer(file);
    });
}

// CSV文字列パーサー
function parseCSV(text) {
    const rows = [];
    const lines = text.split(/\r?\n/);
    
    for (let line of lines) {
        if (line.trim() === '') continue;
        
        const row = [];
        let inQuotes = false;
        let currentCell = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(currentCell);
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        
        row.push(currentCell);
        rows.push(row);
    }
    
    return rows;
}

// 価格パーサー
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    
    let normalized = priceStr.replace(/[０-９]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    
    normalized = normalized.replace(/[,，\s円¥￥]/g, '');
    
    const price = parseInt(normalized);
    return isNaN(price) ? 0 : price;
}

// 価格フォーマット関数（統一フォーマット）
function formatPrice(price) {
    if (!price || price === 0) return '-';
    return `¥${price.toLocaleString()}`;
}

// CSVデータをアプリ形式に変換
function convertCSVToAppFormat(csvData) {
    const hotels = [...new Set(csvData.map(d => d.hotelName))];
    const dates = [...new Set(csvData.map(d => d.date))].sort();
    
    const processedData = [];
    const metadata = {};
    
    csvData.forEach(record => {
        const formattedDate = formatDateString(record.date);
        processedData.push({
            facility: record.hotelName,
            date: formattedDate,
            price: record.price,
            available: record.price > 0,
            isHoliday: holidays.hasOwnProperty(formattedDate),
            planName: record.planName,
            roomType: record.roomType,
            url: record.url,
            timestamp: record.timestamp,
            searchCondition: record.searchCondition
        });
        
        const key = `${record.hotelName}_${formattedDate}`;
        if (!metadata[key]) {
            metadata[key] = [];
        }
        metadata[key].push({
            planName: record.planName,
            roomType: record.roomType,
            price: record.price,
            url: record.url
        });
    });
    
    return {
        raw: processedData,
        facilities: hotels,
        dates: dates.map(d => formatDateString(d)),
        metadata: metadata,
        format: 'csv'
    };
}

// 日付フォーマット関数
function formatDateString(dateStr) {
    if (!dateStr) return '';
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    
    const jpMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (jpMatch) {
        return `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`;
    }
    
    return dateStr;
}

// ファイルリストの更新
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    Object.entries(uploadedFiles).forEach(([fileId, fileInfo]) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span class="name" onclick="loadFileData('${fileId}')" style="cursor: pointer;">${fileInfo.name}</span>
            <span class="remove" onclick="removeFile('${fileId}')" style="cursor: pointer;">✕</span>
        `;
        fileList.appendChild(item);
    });
    
    updateComparisonSelects();
    updateAlertFacilitySelect();
}

// ファイルデータの処理
function processFileData(rawData) {
    const headers = rawData[0];
    const processedData = [];
    const facilities = [];
    const dates = [];
    
    // ヘッダーから日付を抽出
    for (let j = 1; j < headers.length; j++) {
        if (headers[j]) {
            dates.push(formatDate(headers[j]));
        }
    }
    
    // データを構造化
    for (let i = 1; i < rawData.length; i++) {
        const facility = rawData[i][0];
        if (!facility) continue;
        
        facilities.push(facility);
        
        for (let j = 1; j < rawData[i].length && j - 1 < dates.length; j++) {
            const price = parseFloat(rawData[i][j]) || 0;
            processedData.push({
                facility: facility,
                date: dates[j - 1],
                price: price,
                available: price > 0,
                isHoliday: holidays.hasOwnProperty(dates[j - 1])
            });
        }
    }
    
    return {
        raw: processedData,
        facilities: [...new Set(facilities)],
        dates: [...new Set(dates)].sort()
    };
}

// ファイルデータの読み込み
function loadFileData(fileId) {
    if (!uploadedFiles[fileId]) return;
    
    const fileData = uploadedFiles[fileId].data;
    originalData = fileData.raw;
    facilityNames = fileData.facilities;
    dateColumns = fileData.dates;
    filteredData = [...originalData];
    
    currentFileId = fileId;
    
    // UI要素を表示
    showDataSections();
    populateFacilityFilter();
    updateDateRangeInputs();
    renderTable();
    updateStatistics();
    updateChart();
    checkAlerts();
}

// 日付のフォーマット
function formatDate(dateValue) {
    if (typeof dateValue === 'string') {
        return dateValue;
    }
    // ExcelのシリアルナンバーをDateに変換
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
}

// データセクションの表示
function showDataSections() {
    document.getElementById('filterSection').style.display = 'block';
    document.getElementById('statsPanel').style.display = 'block';
    document.getElementById('dataSection').style.display = 'block';
    document.getElementById('analysisSection').style.display = 'block';
}

// 施設フィルターの設定
function populateFacilityFilter() {
    const facilityList = document.getElementById('facilityList');
    facilityList.innerHTML = '';
    
    facilityNames.forEach(facility => {
        const item = document.createElement('label');
        item.className = 'facility-item';
        item.innerHTML = `
            <input type="checkbox" value="${facility}" checked>
            <span>${facility}</span>
        `;
        facilityList.appendChild(item);
    });
}

// 日付範囲の設定
function updateDateRangeInputs() {
    const dates = dateColumns.map(d => new Date(d));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    document.getElementById('startDate').value = minDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = maxDate.toISOString().split('T')[0];
}

// フィルター適用
function applyFilters() {
    const startDate = new Date(document.getElementById('startDate').value);
    const endDate = new Date(document.getElementById('endDate').value);
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    const availableOnly = document.getElementById('availableOnly').checked;
    
    // 選択された施設を取得
    const selectedFacilities = [];
    document.querySelectorAll('.facility-item input:checked').forEach(checkbox => {
        selectedFacilities.push(checkbox.value);
    });
    
    filteredData = originalData.filter(item => {
        const itemDate = new Date(item.date);
        const dateInRange = itemDate >= startDate && itemDate <= endDate;
        const priceInRange = item.price >= minPrice && item.price <= maxPrice;
        const facilitySelected = selectedFacilities.includes(item.facility);
        const availabilityMatch = !availableOnly || item.available;
        
        return dateInRange && priceInRange && facilitySelected && availabilityMatch;
    });
    
    currentPage = 1;
    renderTable();
    updateStatistics();
    updateChart();
}

// フィルターリセット
function resetFilters() {
    updateDateRangeInputs();
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('availableOnly').checked = false;
    selectAllFacilities(true);
    
    filteredData = [...originalData];
    currentPage = 1;
    renderTable();
    updateStatistics();
    updateChart();
}

// 施設の全選択/全解除
function selectAllFacilities(select) {
    document.querySelectorAll('.facility-item input').forEach(checkbox => {
        checkbox.checked = select;
    });
}

// テーブルのレンダリング
function renderTable() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    
    // データをピボット形式に変換
    const pivotData = createPivotData();
    
    // 現在のファイルがCSV形式かチェック
    const currentFile = uploadedFiles[currentFileId];
    const isCSV = currentFile && currentFile.data.format === 'csv';
    
    // ヘッダー作成
    const uniqueDates = [...new Set(filteredData.map(d => d.date))].sort();
    let headerRow = '<tr><th>施設名</th>';
    
    if (isCSV) {
        headerRow += '<th>プラン数</th>';  // CSV形式の場合はプラン数カラムを追加
    }
    
    headerRow += uniqueDates.map(date => `<th class="sortable" data-date="${date}">${date}</th>`).join('') + '</tr>';
    tableHead.innerHTML = headerRow;
    
    // ボディ作成
    const facilities = Object.keys(pivotData);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageData = facilities.slice(startIdx, endIdx);
    
    const rows = pageData.map(facility => {
        let row = `<tr><td><strong>${facility}</strong></td>`;
        
        if (isCSV) {
            // プラン数を計算
            const planCount = new Set(
                filteredData
                    .filter(d => d.facility === facility && d.planName)
                    .map(d => d.planName)
            ).size;
            row += `<td>${planCount}</td>`;
        }
        
        row += uniqueDates.map(date => {
            const priceData = pivotData[facility][date];
            const currentFile = uploadedFiles[currentFileId];
            const metadata = currentFile && currentFile.data.metadata;
            const metadataKey = `${facility}_${date}`;
            
            if (isCSV && priceData && typeof priceData === 'object') {
                // CSV形式で複数プランがある場合
                const prices = priceData.prices || [];
                const plans = priceData.plans || [];
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
                
                const colorClass = getPriceColorClass(avgPrice, date);
                const priceDisplay = prices.length > 1 
                    ? `${formatPrice(minPrice)}〜${formatPrice(maxPrice)}`
                    : formatPrice(avgPrice);
                
                // ツールチップ用のデータ属性を追加
                const tooltipData = plans.map(p => `${p.roomType} - ${p.name}: ${formatPrice(p.price)}`).join('\n');
                const urls = metadata && metadata[metadataKey] ? metadata[metadataKey].map(m => m.url).filter(u => u) : [];
                const urlData = urls.length > 0 ? urls[0] : '';
                
                return `<td class="price-cell ${colorClass} has-tooltip" 
                        data-tooltip="${tooltipData}"
                        data-url="${urlData}"
                        data-facility="${facility}"
                        data-date="${date}"
                        title="${prices.length}プラン">${priceDisplay}</td>`;
            } else {
                // 通常のExcel形式
                const price = priceData || 0;
                const colorClass = getPriceColorClass(price, date);
                const urlData = metadata && metadata[metadataKey] && metadata[metadataKey][0] ? metadata[metadataKey][0].url : '';
                
                return `<td class="price-cell ${colorClass}" 
                        data-url="${urlData}"
                        data-facility="${facility}"
                        data-date="${date}">${formatPrice(price)}</td>`;
            }
        }).join('');
        
        row += '</tr>';
        return row;
    }).join('');
    
    tableBody.innerHTML = rows;
    
    // ページネーション更新
    updatePagination(facilities.length);
    
    // 価格セルのイベントリスナーを追加
    addPriceCellEventListeners();
}

// ピボットデータの作成
function createPivotData() {
    const pivot = {};
    const currentFile = uploadedFiles[currentFileId];
    const isCSV = currentFile && currentFile.data.format === 'csv';
    
    filteredData.forEach(item => {
        if (!pivot[item.facility]) {
            pivot[item.facility] = {};
        }
        
        if (isCSV && item.planName) {
            // CSV形式で複数プランがある場合
            if (!pivot[item.facility][item.date]) {
                pivot[item.facility][item.date] = {
                    prices: [],
                    plans: []
                };
            }
            pivot[item.facility][item.date].prices.push(item.price);
            pivot[item.facility][item.date].plans.push({
                name: item.planName,
                roomType: item.roomType,
                price: item.price
            });
        } else {
            // 通常のExcel形式またはプラン情報なし
            pivot[item.facility][item.date] = item.price;
        }
    });
    
    return pivot;
}

// 価格の色分けクラス
function getPriceColorClass(price, date) {
    let baseClass = '';
    
    if (price === 0) {
        baseClass = '';
    } else if (price < 10000) {
        baseClass = 'price-low';
    } else if (price < 20000) {
        baseClass = 'price-medium';
    } else if (price < 30000) {
        baseClass = 'price-high';
    } else {
        baseClass = 'price-very-high';
    }
    
    // 祝日の場合は追加クラス
    if (holidays.hasOwnProperty(date)) {
        baseClass += ' holiday-cell';
    }
    
    return baseClass;
}

// ページネーション更新
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    pagination.innerHTML = html;
}

// ページ移動
function goToPage(page) {
    currentPage = page;
    renderTable();
}

// 統計情報の更新
function updateStatistics() {
    const prices = filteredData.filter(d => d.price > 0).map(d => d.price);
    
    if (prices.length === 0) {
        document.getElementById('avgPrice').textContent = '-';
        document.getElementById('maxPriceVal').textContent = '-';
        document.getElementById('minPriceVal').textContent = '-';
        document.getElementById('priceVariation').textContent = '-';
        document.getElementById('availabilityRate').textContent = '-';
        document.getElementById('dataCount').textContent = '0件';
        return;
    }
    
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const stdDev = Math.sqrt(prices.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / prices.length);
    const variation = (stdDev / avg * 100).toFixed(1);
    const availabilityRate = (filteredData.filter(d => d.available).length / filteredData.length * 100).toFixed(1);
    
    document.getElementById('avgPrice').textContent = formatPrice(Math.round(avg));
    document.getElementById('maxPriceVal').textContent = formatPrice(max);
    document.getElementById('minPriceVal').textContent = formatPrice(min);
    document.getElementById('priceVariation').textContent = `${variation}%`;
    document.getElementById('availabilityRate').textContent = `${availabilityRate}%`;
    document.getElementById('dataCount').textContent = `${filteredData.length.toLocaleString()}件`;
    
    // フィルター条件の表示を更新
    updateFilterDisplay();
}

// フィルター条件表示を更新
function updateFilterDisplay() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const selectedFacilities = Array.from(document.querySelectorAll('.facility-item input:checked')).length;
    const totalFacilities = facilityNames.length;
    
    let filterText = [];
    
    if (startDate || endDate) {
        filterText.push(`期間: ${startDate || '開始'} 〜 ${endDate || '終了'}`);
    }
    
    if (minPrice || maxPrice) {
        const minDisplay = minPrice ? formatPrice(parseInt(minPrice)) : '最小';
        const maxDisplay = maxPrice ? formatPrice(parseInt(maxPrice)) : '最大';
        filterText.push(`価格: ${minDisplay} 〜 ${maxDisplay}`);
    }
    
    if (selectedFacilities < totalFacilities) {
        filterText.push(`施設: ${selectedFacilities}/${totalFacilities}`);
    }
    
    const filterDisplay = document.getElementById('activeFilters');
    if (filterDisplay) {
        filterDisplay.textContent = filterText.length > 0 ? filterText.join(' | ') : 'フィルターなし';
    }
}

// チャート更新
function updateChart() {
    const ctx = document.getElementById('analysisChart').getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    switch (currentChartType) {
        case 'trend':
            createTrendChart(ctx);
            break;
        case 'daily':
            createDailyAverageChart(ctx);
            break;
        case 'weekday':
            createWeekdayChart(ctx);
            break;
        case 'monthly':
            createMonthlyChart(ctx);
            break;
        case 'prediction':
            showPredictionSection();
            break;
        case 'competitor':
            createCompetitorAnalysis(ctx);
            break;
    }
}

// 価格推移チャート
function createTrendChart(ctx) {
    const facilities = [...new Set(filteredData.map(d => d.facility))].slice(0, 5); // 上位5施設
    const dates = [...new Set(filteredData.map(d => d.date))].sort();
    
    const datasets = facilities.map((facility, index) => {
        const data = dates.map(date => {
            const item = filteredData.find(d => d.facility === facility && d.date === date);
            return item ? item.price : null;
        });
        
        return {
            label: facility,
            data: data,
            borderColor: getChartColor(index),
            fill: false,
            tension: 0.1
        };
    });
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '施設別価格推移'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `¥${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// 日別平均チャート
function createDailyAverageChart(ctx) {
    const dailyData = {};
    
    filteredData.forEach(item => {
        if (item.price > 0) {
            if (!dailyData[item.date]) {
                dailyData[item.date] = [];
            }
            dailyData[item.date].push(item.price);
        }
    });
    
    const dates = Object.keys(dailyData).sort();
    const averages = dates.map(date => {
        const prices = dailyData[date];
        return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [{
                label: '日別平均価格',
                data: averages,
                backgroundColor: 'rgba(52, 152, 219, 0.6)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '日別平均価格'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `¥${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// 曜日別分析チャート
function createWeekdayChart(ctx) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayData = Array(7).fill(null).map(() => []);
    
    filteredData.forEach(item => {
        if (item.price > 0) {
            const date = new Date(item.date);
            const weekday = date.getDay();
            weekdayData[weekday].push(item.price);
        }
    });
    
    const averages = weekdayData.map(prices => {
        if (prices.length === 0) return 0;
        return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    currentChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: weekdays,
            datasets: [{
                label: '曜日別平均価格',
                data: averages,
                backgroundColor: 'rgba(231, 76, 60, 0.2)',
                borderColor: 'rgba(231, 76, 60, 1)',
                pointBackgroundColor: 'rgba(231, 76, 60, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(231, 76, 60, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '曜日別平均価格分析'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `¥${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// 月別集計チャート
function createMonthlyChart(ctx) {
    const monthlyData = {};
    
    filteredData.forEach(item => {
        if (item.price > 0) {
            const date = new Date(item.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = [];
            }
            monthlyData[monthKey].push(item.price);
        }
    });
    
    const months = Object.keys(monthlyData).sort();
    const averages = months.map(month => {
        const prices = monthlyData[month];
        return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: '月別平均価格',
                data: averages,
                backgroundColor: 'rgba(46, 204, 113, 0.2)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '月別平均価格推移'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `¥${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// チャートカラー
function getChartColor(index) {
    const colors = [
        'rgba(52, 152, 219, 1)',
        'rgba(231, 76, 60, 1)',
        'rgba(46, 204, 113, 1)',
        'rgba(155, 89, 182, 1)',
        'rgba(241, 196, 15, 1)'
    ];
    return colors[index % colors.length];
}

// CSV出力
function exportToCSV() {
    const pivotData = createPivotData();
    const facilities = Object.keys(pivotData);
    const dates = [...new Set(filteredData.map(d => d.date))].sort();
    
    let csv = '施設名,' + dates.join(',') + '\n';
    
    facilities.forEach(facility => {
        const row = [facility];
        dates.forEach(date => {
            row.push(pivotData[facility][date] || 0);
        });
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hotel_prices_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// チャート保存
function saveChart() {
    if (!currentChart) return;
    
    const link = document.createElement('a');
    link.href = currentChart.toBase64Image();
    link.download = `price_chart_${currentChartType}_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
}

// 追加機能の実装

// ファイル削除
function removeFile(fileId) {
    delete uploadedFiles[fileId];
    if (currentFileId === fileId) {
        const remainingFiles = Object.keys(uploadedFiles);
        if (remainingFiles.length > 0) {
            loadFileData(remainingFiles[0]);
        } else {
            // すべてのファイルが削除された場合
            originalData = [];
            filteredData = [];
            hideDataSections();
        }
    }
    updateFileList();
}

// 比較モード表示
function showComparisonMode() {
    document.getElementById('comparisonMode').style.display = 'block';
    updateComparisonSelects();
}

// 比較セレクトボックスの更新
function updateComparisonSelects() {
    const baseSelect = document.getElementById('baseFile');
    const compareSelect = document.getElementById('compareFile');
    
    baseSelect.innerHTML = '<option value="">基準ファイルを選択</option>';
    compareSelect.innerHTML = '<option value="">比較ファイルを選択</option>';
    
    Object.entries(uploadedFiles).forEach(([fileId, fileInfo]) => {
        baseSelect.innerHTML += `<option value="${fileId}">${fileInfo.name}</option>`;
        compareSelect.innerHTML += `<option value="${fileId}">${fileInfo.name}</option>`;
    });
}

// ファイル比較実行
function compareFiles() {
    const baseFileId = document.getElementById('baseFile').value;
    const compareFileId = document.getElementById('compareFile').value;
    
    if (!baseFileId || !compareFileId || baseFileId === compareFileId) {
        alert('異なる2つのファイルを選択してください。');
        return;
    }
    
    const baseData = uploadedFiles[baseFileId].data;
    const compareData = uploadedFiles[compareFileId].data;
    
    // 比較結果を表示
    showComparisonResults(baseData, compareData);
}

// 比較結果表示
function showComparisonResults(baseData, compareData) {
    // 実装は簡略化
    alert('比較機能は実装中です。');
}

// 予測セクション表示
function showPredictionSection() {
    document.getElementById('predictionSection').style.display = 'block';
    document.getElementById('alertSection').style.display = 'block';
}

// 価格予測実行
function runPricePrediction() {
    const days = parseInt(document.getElementById('predictionDays').value);
    const method = document.getElementById('predictionMethod').value;
    
    if (!currentFileId || !filteredData.length) {
        alert('予測を実行するにはデータが必要です。');
        return;
    }
    
    const predictions = calculatePredictions(filteredData, days, method);
    displayPredictionResults(predictions);
}

// 予測計算（簡易版）
function calculatePredictions(data, days, method) {
    const facilities = [...new Set(data.map(d => d.facility))].slice(0, 3);
    const predictions = {};
    
    facilities.forEach(facility => {
        const facilityData = data.filter(d => d.facility === facility && d.price > 0);
        if (facilityData.length < 7) return;
        
        const prices = facilityData.slice(-14).map(d => d.price);
        const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        predictions[facility] = [];
        for (let i = 1; i <= days; i++) {
            predictions[facility].push({
                day: i,
                price: Math.round(avg * (1 + (Math.random() - 0.5) * 0.2))
            });
        }
    });
    
    return predictions;
}

// 予測結果表示
function displayPredictionResults(predictions) {
    const resultsDiv = document.getElementById('predictionResults');
    let html = '<h3>予測結果</h3>';
    
    Object.entries(predictions).forEach(([facility, preds]) => {
        html += `<h4>${facility}</h4>`;
        html += '<ul>';
        preds.slice(0, 7).forEach(pred => {
            html += `<li>${pred.day}日後: ¥${pred.price.toLocaleString()}</li>`;
        });
        html += '</ul>';
    });
    
    resultsDiv.innerHTML = html;
}

// 競合比較分析
function createCompetitorAnalysis(ctx) {
    const facilities = [...new Set(filteredData.map(d => d.facility))];
    
    // 施設の平均価格を計算
    const avgPrices = facilities.map(facility => {
        const prices = filteredData.filter(d => d.facility === facility && d.price > 0).map(d => d.price);
        return {
            facility: facility,
            avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0
        };
    }).sort((a, b) => b.avgPrice - a.avgPrice);
    
    currentChart = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: avgPrices.map(d => d.facility),
            datasets: [{
                label: '平均価格',
                data: avgPrices.map(d => d.avgPrice),
                backgroundColor: avgPrices.map((_, i) => 
                    i < 3 ? 'rgba(231, 76, 60, 0.6)' : 'rgba(52, 152, 219, 0.6)'
                )
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '施設別平均価格ランキング'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `¥${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

// アラート設定
function addPriceAlert() {
    const facilities = Array.from(document.getElementById('alertFacility').selectedOptions)
        .map(opt => opt.value);
    const condition = document.getElementById('alertCondition').value;
    const threshold = parseFloat(document.getElementById('alertThreshold').value);
    
    if (facilities.length === 0 || !threshold) {
        alert('施設と閾値を設定してください。');
        return;
    }
    
    const alert = {
        id: Date.now(),
        facilities: facilities,
        condition: condition,
        threshold: threshold,
        created: new Date(),
        triggered: false
    };
    
    priceAlerts.push(alert);
    updateAlertList();
    checkAlerts();
}

// アラートリスト更新
function updateAlertList() {
    const alertsDiv = document.getElementById('activeAlerts');
    alertsDiv.innerHTML = priceAlerts.map(alert => `
        <div class="alert-item ${alert.triggered ? 'triggered' : ''}">
            <span>${alert.facilities.join(', ')} - ${alert.condition} - ${alert.threshold}</span>
            <button onclick="removeAlert(${alert.id})">削除</button>
        </div>
    `).join('');
}

// アラートチェック
function checkAlerts() {
    if (!filteredData.length) return;
    
    priceAlerts.forEach(alert => {
        alert.triggered = false;
        
        alert.facilities.forEach(facility => {
            const recentPrices = filteredData
                .filter(d => d.facility === facility && d.price > 0)
                .slice(-7)
                .map(d => d.price);
            
            if (recentPrices.length === 0) return;
            
            const latestPrice = recentPrices[recentPrices.length - 1];
            
            switch (alert.condition) {
                case 'above':
                    if (latestPrice > alert.threshold) {
                        alert.triggered = true;
                    }
                    break;
                case 'below':
                    if (latestPrice < alert.threshold) {
                        alert.triggered = true;
                    }
                    break;
            }
        });
    });
    
    updateAlertList();
}

// アラート削除
function removeAlert(alertId) {
    priceAlerts = priceAlerts.filter(a => a.id !== alertId);
    updateAlertList();
}

// アラート施設セレクト更新
function updateAlertFacilitySelect() {
    const select = document.getElementById('alertFacility');
    if (!select) return;
    
    select.innerHTML = facilityNames.map(facility => 
        `<option value="${facility}">${facility}</option>`
    ).join('');
}

// セクション非表示
function hideDataSections() {
    document.getElementById('filterSection').style.display = 'none';
    document.getElementById('statsPanel').style.display = 'none';
    document.getElementById('dataSection').style.display = 'none';
    document.getElementById('analysisSection').style.display = 'none';
    document.getElementById('predictionSection').style.display = 'none';
    document.getElementById('alertSection').style.display = 'none';
}

// 価格セルのイベントリスナーを追加
function addPriceCellEventListeners() {
    const priceCells = document.querySelectorAll('.price-cell');
    
    priceCells.forEach(cell => {
        // ホバー時のツールチップ表示
        if (cell.classList.contains('has-tooltip')) {
            cell.addEventListener('mouseenter', function(e) {
                const tooltip = document.createElement('div');
                tooltip.className = 'price-tooltip';
                tooltip.innerHTML = this.dataset.tooltip.replace(/\\n/g, '<br>');
                
                document.body.appendChild(tooltip);
                
                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + window.scrollX + 'px';
                tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                
                // ツールチップが画面外に出ないよう調整
                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.right > window.innerWidth) {
                    tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
                }
                
                this._tooltip = tooltip;
            });
            
            cell.addEventListener('mouseleave', function() {
                if (this._tooltip) {
                    this._tooltip.remove();
                    delete this._tooltip;
                }
            });
        }
        
        // クリック時のURL遷移
        if (cell.dataset.url && cell.dataset.url !== '') {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', function() {
                if (this.dataset.url && this.dataset.url !== '#') {
                    window.open(this.dataset.url, '_blank');
                }
            });
        }
    });
}

// グローバル関数として公開
window.loadFileData = loadFileData;
window.removeFile = removeFile;
window.removeAlert = removeAlert;
window.goToPage = goToPage;