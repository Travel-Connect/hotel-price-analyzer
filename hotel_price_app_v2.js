// グローバル変数
var originalData = [];
var filteredData = [];
var facilityNames = [];
var dateColumns = [];
let currentPage = 1;
const itemsPerPage = 20;
let currentChart = null;
let currentChartType = 'trend';
let isDarkMode = false;
let favorites = new Set();
let selectedFacilities = new Set();
let comparisonMode = false;
let detailData = {}; // 部屋タイプとプラン名を格納
let showMedianMode = false; // 平均/中央値表示モード
let guestCountData = { 2: null, 4: null }; // 人数別データ
let currentGuestCount = 2; // 現在選択中の人数
let touristData = null; // 観光客数データ

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// ツールチップ要素
let tooltip = null;

// 価格アラート設定
let priceAlerts = [];
let alertCheckInterval = null;

function initializeApp() {
    // ダークモード設定の復元
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        toggleDarkMode();
    }

    // お気に入りの復元
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
        favorites = new Set(JSON.parse(savedFavorites));
    }

    // 価格アラートの復元
    const savedAlerts = localStorage.getItem('priceAlerts');
    if (savedAlerts) {
        priceAlerts = JSON.parse(savedAlerts);
    }

    // ツールチップ要素の作成
    createTooltip();

    // イベントリスナーの設定
    initializeEventListeners();
    initializeDatePickers();
    initializeMultiSelect();
    initializeDragDrop();
    initializeAlertSection();
}

// イベントリスナーの初期化
function initializeEventListeners() {
    // ファイルアップロード
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    
    // 観光客数ファイルアップロード
    document.getElementById('touristFileInput').addEventListener('change', handleTouristFileUpload);
    
    // チャートタブ
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentChartType = e.currentTarget.dataset.chart;
            
            // 観光客数分析タブの場合のみ施設フィルターを表示
            if (currentChartType === 'tourist') {
                showTouristFacilityFilter();
            } else {
                hideTouristFacilityFilter();
            }
            
            updateChart();
        });
    });

    // テーブルソート
    document.addEventListener('click', (e) => {
        if (e.target.matches('.data-table th.sortable')) {
            sortTable(e.target);
        }
    });

    // 価格セルのホバーとクリックイベント（グローバルイベントを無効化して重複を防ぐ）
    // document.addEventListener('mouseover', handleCellHover);
    // document.addEventListener('mouseout', handleCellHoverOut);
    // document.addEventListener('click', handleCellClick);
}

// 日付ピッカーの初期化
function initializeDatePickers() {
    const commonConfig = {
        locale: "ja",
        dateFormat: "Y-m-d",
        animate: true
    };

    flatpickr("#startDate", {
        ...commonConfig,
        onChange: (selectedDates, dateStr) => {
            document.getElementById('endDate')._flatpickr.set('minDate', dateStr);
        }
    });
    
    flatpickr("#endDate", {
        ...commonConfig,
        onChange: (selectedDates, dateStr) => {
            document.getElementById('startDate')._flatpickr.set('maxDate', dateStr);
        }
    });
}

// マルチセレクトの初期化
function initializeMultiSelect() {
    const selectInput = document.getElementById('facilitySelectInput');
    const dropdown = document.getElementById('facilityDropdown');
    const searchInput = document.getElementById('facilitySearch');
    
    selectInput.addEventListener('click', () => {
        dropdown.classList.toggle('active');
        searchInput.focus();
    });
    
    searchInput.addEventListener('input', (e) => {
        filterFacilities(e.target.value);
    });
    
    // クリック外で閉じる
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.multiselect-wrapper')) {
            dropdown.classList.remove('active');
        }
    });
}

// ドラッグ&ドロップの初期化
function initializeDragDrop() {
    const dropzone = document.getElementById('uploadDropzone');
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.background = 'var(--primary-light)';
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.style.background = '';
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.background = '';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });
}

// ファイルアップロード処理
function handleFileUpload(e) {
    handleFiles(e.target.files);
}

async function handleFiles(files) {
    showLoading(true);
    
    try {
        for (const file of files) {
            await processFile(file);
        }
        
        // データセクションを表示
        showDataSections();
        updateFacilitySelect();
        applyFilters();
    } catch (error) {
        showError('ファイル処理エラー: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// ファイル処理
async function processFile(file) {
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt === 'csv') {
        return await processCSVFile(file);
    } else {
        return await processExcelFile(file);
    }
}

// Excel処理
async function processExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                processRawData(jsonData);
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// CSV処理
async function processCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const decoder = new TextDecoder('shift-jis');
                const text = decoder.decode(e.target.result);
                const rows = parseCSV(text);
                
                // CSVのフォーマットを判定して適切な処理を行う
                if (rows[0] && rows[0].some(header => 
                    header === 'プラン名' || 
                    header === '部屋タイプ' || 
                    header === 'ホテル名' ||
                    header.includes('URL'))) {
                    processDetailedCSVData(rows);
                } else {
                    processCSVData(rows);
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// データ処理
function processRawData(rawData) {
    const headers = rawData[0];
    const facilitiesList = [];
    const datesList = [];
    originalData = [];
    
    // 日付列を抽出
    for (let j = 1; j < headers.length; j++) {
        if (headers[j]) {
            datesList.push(formatDate(headers[j]));
        }
    }
    
    // データを構造化
    for (let i = 1; i < rawData.length; i++) {
        const facility = rawData[i][0];
        if (!facility) continue;
        
        facilitiesList.push(facility);
        
        for (let j = 1; j < rawData[i].length && j - 1 < datesList.length; j++) {
            const price = parseFloat(rawData[i][j]) || 0;
            originalData.push({
                facility: facility,
                date: datesList[j - 1],
                price: price,
                available: price > 0
            });
        }
    }
    
    facilityNames = [...new Set(facilitiesList)];
    dateColumns = datesList;
}

// 詳細情報付きCSVデータ処理
function processDetailedCSVData(rows) {
    const headers = rows[0];
    originalData = [];
    const facilitiesSet = new Set();
    const datesSet = new Set();
    detailData = {};
    
    // ヘッダーのインデックスを特定
    const headerMap = {};
    headers.forEach((header, index) => {
        const h = header.trim();
        if (h === 'ホテル名') headerMap.facility = index;
        else if (h === '日付') headerMap.date = index;
        else if (h === '料金') headerMap.price = index;
        else if (h === '部屋タイプ') headerMap.roomType = index;
        else if (h === 'プラン名') headerMap.planName = index;
        else if (h === 'URL') headerMap.url = index;
        else if (h === '取得日時') headerMap.fetchTime = index;
        else if (h === '検索条件') headerMap.searchCondition = index;
    });
    
    // 人数を検索条件から抽出
    let guestCount = 2; // デフォルト
    if (headerMap.searchCondition !== undefined && rows.length > 1) {
        const searchCondition = rows[1][headerMap.searchCondition] || '';
        const match = searchCondition.match(/大人の人数:\s*(\d+)/);
        if (match) {
            guestCount = parseInt(match[1]);
        }
    }
    
    // 人数別データを初期化
    if (!guestCountData[guestCount]) {
        guestCountData[guestCount] = [];
    }
    
    // データを処理
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;
        
        const facility = row[headerMap.facility] || '';
        const date = formatDateString(row[headerMap.date] || '');
        const price = parseFloat(row[headerMap.price]) || 0;
        const roomType = row[headerMap.roomType] || '';
        const planName = row[headerMap.planName] || '';
        
        if (facility && date && price > 0) {
            facilitiesSet.add(facility);
            datesSet.add(date);
            
            // 基本データ
            const dataItem = {
                facility: facility,
                date: date,
                price: price,
                available: true,
                roomType: roomType,
                planName: planName,
                url: row[headerMap.url] || ''
            };
            
            // 人数別データに追加
            guestCountData[guestCount].push(dataItem);
            
            // 現在の人数と一致する場合のみoriginalDataに追加
            if (guestCount === currentGuestCount) {
                originalData.push(dataItem);
            }
            
            // 詳細データを保存
            const key = `${facility}_${date}`;
            if (!detailData[key]) {
                detailData[key] = [];
            }
            detailData[key].push({
                price: price,
                roomType: roomType,
                planName: planName
            });
        }
    }
    
    facilityNames = [...facilitiesSet];
    dateColumns = [...datesSet].sort();
    
    console.log('CSV処理完了:', {
        施設数: facilityNames.length,
        日付数: dateColumns.length,
        データ件数: originalData.length
    });
}

// 日付文字列のフォーマット統一
function formatDateString(dateStr) {
    if (!dateStr) return '';
    
    // 数値の場合（Excelの日付シリアル値）
    if (typeof dateStr === 'number') {
        return excelSerialToDate(dateStr);
    }
    
    const str = dateStr.toString();
    
    // すでに正しい形式の場合
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    
    // YYYY/MM/DD形式
    if (/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(str)) {
        const parts = str.split(/[\/-]/);
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    
    // MM/DD/YYYY形式
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(str)) {
        const parts = str.split(/[\/-]/);
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    
    // M月D日形式
    const jpDateMatch = str.match(/^(\d{1,2})月(\d{1,2})日$/);
    if (jpDateMatch) {
        const year = new Date().getFullYear();
        return `${year}-${jpDateMatch[1].padStart(2, '0')}-${jpDateMatch[2].padStart(2, '0')}`;
    }
    
    // YYYY年M月D日形式
    const jpFullDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
    if (jpFullDateMatch) {
        return `${jpFullDateMatch[1]}-${jpFullDateMatch[2].padStart(2, '0')}-${jpFullDateMatch[3].padStart(2, '0')}`;
    }
    
    return str;
}

// 通常のCSVデータ処理（ピボット形式）
function processCSVData(rows) {
    if (rows.length < 2) return;
    
    const headers = rows[0];
    originalData = [];
    const facilitiesList = [];
    const datesList = [];
    
    // 最初の列が施設名、それ以降が日付と仮定
    for (let j = 1; j < headers.length; j++) {
        if (headers[j]) {
            datesList.push(formatDateString(headers[j]));
        }
    }
    
    // データを処理
    for (let i = 1; i < rows.length; i++) {
        const facility = rows[i][0];
        if (!facility) continue;
        
        facilitiesList.push(facility);
        
        for (let j = 1; j < rows[i].length && j - 1 < datesList.length; j++) {
            const price = parseFloat(rows[i][j]) || 0;
            originalData.push({
                facility: facility,
                date: datesList[j - 1],
                price: price,
                available: price > 0
            });
        }
    }
    
    facilityNames = [...new Set(facilitiesList)];
    dateColumns = datesList;
}

// 日付フォーマット
function formatDate(dateValue) {
    if (typeof dateValue === 'string') {
        return dateValue;
    }
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
}

// データセクション表示
function showDataSections() {
    document.getElementById('filterSection').style.display = 'block';
    document.getElementById('statsPanel').style.display = 'block';
    document.getElementById('dataSection').style.display = 'block';
    document.getElementById('analysisSection').style.display = 'block';
    document.getElementById('alertSection').style.display = 'block';
    
    // 日付範囲をデフォルト設定
    setDefaultDateRange();
}

// デフォルト日付範囲を設定
function setDefaultDateRange() {
    if (dateColumns && dateColumns.length > 0) {
        const sortedDates = [...dateColumns].sort();
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];
        
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            startDateInput.value = startDate;
            endDateInput.value = endDate;
            
            // Flatpickrインスタンスがある場合は更新
            if (startDateInput._flatpickr) {
                startDateInput._flatpickr.setDate(startDate);
            }
            if (endDateInput._flatpickr) {
                endDateInput._flatpickr.setDate(endDate);
            }
        }
    }
}

// 施設選択の更新
function updateFacilitySelect() {
    const optionsContainer = document.getElementById('facilityOptions');
    selectedFacilities = new Set(facilityNames);
    
    optionsContainer.innerHTML = facilityNames.map(facility => `
        <div class="multiselect-option selected" data-facility="${facility}">
            <input type="checkbox" checked>
            <span>${facility}</span>
            ${favorites.has(facility) ? '<i class="fas fa-star" style="color: var(--warning); margin-left: auto;"></i>' : ''}
        </div>
    `).join('');
    
    // イベントリスナー追加
    optionsContainer.querySelectorAll('.multiselect-option').forEach(option => {
        option.addEventListener('click', (e) => {
            if (!e.target.matches('input')) {
                const checkbox = option.querySelector('input');
                checkbox.checked = !checkbox.checked;
            }
            
            const facility = option.dataset.facility;
            if (option.querySelector('input').checked) {
                selectedFacilities.add(facility);
                option.classList.add('selected');
            } else {
                selectedFacilities.delete(facility);
                option.classList.remove('selected');
            }
            
            updateFacilitySelectText();
        });
    });
    
    updateFacilitySelectText();
    
}


// 施設選択テキスト更新
function updateFacilitySelectText() {
    const selectText = document.getElementById('facilitySelectText');
    const count = selectedFacilities.size;
    const total = facilityNames.length;
    
    if (count === total) {
        selectText.textContent = 'すべての施設';
    } else if (count === 0) {
        selectText.textContent = '施設を選択';
    } else {
        selectText.textContent = `${count}/${total} 施設`;
    }
}

// 施設フィルター
function filterFacilities(searchTerm) {
    const options = document.querySelectorAll('.multiselect-option');
    const term = searchTerm.toLowerCase();
    
    options.forEach(option => {
        const facility = option.dataset.facility.toLowerCase();
        option.style.display = facility.includes(term) ? '' : 'none';
    });
}

// Excelファイルを読み込む関数
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            reject(error);
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// 観光客数ファイルのアップロード処理
async function handleTouristFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // ファイル名を表示
    document.getElementById('touristFileName').textContent = file.name;
    
    showLoading(true);
    
    try {
        let data;
        
        if (file.name.endsWith('.csv')) {
            // CSVファイルの場合
            data = await readCSVFile(file);
        } else {
            // Excelファイルの場合
            data = await readExcelFile(file);
        }
        
        console.log('観光客数データ構造:', data);
        processTouristData(data);
        
        // 観光客数データが読み込まれたら、分析機能を有効化
        enableTouristAnalysis();
        
    } catch (error) {
        console.error('観光客数データの読み込みエラー:', error);
        alert('観光客数データの読み込みに失敗しました。');
    } finally {
        showLoading(false);
    }
}

