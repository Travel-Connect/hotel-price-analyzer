// 高度な機能の実装

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

// 複数ファイルアップロード処理
function handleMultipleFiles(files) {
    Array.from(files).forEach(file => {
        const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            uploadedFiles[fileId] = {
                name: file.name,
                data: processFileData(jsonData),
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
        };
        
        reader.readAsArrayBuffer(file);
    });
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

// ファイルリストの更新
function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    Object.entries(uploadedFiles).forEach(([fileId, fileInfo]) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.innerHTML = `
            <span class="name" onclick="loadFileData('${fileId}')">${fileInfo.name}</span>
            <span class="remove" onclick="removeFile('${fileId}')">✕</span>
        `;
        fileList.appendChild(item);
    });
    
    // 比較モードのセレクトボックスも更新
    updateComparisonSelects();
}

// 比較モードの表示
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

// 価格予測機能
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

// 予測計算
function calculatePredictions(data, days, method) {
    const facilities = [...new Set(data.map(d => d.facility))];
    const predictions = {};
    
    facilities.forEach(facility => {
        const facilityData = data.filter(d => d.facility === facility && d.price > 0);
        if (facilityData.length < 7) return; // 最低7日分のデータが必要
        
        const prices = facilityData.map(d => d.price);
        const dates = facilityData.map(d => new Date(d.date));
        
        switch (method) {
            case 'linear':
                predictions[facility] = linearRegression(prices, dates, days);
                break;
            case 'seasonal':
                predictions[facility] = seasonalPrediction(prices, dates, days);
                break;
            case 'arima':
                predictions[facility] = simplifiedARIMA(prices, dates, days);
                break;
        }
    });
    
    return predictions;
}

// 線形回帰予測
function linearRegression(prices, dates, days) {
    const n = prices.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = prices;
    
    // 回帰係数の計算
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 予測値の生成
    const predictions = [];
    const lastDate = dates[dates.length - 1];
    
    for (let i = 1; i <= days; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + i);
        
        const predictedPrice = Math.max(0, Math.round(intercept + slope * (n - 1 + i)));
        predictions.push({
            date: futureDate.toISOString().split('T')[0],
            price: predictedPrice,
            confidence: 0.8 - (i / days) * 0.3 // 信頼度は日数が増えるほど低下
        });
    }
    
    return predictions;
}

// 季節調整予測
function seasonalPrediction(prices, dates, days) {
    // 曜日別の平均価格を計算
    const weekdayAverages = Array(7).fill(0).map(() => ({ sum: 0, count: 0 }));
    
    prices.forEach((price, i) => {
        const weekday = dates[i].getDay();
        weekdayAverages[weekday].sum += price;
        weekdayAverages[weekday].count++;
    });
    
    const weekdayFactors = weekdayAverages.map(avg => 
        avg.count > 0 ? avg.sum / avg.count : 0
    );
    
    // 全体の平均
    const overallAvg = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // 予測値の生成
    const predictions = [];
    const lastDate = dates[dates.length - 1];
    
    for (let i = 1; i <= days; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + i);
        
        const weekday = futureDate.getDay();
        const seasonalFactor = weekdayFactors[weekday] / overallAvg || 1;
        
        // トレンドも考慮
        const recentPrices = prices.slice(-7);
        const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        
        const predictedPrice = Math.round(recentAvg * seasonalFactor);
        
        predictions.push({
            date: futureDate.toISOString().split('T')[0],
            price: predictedPrice,
            confidence: 0.7
        });
    }
    
    return predictions;
}

// 簡易ARIMA予測
function simplifiedARIMA(prices, dates, days) {
    // 移動平均の計算
    const ma = [];
    const window = 3;
    
    for (let i = window - 1; i < prices.length; i++) {
        const sum = prices.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        ma.push(sum / window);
    }
    
    // 自己回帰
    const predictions = [];
    const lastDate = dates[dates.length - 1];
    let lastMA = ma[ma.length - 1];
    
    for (let i = 1; i <= days; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + i);
        
        // 簡易的な予測（最後の移動平均に微小な変動を加える）
        const trend = (ma[ma.length - 1] - ma[0]) / ma.length;
        const noise = (Math.random() - 0.5) * 0.1 * lastMA;
        
        const predictedPrice = Math.round(lastMA + trend * i + noise);
        lastMA = predictedPrice;
        
        predictions.push({
            date: futureDate.toISOString().split('T')[0],
            price: Math.max(0, predictedPrice),
            confidence: 0.6
        });
    }
    
    return predictions;
}

