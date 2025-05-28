#!/usr/bin/env python3
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import numpy as np
from datetime import datetime
import json
import os

# 日本語フォントの設定
plt.rcParams['font.sans-serif'] = ['DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

class OkinawaTourismAnalyzer:
    def __init__(self):
        from okinawa_tourism_data import tourism_data
        self.data = tourism_data
        self.df_yearly = pd.DataFrame(self.data['yearly'])
        self.df_monthly = pd.DataFrame(self.data['monthly_2023'])
        self.df_country = pd.DataFrame(self.data['by_country_2023'])
        self.df_purpose = pd.DataFrame(self.data['by_purpose_2023'])
    
    def get_summary_stats(self):
        """基本統計情報を取得"""
        latest_year = self.df_yearly.iloc[-1]
        prev_year = self.df_yearly.iloc[-2]
        growth_rate = ((latest_year['total'] - prev_year['total']) / prev_year['total']) * 100
        
        # COVID前後の比較
        pre_covid = self.df_yearly[self.df_yearly['year'] == 2019].iloc[0]
        recovery_rate = (latest_year['total'] / pre_covid['total']) * 100
        
        return {
            'latest_year': int(latest_year['year']),
            'total_visitors': int(latest_year['total']),
            'domestic_visitors': int(latest_year['domestic']),
            'foreign_visitors': int(latest_year['foreign']),
            'growth_rate': round(growth_rate, 1),
            'recovery_rate': round(recovery_rate, 1),
            'foreign_ratio': round((latest_year['foreign'] / latest_year['total']) * 100, 1)
        }
    
    def analyze_trends(self):
        """トレンド分析"""
        # 年間成長率の計算
        self.df_yearly['growth_rate'] = self.df_yearly['total'].pct_change() * 100
        
        # 移動平均（3年）
        self.df_yearly['ma_3year'] = self.df_yearly['total'].rolling(window=3, center=True).mean()
        
        # トレンド予測（簡易線形回帰）
        pre_covid_data = self.df_yearly[self.df_yearly['year'] < 2020]
        x = pre_covid_data['year'].values
        y = pre_covid_data['total'].values
        z = np.polyfit(x, y, 1)
        
        return {
            'avg_growth_pre_covid': round(pre_covid_data['growth_rate'].mean(), 1),
            'trend_slope': round(z[0], 1),
            'peak_year': int(self.df_yearly.loc[self.df_yearly['total'].idxmax(), 'year']),
            'peak_visitors': int(self.df_yearly['total'].max())
        }
    
    def analyze_seasonality(self):
        """季節性分析"""
        monthly_avg = self.df_monthly['total'].mean()
        peak_month = self.df_monthly.loc[self.df_monthly['total'].idxmax(), 'month']
        low_month = self.df_monthly.loc[self.df_monthly['total'].idxmin(), 'month']
        
        # 季節変動指数
        seasonal_index = (self.df_monthly['total'] / monthly_avg * 100).round(1)
        
        return {
            'monthly_avg': round(monthly_avg, 0),
            'peak_month': peak_month,
            'peak_visitors': int(self.df_monthly['total'].max()),
            'low_month': low_month,
            'low_visitors': int(self.df_monthly['total'].min()),
            'seasonal_variation': round(self.df_monthly['total'].std(), 1)
        }
    
    def create_yearly_chart(self):
        """年間推移グラフ作成"""
        fig, ax = plt.subplots(figsize=(10, 6))
        
        years = self.df_yearly['year']
        width = 0.35
        
        # 積み上げ棒グラフ
        p1 = ax.bar(years, self.df_yearly['domestic'], width, label='Domestic')
        p2 = ax.bar(years, self.df_yearly['foreign'], width, bottom=self.df_yearly['domestic'], label='Foreign')
        
        # 合計値のライン
        ax.plot(years, self.df_yearly['total'], 'k-o', linewidth=2, markersize=6, label='Total')
        
        ax.set_ylabel('Visitors (thousands)')
        ax.set_title('Okinawa Tourism Visitors by Year')
        ax.legend()
        
        # COVID-19影響を示す背景
        ax.axvspan(2019.5, 2022.5, alpha=0.2, color='red', label='COVID-19 Impact')
        
        plt.xticks(years, rotation=45)
        plt.tight_layout()
        plt.savefig('okinawa_yearly_tourism.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return 'okinawa_yearly_tourism.png'
    
    def create_monthly_chart(self):
        """月別推移グラフ作成"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        months = range(len(self.df_monthly))
        month_labels = self.df_monthly['month']
        
        ax.bar(months, self.df_monthly['domestic'], label='Domestic', color='#1f77b4')
        ax.bar(months, self.df_monthly['foreign'], bottom=self.df_monthly['domestic'], 
               label='Foreign', color='#ff7f0e')
        
        # 平均線
        avg = self.df_monthly['total'].mean()
        ax.axhline(y=avg, color='red', linestyle='--', label=f'Average: {avg:.0f}k')
        
        ax.set_ylabel('Visitors (thousands)')
        ax.set_title('Monthly Tourism Visitors in Okinawa (2023)')
        ax.set_xticks(months)
        ax.set_xticklabels(month_labels, rotation=45)
        ax.legend()
        
        plt.tight_layout()
        plt.savefig('okinawa_monthly_tourism.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return 'okinawa_monthly_tourism.png'
    
    def create_country_chart(self):
        """国別訪問者グラフ作成"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        # 棒グラフ
        countries = self.df_country['country']
        visitors = self.df_country['visitors']
        colors = plt.cm.Set3(range(len(countries)))
        
        bars = ax1.barh(countries, visitors, color=colors)
        ax1.set_xlabel('Visitors (thousands)')
        ax1.set_title('Foreign Visitors by Country (2023)')
        
        # 値を表示
        for i, bar in enumerate(bars):
            width = bar.get_width()
            ax1.text(width + 5, bar.get_y() + bar.get_height()/2, 
                    f'{int(width)}k', ha='left', va='center')
        
        # 円グラフ
        ax2.pie(visitors, labels=countries, autopct='%1.1f%%', colors=colors, startangle=90)
        ax2.set_title('Foreign Visitors Distribution')
        
        plt.tight_layout()
        plt.savefig('okinawa_country_tourism.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return 'okinawa_country_tourism.png'
    
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
   - 長期トレンド係数: 年間約{trends['trend_slope']:.0f}千人増

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
    analyzer = OkinawaTourismAnalyzer()
    
    print("沖縄県観光統計分析システム")
    print("="*30)
    
    # レポート生成
    report = analyzer.generate_report()
    print(report)
    
    # グラフ生成
    print("\nグラフを生成中...")
    yearly_chart = analyzer.create_yearly_chart()
    monthly_chart = analyzer.create_monthly_chart()
    country_chart = analyzer.create_country_chart()
    
    print(f"\n生成されたファイル:")
    print(f"- {yearly_chart}")
    print(f"- {monthly_chart}")
    print(f"- {country_chart}")
    
    # JSON形式でデータ保存
    summary = analyzer.get_summary_stats()
    with open('tourism_summary.json', 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("- tourism_summary.json")

if __name__ == "__main__":
    main()