// CSVファイルを読み込む関数
async function readCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                
                // BOMを除去
                const cleanText = text.replace(/^\uFEFF/, '');
                
                // CSVをパース（カンマ区切り）
                const lines = cleanText.split(/\r?\n/);
                const data = lines
                    .filter(line => line.trim())
                    .map(line => {
                        // カンマで分割（引用符内のカンマは無視）
                        const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
                        return matches ? matches.map(cell => cell.replace(/^"|"$/g, '').trim()) : [];
                    });
                
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            reject(error);
        };
        
        // まずUTF-8として試す
        reader.readAsText(file, 'UTF-8');
        
        // エラー時にShift-JISとして再試行
        reader.onerror = function() {
            const reader2 = new FileReader();
            reader2.onload = function(e) {
                try {
                    const text = new TextDecoder('shift-jis').decode(e.target.result);
                    const cleanText = text.replace(/^\uFEFF/, '');
                    
                    const lines = cleanText.split(/\r?\n/);
                    const data = lines
                        .filter(line => line.trim())
                        .map(line => {
                            const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
                            return matches ? matches.map(cell => cell.replace(/^"|"$/g, '').trim()) : [];
                        });
                    
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader2.readAsArrayBuffer(file);
        };
    });
}

// 観光客数データの処理
function processTouristData(data) {
    touristData = {
        forecast: {},      // 予想データ
        actual: {},        // 実績データ（オンハンド）
        progress: {},      // 予約進捗データ
        lastYear: {},      // 前年実績
        twoYearsAgo: {}    // 一昨年実績
    };
    
    if (!data || data.length < 1) {
        console.error('データが不正です');
        return;
    }
    
    // デバッグ情報を表示
    console.log('データ全体:', data);
    console.log('データ行数:', data.length);
    console.log('最初の5行:', data.slice(0, 5));
    
    // すべてのデータを調べて最適な処理方法を決定
    let hasDateInHeader = false;
    let hasDateInFirstColumn = false;
    let dateColumnIndex = -1;
    
    // ヘッダー行を解析
    if (data.length > 0) {
        const headers = data[0];
        console.log('ヘッダー:', headers);
        
        // ヘッダーに日付があるかチェック
        for (let i = 0; i < headers.length; i++) {
            if (headers[i] && (isDateFormat(headers[i].toString()) || typeof headers[i] === 'number')) {
                hasDateInHeader = true;
                if (dateColumnIndex === -1) dateColumnIndex = i;
            }
        }
    }
    
    // 最初の列に日付があるかチェック（2行目以降）
    if (data.length > 1) {
        for (let i = 1; i < Math.min(data.length, 5); i++) {
            if (data[i] && data[i][0] && (isDateFormat(data[i][0].toString()) || typeof data[i][0] === 'number')) {
                hasDateInFirstColumn = true;
                break;
            }
        }
    }
    
    console.log('日付の位置 - ヘッダー:', hasDateInHeader, '最初の列:', hasDateInFirstColumn);
    
    // 処理方法を決定
    if (hasDateInHeader && !hasDateInFirstColumn) {
        // 横型：日付がヘッダーにある
        console.log('横型データ構造として処理');
        processHorizontalDataImproved(data);
    } else if (hasDateInFirstColumn && !hasDateInHeader) {
        // 縦型：日付が最初の列にある
        console.log('縦型データ構造として処理');
        processVerticalDataImproved(data);
    } else if (data.length === 1 || (data.length === 2 && data[0].length === 2)) {
        // 非常にシンプルなデータ
        console.log('シンプルなデータ構造として処理');
        processSimpleFormat(data);
    } else {
        // 汎用的な処理
        console.log('汎用的な処理を実行');
        processGenericFormat(data);
    }
    
    console.log('処理後の観光客数データ:', touristData);
}

// 新しいフォーマットの処理（A列が項目名、B列以降が日付ごとのデータ）
function processNewFormat(data) {
    console.log('新しいフォーマットで処理開始');
    
    // ヘッダー行（日付が入っている）
    const dateHeaders = data[0].slice(1); // B列以降
    console.log('日付ヘッダー:', dateHeaders);
    
    // データ行を処理
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        const itemName = row[0]; // A列の項目名
        if (!itemName) continue;
        
        console.log(`処理中の行 ${i}: ${itemName}`);
        
        // B列以降のデータを処理
        for (let j = 1; j < row.length && j - 1 < dateHeaders.length; j++) {
            const dateHeader = dateHeaders[j - 1];
            if (!dateHeader) continue;
            
            // 日付をフォーマット
            let formattedDate;
            if (isDateFormat(dateHeader.toString())) {
                formattedDate = formatDateString(dateHeader.toString());
            } else if (typeof dateHeader === 'number') {
                // Excelの日付シリアル値の場合
                formattedDate = excelSerialToDate(dateHeader);
            } else {
                continue;
            }
            
            const value = parseFloat(row[j]) || 0;
            
            if (value > 0) {
                const itemNameLower = itemName.toString().toLowerCase();
                
                // 項目名から種別を判定
                if (itemNameLower.includes('予測') || itemNameLower.includes('予想') || 
                    itemNameLower.includes('forecast') || itemNameLower === '予測値') {
                    touristData.forecast[formattedDate] = value;
                } else if (itemNameLower.includes('実績') || itemNameLower.includes('確定') || 
                           itemNameLower.includes('actual') || itemNameLower === '確定値') {
                    touristData.actual[formattedDate] = value;
                } else if (itemNameLower.includes('進捗') || itemNameLower.includes('オンハンド') || 
                           itemNameLower.includes('progress') || itemNameLower === 'オンハンド') {
                    touristData.progress[formattedDate] = value;
                } else {
                    // デフォルトは予測データとして扱う
                    console.log(`不明な項目名「${itemName}」を予測データとして処理`);
                    if (!touristData.forecast[formattedDate]) {
                        touristData.forecast[formattedDate] = value;
                    }
                }
            }
        }
    }
}

// シンプルなフォーマットの処理（2列：日付と値）
function processSimpleFormat(data) {
    console.log('シンプルなフォーマットで処理開始');
    
    // ヘッダーを確認
    const headers = data[0];
    const hasHeader = headers.every(h => h && isNaN(parseFloat(h)));
    
    const startRow = hasHeader ? 1 : 0;
    
    for (let i = startRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        // 日付を取得
        let date = null;
        const dateCell = row[0];
        
        if (dateCell) {
            if (typeof dateCell === 'number') {
                date = excelSerialToDate(dateCell);
            } else if (isDateFormat(dateCell.toString())) {
                date = formatDateString(dateCell.toString());
            }
        }
        
        if (!date) continue;
        
        // 値を取得
        const value = parseFloat(row[1]) || 0;
        
        if (value > 0) {
            // シンプルなフォーマットの場合、すべて予測データとして扱う
            touristData.forecast[date] = value;
        }
    }
}

// 改善された横型データの処理
function processHorizontalDataImproved(data) {
    console.log('改善された横型データ処理開始');
    
    const headers = data[0];
    let dateStartIndex = 1; // デフォルトは2列目から
    
    // 日付が始まる列を特定
    for (let i = 0; i < headers.length; i++) {
        if (headers[i] && (isDateFormat(headers[i].toString()) || typeof headers[i] === 'number')) {
            dateStartIndex = i;
            break;
        }
    }
    
    // データ行を処理
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        const itemName = row[0] || `データ${i}`;
        console.log(`処理中: ${itemName}`);
        
        // 各日付のデータを処理
        for (let j = dateStartIndex; j < headers.length && j < row.length; j++) {
            const dateValue = headers[j];
            if (!dateValue) continue;
            
            let date = formatDateString(dateValue);
            const value = parseFloat(row[j]) || 0;
            
            if (value > 0) {
                const itemNameLower = itemName.toString().toLowerCase();
                
                if (itemNameLower.includes('予測') || itemNameLower.includes('予想')) {
                    touristData.forecast[date] = value;
                } else if (itemNameLower.includes('オンハンド') || itemNameLower === 'オンハンド') {
                    touristData.actual[date] = value;
                } else if (itemNameLower.includes('前年') || itemNameLower === '前年') {
                    touristData.lastYear[date] = value;
                } else if (itemNameLower.includes('一昨年') || itemNameLower === '一昨年') {
                    touristData.twoYearsAgo[date] = value;
                } else if (itemNameLower.includes('進捗')) {
                    touristData.progress[date] = value;
                } else {
                    // デフォルトは行番号で分類
                    if (i === 1) touristData.forecast[date] = value;
                    else if (i === 2) touristData.actual[date] = value;
                    else if (i === 3) touristData.lastYear[date] = value;
                    else if (i === 4) touristData.twoYearsAgo[date] = value;
                }
            }
        }
    }
}

