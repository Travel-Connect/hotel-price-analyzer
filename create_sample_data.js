// Node.jsスクリプトでサンプルデータを生成
const XLSX = require('xlsx');

// 施設データ
const facilities = [
    { name: "オーシャンビューリゾート那覇", basePrice: 15000 },
    { name: "サンセットビーチホテル", basePrice: 12000 },
    { name: "沖縄グランドホテル", basePrice: 18000 },
    { name: "ビジネスホテル国際通り", basePrice: 6000 },
    { name: "リゾートヴィラ恩納", basePrice: 25000 }
];

// 日付生成（2024年1月〜3月）
function generateDates() {
    const dates = [];
    const start = new Date('2024-01-01');
    const end = new Date('2024-03-31');
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
    }
    
    return dates;
}

// 価格計算
function calculatePrice(basePrice, date) {
    const d = new Date(date);
    const weekday = d.getDay();
    const month = d.getMonth() + 1;
    
    // 曜日係数
    let weekdayFactor = 1.0;
    if (weekday === 6) weekdayFactor = 1.3; // 土曜
    else if (weekday === 0) weekdayFactor = 1.2; // 日曜
    else if (weekday === 5) weekdayFactor = 1.15; // 金曜
    
    // 季節係数
    let seasonalFactor = 1.0;
    if (month === 1) seasonalFactor = 1.3; // 正月
    else if (month === 3) seasonalFactor = 1.2; // 春休み
    
    // ランダム変動
    const randomFactor = 1 + (Math.random() - 0.5) * 0.3;
    
    // 10%の確率で満室（0円）
    if (Math.random() < 0.1) return 0;
    
    const price = Math.round(basePrice * weekdayFactor * seasonalFactor * randomFactor / 100) * 100;
    return price;
}

// メイン処理
function createSampleExcel() {
    const dates = generateDates();
    const data = [];
    
    // ヘッダー行
    const header = ['施設名', ...dates];
    data.push(header);
    
    // 各施設のデータ
    facilities.forEach(facility => {
        const row = [facility.name];
        dates.forEach(date => {
            row.push(calculatePrice(facility.basePrice, date));
        });
        data.push(row);
    });
    
    // Excelファイル作成
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hotel Prices');
    
    // ファイル保存
    XLSX.writeFile(wb, 'sample_hotel_prices.xlsx');
    console.log('サンプルデータを生成しました: sample_hotel_prices.xlsx');
}

// 実行
createSampleExcel();