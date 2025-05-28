// 沖縄観光データ
const tourismData = {
    yearly: [
        {year: 2015, total: 7936, domestic: 6640, foreign: 1296},
        {year: 2016, total: 8769, domestic: 6880, foreign: 1889},
        {year: 2017, total: 9579, domestic: 6887, foreign: 2692},
        {year: 2018, total: 10000, domestic: 7000, foreign: 3000},
        {year: 2019, total: 10163, domestic: 6930, foreign: 3233},
        {year: 2020, total: 3736, domestic: 3584, foreign: 152},
        {year: 2021, total: 3016, domestic: 3012, foreign: 4},
        {year: 2022, total: 6835, domestic: 6729, foreign: 106},
        {year: 2023, total: 8900, domestic: 7600, foreign: 1300},
        {year: 2024, total: 9800, domestic: 7400, foreign: 2400}
    ],
    monthly2023: [
        {month: "1月", total: 620, domestic: 580, foreign: 40},
        {month: "2月", total: 650, domestic: 600, foreign: 50},
        {month: "3月", total: 780, domestic: 680, foreign: 100},
        {month: "4月", total: 720, domestic: 600, foreign: 120},
        {month: "5月", total: 750, domestic: 620, foreign: 130},
        {month: "6月", total: 700, domestic: 580, foreign: 120},
        {month: "7月", total: 850, domestic: 700, foreign: 150},
        {month: "8月", total: 920, domestic: 750, foreign: 170},
        {month: "9月", total: 800, domestic: 650, foreign: 150},
        {month: "10月", total: 780, domestic: 630, foreign: 150},
        {month: "11月", total: 760, domestic: 610, foreign: 150},
        {month: "12月", total: 770, domestic: 600, foreign: 170}
    ],
    byCountry2023: [
        {country: "台湾", visitors: 380},
        {country: "韓国", visitors: 320},
        {country: "中国本土", visitors: 180},
        {country: "香港", visitors: 150},
        {country: "アメリカ", visitors: 120},
        {country: "タイ", visitors: 80},
        {country: "シンガポール", visitors: 40},
        {country: "その他", visitors: 30}
    ],
    byPurpose2023: [
        {purpose: "観光・レジャー", percentage: 82},
        {purpose: "ビジネス", percentage: 8},
        {purpose: "友人・親族訪問", percentage: 6},
        {purpose: "その他", percentage: 4}
    ]
};

// チャート変数
let yearlyChart, monthlyChart, countryChart, purposeChart;

// 認証関連の関数を追加
async function checkAuth() {
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();
        
        if (data.authenticated) {
            document.getElementById('username-display').textContent = `ようこそ、${data.username}さん`;
            return true;
        } else {
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return false;
    }
}

async function logout() {
    try {
        const response = await fetch('/auth/logout');
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/login.html?message=logout';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', async function() {
    // 認証チェック
    const isAuthenticated = await checkAuth();
    
    if (isAuthenticated) {
        updateSummaryCards();
        createCharts();
    }
});

// サマリーカードの更新
function updateSummaryCards() {
    const latestYear = tourismData.yearly[tourismData.yearly.length - 1];
    const prevYear = tourismData.yearly[tourismData.yearly.length - 2];
    const preCovid = tourismData.yearly.find(d => d.year === 2019);
    
    const growthRate = ((latestYear.total - prevYear.total) / prevYear.total * 100).toFixed(1);
    const recoveryRate = (latestYear.total / preCovid.total * 100).toFixed(1);
    const foreignRatio = (latestYear.foreign / latestYear.total * 100).toFixed(1);
    
    document.getElementById('totalVisitors').textContent = latestYear.total.toLocaleString();
    document.getElementById('growthRate').textContent = `${growthRate}%`;
    document.getElementById('recoveryRate').textContent = `${recoveryRate}%`;
    document.getElementById('foreignRatio').textContent = `${foreignRatio}%`;
}

// チャート作成
function createCharts() {
    // 年間推移チャート
    const yearlyCtx = document.getElementById('yearlyChart').getContext('2d');
    yearlyChart = new Chart(yearlyCtx, {
        type: 'bar',
        data: {
            labels: tourismData.yearly.map(d => d.year),
            datasets: [
                {
                    label: '国内観光客',
                    data: tourismData.yearly.map(d => d.domestic),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    stack: 'Stack 0'
                },
                {
                    label: '海外観光客',
                    data: tourismData.yearly.map(d => d.foreign),
                    backgroundColor: 'rgba(255, 99, 132, 0.8)',
                    stack: 'Stack 0'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '千人';
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: '観光客数（千人）'
                    }
                }
            }
        }
    });

    // 月別チャート
    const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
    monthlyChart = new Chart(monthlyCtx, {
        type: 'line',
        data: {
            labels: tourismData.monthly2023.map(d => d.month),
            datasets: [
                {
                    label: '総観光客数',
                    data: tourismData.monthly2023.map(d => d.total),
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.3
                },
                {
                    label: '国内観光客',
                    data: tourismData.monthly2023.map(d => d.domestic),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.3
                },
                {
                    label: '海外観光客',
                    data: tourismData.monthly2023.map(d => d.foreign),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '千人';
                        }
                    }
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '観光客数（千人）'
                    }
                }
            }
        }
    });

    // 国別チャート
    const countryCtx = document.getElementById('countryChart').getContext('2d');
    countryChart = new Chart(countryCtx, {
        type: 'doughnut',
        data: {
            labels: tourismData.byCountry2023.map(d => d.country),
            datasets: [{
                data: tourismData.byCountry2023.map(d => d.visitors),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(199, 199, 199, 0.8)',
                    'rgba(83, 102, 255, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = (context.parsed / total * 100).toFixed(1);
                            return context.label + ': ' + context.parsed.toLocaleString() + '千人 (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });

    // 目的別チャート
    const purposeCtx = document.getElementById('purposeChart').getContext('2d');
    purposeChart = new Chart(purposeCtx, {
        type: 'polarArea',
        data: {
            labels: tourismData.byPurpose2023.map(d => d.purpose),
            datasets: [{
                data: tourismData.byPurpose2023.map(d => d.percentage),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.7)',
                    'rgba(118, 75, 162, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(75, 192, 192, 0.7)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

// データ更新（シミュレーション）
function updateData() {
    alert('最新データに更新しました');
    // 実際のアプリケーションではAPIから最新データを取得
}

// レポート出力
function exportReport() {
    const latestYear = tourismData.yearly[tourismData.yearly.length - 1];
    const report = `
沖縄県入域観光客数レポート
生成日時: ${new Date().toLocaleString('ja-JP')}

最新統計（${latestYear.year}年）
- 総観光客数: ${latestYear.total.toLocaleString()}千人
- 国内観光客: ${latestYear.domestic.toLocaleString()}千人
- 海外観光客: ${latestYear.foreign.toLocaleString()}千人
    `;
    
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `okinawa_tourism_report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
}