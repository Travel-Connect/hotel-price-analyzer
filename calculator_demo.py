#!/usr/bin/env python3

from calculator import add, subtract, multiply, divide, square_root

print("計算機デモ")
print("-" * 20)

# デモ計算
print(f"\n10 + 5 = {add(10, 5)}")
print(f"20 - 8 = {subtract(20, 8)}")
print(f"6 * 7 = {multiply(6, 7)}")
print(f"15 / 3 = {divide(15, 3)}")
print(f"10 / 0 = {divide(10, 0)}")
print(f"√25 = {square_root(25)}")
print(f"√-4 = {square_root(-4)}")

print("\n対話型計算機を実行するには:")
print("python3 calculator.py")