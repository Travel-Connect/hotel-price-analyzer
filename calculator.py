#!/usr/bin/env python3
import math

def add(x, y):
    return x + y

def subtract(x, y):
    return x - y

def multiply(x, y):
    return x * y

def divide(x, y):
    if y == 0:
        return "エラー: ゼロで除算はできません"
    return x / y

def square_root(x):
    if x < 0:
        return "エラー: 負の数の平方根は計算できません"
    return math.sqrt(x)

def calculator():
    print("シンプル計算機")
    print("-" * 20)
    
    while True:
        print("\n操作を選択してください:")
        print("1. 足し算 (+)")
        print("2. 引き算 (-)")
        print("3. 掛け算 (*)")
        print("4. 割り算 (/)")
        print("5. 平方根 (√)")
        print("6. 終了")
        
        choice = input("\n選択 (1-6): ")
        
        if choice == '6':
            print("計算機を終了します。")
            break
        
        if choice not in ['1', '2', '3', '4', '5']:
            print("無効な選択です。もう一度お試しください。")
            continue
        
        if choice == '5':
            try:
                num = float(input("数を入力: "))
            except ValueError:
                print("無効な数値です。もう一度お試しください。")
                continue
            result = square_root(num)
            print(f"√{num} = {result}")
        else:
            try:
                num1 = float(input("最初の数を入力: "))
                num2 = float(input("次の数を入力: "))
            except ValueError:
                print("無効な数値です。もう一度お試しください。")
                continue
            
            if choice == '1':
                result = add(num1, num2)
                print(f"{num1} + {num2} = {result}")
            elif choice == '2':
                result = subtract(num1, num2)
                print(f"{num1} - {num2} = {result}")
            elif choice == '3':
                result = multiply(num1, num2)
                print(f"{num1} * {num2} = {result}")
            elif choice == '4':
                result = divide(num1, num2)
                print(f"{num1} / {num2} = {result}")

if __name__ == "__main__":
    calculator()