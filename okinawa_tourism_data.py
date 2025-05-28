#!/usr/bin/env python3

# 沖縄県入域観光客数サンプルデータ（実際のデータに近い形式）
# 単位：千人

tourism_data = {
    "yearly": [
        {"year": 2015, "total": 7936, "domestic": 6640, "foreign": 1296},
        {"year": 2016, "total": 8769, "domestic": 6880, "foreign": 1889},
        {"year": 2017, "total": 9579, "domestic": 6887, "foreign": 2692},
        {"year": 2018, "total": 10000, "domestic": 7000, "foreign": 3000},
        {"year": 2019, "total": 10163, "domestic": 6930, "foreign": 3233},
        {"year": 2020, "total": 3736, "domestic": 3584, "foreign": 152},  # COVID-19 impact
        {"year": 2021, "total": 3016, "domestic": 3012, "foreign": 4},
        {"year": 2022, "total": 6835, "domestic": 6729, "foreign": 106},
        {"year": 2023, "total": 8900, "domestic": 7600, "foreign": 1300},
        {"year": 2024, "total": 9800, "domestic": 7400, "foreign": 2400},  # 予測値
    ],
    
    "monthly_2023": [
        {"month": "1月", "total": 620, "domestic": 580, "foreign": 40},
        {"month": "2月", "total": 650, "domestic": 600, "foreign": 50},
        {"month": "3月", "total": 780, "domestic": 680, "foreign": 100},
        {"month": "4月", "total": 720, "domestic": 600, "foreign": 120},
        {"month": "5月", "total": 750, "domestic": 620, "foreign": 130},
        {"month": "6月", "total": 700, "domestic": 580, "foreign": 120},
        {"month": "7月", "total": 850, "domestic": 700, "foreign": 150},
        {"month": "8月", "total": 920, "domestic": 750, "foreign": 170},
        {"month": "9月", "total": 800, "domestic": 650, "foreign": 150},
        {"month": "10月", "total": 780, "domestic": 630, "foreign": 150},
        {"month": "11月", "total": 760, "domestic": 610, "foreign": 150},
        {"month": "12月", "total": 770, "domestic": 600, "foreign": 170},
    ],
    
    "by_country_2023": [
        {"country": "台湾", "visitors": 380},
        {"country": "韓国", "visitors": 320},
        {"country": "中国本土", "visitors": 180},
        {"country": "香港", "visitors": 150},
        {"country": "アメリカ", "visitors": 120},
        {"country": "タイ", "visitors": 80},
        {"country": "シンガポール", "visitors": 40},
        {"country": "その他", "visitors": 30},
    ],
    
    "by_purpose_2023": [
        {"purpose": "観光・レジャー", "percentage": 82},
        {"purpose": "ビジネス", "percentage": 8},
        {"purpose": "友人・親族訪問", "percentage": 6},
        {"purpose": "その他", "percentage": 4},
    ]
}