#!/usr/bin/env python3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

def generate_sample_hotel_data():
    """サンプルの宿泊施設料金データを生成"""
    
    # 施設名リスト
    facilities = [
        "オーシャンビューリゾート那覇",
        "サンセットビーチホテル",
        "沖縄グランドホテル",
        "ビジネスホテル国際通り",
        "リゾートヴィラ恩納",
        "シーサイドペンション",
        "那覇シティホテル",
        "美ら海リゾート",
        "首里城ホテル",
        "コーラルビーチリゾート"
    ]
    
    # 日付範囲（3ヶ月分）
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 3, 31)
    date_range = pd.date_range(start_date, end_date)
    
    # 施設タイプ別の基本価格
    base_prices = {
        "オーシャンビューリゾート那覇": 15000,
        "サンセットビーチホテル": 12000,
        "沖縄グランドホテル": 18000,
        "ビジネスホテル国際通り": 6000,
        "リゾートヴィラ恩納": 25000,
        "シーサイドペンション": 4500,
        "那覇シティホテル": 8000,
        "美ら海リゾート": 20000,
        "首里城ホテル": 10000,
        "コーラルビーチリゾート": 16000
    }
    
    # データフレームの作成
    data = []
    data.append(["施設名"] + [date.strftime("%Y-%m-%d") for date in date_range])
    
    for facility in facilities:
        row = [facility]
        base_price = base_prices[facility]
        
        for date in date_range:
            # 曜日による価格変動
            weekday = date.weekday()
            weekday_factor = 1.0
            if weekday == 5:  # 土曜日
                weekday_factor = 1.3
            elif weekday == 6:  # 日曜日
                weekday_factor = 1.2
            elif weekday == 4:  # 金曜日
                weekday_factor = 1.15
            
            # 季節変動
            month = date.month
            seasonal_factor = 1.0
            if month in [7, 8]:  # 夏季
                seasonal_factor = 1.4
            elif month in [12, 1]:  # 年末年始
                seasonal_factor = 1.3
            elif month == 3:  # 春休み
                seasonal_factor = 1.2
            
            # ランダムな変動（±20%）
            random_factor = 1 + random.uniform(-0.2, 0.2)
            
            # 空室率（10%の確率で満室）
            if random.random() < 0.1:
                price = 0  # 満室
            else:
                price = int(base_price * weekday_factor * seasonal_factor * random_factor)
                # 100円単位に丸める
                price = round(price / 100) * 100
            
            row.append(price)
        
        data.append(row)
    
    # Excelファイルとして保存
    df = pd.DataFrame(data[1:], columns=data[0])
    df.to_excel("sample_hotel_prices.xlsx", index=False)
    print("サンプルデータを 'sample_hotel_prices.xlsx' として生成しました。")
    
    # データの概要を表示
    print(f"\n生成されたデータの概要:")
    print(f"- 施設数: {len(facilities)}")
    print(f"- 期間: {start_date.strftime('%Y-%m-%d')} 〜 {end_date.strftime('%Y-%m-%d')}")
    print(f"- 日数: {len(date_range)}日")

if __name__ == "__main__":
    generate_sample_hotel_data()