// 改善された縦型データの処理
function processVerticalDataImproved(data) {
    console.log('改善された縦型データ処理開始');
    
    // ヘッダーから列の意味を特定
    const headers = data[0];
    const columnMap = new Map();
    
    headers.forEach((header, index) => {
        if (!header) return;
        const h = header.toString().toLowerCase();
        
        if (h.includes('日付') || h.includes('date')) {
            columnMap.set('date', index);
        } else if (h.includes('予測') || h.includes('予想')) {
            columnMap.set('forecast', index);
        } else if (h.includes('オンハンド') || h === 'オンハンド') {
            columnMap.set('actual', index);
        } else if (h.includes('前年') || h === '前年') {
            columnMap.set('lastYear', index);
        } else if (h.includes('一昨年') || h === '一昨年') {
            columnMap.set('twoYearsAgo', index);
        } else if (h.includes('実績') || h.includes('確定')) {
            columnMap.set('actual', index);
        } else if (h.includes('進捗')) {
            columnMap.set('progress', index);
        } else if (h.includes('値') || h.includes('value')) {
            columnMap.set('value', index);
        }
    });
    
    // データ行を処理
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        let date = null;
        
        // 日付を取得
        if (columnMap.has('date')) {
            date = formatDateString(row[columnMap.get('date')]);
        } else {
            // 最初の列を日付として試す
            date = formatDateString(row[0]);
        }
        
        if (!date || date === row[0]) continue;
        
        // 各データタイプの値を取得
        if (columnMap.has('forecast')) {
            const value = parseFloat(row[columnMap.get('forecast')]) || 0;
            if (value > 0) touristData.forecast[date] = value;
        }
        
        if (columnMap.has('actual')) {
            const value = parseFloat(row[columnMap.get('actual')]) || 0;
            if (value > 0) touristData.actual[date] = value;
        }
        
        if (columnMap.has('lastYear')) {
            const value = parseFloat(row[columnMap.get('lastYear')]) || 0;
            if (value > 0) touristData.lastYear[date] = value;
        }
        
        if (columnMap.has('twoYearsAgo')) {
            const value = parseFloat(row[columnMap.get('twoYearsAgo')]) || 0;
            if (value > 0) touristData.twoYearsAgo[date] = value;
        }
        
        if (columnMap.has('progress')) {
            const value = parseFloat(row[columnMap.get('progress')]) || 0;
            if (value > 0) touristData.progress[date] = value;
        }
        
        // 単一の値列の場合
        if (columnMap.has('value') && !columnMap.has('forecast')) {
            const value = parseFloat(row[columnMap.get('value')]) || 0;
            if (value > 0) touristData.forecast[date] = value;
        }
        
        // 列が特定できない場合、2列目を値として使用
        if (columnMap.size === 1 && columnMap.has('date')) {
            const value = parseFloat(row[1]) || 0;
            if (value > 0) touristData.forecast[date] = value;
        }
    }
}

// 汎用的なフォーマット処理
function processGenericFormat(data) {
    console.log('汎用的なフォーマット処理開始');
    
    // すべてのセルを調べて日付と数値のペアを探す
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        
        for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (!cell) continue;
            
            // このセルが日付の場合
            const date = formatDateString(cell);
            if (date && date !== cell.toString()) {
                // 隣接するセルから値を探す
                for (let k = j + 1; k < row.length; k++) {
                    const value = parseFloat(row[k]);
                    if (value > 0) {
                        touristData.forecast[date] = value;
                        break;
                    }
                }
            }
        }
    }
}

// Excelの日付シリアル値を日付文字列に変換
function excelSerialToDate(serial) {
    // Excelの仕様:
    // - シリアル値 1 = 1900年1月1日
    // - シリアル値 2 = 1900年1月2日
    
    // Excelのシリアル値は1900年1月1日が1なので、
    // 基準日は1899年12月30日（シリアル値0の前日）
    const baseDate = new Date(Date.UTC(1899, 11, 30));
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    
    // serial日を加算
    const resultDate = new Date(baseDate.getTime() + serial * millisecondsPerDay);
    
    // UTC時間で年月日を取得
    const year = resultDate.getUTCFullYear();
    const month = String(resultDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(resultDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 日付形式かどうかチェック
function isDateFormat(str) {
    const datePatterns = [
        /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/,
        /^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/,
        /^\d{1,2}月\d{1,2}日$/,
        /^\d{4}年\d{1,2}月\d{1,2}日$/
    ];
    
    return datePatterns.some(pattern => pattern.test(str));
}

// 横型データの処理
function processHorizontalData(data, headers) {
    // データ行を処理
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        const dataType = row[0]; // 予測値/オンハンド/進捗/確定値等
        
        for (let j = 1; j < headers.length && j < row.length; j++) {
            const dateHeader = headers[j];
            if (!dateHeader || !isDateFormat(dateHeader.toString())) continue;
            
            const value = parseFloat(row[j]) || 0;
            
            if (value > 0) {
                const formattedDate = formatDateString(dateHeader.toString());
                
                // データタイプの判定
                const typeStr = dataType ? dataType.toString().toLowerCase() : '';
                
                if (typeStr.includes('予測') || typeStr.includes('予想')) {
                    touristData.forecast[formattedDate] = value;
                } else if (typeStr.includes('実績') || typeStr.includes('確定')) {
                    touristData.actual[formattedDate] = value;
                } else if (typeStr.includes('進捗') || typeStr.includes('オンハンド')) {
                    touristData.progress[formattedDate] = value;
                }
            }
        }
    }
}

// 縦型データの処理
function processVerticalData(data) {
    // ヘッダーから列の意味を判定
    const headers = data[0];
    let dateColIndex = -1;
    let forecastColIndex = -1;
    let actualColIndex = -1;
    let progressColIndex = -1;
    
    // 列インデックスを特定
    headers.forEach((header, index) => {
        const h = header ? header.toString().toLowerCase() : '';
        if (h.includes('日付') || h.includes('date')) {
            dateColIndex = index;
        } else if (h.includes('予測') || h.includes('予想') || h === 'forecast') {
            forecastColIndex = index;
        } else if (h.includes('実績') || h.includes('確定') || h === 'actual') {
            actualColIndex = index;
        } else if (h.includes('進捗') || h.includes('オンハンド') || h === 'progress') {
            progressColIndex = index;
        }
    });
    
    // もし列が特定できない場合、値から判断
    if (forecastColIndex === -1 && actualColIndex === -1 && progressColIndex === -1) {
        console.log('列名から特定できないため、値で判断します');
        
        // 2列目以降の数値列を順番に割り当て
        let numericColumns = [];
        for (let i = 1; i < headers.length; i++) {
            // 2行目の値をチェックして数値列を特定
            if (data.length > 1 && data[1][i]) {
                const val = parseFloat(data[1][i]);
                if (!isNaN(val)) {
                    numericColumns.push(i);
                }
            }
        }
        
        // 数値列を順番に割り当て
        if (numericColumns.length > 0) forecastColIndex = numericColumns[0];
        if (numericColumns.length > 1) actualColIndex = numericColumns[1];
        if (numericColumns.length > 2) progressColIndex = numericColumns[2];
    }
    
    // データ行を処理
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        let date = null;
        
        // 日付を探す
        if (dateColIndex >= 0 && row[dateColIndex]) {
            date = formatDateString(row[dateColIndex].toString());
        } else {
            // 日付列が特定できない場合、各セルから日付を探す
            for (let j = 0; j < row.length; j++) {
                if (row[j] && isDateFormat(row[j].toString())) {
                    date = formatDateString(row[j].toString());
                    dateColIndex = j; // 日付列を記憶
                    break;
                }
            }
        }
        
        if (!date) continue;
        
        // 各データタイプの値を取得
        if (forecastColIndex >= 0 && row[forecastColIndex]) {
            const value = parseFloat(row[forecastColIndex]) || 0;
            if (value > 0) touristData.forecast[date] = value;
        }
        
        if (actualColIndex >= 0 && row[actualColIndex]) {
            const value = parseFloat(row[actualColIndex]) || 0;
            if (value > 0) touristData.actual[date] = value;
        }
        
        if (progressColIndex >= 0 && row[progressColIndex]) {
            const value = parseFloat(row[progressColIndex]) || 0;
            if (value > 0) touristData.progress[date] = value;
        }
        
        // もしデータタイプ列がない場合、すべて予測データとして扱う
        if (forecastColIndex === -1 && actualColIndex === -1 && progressColIndex === -1) {
            for (let j = 0; j < row.length; j++) {
                if (j !== dateColIndex && row[j]) {
                    const value = parseFloat(row[j]) || 0;
                    if (value > 0) {
                        touristData.forecast[date] = value;
                        break; // 最初の数値を使用
                    }
                }
            }
        }
    }
}

// 観光客数分析機能を有効化
function enableTouristAnalysis() {
    // 新しいチャートタブを追加（既存の場合はスキップ）
    if (!document.querySelector('[data-chart="tourist"]')) {
        const chartTabs = document.querySelector('.chart-tabs');
        const touristTab = document.createElement('button');
        touristTab.className = 'chart-tab';
        touristTab.dataset.chart = 'tourist';
        touristTab.innerHTML = '<i class="fas fa-users"></i> 観光客数分析';
        chartTabs.appendChild(touristTab);
        
        // イベントリスナーを追加
        touristTab.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentChartType = 'tourist';
            // 観光客数分析用の施設フィルターを表示
            showTouristFacilityFilter();
            updateChart();
        });
    }
    
    // 観光客数統計を表示
    document.getElementById('touristStats').style.display = 'flex';
    updateTouristStatistics();
}

