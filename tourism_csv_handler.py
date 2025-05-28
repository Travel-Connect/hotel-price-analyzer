#!/usr/bin/env python3
import csv
import json
import os
from datetime import datetime, timedelta
import random

class TourismCSVHandler:
    def __init__(self):
        self.data_dir = "tourism_data"
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
    
    def generate_sample_csv_files(self):
        """実際のパターンに基づいたサンプルCSVファイルを生成"""
        
        # 1. 年次データ (2010-2024)
        self._generate_yearly_data()
        
        # 2. 月次データ (2022-2024)
        self._generate_monthly_data()
        
        # 3. 国・地域別データ
        self._generate_country_data()
        
        # 4. 宿泊施設データ
        self._generate_accommodation_data()
        
        print(f"サンプルCSVファイルを {self.data_dir} ディレクトリに生成しました。")
    
    def _generate_yearly_data(self):
        """年次観光統計データ生成"""
        filename = os.path.join(self.data_dir, "okinawa_tourism_yearly.csv")
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['年', '総数', '国内客', '外国客', '国内客比率(%)', '外国客比率(%)', 
                           '対前年増減率(%)', '一人当たり消費額(円)', '観光収入(億円)'])
            
            # 実際の観光トレンドに基づいたデータ
            base_data = [
                (2010, 5710, 5340, 370, 73000, 4100),
                (2011, 5420, 5090, 330, 72000, 3900),
                (2012, 5930, 5440, 490, 72500, 4300),
                (2013, 6580, 5780, 800, 73000, 4800),
                (2014, 7170, 6020, 1150, 74000, 5300),
                (2015, 7940, 6640, 1300, 74500, 5900),
                (2016, 8770, 6880, 1890, 75000, 6600),
                (2017, 9580, 6890, 2690, 75500, 7200),
                (2018, 10000, 7000, 3000, 76000, 7600),
                (2019, 10160, 6930, 3230, 76500, 7800),
                (2020, 3740, 3590, 150, 68000, 2500),  # COVID-19
                (2021, 3020, 3010, 10, 70000, 2100),
                (2022, 6840, 6730, 110, 78000, 5300),
                (2023, 8900, 7600, 1300, 80000, 7100),
                (2024, 9800, 7400, 2400, 82000, 8000)  # 予測
            ]
            
            for i, (year, total, domestic, foreign, spending, revenue) in enumerate(base_data):
                domestic_ratio = round((domestic / total) * 100, 1)
                foreign_ratio = round((foreign / total) * 100, 1)
                
                if i == 0:
                    growth_rate = 0
                else:
                    prev_total = base_data[i-1][1]
                    growth_rate = round(((total - prev_total) / prev_total) * 100, 1)
                
                writer.writerow([year, total * 1000, domestic * 1000, foreign * 1000, 
                               domestic_ratio, foreign_ratio, growth_rate, spending, revenue])
    
    def _generate_monthly_data(self):
        """月次観光統計データ生成"""
        filename = os.path.join(self.data_dir, "okinawa_tourism_monthly.csv")
        
        # 季節変動パターン（実際の沖縄観光の特徴を反映）
        seasonal_factors = {
            1: 0.82,   # 1月 - 正月後の閑散期
            2: 0.86,   # 2月 - プロ野球キャンプ
            3: 1.03,   # 3月 - 春休み
            4: 0.95,   # 4月 - 端境期
            5: 0.99,   # 5月 - GW
            6: 0.92,   # 6月 - 梅雨
            7: 1.12,   # 7月 - 夏休み開始
            8: 1.21,   # 8月 - ピークシーズン
            9: 1.05,   # 9月 - 残暑
            10: 1.03,  # 10月 - 秋の行楽
            11: 1.00,  # 11月 - 修学旅行
            12: 1.02   # 12月 - 年末
        }
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['年月', '総数', '国内客', '外国客', '前年同月比(%)', 
                           '客室稼働率(%)', '平均滞在日数'])
            
            for year in [2022, 2023, 2024]:
                if year == 2022:
                    base_monthly = 570  # 千人
                    foreign_ratio = 0.016
                elif year == 2023:
                    base_monthly = 742
                    foreign_ratio = 0.146
                else:  # 2024
                    base_monthly = 817
                    foreign_ratio = 0.245
                
                for month in range(1, 13):
                    if year == 2024 and month > 10:  # 2024年11月以降は予測
                        continue
                    
                    # 季節変動を適用
                    total = int(base_monthly * seasonal_factors[month] * 
                              (1 + random.uniform(-0.05, 0.05)))  # ±5%のランダム変動
                    
                    foreign = int(total * foreign_ratio)
                    domestic = total - foreign
                    
                    # 前年同月比（2022年は基準なし）
                    if year == 2022:
                        yoy_growth = 0
                    else:
                        yoy_growth = round(random.uniform(5, 25), 1)
                    
                    # 客室稼働率（季節と相関）
                    occupancy = round(60 + seasonal_factors[month] * 20 + 
                                    random.uniform(-5, 5), 1)
                    
                    # 平均滞在日数
                    avg_stay = round(3.2 + random.uniform(-0.3, 0.3), 1)
                    
                    date_str = f"{year}/{month:02d}"
                    writer.writerow([date_str, total * 1000, domestic * 1000, 
                                   foreign * 1000, yoy_growth, occupancy, avg_stay])
    
    def _generate_country_data(self):
        """国・地域別訪問者データ生成"""
        filename = os.path.join(self.data_dir, "okinawa_tourism_by_country.csv")
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['年', '国・地域', '訪問者数', '構成比(%)', '前年比(%)'])
            
            # 2023年と2024年のデータ
            country_distributions = {
                2023: {
                    '台湾': 380, '韓国': 320, '中国本土': 180, '香港': 150,
                    'アメリカ': 120, 'タイ': 80, 'シンガポール': 40,
                    'オーストラリア': 20, 'その他': 10
                },
                2024: {  # 回復傾向を反映
                    '台湾': 720, '韓国': 600, '中国本土': 360, '香港': 280,
                    'アメリカ': 200, 'タイ': 120, 'シンガポール': 80,
                    'オーストラリア': 30, 'その他': 10
                }
            }
            
            for year, countries in country_distributions.items():
                total = sum(countries.values())
                
                for country, visitors in countries.items():
                    ratio = round((visitors / total) * 100, 1)
                    
                    # 前年比計算
                    if year == 2023:
                        yoy = 0  # 基準年
                    else:
                        prev_visitors = country_distributions[2023].get(country, 0)
                        if prev_visitors > 0:
                            yoy = round(((visitors - prev_visitors) / prev_visitors) * 100, 1)
                        else:
                            yoy = 0
                    
                    writer.writerow([year, country, visitors * 1000, ratio, yoy])
    
    def _generate_accommodation_data(self):
        """宿泊施設関連データ生成"""
        filename = os.path.join(self.data_dir, "okinawa_accommodation_stats.csv")
        
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['年月', '施設タイプ', '客室数', '稼働率(%)', 
                           '平均宿泊料金(円)', '延べ宿泊者数'])
            
            facility_types = {
                'リゾートホテル': {'rooms': 12000, 'base_rate': 15000},
                'シティホテル': {'rooms': 8000, 'base_rate': 8000},
                'ビジネスホテル': {'rooms': 6000, 'base_rate': 5000},
                '民宿・ペンション': {'rooms': 3000, 'base_rate': 4000},
                '簡易宿所': {'rooms': 2000, 'base_rate': 3000}
            }
            
            for year in [2023, 2024]:
                for month in range(1, 13):
                    if year == 2024 and month > 10:
                        continue
                    
                    date_str = f"{year}/{month:02d}"
                    
                    for ftype, info in facility_types.items():
                        # 稼働率（リゾートホテルは高め、季節変動あり）
                        if ftype == 'リゾートホテル':
                            base_occupancy = 75
                        elif ftype == 'シティホテル':
                            base_occupancy = 70
                        else:
                            base_occupancy = 65
                        
                        # 季節変動を適用
                        seasonal_factor = 1.0 + (month in [7, 8, 12, 3]) * 0.15
                        occupancy = round(base_occupancy * seasonal_factor + 
                                        random.uniform(-5, 5), 1)
                        
                        # 宿泊料金（季節変動）
                        rate = int(info['base_rate'] * seasonal_factor * 
                                 (1 + random.uniform(-0.1, 0.1)))
                        
                        # 延べ宿泊者数
                        guests = int(info['rooms'] * 30 * (occupancy / 100) * 
                                   random.uniform(1.8, 2.2))  # 1室あたり1.8-2.2人
                        
                        writer.writerow([date_str, ftype, info['rooms'], 
                                       occupancy, rate, guests])
    
    def import_csv_data(self, filename, data_type='yearly'):
        """CSVファイルからデータを読み込み"""
        try:
            data = []
            with open(filename, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # 数値データの変換
                    for key in row:
                        if key not in ['年', '年月', '国・地域', '施設タイプ']:
                            try:
                                if '.' in row[key] or key.endswith('(%)'):
                                    row[key] = float(row[key])
                                else:
                                    row[key] = int(row[key])
                            except:
                                pass
                    data.append(row)
            
            return {
                'success': True,
                'data': data,
                'count': len(data),
                'type': data_type
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'type': data_type
            }
    
    def validate_csv_data(self, data, expected_columns):
        """CSVデータの検証"""
        if not data:
            return False, "データが空です"
        
        # カラムチェック
        first_row = data[0]
        missing_columns = set(expected_columns) - set(first_row.keys())
        if missing_columns:
            return False, f"必須カラムが不足: {missing_columns}"
        
        return True, "OK"

def main():
    handler = TourismCSVHandler()
    
    print("沖縄県観光データCSVハンドラー")
    print("="*40)
    
    # サンプルCSVファイル生成
    handler.generate_sample_csv_files()
    
    # 生成したファイルのリスト
    print("\n生成されたCSVファイル:")
    for filename in os.listdir(handler.data_dir):
        if filename.endswith('.csv'):
            filepath = os.path.join(handler.data_dir, filename)
            print(f"- {filename} ({os.path.getsize(filepath):,} bytes)")
    
    # サンプル: 年次データの読み込み
    print("\n年次データの読み込みテスト:")
    yearly_file = os.path.join(handler.data_dir, "okinawa_tourism_yearly.csv")
    result = handler.import_csv_data(yearly_file, 'yearly')
    
    if result['success']:
        print(f"✓ {result['count']}件のデータを読み込みました")
        print(f"  最新年のデータ: {result['data'][-1]}")
    else:
        print(f"✗ エラー: {result['error']}")

if __name__ == "__main__":
    main()