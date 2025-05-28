// CSV解析用モジュール

// CSVパーサー（Shift-JIS対応）
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
                
                // ヘッダーを確認
                const headers = rows[0];
                const expectedHeaders = ['取得日時', '検索条件', 'ホテル名', '日付', 'プラン名', '部屋名称', '料金', 'URL'];
                
                // ヘッダーマッピング（柔軟性のため）
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
                    
                    // 有効なデータのみ追加
                    if (record.hotelName && record.date && record.price > 0) {
                        data.push(record);
                    }
                }
                
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('ファイルの読み込みに失敗しました'));
        };
        
        // Shift-JISとして読み込み
        reader.readAsArrayBuffer(file);
    });
}

// CSV文字列をパース
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
                    // エスケープされた引用符
                    currentCell += '"';
                    i++; // 次の引用符をスキップ
                } else {
                    // 引用符の開始/終了
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // セルの区切り
                row.push(currentCell);
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
        
        // 最後のセルを追加
        row.push(currentCell);
        rows.push(row);
    }
    
    return rows;
}

// 価格文字列を数値に変換
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    
    // 全角数字を半角に変換
    let normalized = priceStr.replace(/[０-９]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    
    // カンマ、円記号、スペースを削除
    normalized = normalized.replace(/[,，\s円¥￥]/g, '');
    
    // 数値に変換
    const price = parseInt(normalized);
    return isNaN(price) ? 0 : price;
}

// CSVデータをアプリケーション用の形式に変換
function convertCSVToAppFormat(csvData) {
    // ホテル名のリスト
    const hotels = [...new Set(csvData.map(d => d.hotelName))];
    
    // 日付のリスト
    const dates = [...new Set(csvData.map(d => d.date))].sort();
    
    // データを変換
    const processedData = [];
    const metadata = {};
    
    csvData.forEach(record => {
        processedData.push({
            facility: record.hotelName,
            date: formatDateString(record.date),
            price: record.price,
            available: record.price > 0,
            isHoliday: isHolidayDate(record.date),
            // 追加情報
            planName: record.planName,
            roomType: record.roomType,
            url: record.url,
            timestamp: record.timestamp,
            searchCondition: record.searchCondition
        });
        
        // メタデータを収集
        const key = `${record.hotelName}_${record.date}`;
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

// 日付文字列を標準形式に変換
function formatDateString(dateStr) {
    if (!dateStr) return '';
    
    // 既に標準形式（YYYY-MM-DD）の場合
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    
    // YYYY/MM/DD形式
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    
    // MM/DD/YYYY形式
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const parts = dateStr.split('/');
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    
    // 日本語形式（2024年1月1日）
    const jpMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (jpMatch) {
        return `${jpMatch[1]}-${jpMatch[2].padStart(2, '0')}-${jpMatch[3].padStart(2, '0')}`;
    }
    
    return dateStr;
}

// 祝日判定
function isHolidayDate(dateStr) {
    const formattedDate = formatDateString(dateStr);
    return holidays.hasOwnProperty(formattedDate);
}

// エクスポート
export { parseCSVFile, convertCSVToAppFormat };