// 観光客数統計を更新
function updateTouristStatistics() {
    if (!touristData) return;
    
    // フィルター期間を取得
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    // 期間内の合計を計算
    let forecastTotal = 0;
    let actualTotal = 0;
    let lastYearTotal = 0;
    let twoYearsAgoTotal = 0;
    
    // データの集計
    const aggregateData = (dataObj, startDate, endDate) => {
        let total = 0;
        for (const [date, value] of Object.entries(dataObj)) {
            if ((!startDate || date >= startDate) && (!endDate || date <= endDate)) {
                total += value;
            }
        }
        return total;
    };
    
    // 各データの合計を計算
    if (touristData.forecast) {
        forecastTotal = aggregateData(touristData.forecast, startDate, endDate);
    }
    
    if (touristData.actual) {
        actualTotal = aggregateData(touristData.actual, startDate, endDate);
    }
    
    if (touristData.lastYear) {
        lastYearTotal = aggregateData(touristData.lastYear, startDate, endDate);
    }
    
    if (touristData.twoYearsAgo) {
        twoYearsAgoTotal = aggregateData(touristData.twoYearsAgo, startDate, endDate);
    }
    
    // 予想合計
    const forecastElement = document.getElementById('touristForecast');
    if (forecastElement) {
        forecastElement.textContent = forecastTotal > 0 ? forecastTotal.toLocaleString() + '人' : '-';
    }
    
    // オンハンド合計
    const actualElement = document.getElementById('touristActual');
    if (actualElement) {
        actualElement.textContent = actualTotal > 0 ? actualTotal.toLocaleString() + '人' : '-';
    }
    
    // 前年実績合計
    const lastYearElement = document.getElementById('lastYearActual');
    if (lastYearElement) {
        lastYearElement.textContent = lastYearTotal > 0 ? lastYearTotal.toLocaleString() + '人' : '-';
    }
    
    // 一昨年実績合計
    const twoYearsAgoElement = document.getElementById('twoYearsAgoActual');
    if (twoYearsAgoElement) {
        twoYearsAgoElement.textContent = twoYearsAgoTotal > 0 ? twoYearsAgoTotal.toLocaleString() + '人' : '-';
    }
    
    // ラベルも更新
    const forecastLabel = document.querySelector('#touristStats .stat-card:nth-child(1) .stat-change span');
    const actualLabel = document.querySelector('#touristStats .stat-card:nth-child(2) .stat-change span');
    const lastYearLabel = document.querySelector('#touristStats .stat-card:nth-child(3) .stat-change span');
    const twoYearsAgoLabel = document.querySelector('#touristStats .stat-card:nth-child(4) .stat-change span');
    
    if (forecastLabel) forecastLabel.textContent = '期間内の予想合計';
    if (actualLabel) actualLabel.textContent = '期間内のオンハンド合計';
    if (lastYearLabel) lastYearLabel.textContent = '期間内の前年実績合計';
    if (twoYearsAgoLabel) twoYearsAgoLabel.textContent = '期間内の一昨年実績合計';
}

// フィルター適用
function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    
    filteredData = originalData.filter(item => {
        const dateMatch = (!startDate || item.date >= startDate) && 
                         (!endDate || item.date <= endDate);
        const priceMatch = item.price >= minPrice && item.price <= maxPrice;
        const facilityMatch = selectedFacilities.has(item.facility);
        
        return dateMatch && priceMatch && facilityMatch;
    });
    
    // アクティブフィルターの表示
    updateActiveFilters();
    
    // UI更新
    currentPage = 1;
    renderTable();
    updateStatistics();
    updateChart();
    
    // 観光客数統計も更新
    if (touristData) {
        updateTouristStatistics();
    }
}

// フィルターリセット
function resetFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    
    selectedFacilities = new Set(facilityNames);
    updateFacilitySelect();
    updateFacilitySelectText();
    
    applyFilters();
}

// アクティブフィルター更新
function updateActiveFilters() {
    let activeCount = 0;
    
    if (document.getElementById('startDate').value || document.getElementById('endDate').value) activeCount++;
    if (document.getElementById('minPrice').value || document.getElementById('maxPrice').value) activeCount++;
    if (selectedFacilities.size < facilityNames.length) activeCount++;
    
    const badge = document.getElementById('activeFiltersBadge');
    const count = document.getElementById('activeFiltersCount');
    
    if (activeCount > 0) {
        badge.style.display = 'block';
        count.textContent = activeCount;
    } else {
        badge.style.display = 'none';
    }
}

// 統計情報更新
function updateStatistics() {
    const prices = filteredData.filter(d => d.price > 0).map(d => d.price);
    
    if (prices.length === 0) {
        const elementsToUpdate = {
            'avgPrice': '-',
            'maxPriceVal': '-',
            'minPriceVal': '-',
            'medianPrice': '-',
            'dataCount': '-',
            'priceVariation': '-'
        };
        
        for (const [id, value] of Object.entries(elementsToUpdate)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
        return;
    }
    
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    
    // 中央値を計算（偶数個の場合は平均に近い方を採用）
    const sortedPrices = [...prices].sort((a, b) => a - b);
    let median;
    if (sortedPrices.length % 2 === 0) {
        // 偶数個の場合、2つの中央値候補から平均に近い方を選択
        const mid1 = sortedPrices[sortedPrices.length / 2 - 1];
        const mid2 = sortedPrices[sortedPrices.length / 2];
        const diff1 = Math.abs(mid1 - avg);
        const diff2 = Math.abs(mid2 - avg);
        median = diff1 <= diff2 ? mid1 : mid2;
    } else {
        median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    }
    
    // 最高/最低価格の施設を特定
    const maxItem = filteredData.find(d => d.price === max);
    const minItem = filteredData.find(d => d.price === min);
    
    const avgPriceElement = document.getElementById('avgPrice');
    if (avgPriceElement) {
        avgPriceElement.textContent = formatPrice(Math.round(avg));
    }
    
    // 最高価格にツールチップ用の属性を追加
    const maxPriceElement = document.getElementById('maxPriceVal');
    if (maxPriceElement) {
        maxPriceElement.textContent = formatPrice(max);
        if (maxItem) {
            maxPriceElement.dataset.tooltip = `施設: ${maxItem.facility}\n日付: ${maxItem.date}\n${maxItem.roomType ? '部屋: ' + maxItem.roomType + '\n' : ''}${maxItem.planName ? 'プラン: ' + maxItem.planName : ''}`;
            maxPriceElement.classList.add('has-tooltip');
        }
    }
    
    // 最低価格にツールチップ用の属性を追加
    const minPriceElement = document.getElementById('minPriceVal');
    if (minPriceElement) {
        minPriceElement.textContent = formatPrice(min);
        if (minItem) {
            minPriceElement.dataset.tooltip = `施設: ${minItem.facility}\n日付: ${minItem.date}\n${minItem.roomType ? '部屋: ' + minItem.roomType + '\n' : ''}${minItem.planName ? 'プラン: ' + minItem.planName : ''}`;
            minPriceElement.classList.add('has-tooltip');
        }
    }
    
    // 中央値の要素が存在する場合のみ設定
    const medianElement = document.getElementById('medianPrice');
    if (medianElement) {
        medianElement.textContent = formatPrice(Math.round(median));
    }
    
    const dataCountElement = document.getElementById('dataCount');
    if (dataCountElement) {
        dataCountElement.textContent = filteredData.length.toLocaleString();
    }
    
    // 価格変動率を中央値に変更
    const priceVariationElement = document.getElementById('priceVariation');
    if (priceVariationElement) {
        priceVariationElement.textContent = formatPrice(Math.round(median));
    }
    
    const maxFacilityElement = document.getElementById('maxFacility');
    if (maxFacilityElement) {
        maxFacilityElement.textContent = maxItem ? maxItem.facility : '-';
    }
    
    const minFacilityElement = document.getElementById('minFacility');
    if (minFacilityElement) {
        minFacilityElement.textContent = minItem ? minItem.facility : '-';
    }
    
    const facilityCount = new Set(filteredData.map(d => d.facility)).size;
    const facilityCountElement = document.getElementById('facilityCount');
    if (facilityCountElement) {
        facilityCountElement.textContent = `${facilityCount}施設`;
    }
    
    // 統計値のホバーイベントを追加
    addStatHoverEvents();
}

// 統計値のホバーイベントを追加
function addStatHoverEvents() {
    document.querySelectorAll('.stat-value.has-tooltip').forEach(element => {
        element.addEventListener('mouseenter', function(e) {
            const tooltipText = this.dataset.tooltip;
            if (!tooltipText) return;
            
            const tooltip = document.createElement('div');
            tooltip.className = 'price-tooltip';
            tooltip.innerHTML = tooltipText.replace(/\n/g, '<br>');
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.left = rect.left + window.scrollX + 'px';
            tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
            
            // 画面外に出ないよう調整
            const tooltipRect = tooltip.getBoundingClientRect();
            if (tooltipRect.right > window.innerWidth) {
                tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
            }
            
            this._tooltip = tooltip;
        });
        
        element.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
                delete this._tooltip;
            }
        });
    });
}

// 価格フォーマット
function formatPrice(price) {
    if (!price || price === 0) return 'CLOSE';
    return `¥${price.toLocaleString()}`;
}

// テーブルレンダリング
function renderTable() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    
    // ピボットデータ作成
    const pivotData = createPivotData();
    const uniqueDates = [...new Set(filteredData.map(d => d.date))].sort();
    let facilities = Object.keys(pivotData);
    
    
    // ヘッダー作成
    let headerRow = '<tr><th class="sortable facility-name-column" data-sort="facility">施設名</th>';
    headerRow += uniqueDates.map(date => {
        // 曜日判定
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        const isSaturday = dayOfWeek === 6;
        const isSunday = dayOfWeek === 0;
        const isHoliday = checkIsHoliday(date);
        let dateClass = '';
        if (isSaturday) {
            dateClass = 'saturday-header';
        } else if (isSunday || isHoliday) {
            dateClass = 'sunday-holiday-header';
        }
        return `<th class="sortable date-column ${dateClass}" data-sort="${date}">${formatDisplayDate(date)}</th>`;
    }).join('');
    headerRow += '</tr>';
    tableHead.innerHTML = headerRow;
    
    // ページング
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageData = facilities.slice(startIdx, endIdx);
    
    // ボディ作成
    let rows = pageData.map(facility => {
        let row = `<tr>`;
        const displayName = facility.length > 20 ? facility.substring(0, 20) + '...' : facility;
        const titleAttr = facility.length > 20 ? `title="${facility}"` : '';
        
        row += `<td class="facility-name-cell" style="min-width: 200px; width: 200px;">
            <span class="favorite-toggle ${favorites.has(facility) ? 'active' : ''}" 
                  onclick="toggleFavorite('${facility}')" title="お気に入り">
                <i class="fas fa-star"></i>
            </span>
            <strong ${titleAttr} style="cursor: ${facility.length > 20 ? 'help' : 'default'};">${displayName}</strong>
        </td>`;
        
        row += uniqueDates.map(date => {
            const price = pivotData[facility][date] || 0;
            const priceClass = getPriceClass(price);
            const cellClass = price > 0 ? 'available' : 'unavailable';
            
            // 詳細情報をデータ属性として追加
            const detailKey = `${facility}_${date}`;
            let detailInfo = '';
            let url = '';
            
            if (detailData[detailKey] && detailData[detailKey].length > 0) {
                const details = detailData[detailKey][0]; // 最初のプラン情報を使用
                if (details.roomType || details.planName) {
                    detailInfo = `${details.roomType || ''} ${details.planName || ''}`.trim();
                }
            }
            
            // originalDataからURLを取得
            const dataItem = originalData.find(d => d.facility === facility && d.date === date && d.price === price);
            if (dataItem && dataItem.url) {
                url = dataItem.url;
            }
            
            // 表示値のフォーマット
            const displayText = formatPrice(price);
            
            return `<td class="price-cell ${cellClass} ${priceClass}" 
                    data-facility="${facility}" 
                    data-date="${date}" 
                    data-price="${price}"
                    data-detail="${detailInfo}"
                    data-url="${url}">${displayText}</td>`;
        }).join('');
        
        row += '</tr>';
        return row;
    }).join('');
    
    // 平均または中央値行を追加
    if (pageData.length > 0) {
        let statsRow = '<tr class="average-row">';
        statsRow += `<td class="facility-name-cell" style="min-width: 200px; width: 200px;"><strong>${showMedianMode ? '中央値' : '平均'}</strong></td>`;
        
        statsRow += uniqueDates.map(date => {
            // 該当日付の価格を集計
            const pricesForDate = pageData.map(facility => pivotData[facility][date] || 0).filter(p => p > 0);
            let statPrice = 0;
            
            if (pricesForDate.length > 0) {
                if (showMedianMode) {
                    // 中央値を計算（偶数個の場合は平均に近い方を採用）
                    const sorted = [...pricesForDate].sort((a, b) => a - b);
                    const avg = pricesForDate.reduce((a, b) => a + b, 0) / pricesForDate.length;
                    if (sorted.length % 2 === 0) {
                        const mid1 = sorted[sorted.length / 2 - 1];
                        const mid2 = sorted[sorted.length / 2];
                        const diff1 = Math.abs(mid1 - avg);
                        const diff2 = Math.abs(mid2 - avg);
                        statPrice = Math.round(diff1 <= diff2 ? mid1 : mid2);
                    } else {
                        statPrice = sorted[Math.floor(sorted.length / 2)];
                    }
                } else {
                    // 平均を計算
                    statPrice = Math.round(pricesForDate.reduce((a, b) => a + b, 0) / pricesForDate.length);
                }
            }
            
            // 日付のクラスを設定
            const d = new Date(date);
            const dayOfWeek = d.getDay();
            const isSaturday = dayOfWeek === 6;
            const isSunday = dayOfWeek === 0;
            const isHoliday = checkIsHoliday(date);
            let dateClass = '';
            if (isSaturday) {
                dateClass = 'saturday-cell';
            } else if (isSunday || isHoliday) {
                dateClass = 'sunday-holiday-cell';
            }
            
            return `<td class="price-cell average-cell ${dateClass}">${formatPrice(statPrice)}</td>`;
        }).join('');
        
        statsRow += '</tr>';
        rows += statsRow;
    }
    
    tableBody.innerHTML = rows;
    updatePagination(facilities.length);
    
    // 価格セルにホバーイベントを追加
    addPriceCellHoverEvents();
}