// 競合比較分析
function createCompetitorAnalysis(ctx) {
    const facilities = [...new Set(filteredData.map(d => d.facility))];
    
    // 施設をカテゴリ分け（価格帯で）
    const categories = categorizeFacilities(facilities);
    
    // カテゴリごとの平均価格を計算
    const categoryData = {};
    
    Object.entries(categories).forEach(([category, facilityList]) => {
        const prices = filteredData.filter(d => 
            facilityList.includes(d.facility) && d.price > 0
        ).map(d => d.price);
        
        if (prices.length > 0) {
            categoryData[category] = {
                avg: prices.reduce((a, b) => a + b, 0) / prices.length,
                min: Math.min(...prices),
                max: Math.max(...prices),
                count: facilityList.length
            };
        }
    });
    
    // グラフ作成
    const labels = Object.keys(categoryData);
    const avgData = labels.map(cat => categoryData[cat].avg);
    const minData = labels.map(cat => categoryData[cat].min);
    const maxData = labels.map(cat => categoryData[cat].max);
    
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '平均価格',
                    data: avgData,
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    order: 1
                },
                {
                    label: '価格範囲',
                    data: labels.map((_, i) => [minData[i], maxData[i]]),
                    type: 'line',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: '競合カテゴリ別価格分析'
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

// 施設のカテゴリ分け
function categorizeFacilities(facilities) {
    const categories = {
        'ラグジュアリー': [],
        'アッパーミドル': [],
        'スタンダード': [],
        'エコノミー': []
    };
    
    facilities.forEach(facility => {
        const avgPrice = calculateFacilityAvgPrice(facility);
        
        if (avgPrice >= 20000) {
            categories['ラグジュアリー'].push(facility);
        } else if (avgPrice >= 12000) {
            categories['アッパーミドル'].push(facility);
        } else if (avgPrice >= 7000) {
            categories['スタンダード'].push(facility);
        } else {
            categories['エコノミー'].push(facility);
        }
    });
    
    return categories;
}

// 施設の平均価格計算
function calculateFacilityAvgPrice(facility) {
    const prices = filteredData.filter(d => 
        d.facility === facility && d.price > 0
    ).map(d => d.price);
    
    return prices.length > 0 ? 
        prices.reduce((a, b) => a + b, 0) / prices.length : 0;
}

// アラート機能
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

// アラートチェック
function checkAlerts() {
    if (!filteredData.length) return;
    
    priceAlerts.forEach(alert => {
        alert.triggered = false;
        
        alert.facilities.forEach(facility => {
            const recentPrices = filteredData
                .filter(d => d.facility === facility && d.price > 0)
                .slice(-7)  // 直近7日間
                .map(d => d.price);
            
            if (recentPrices.length === 0) return;
            
            const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
            const latestPrice = recentPrices[recentPrices.length - 1];
            
            switch (alert.condition) {
                case 'above':
                    if (latestPrice > alert.threshold) {
                        alert.triggered = true;
                        showNotification(`${facility}の価格が¥${alert.threshold.toLocaleString()}を超えました！`);
                    }
                    break;
                    
                case 'below':
                    if (latestPrice < alert.threshold) {
                        alert.triggered = true;
                        showNotification(`${facility}の価格が¥${alert.threshold.toLocaleString()}を下回りました！`);
                    }
                    break;
                    
                case 'change':
                    const changeRate = Math.abs((latestPrice - avgPrice) / avgPrice * 100);
                    if (changeRate > alert.threshold) {
                        alert.triggered = true;
                        showNotification(`${facility}の価格変動率が${alert.threshold}%を超えました！`);
                    }
                    break;
            }
        });
    });
    
    updateAlertList();
}

// 通知表示
function showNotification(message) {
    // ブラウザ通知APIを使用
    if (Notification.permission === 'granted') {
        new Notification('価格アラート', {
            body: message,
            icon: '🔔'
        });
    } else {
        // フォールバック：アラート表示
        console.log('Alert:', message);
    }
}

// 祝日判定とハイライト
function isHoliday(dateStr) {
    return holidays.hasOwnProperty(dateStr);
}

function getHolidayName(dateStr) {
    return holidays[dateStr] || '';
}

// エクスポート
export {
    handleMultipleFiles,
    compareFiles,
    runPricePrediction,
    createCompetitorAnalysis,
    addPriceAlert,
    checkAlerts,
    isHoliday,
    getHolidayName
};