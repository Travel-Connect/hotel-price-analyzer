#!/usr/bin/env python3
import json
import csv
import os
from datetime import datetime
from tourism_csv_handler import TourismCSVHandler

class AdvancedTourismAnalyzer:
    def __init__(self):
        self.csv_handler = TourismCSVHandler()
        self.data = {}
        self.load_all_data()
    
    def load_all_data(self):
        """すべてのCSVデータを読み込み"""
        data_files = {
            'yearly': 'okinawa_tourism_yearly.csv',
            'monthly': 'okinawa_tourism_monthly.csv',
            'country': 'okinawa_tourism_by_country.csv',
            'accommodation': 'okinawa_accommodation_stats.csv'
        }
        
        for data_type, filename in data_files.items():
            filepath = os.path.join(self.csv_handler.data_dir, filename)
            if os.path.exists(filepath):
                result = self.csv_handler.import_csv_data(filepath, data_type)
                if result['success']:
                    self.data[data_type] = result['data']
                    print(f"✓ {data_type}データを読み込みました ({result['count']}件)")
                else:
                    print(f"✗ {data_type}データの読み込みエラー: {result['error']}")
    
    def analyze_recovery_trend(self):
        """COVID-19からの回復トレンド分析"""
        if 'yearly' not in self.data:
            return None
        
        yearly_data = self.data['yearly']
        
        # 2019年（COVID前）を基準とした回復率を計算
        base_year = next((d for d in yearly_data if d['年'] == '2019'), None)
        if not base_year:
            return None
        
        recovery_analysis = []
        for year_data in yearly_data:
            year = int(year_data['年'])
            if year >= 2020:
                total_recovery = (year_data['総数'] / base_year['総数']) * 100
                domestic_recovery = (year_data['国内客'] / base_year['国内客']) * 100
                foreign_recovery = (year_data['外国客'] / base_year['外国客']) * 100
                
                recovery_analysis.append({
                    'year': year,
                    'total_recovery': round(total_recovery, 1),
                    'domestic_recovery': round(domestic_recovery, 1),
                    'foreign_recovery': round(foreign_recovery, 1)
                })
        
        return recovery_analysis
    
    def analyze_seasonal_patterns(self):
        """詳細な季節パターン分析"""
        if 'monthly' not in self.data:
            return None
        
        monthly_data = self.data['monthly']
        
        # 月別の平均を計算
        monthly_averages = {}
        for data in monthly_data:
            month = int(data['年月'].split('/')[1])
            if month not in monthly_averages:
                monthly_averages[month] = {'total': [], 'occupancy': []}
            
            monthly_averages[month]['total'].append(data['総数'])
            if '客室稼働率(%)' in data:
                monthly_averages[month]['occupancy'].append(data['客室稼働率(%)'])
        
        # 各月の統計を計算
        seasonal_stats = []
        for month in sorted(monthly_averages.keys()):
            totals = monthly_averages[month]['total']
            occupancies = monthly_averages[month]['occupancy']
            
            avg_total = sum(totals) / len(totals) if totals else 0
            avg_occupancy = sum(occupancies) / len(occupancies) if occupancies else 0
            
            seasonal_stats.append({
                'month': month,
                'avg_visitors': round(avg_total / 1000),  # 千人単位
                'avg_occupancy': round(avg_occupancy, 1),
                'month_name': ['1月', '2月', '3月', '4月', '5月', '6月', 
                              '7月', '8月', '9月', '10月', '11月', '12月'][month-1]
            })
        
        return seasonal_stats
    
    def analyze_market_composition(self):
        """市場構成の詳細分析"""
        if 'country' not in self.data:
            return None
        
        # 最新年のデータを取得
        latest_year = max(int(d['年']) for d in self.data['country'])
        latest_data = [d for d in self.data['country'] if int(d['年']) == latest_year]
        
        # 地域別に集計
        regions = {
            '東アジア': ['台湾', '韓国', '中国本土', '香港'],
            '東南アジア': ['タイ', 'シンガポール'],
            '欧米豪': ['アメリカ', 'オーストラリア'],
            'その他': ['その他']
        }
        
        regional_stats = {}
        total_foreign = sum(d['訪問者数'] for d in latest_data)
        
        for region, countries in regions.items():
            region_total = sum(d['訪問者数'] for d in latest_data 
                             if d['国・地域'] in countries)
            regional_stats[region] = {
                'visitors': region_total,
                'percentage': round((region_total / total_foreign) * 100, 1)
            }
        
        return {
            'year': latest_year,
            'by_country': latest_data,
            'by_region': regional_stats,
            'total_foreign': total_foreign
        }
    
    def analyze_accommodation_trends(self):
        """宿泊施設トレンド分析"""
        if 'accommodation' not in self.data:
            return None
        
        # 施設タイプ別の稼働率トレンド
        facility_trends = {}
        
        for data in self.data['accommodation']:
            ftype = data['施設タイプ']
            if ftype not in facility_trends:
                facility_trends[ftype] = {
                    'occupancy_rates': [],
                    'avg_rates': [],
                    'total_guests': 0
                }
            
            facility_trends[ftype]['occupancy_rates'].append(data['稼働率(%)'])
            facility_trends[ftype]['avg_rates'].append(data['平均宿泊料金(円)'])
            facility_trends[ftype]['total_guests'] += data['延べ宿泊者数']
        
        # 統計を計算
        summary = {}
        for ftype, trends in facility_trends.items():
            summary[ftype] = {
                'avg_occupancy': round(sum(trends['occupancy_rates']) / 
                                     len(trends['occupancy_rates']), 1),
                'avg_rate': round(sum(trends['avg_rates']) / 
                                len(trends['avg_rates'])),
                'total_guests': trends['total_guests']
            }
        
        return summary
    
    def generate_comprehensive_report(self):
        """包括的な分析レポート生成"""
        report_data = {
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'recovery_trend': self.analyze_recovery_trend(),
            'seasonal_patterns': self.analyze_seasonal_patterns(),
            'market_composition': self.analyze_market_composition(),
            'accommodation_trends': self.analyze_accommodation_trends()
        }
        
        # 最新の基本統計
        if 'yearly' in self.data and self.data['yearly']:
            latest = self.data['yearly'][-1]
            report_data['latest_stats'] = {
                'year': latest['年'],
                'total_visitors': latest['総数'],
                'domestic': latest['国内客'],
                'foreign': latest['外国客'],
                'tourism_revenue': latest['観光収入(億円)'],
                'per_capita_spending': latest['一人当たり消費額(円)']
            }
        
        return report_data
    
    def export_analysis_json(self, filename='tourism_analysis.json'):
        """分析結果をJSONで出力"""
        report = self.generate_comprehensive_report()
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        print(f"\n分析結果を {filename} に保存しました。")
        return filename
    
    def print_summary_report(self):
        """サマリーレポートを表示"""
        print("\n" + "="*60)
        print("沖縄県観光統計 包括的分析レポート")
        print("="*60)
        
        report = self.generate_comprehensive_report()
        
        # 最新統計
        if 'latest_stats' in report:
            stats = report['latest_stats']
            print(f"\n【最新統計 ({stats['year']}年)】")
            print(f"総観光客数: {stats['total_visitors']:,}人")
            print(f"観光収入: {stats['tourism_revenue']:,}億円")
            print(f"一人当たり消費額: {stats['per_capita_spending']:,}円")
        
        # 回復トレンド
        if report['recovery_trend']:
            print("\n【COVID-19からの回復状況】")
            latest_recovery = report['recovery_trend'][-1]
            print(f"{latest_recovery['year']}年の回復率（2019年比）:")
            print(f"  - 全体: {latest_recovery['total_recovery']}%")
            print(f"  - 国内客: {latest_recovery['domestic_recovery']}%")
            print(f"  - 外国客: {latest_recovery['foreign_recovery']}%")
        
        # 季節パターン
        if report['seasonal_patterns']:
            print("\n【季節性分析】")
            peak = max(report['seasonal_patterns'], key=lambda x: x['avg_visitors'])
            low = min(report['seasonal_patterns'], key=lambda x: x['avg_visitors'])
            print(f"ピーク月: {peak['month_name']} (平均 {peak['avg_visitors']:,}千人)")
            print(f"閑散期: {low['month_name']} (平均 {low['avg_visitors']:,}千人)")
        
        # 市場構成
        if report['market_composition']:
            print("\n【外国人観光客の地域別構成】")
            for region, data in report['market_composition']['by_region'].items():
                print(f"  - {region}: {data['percentage']}%")
        
        # 宿泊施設
        if report['accommodation_trends']:
            print("\n【宿泊施設稼働率】")
            for ftype, data in report['accommodation_trends'].items():
                print(f"  - {ftype}: {data['avg_occupancy']}%")

def main():
    print("高度な沖縄観光データ分析システム")
    print("="*40)
    
    analyzer = AdvancedTourismAnalyzer()
    
    # 分析実行
    analyzer.print_summary_report()
    
    # JSON出力
    output_file = analyzer.export_analysis_json()
    
    # Web用データも生成
    web_data_file = 'tourism_data_for_web.json'
    web_data = {
        'yearly': analyzer.data.get('yearly', []),
        'monthly': analyzer.data.get('monthly', []),
        'country': analyzer.data.get('country', []),
        'analysis': analyzer.generate_comprehensive_report()
    }
    
    with open(web_data_file, 'w', encoding='utf-8') as f:
        json.dump(web_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nWeb用データを {web_data_file} に保存しました。")
    print("\nCSVデータのインポート機能が利用可能です。")
    print("新しいデータは tourism_data/ ディレクトリに配置してください。")

if __name__ == "__main__":
    main()