// ピボットデータ作成
function createPivotData(data) {
    const sourceData = data || filteredData;
    const pivot = {};
    
    sourceData.forEach(item => {
        if (!pivot[item.facility]) {
            pivot[item.facility] = {};
        }
        pivot[item.facility][item.date] = item.price;
    });
    
    return pivot;
}

// 価格クラス取得
function getPriceClass(price) {
    if (price === 0) return '';
    if (price < 10000) return 'low';
    if (price < 20000) return 'medium';
    return 'high';
}

// 日付表示フォーマット
function formatDisplayDate(date) {
    const d = new Date(date);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[d.getDay()];
    const dayOfWeek = d.getDay();
    const isFriday = dayOfWeek === 5;
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isHoliday = checkIsHoliday(date);
    
    let className = '';
    if (isFriday || isSaturday || isHoliday) {
        className = 'weekend-holiday';
    } else if (isSunday) {
        className = 'sunday';
    }
    
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `<span class="${className}">${month}/${day}(${weekday})</span>`;
}

// 祝日チェック（簡易版）
function checkIsHoliday(date) {
    // 2024年の祝日（実際には年度ごとに更新必要）
    const holidays2024 = [
        '2024-01-01', // 元日
        '2024-01-08', // 成人の日
        '2024-02-11', // 建国記念の日
        '2024-02-12', // 振替休日
        '2024-02-23', // 天皇誕生日
        '2024-03-20', // 春分の日
        '2024-04-29', // 昭和の日
        '2024-05-03', // 憲法記念日
        '2024-05-04', // みどりの日
        '2024-05-05', // こどもの日
        '2024-05-06', // 振替休日
        '2024-07-15', // 海の日
        '2024-08-11', // 山の日
        '2024-08-12', // 振替休日
        '2024-09-16', // 敬老の日
        '2024-09-22', // 秋分の日
        '2024-09-23', // 振替休日
        '2024-10-14', // スポーツの日
        '2024-11-03', // 文化の日
        '2024-11-04', // 振替休日
        '2024-11-23', // 勤労感謝の日
    ];
    
    // 固定祝日（月日のみで判定）
    const fixedHolidays = [
        '01-01', // 元日
        '02-11', // 建国記念の日
        '02-23', // 天皇誕生日
        '04-29', // 昭和の日
        '05-03', // 憲法記念日
        '05-04', // みどりの日
        '05-05', // こどもの日
        '08-11', // 山の日
        '11-03', // 文化の日
        '11-23', // 勤労感謝の日
    ];
    
    // 完全な日付でチェック
    if (holidays2024.includes(date)) {
        return true;
    }
    
    // 月日でチェック
    const monthDay = date.slice(5);
    return fixedHolidays.includes(monthDay);
}

// ページネーション更新
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    let html = '';
    
    // 前へボタン
    if (currentPage > 1) {
        html += `<button class="btn btn-secondary" onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;
    }
    
    // ページ番号
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="btn ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" 
                         onclick="goToPage(${i})">${i}</button>`;
    }
    
    // 次へボタン
    if (currentPage < totalPages) {
        html += `<button class="btn btn-secondary" onclick="goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>`;
    }
    
    pagination.innerHTML = html;
}

// ページ移動
function goToPage(page) {
    currentPage = page;
    renderTable();
}

// チャート更新
function updateChart() {
    try {
        const canvas = document.getElementById('analysisChart');
        if (!canvas) {
            console.error('Chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        
        // 既存の説明文を削除
        const existingDesc = document.querySelector('.chart-description');
        if (existingDesc) {
            existingDesc.remove();
        }
        
        // ヒートマップ凡例の表示/非表示
        const heatmapLegend = document.getElementById('heatmapLegend');
        if (heatmapLegend) {
            heatmapLegend.style.display = currentChartType === 'heatmap' ? 'block' : 'none';
        }
        
        // データがない場合の処理
        if (!filteredData || filteredData.length === 0) {
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText('データがありません', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        switch (currentChartType) {
            case 'trend':
                addChartDescription('選択した施設の価格推移を時系列で表示します。トレンドや季節変動を把握できます。');
                createTrendChart(ctx);
                break;
            case 'heatmap':
                addChartDescription('施設と日付の組み合わせで価格を色の濃淡で表現します。パターンを視覚的に把握できます。');
                createHeatmapChart(ctx);
                break;
        case 'distribution':
            addChartDescription('価格帯別の分布を表示します。価格設定の傾向を分析できます。');
            createDistributionChart(ctx);
            break;
        case 'weekday':
            addChartDescription('曜日別の平均価格を表示します。週末料金の傾向を把握できます。');
            createWeekdayChart(ctx);
            break;
        case 'tourist':
            if (touristData) {
                addChartDescription('観光客数の予想・実績・予約進捗と価格の相関を分析します。');
                createTouristAnalysisChart(ctx);
            } else {
                ctx.font = '16px sans-serif';
                ctx.fillStyle = '#666';
                ctx.textAlign = 'center';
                ctx.fillText('観光客数データを読み込んでください', ctx.canvas.width / 2, ctx.canvas.height / 2);
            }
            break;
        case 'forecast':
            addChartDescription('過去のデータから今後7日間の価格を予測します。移動平均を使用した簡易予測です。');
            createForecastChart(ctx);
            break;
        case 'comparison':
            addChartDescription('複数施設の価格を比較します。競合分析に活用できます。');
            createComparisonChart(ctx);
            break;
    }
    } catch (error) {
        console.error('Chart update error:', error);
        const canvas = document.getElementById('analysisChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#f44336';
            ctx.textAlign = 'center';
            ctx.fillText('チャートの表示中にエラーが発生しました', canvas.width / 2, canvas.height / 2);
        }
    }
}

// チャート説明文を追加
function addChartDescription(text) {
    const chartContainer = document.querySelector('.chart-container');
    const description = document.createElement('div');
    description.className = 'chart-description';
    description.innerHTML = `<i class="fas fa-info-circle"></i> ${text}`;
    chartContainer.insertBefore(description, chartContainer.firstChild);
}

// 価格推移チャート
function createTrendChart(ctx) {
    const facilities = [...new Set(filteredData.map(d => d.facility))].slice(0, 5);
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
            backgroundColor: getChartColor(index, 0.1),
            fill: false,
            tension: 0.1
        };
    });
    
    // 日ごとの平均価格を計算
    const avgData = dates.map(date => {
        const pricesForDate = filteredData
            .filter(d => d.date === date && d.price > 0)
            .map(d => d.price);
        
        if (pricesForDate.length === 0) return null;
        return Math.round(pricesForDate.reduce((sum, p) => sum + p, 0) / pricesForDate.length);
    });
    
    // 平均線を追加
    datasets.push({
        label: '全施設平均',
        data: avgData,
        borderColor: 'rgba(128, 128, 128, 1)',
        backgroundColor: 'rgba(128, 128, 128, 0.1)',
        borderWidth: 3,
        borderDash: [10, 5],
        fill: false,
        tension: 0.1
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
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: '施設別価格推移'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const facility = context.dataset.label;
                            const date = context.label;
                            const price = context.parsed.y;
                            
                            let tooltipText = [`${facility}: ${formatPrice(price)}`];
                            
                            // 詳細データから部屋タイプとプラン名を取得
                            const detailKey = `${facility}_${date}`;
                            if (detailData[detailKey]) {
                                const details = detailData[detailKey].find(d => d.price === price);
                                if (details) {
                                    if (details.roomType) {
                                        tooltipText.push(`部屋: ${details.roomType}`);
                                    }
                                    if (details.planName) {
                                        tooltipText.push(`プラン: ${details.planName}`);
                                    }
                                }
                            } else {
                                // 従来のデータ構造からも取得を試みる
                                const dataItem = filteredData.find(d => 
                                    d.facility === facility && 
                                    d.date === date && 
                                    d.price === price
                                );
                                
                                if (dataItem) {
                                    if (dataItem.roomType) {
                                        tooltipText.push(`部屋: ${dataItem.roomType}`);
                                    }
                                    if (dataItem.planName) {
                                        tooltipText.push(`プラン: ${dataItem.planName}`);
                                    }
                                }
                            }
                            
                            return tooltipText;
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatPrice(value)
                    }
                }
            }
        }
    });
}

