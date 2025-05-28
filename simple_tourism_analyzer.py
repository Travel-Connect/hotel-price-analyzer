#!/usr/bin/env python3
import json
from datetime import datetime
from okinawa_tourism_data import tourism_data

class SimpleTourismAnalyzer:
    def __init__(self):
        self.data = tourism_data
    
    def get_summary_stats(self):
        """基本統計情報を取得"""
        yearly = self.data['yearly']
        latest = yearly[-1]
        prev = yearly[-2]
        
        # 成長率計算
        growth_rate = ((latest['total'] - prev['total']) / prev['total']) * 100
        
        # COVID前との比較
        pre_covid = next(y for y in yearly if y['year'] == 2019)
        recovery_rate = (latest['total'] / pre_covid['total']) * 100
        
        return {
            'latest_year': latest['year'],
            'total_visitors': latest['total'],
            'domestic_visitors': latest['domestic'],
            'foreign_visitors': latest['foreign'],
            'growth_rate': round(growth_rate, 1),
            'recovery_rate': round(recovery_rate, 1),
            'foreign_ratio': round((latest['foreign'] / latest['total']) * 100, 1)
        }
    
    def analyze_trends(self):
        """トレンド分析"""
        yearly = self.data['yearly']
        
        # 最大値を見つける
        peak = max(yearly, key=lambda x: x['total'])
        
        # COVID前のデータで成長率を計算
        pre_covid = [y for y in yearly if y['year'] < 2020]
        growth_rates = []
        for i in range(1, len(pre_covid)):
            rate = ((pre_covid[i]['total'] - pre_covid[i-1]['total']) / pre_covid[i-1]['total']) * 100
            growth_rates.append(rate)
        
        avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0
        
        return {
            'peak_year': peak['year'],
            'peak_visitors': peak['total'],
            'avg_growth_pre_covid': round(avg_growth, 1)
        }
    
    def analyze_seasonality(self):
        """季節性分析"""
        monthly = self.data['monthly_2023']
        
        # 平均、最大、最小を計算
        total_values = [m['total'] for m in monthly]
        avg = sum(total_values) / len(total_values)
        
        peak_month = max(monthly, key=lambda x: x['total'])
        low_month = min(monthly, key=lambda x: x['total'])
        
        # 標準偏差（簡易計算）
        variance = sum((x - avg) ** 2 for x in total_values) / len(total_values)
        std_dev = variance ** 0.5
        
        return {
            'monthly_avg': round(avg, 0),
            'peak_month': peak_month['month'],
            'peak_visitors': peak_month['total'],
            'low_month': low_month['month'],
            'low_visitors': low_month['total'],
            'seasonal_variation': round(std_dev, 1)
        }
    
    def generate_report(self):
        """分析レポート生成"""
        stats = self.get_summary_stats()
        trends = self.analyze_trends()
        seasonality = self.analyze_seasonality()
        
        report = f"""
沖縄県入域観光客数分析レポート
生成日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}
{'='*50}

1. 最新統計情報 ({stats['latest_year']}年)
   - 総観光客数: {stats['total_visitors']:,}千人
   - 国内観光客: {stats['domestic_visitors']:,}千人
   - 海外観光客: {stats['foreign_visitors']:,}千人
   - 前年比成長率: {stats['growth_rate']}%
   - COVID-19前(2019年)比回復率: {stats['recovery_rate']}%
   - 外国人観光客比率: {stats['foreign_ratio']}%

2. トレンド分析
   - ピーク年: {trends['peak_year']}年 ({trends['peak_visitors']:,}千人)
   - COVID前平均成長率: {trends['avg_growth_pre_covid']}%

3. 季節性分析 (2023年)
   - 月平均観光客数: {seasonality['monthly_avg']:,.0f}千人
   - ピーク月: {seasonality['peak_month']} ({seasonality['peak_visitors']:,}千人)
   - 閑散期: {seasonality['low_month']} ({seasonality['low_visitors']:,}千人)
   - 月別標準偏差: {seasonality['seasonal_variation']:.0f}千人

4. 主要インサイト
   - COVID-19の影響から着実に回復傾向
   - 夏季（7-8月）が最も観光客が多い
   - アジア圏からの観光客が外国人の大半を占める
   - 国内観光客が全体の約{100-stats['foreign_ratio']:.0f}%と依然として主力
        """
        
        return report

def main():
    analyzer = SimpleTourismAnalyzer()
    
    print("沖縄県観光統計分析システム")
    print("="*30)
    
    # レポート生成
    report = analyzer.generate_report()
    print(report)
    
    # サマリーをJSON保存
    summary = analyzer.get_summary_stats()
    with open('tourism_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print("\n生成されたファイル:")
    print("- tourism_summary.json")
    print("\nWebダッシュボードを表示するには:")
    print("python3 server.py を実行後、")
    print("http://localhost:8000/tourism_web.html にアクセス")

if __name__ == "__main__":
    main()