// ヒートマップチャート
function createHeatmapChart(ctx) {
    const facilities = [...new Set(filteredData.map(d => d.facility))].slice(0, 10);
    const dates = [...new Set(filteredData.map(d => d.date))].sort();
    
    // 価格の最小値と最大値を計算
    const prices = filteredData.filter(d => d.price > 0).map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const data = [];
    facilities.forEach((facility, y) => {
        dates.forEach((date, x) => {
            const item = filteredData.find(d => d.facility === facility && d.date === date);
            if (item && item.price > 0) {
                data.push({
                    x: x,
                    y: y,
                    v: item.price
                });
            }
        });
    });
    
    currentChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: '価格',
                data: data,
                backgroundColor: (context) => {
                    const value = context.raw.v;
                    // 価格を0-1の範囲に正規化
                    const normalized = (value - minPrice) / (maxPrice - minPrice);
                    
                    // カラーグラデーション（青→黄→赤）
                    if (normalized < 0.5) {
                        // 青から黄へ
                        const ratio = normalized * 2;
                        const r = Math.round(255 * ratio);
                        const g = Math.round(255 * ratio);
                        const b = Math.round(255 * (1 - ratio));
                        return `rgba(${r}, ${g}, ${b}, 0.8)`;
                    } else {
                        // 黄から赤へ
                        const ratio = (normalized - 0.5) * 2;
                        const r = 255;
                        const g = Math.round(255 * (1 - ratio));
                        const b = 0;
                        return `rgba(${r}, ${g}, ${b}, 0.8)`;
                    }
                },
                pointRadius: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        stepSize: 1,
                        callback: (value) => {
                            if (Number.isInteger(value) && value >= 0 && value < dates.length) {
                                const date = dates[value];
                                const d = new Date(date);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                            }
                            return '';
                        },
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    type: 'linear',
                    ticks: {
                        stepSize: 1,
                        callback: (value) => {
                            if (Number.isInteger(value) && value >= 0 && value < facilities.length) {
                                return facilities[value];
                            }
                            return '';
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const facility = facilities[context.raw.y];
                            const date = dates[context.raw.x];
                            const price = context.raw.v;
                            return [`${facility}`, `${date}: ${formatPrice(price)}`];
                        }
                    }
                },
                title: {
                    display: true,
                    text: '価格ヒートマップ'
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                    }
                }
            }
        }
    });
}

// 価格分布チャート
function createDistributionChart(ctx) {
    const prices = filteredData.filter(d => d.price > 0).map(d => d.price);
    
    // 価格帯ごとにグループ化
    const bins = [
        { label: 'ｾ¥5,000', min: 0, max: 5000 },
        { label: '¥5,000ｾ¥10,000', min: 5000, max: 10000 },
        { label: '¥10,000ｾ¥15,000', min: 10000, max: 15000 },
        { label: '¥15,000ｾ¥20,000', min: 15000, max: 20000 },
        { label: '¥20,000ｾ¥30,000', min: 20000, max: 30000 },
        { label: '¥30,000ｾ', min: 30000, max: Infinity }
    ];
    
    const distribution = bins.map(bin => {
        return prices.filter(p => p >= bin.min && p < bin.max).length;
    });
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: bins.map(b => b.label),
            datasets: [{
                label: '件数',
                data: distribution,
                backgroundColor: 'rgba(33, 150, 243, 0.6)',
                borderColor: 'rgba(33, 150, 243, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '価格分布'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '件数'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '価格帯'
                    }
                }
            }
        }
    });
}

// 曜日別価格チャート
function createWeekdayChart(ctx) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekdayData = Array(7).fill(null).map(() => []);
    
    filteredData.forEach(item => {
        if (item.price > 0) {
            const day = new Date(item.date).getDay();
            weekdayData[day].push(item.price);
        }
    });
    
    const avgPrices = weekdayData.map(prices => {
        if (prices.length === 0) return 0;
        return prices.reduce((a, b) => a + b, 0) / prices.length;
    });
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekdays,
            datasets: [{
                label: '平均価格',
                data: avgPrices,
                backgroundColor: weekdays.map((_, i) => {
                    if (i === 0) return 'rgba(244, 67, 54, 0.6)'; // 日曜
                    if (i === 5 || i === 6) return 'rgba(255, 152, 0, 0.6)'; // 金土
                    return 'rgba(76, 175, 80, 0.6)'; // 平日
                }),
                borderColor: weekdays.map((_, i) => {
                    if (i === 0) return 'rgba(244, 67, 54, 1)';
                    if (i === 5 || i === 6) return 'rgba(255, 152, 0, 1)';
                    return 'rgba(76, 175, 80, 1)';
                }),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '曜日別平均価格'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatPrice(value)
                    }
                }
            }
        }
    });
}

// 価格予測チャート
function createForecastChart(ctx) {
    const facilities = [...new Set(filteredData.map(d => d.facility))].slice(0, 3);
    const dates = [...new Set(filteredData.map(d => d.date))].sort();
    
    // 予測日付を事前に計算
    const forecastDates = [];
    for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(dates[dates.length - 1]);
        futureDate.setDate(futureDate.getDate() + i);
        forecastDates.push(futureDate.toISOString().split('T')[0]);
    }
    
    // 簡易的な移動平均を使った予測
    const datasets = facilities.map((facility, index) => {
        const facilityData = dates.map(date => {
            const item = filteredData.find(d => d.facility === facility && d.date === date);
            return item ? item.price : null;
        });
        
        // 7日移動平均でトレンドを計算
        const trend = [];
        for (let i = 0; i < facilityData.length; i++) {
            if (i < 6) {
                trend.push(null);
            } else {
                const slice = facilityData.slice(i - 6, i + 1).filter(v => v !== null);
                if (slice.length > 0) {
                    trend.push(slice.reduce((a, b) => a + b, 0) / slice.length);
                } else {
                    trend.push(null);
                }
            }
        }
        
        // 予測値を追加（7日分）
        const lastTrendValue = trend[trend.length - 1];
        const forecastValues = [];
        
        if (lastTrendValue !== null) {
            for (let i = 1; i <= 7; i++) {
                forecastValues.push(lastTrendValue * (1 + (Math.random() - 0.5) * 0.1));
            }
        } else {
            // トレンド値がない場合は空の予測値
            for (let i = 1; i <= 7; i++) {
                forecastValues.push(null);
            }
        }
        
        return [
            {
                label: `${facility} (実績)`,
                data: facilityData,
                borderColor: getChartColor(index),
                backgroundColor: getChartColor(index, 0.1),
                fill: false
            },
            {
                label: `${facility} (トレンド)`,
                data: trend,
                borderColor: getChartColor(index),
                borderDash: [5, 5],
                fill: false
            },
            {
                label: `${facility} (予測)`,
                data: [...Array(dates.length).fill(null), ...forecastValues],
                borderColor: getChartColor(index, 0.5),
                borderDash: [2, 2],
                fill: false
            }
        ];
    }).flat();
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [...dates, ...forecastDates],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '価格予測 (簡易移動平均)'
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            xMin: dates.length - 0.5,
                            xMax: dates.length - 0.5,
                            borderColor: 'rgb(255, 99, 132)',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                content: '予測開始',
                                enabled: true,
                                position: 'top'
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatPrice(value)
                    }
                }
            }
        }
    });
}

// 比較チャート
function createComparisonChart(ctx) {
    const selectedFacilitiesList = [...selectedFacilities].slice(0, 5);
    if (selectedFacilitiesList.length < 2) {
        // 比較する施設が少ない場合
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('比較するために2つ以上の施設を選択してください', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    // 各施設の統計情報を計算
    const stats = selectedFacilitiesList.map(facility => {
        const facilityData = filteredData.filter(d => d.facility === facility && d.price > 0);
        const prices = facilityData.map(d => d.price);
        
        if (prices.length === 0) {
            return {
                facility: facility,
                avg: 0,
                min: 0,
                max: 0,
                median: 0,
                occupancyRate: 0,
                weekendPremium: 0
            };
        }
        
        // 中央値を計算
        const sortedPrices = [...prices].sort((a, b) => a - b);
        const median = sortedPrices.length % 2 === 0 
            ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
            : sortedPrices[Math.floor(sortedPrices.length / 2)];
        
        // 稼働率（価格が設定されている日の割合）
        const totalDays = [...new Set(filteredData.filter(d => d.facility === facility).map(d => d.date))].length;
        const occupancyRate = (prices.length / totalDays) * 100;
        
        // 週末プレミアム（土日の平均価格と平日の差）
        const weekendPrices = [];
        const weekdayPrices = [];
        
        facilityData.forEach(d => {
            const dayOfWeek = new Date(d.date).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                weekendPrices.push(d.price);
            } else {
                weekdayPrices.push(d.price);
            }
        });
        
        const weekendAvg = weekendPrices.length > 0 ? weekendPrices.reduce((a, b) => a + b, 0) / weekendPrices.length : 0;
        const weekdayAvg = weekdayPrices.length > 0 ? weekdayPrices.reduce((a, b) => a + b, 0) / weekdayPrices.length : 0;
        const weekendPremium = weekdayAvg > 0 ? ((weekendAvg - weekdayAvg) / weekdayAvg) * 100 : 0;
        
        return {
            facility: facility,
            avg: prices.reduce((a, b) => a + b, 0) / prices.length,
            min: Math.min(...prices),
            max: Math.max(...prices),
            median: median,
            occupancyRate: occupancyRate,
            weekendPremium: weekendPremium
        };
    });
    
    // バーチャートで比較
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stats.map(s => s.facility),
            datasets: [
                {
                    label: '平均価格',
                    data: stats.map(s => Math.round(s.avg)),
                    backgroundColor: getChartColor(0, 0.7),
                    borderColor: getChartColor(0),
                    borderWidth: 1
                },
                {
                    label: '中央値',
                    data: stats.map(s => Math.round(s.median)),
                    backgroundColor: getChartColor(1, 0.7),
                    borderColor: getChartColor(1),
                    borderWidth: 1
                },
                {
                    label: '週末プレミアム(%)',
                    data: stats.map(s => Math.round(s.weekendPremium)),
                    backgroundColor: getChartColor(2, 0.7),
                    borderColor: getChartColor(2),
                    borderWidth: 1,
                    yAxisID: 'y-percentage'
                },
                {
                    label: '稼働率(%)',
                    data: stats.map(s => Math.round(s.occupancyRate)),
                    backgroundColor: getChartColor(3, 0.7),
                    borderColor: getChartColor(3),
                    borderWidth: 1,
                    yAxisID: 'y-percentage'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '施設比較分析'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label;
                            const value = context.parsed.y;
                            
                            if (label.includes('価格') || label.includes('中央値')) {
                                return `${label}: ${formatPrice(value)}`;
                            } else {
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '施設'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '価格 (円)'
                    },
                    ticks: {
                        callback: (value) => formatPrice(value)
                    }
                },
                'y-percentage': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'パーセント (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: (value) => value + '%'
                    }
                }
            }
        }
    });
}

// 観光客数分析チャート
function createTouristAnalysisChart(ctx) {
    const dates = [...new Set(filteredData.map(d => d.date))].sort();
    
    // 日付ごとの平均価格を計算
    const avgPrices = dates.map(date => {
        const pricesForDate = filteredData.filter(d => d.date === date && d.price > 0);
        if (pricesForDate.length === 0) return null;
        return pricesForDate.reduce((sum, d) => sum + d.price, 0) / pricesForDate.length;
    });
    
    // 選択された施設の価格データを取得
    const selectedFacility = document.getElementById('touristFacilitySelect')?.value;
    let facilityPrices = null;
    if (selectedFacility) {
        facilityPrices = dates.map(date => {
            const facilityData = filteredData.find(d => d.date === date && d.facility === selectedFacility && d.price > 0);
            return facilityData ? facilityData.price : null;
        });
    }
    
    // 観光客数データを日付に合わせて取得
    const forecastData = dates.map(date => touristData.forecast[date] || null);
    const actualData = dates.map(date => touristData.actual[date] || null);
    const lastYearData = dates.map(date => touristData.lastYear[date] || null);
    const twoYearsAgoData = dates.map(date => touristData.twoYearsAgo[date] || null);
    
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(date => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
            }),
            datasets: (() => {
                const datasets = [
                    {
                        label: '平均価格',
                        data: avgPrices,
                        borderColor: 'rgba(33, 150, 243, 1)',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        yAxisID: 'y-price',
                        tension: 0.1
                    }
                ];
                
                // 選択された施設の価格を追加
                if (facilityPrices) {
                    datasets.push({
                        label: `${selectedFacility}の価格`,
                        data: facilityPrices,
                        borderColor: 'rgba(244, 67, 54, 1)',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        yAxisID: 'y-price',
                        tension: 0.1,
                        borderWidth: 3
                    });
                }
                
                // 観光客数データを追加
                datasets.push(
                    {
                        label: '観光客数（予想）',
                        data: forecastData,
                        borderColor: 'rgba(255, 152, 0, 1)',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        borderDash: [5, 5],
                        yAxisID: 'y-tourist',
                        tension: 0.1
                    },
                    {
                        label: '観光客数（オンハンド）',
                        data: actualData,
                        borderColor: 'rgba(76, 175, 80, 1)',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        yAxisID: 'y-tourist',
                        tension: 0.1
                    },
                    {
                        label: '観光客数（前年実績）',
                        data: lastYearData,
                        borderColor: 'rgba(156, 39, 176, 1)',
                        backgroundColor: 'rgba(156, 39, 176, 0.1)',
                        borderDash: [3, 3],
                        yAxisID: 'y-tourist',
                        tension: 0.1
                    },
                    {
                        label: '観光客数（一昨年実績）',
                        data: twoYearsAgoData,
                        borderColor: 'rgba(96, 125, 139, 1)',
                        backgroundColor: 'rgba(96, 125, 139, 0.1)',
                        borderDash: [5, 2],
                        yAxisID: 'y-tourist',
                        tension: 0.1
                    }
                );
                
                return datasets;
            })()
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: '観光客数と価格の相関分析'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label;
                            const value = context.parsed.y;
                            
                            if (label.includes('価格')) {
                                return `${label}: ${formatPrice(value)}`;
                            } else {
                                return `${label}: ${value ? value.toLocaleString() : '-'}人`;
                            }
                        }
                    }
                },
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日付'
                    }
                },
                'y-price': {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '平均価格 (円)'
                    },
                    ticks: {
                        callback: (value) => formatPrice(value)
                    }
                },
                'y-tourist': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '観光客数 (人)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: (value) => value.toLocaleString()
                    }
                }
            }
        }
    });
}

// チャートカラー
function getChartColor(index, opacity = 1) {
    const colors = [
        `rgba(33, 150, 243, ${opacity})`,
        `rgba(76, 175, 80, ${opacity})`,
        `rgba(255, 152, 0, ${opacity})`,
        `rgba(244, 67, 54, ${opacity})`,
        `rgba(156, 39, 176, ${opacity})`
    ];
    return colors[index % colors.length];
}

// 平均/中央値モード切り替え
function toggleMedianMode() {
    showMedianMode = !showMedianMode;
    const btn = document.getElementById('medianToggleBtn');
    btn.innerHTML = showMedianMode ? 
        '<i class="fas fa-calculator"></i> 平均表示' : 
        '<i class="fas fa-calculator"></i> 中央値表示';
    renderTable();
}

// 人数切り替え
function switchGuestCount(count) {
    currentGuestCount = parseInt(count);
    
    // 該当する人数のデータがある場合は切り替え
    if (guestCountData[currentGuestCount]) {
        originalData = guestCountData[currentGuestCount];
        applyFilters();
    } else {
        alert(`${count}名のデータがありません。`);
        // 元の人数に戻す
        document.getElementById('guestCount').value = currentGuestCount;
    }
}

// お気に入り切替
function toggleFavorite(facility) {
    if (favorites.has(facility)) {
        favorites.delete(facility);
    } else {
        favorites.add(facility);
    }
    
    localStorage.setItem('favorites', JSON.stringify([...favorites]));
    renderTable();
    updateFacilitySelect();
}

// ダークモード切替
function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    
    const icon = document.getElementById('darkModeIcon');
    icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    
    localStorage.setItem('darkMode', isDarkMode);
}


// 全画面表示切替
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.body.classList.add('fullscreen');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        document.body.classList.remove('fullscreen');
    }
}


// 比較モード切替
function toggleComparison() {
    comparisonMode = !comparisonMode;
    const panel = document.getElementById('comparisonPanel');
    panel.classList.toggle('active');
    
    if (comparisonMode) {
        updateComparisonPanel();
    }
}

// 比較パネル更新
function updateComparisonPanel() {
    const content = document.getElementById('comparisonContent');
    const selectedList = [...selectedFacilities];
    
    if (selectedList.length === 0) {
        content.innerHTML = '<p style="color: var(--text-secondary);">施設を選択してください</p>';
        return;
    }
    
    const comparisonData = selectedList.map(facility => {
        const facilityData = filteredData.filter(d => d.facility === facility && d.price > 0);
        const prices = facilityData.map(d => d.price);
        
        if (prices.length === 0) {
            return {
                facility: facility,
                avg: 0,
                min: 0,
                max: 0,
                count: 0
            };
        }
        
        return {
            facility: facility,
            avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            min: Math.min(...prices),
            max: Math.max(...prices),
            count: prices.length
        };
    });
    
    content.innerHTML = `
        <div class="comparison-table">
            <table style="width: 100%; font-size: 0.9em;">
                <thead>
                    <tr>
                        <th style="text-align: left;">施設名</th>
                        <th style="text-align: right;">平均</th>
                        <th style="text-align: right;">最低</th>
                        <th style="text-align: right;">最高</th>
                        <th style="text-align: right;">件数</th>
                    </tr>
                </thead>
                <tbody>
                    ${comparisonData.map(data => `
                        <tr>
                            <td style="font-weight: 500;">${data.facility}</td>
                            <td style="text-align: right;">${formatPrice(data.avg)}</td>
                            <td style="text-align: right; color: var(--success);">${formatPrice(data.min)}</td>
                            <td style="text-align: right; color: var(--danger);">${formatPrice(data.max)}</td>
                            <td style="text-align: right;">${data.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// CSV出力
function exportToCSV(dataToExport) {
    const exportData = dataToExport || filteredData;
    const pivotData = createPivotData(exportData);
    const facilities = Object.keys(pivotData);
    const dates = [...new Set(exportData.map(d => d.date))].sort();
    
    // ヘッダー行の作成（日付に曜日を含める）
    let csv = '施設名';
    dates.forEach(date => {
        const d = new Date(date);
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        csv += `,${date}(${weekdays[d.getDay()]})`;
    });
    csv += '\n';
    
    // データ行の作成
    facilities.forEach(facility => {
        const row = [facility];
        dates.forEach(date => {
            const price = pivotData[facility][date] || 0;
            // 価格データを正しく出力（objectではなく数値として）
            row.push(price);
        });
        csv += row.map(cell => {
            // セル内にカンマが含まれる場合はダブルクォートで囲む
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(',') + '\n';
    });
    
    // UTF-8 BOMを付けて文字化けを防ぐ
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `hotel_prices_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    // メモリリークを防ぐため、URLを解放
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
}

// チャート保存
function saveChart() {
    if (!currentChart) return;
    
    const link = document.createElement('a');
    link.href = currentChart.toBase64Image();
    link.download = `chart_${currentChartType}_${new Date().toISOString().split('T')[0]}.png`;
    link.click();
}

// ローディング表示
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// エラー表示
function showError(message) {
    // トースト通知など実装
    alert(message);
}

// CSV解析
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

// その他の関数
function exportSelection() {
    // 選択した施設のみをエクスポート
    const selectedData = filteredData.filter(d => selectedFacilities.has(d.facility));
    if (selectedData.length === 0) {
        alert('エクスポートする施設を選択してください');
        return;
    }
    
    // 選択データでCSV作成
    exportToCSV(selectedData);
}

function toggleTableView() {
    // テーブル表示の切り替え（実装予定）
    alert('表示切替機能は準備中です');
}

function resetZoom() {
    if (currentChart && currentChart.resetZoom) {
        currentChart.resetZoom();
    }
}

function toggleChartType() {
    // チャートタイプの切り替え（実装予定）
    if (currentChart) {
        const currentType = currentChart.config.type;
        const newType = currentType === 'line' ? 'bar' : 'line';
        currentChart.config.type = newType;
        currentChart.update();
    }
}

// 価格セルのホバーイベントを追加
function addPriceCellHoverEvents() {
    const priceCells = document.querySelectorAll('.price-cell:not(.average-cell)');
    
    priceCells.forEach(cell => {
        // ホバー時のツールチップ表示
        cell.addEventListener('mouseenter', function(e) {
            const detail = this.dataset.detail;
            const price = this.dataset.price;
            
            if (detail || price > 0) {
                const tooltip = document.createElement('div');
                tooltip.className = 'price-tooltip';
                
                let content = '';
                if (price > 0) {
                    content += `価格: ${formatPrice(price)}`;
                }
                if (detail) {
                    content += content ? '<br>' : '';
                    content += detail;
                }
                
                tooltip.innerHTML = content;
                document.body.appendChild(tooltip);
                
                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + window.scrollX + 'px';
                tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
                
                // 画面外に出ないよう調整
                const tooltipRect = tooltip.getBoundingClientRect();
                if (tooltipRect.right > window.innerWidth) {
                    tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
                }
                
                this._tooltip = tooltip;
            }
        });
        
        cell.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
                delete this._tooltip;
            }
        });
        
        // クリック時のURL遷移
        const url = cell.dataset.url;
        if (url && url !== '' && url !== 'undefined') {
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', function() {
                window.open(url, '_blank');
            });
        }
    });
}

// テーブルソート
function sortTable(header) {
    const sortKey = header.dataset.sort;
    const currentOrder = header.dataset.order || 'asc';
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    
    // ソート状態をリセット
    document.querySelectorAll('.data-table th').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        delete th.dataset.order;
    });
    
    // 新しいソート状態を設定
    header.classList.add(`sorted-${newOrder}`);
    header.dataset.order = newOrder;
    
    // データをソート
    const pivotData = createPivotData();
    const facilities = Object.keys(pivotData);
    
    if (sortKey === 'facility') {
        facilities.sort((a, b) => {
            return newOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
        });
    } else {
        // 日付列でソート
        facilities.sort((a, b) => {
            const priceA = pivotData[a][sortKey] || 0;
            const priceB = pivotData[b][sortKey] || 0;
            return newOrder === 'asc' ? priceA - priceB : priceB - priceA;
        });
    }
    
    // 再レンダリング
    renderTable();
}

// ツールチップの作成
function createTooltip() {
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);
}

// セルホバーイベント
function handleCellHover(e) {
    const cell = e.target.closest('.price-cell, .has-tooltip');
    if (!cell) return;
    
    if (cell.classList.contains('price-cell')) {
        const facility = cell.dataset.facility;
        const date = cell.dataset.date;
        const price = parseFloat(cell.dataset.price);
        const detail = cell.dataset.detail;
        
        if (price > 0 && detail) {
            showTooltip(e, `${detail}`);
        }
    } else if (cell.classList.contains('has-tooltip') && cell.dataset.tooltip) {
        showTooltip(e, cell.dataset.tooltip);
    }
}

// ホバーアウトイベント
function handleCellHoverOut(e) {
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// ツールチップ表示
function showTooltip(e, text) {
    if (!tooltip) return;
    
    tooltip.textContent = text;
    tooltip.style.display = 'block';
    
    const x = e.pageX + 10;
    const y = e.pageY + 10;
    
    // 画面端での位置調整
    const rect = tooltip.getBoundingClientRect();
    const adjustedX = x + rect.width > window.innerWidth ? x - rect.width - 20 : x;
    const adjustedY = y + rect.height > window.innerHeight ? y - rect.height - 20 : y;
    
    tooltip.style.left = adjustedX + 'px';
    tooltip.style.top = adjustedY + 'px';
}

// セルクリックイベント
function handleCellClick(e) {
    const cell = e.target.closest('.price-cell');
    if (!cell || !cell.dataset.url) return;
    
    const url = cell.dataset.url;
    if (url && url !== 'undefined' && url !== '') {
        window.open(url, '_blank');
    }
}

// アラートセクションの初期化
function initializeAlertSection() {
    // アラート追加ボタンのイベントリスナー
    const addAlertBtn = document.getElementById('addAlertBtn');
    if (addAlertBtn) {
        addAlertBtn.addEventListener('click', showAddAlertDialog);
    }
    
    // 既存のアラートを表示
    displayAlerts();
    
    // アラート監視を開始
    startAlertMonitoring();
}

// アラート追加ダイアログ表示
function showAddAlertDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'alert-dialog';
    dialog.innerHTML = `
        <div class="alert-dialog-content">
            <h3>価格アラートの追加</h3>
            <div class="form-group">
                <label>施設</label>
                <select id="alertFacility">
                    ${facilityNames.map(f => `<option value="${f}">${f}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>条件</label>
                <select id="alertCondition">
                    <option value="below">以下</option>
                    <option value="above">以上</option>
                </select>
            </div>
            <div class="form-group">
                <label>価格</label>
                <input type="number" id="alertPrice" placeholder="例: 10000">
            </div>
            <div class="dialog-buttons">
                <button class="btn btn-primary" onclick="addAlert()">追加</button>
                <button class="btn btn-secondary" onclick="closeAlertDialog()">キャンセル</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

// アラート追加
function addAlert() {
    const facility = document.getElementById('alertFacility').value;
    const condition = document.getElementById('alertCondition').value;
    const price = parseFloat(document.getElementById('alertPrice').value);
    
    if (!price || price <= 0) {
        alert('正しい価格を入力してください');
        return;
    }
    
    const alert = {
        id: Date.now(),
        facility: facility,
        condition: condition,
        price: price,
        active: true,
        created: new Date().toISOString()
    };
    
    priceAlerts.push(alert);
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
    
    closeAlertDialog();
    displayAlerts();
    checkAlerts();
}

// アラートダイアログを閉じる
function closeAlertDialog() {
    const dialog = document.querySelector('.alert-dialog');
    if (dialog) {
        dialog.remove();
    }
}

// アラート表示
function displayAlerts() {
    const alertList = document.getElementById('alertList');
    if (!alertList) return;
    
    if (priceAlerts.length === 0) {
        alertList.innerHTML = '<p class="no-alerts">アラートが設定されていません</p>';
        return;
    }
    
    alertList.innerHTML = priceAlerts.map(alert => `
        <div class="alert-item ${alert.active ? 'active' : 'inactive'}">
            <div class="alert-info">
                <strong>${alert.facility}</strong>
                <span>価格が ¥${alert.price.toLocaleString()} ${alert.condition === 'below' ? '以下' : '以上'}</span>
            </div>
            <div class="alert-actions">
                <button class="btn btn-sm ${alert.active ? 'btn-warning' : 'btn-success'}" 
                        onclick="toggleAlert(${alert.id})">
                    ${alert.active ? '一時停止' : '有効化'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteAlert(${alert.id})">
                    削除
                </button>
            </div>
        </div>
    `).join('');
}

// アラートの有効/無効切り替え
function toggleAlert(id) {
    const alert = priceAlerts.find(a => a.id === id);
    if (alert) {
        alert.active = !alert.active;
        localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
        displayAlerts();
    }
}

// アラート削除
function deleteAlert(id) {
    if (confirm('このアラートを削除しますか？')) {
        priceAlerts = priceAlerts.filter(a => a.id !== id);
        localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
        displayAlerts();
    }
}

// アラート監視開始
function startAlertMonitoring() {
    // 5分ごとにチェック
    alertCheckInterval = setInterval(checkAlerts, 5 * 60 * 1000);
    
    // 初回チェック
    checkAlerts();
}

// アラートチェック
function checkAlerts() {
    if (!filteredData || filteredData.length === 0) return;
    
    // アクティブなアラートがない場合は何もしない
    const activeAlerts = priceAlerts.filter(a => a.active);
    if (activeAlerts.length === 0) return;
    
    const notifications = [];
    let checkedCount = 0;
    
    activeAlerts.forEach(alert => {
        checkedCount++;
        const facilityData = filteredData.filter(d => d.facility === alert.facility && d.price > 0);
        
        facilityData.forEach(data => {
            const matches = (alert.condition === 'below' && data.price <= alert.price) ||
                          (alert.condition === 'above' && data.price >= alert.price);
            
            if (matches) {
                notifications.push({
                    facility: data.facility,
                    date: data.date,
                    price: data.price,
                    condition: alert.condition,
                    threshold: alert.price,
                    alertId: alert.id
                });
            }
        });
    });
    
    if (notifications.length > 0) {
        showAlertNotifications(notifications);
    } else if (checkedCount > 0) {
        // 該当なし通知を表示
        showNoMatchNotification(checkedCount);
    }
}

// アラート通知表示
function showAlertNotifications(notifications) {
    const notification = document.createElement('div');
    notification.className = 'alert-notification';
    
    const summary = notifications.slice(0, 5).map(n => 
        `${n.facility}: ${n.date} - ¥${n.price.toLocaleString()}`
    ).join('\n');
    
    notification.innerHTML = `
        <div class="alert-notification-content">
            <h4>価格アラート</h4>
            <p>${notifications.length}件の条件に一致する価格が見つかりました</p>
            <pre>${summary}</pre>
            <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                OK
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 10秒後に自動で消える
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

// 平均/中央値表示モード切替
function toggleAverageMode() {
    showMedianMode = !showMedianMode;
    document.getElementById('averageModeText').textContent = showMedianMode ? '平均表示' : '中央値表示';
    renderTable();
}

// 人数切り替え処理
function handleGuestCountChange() {
    const guestCount = parseInt(document.getElementById('guestCount').value);
    
    // 現在のデータを保存
    if (originalData.length > 0) {
        guestCountData[currentGuestCount] = {
            originalData: [...originalData],
            filteredData: [...filteredData],
            facilityNames: [...facilityNames],
            dateColumns: [...dateColumns],
            detailData: {...detailData}
        };
    }
    
    // 新しい人数のデータに切り替え
    currentGuestCount = guestCount;
    
    if (guestCountData[guestCount]) {
        // 保存済みデータがある場合は復元
        const savedData = guestCountData[guestCount];
        originalData = [...savedData.originalData];
        filteredData = [...savedData.filteredData];
        facilityNames = [...savedData.facilityNames];
        dateColumns = [...savedData.dateColumns];
        detailData = {...savedData.detailData};
        
        // UIを更新
        updateFacilitySelect();
        applyFilters();
    } else {
        // データがない場合はリセット
        originalData = [];
        filteredData = [];
        facilityNames = [];
        dateColumns = [];
        detailData = {};
        
        // メッセージ表示
        showError(`${guestCount}名分のデータをアップロードしてください`);
    }
}

// グローバル関数として公開
window.exportSelection = exportSelection;
window.toggleTableView = toggleTableView;
window.exportToCSV = exportToCSV;
window.saveChart = saveChart;
window.resetZoom = resetZoom;
window.toggleChartType = toggleChartType;
window.toggleFullscreen = toggleFullscreen;
window.toggleAverageMode = toggleAverageMode;
window.handleGuestCountChange = handleGuestCountChange;
window.toggleMedianMode = toggleMedianMode;
window.switchGuestCount = switchGuestCount;
window.handleFiles = handleFiles;

// ヒートマップズーム機能
let heatmapZoomLevel = 1;

function heatmapZoom(factor) {
    heatmapZoomLevel *= factor;
    heatmapZoomLevel = Math.max(0.5, Math.min(3, heatmapZoomLevel)); // 0.5倍から3倍まで
    
    const heatmapContent = document.getElementById('heatmapContent');
    if (heatmapContent) {
        heatmapContent.style.transform = `scale(${heatmapZoomLevel})`;
    }
}

window.heatmapZoom = heatmapZoom;

// 観光客数分析用の施設フィルター表示
function showTouristFacilityFilter() {
    const filterDiv = document.getElementById('touristFacilityFilter');
    const selectElement = document.getElementById('touristFacilitySelect');
    
    if (filterDiv && selectElement) {
        // 施設リストを更新
        updateTouristFacilityList();
        filterDiv.style.display = 'block';
        
        // 選択変更時のイベントリスナーを設定（重複を避けるため一度削除）
        selectElement.removeEventListener('change', handleTouristFacilityChange);
        selectElement.addEventListener('change', handleTouristFacilityChange);
    }
}

// 観光客数分析用の施設フィルター非表示
function hideTouristFacilityFilter() {
    const filterDiv = document.getElementById('touristFacilityFilter');
    if (filterDiv) {
        filterDiv.style.display = 'none';
    }
}

// 施設リストを更新
function updateTouristFacilityList() {
    const selectElement = document.getElementById('touristFacilitySelect');
    if (!selectElement) return;
    
    // 現在の選択値を保存
    const currentValue = selectElement.value;
    
    // オプションをクリア
    selectElement.innerHTML = '<option value="">施設を選択...</option>';
    
    // 施設リストを取得
    const facilities = [...new Set(filteredData.map(d => d.facility))].sort();
    
    // オプションを追加
    facilities.forEach(facility => {
        const option = document.createElement('option');
        option.value = facility;
        const displayName = facility.length > 20 ? facility.substring(0, 20) + '...' : facility;
        option.textContent = displayName;
        if (facility.length > 20) {
            option.title = facility;
        }
        selectElement.appendChild(option);
    });
    
    // 以前の選択値を復元（存在する場合）
    if (currentValue && facilities.includes(currentValue)) {
        selectElement.value = currentValue;
    }
}

// 施設選択変更時の処理
function handleTouristFacilityChange() {
    updateChart();
}

// 該当なし通知表示
function showNoMatchNotification(alertCount) {
    const notification = document.createElement('div');
    notification.className = 'alert-notification no-match';
    
    notification.innerHTML = `
        <div class="alert-notification-content">
            <h4>
                <i class="fas fa-info-circle"></i>
                価格アラート確認結果
            </h4>
            <p>${alertCount}件のアラート条件をチェックしましたが、該当する価格はありませんでした。</p>
            <div class="alert-details">
                <small>設定された条件:</small>
                <ul style="margin: 8px 0; padding-left: 20px;">
                    ${priceAlerts.filter(a => a.active).map(a => 
                        `<li>${a.facility} - ${a.condition === 'below' ? '以下' : '以上'} ¥${a.price.toLocaleString()}</li>`
                    ).join('')}
                </ul>
            </div>
            <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">
                OK
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 8秒後に自動で消える
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 8000);
}
