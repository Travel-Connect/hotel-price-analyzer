#!/usr/bin/env python3
from todo_app import TodoList

print("📝 TODOリストアプリ デモ")
print("=" * 30)

# デモ用のTODOリストを作成
demo_list = TodoList("demo_todos.json")

# タスクを追加
print("\n--- タスクを追加 ---")
demo_list.add_todo("緊急のバグ修正", "high")
demo_list.add_todo("買い物リストを作成", "low")
demo_list.add_todo("会議の準備", "medium")
demo_list.add_todo("コードレビュー", "high")

# タスク一覧を表示
print("\n--- タスク一覧 ---")
demo_list.list_todos()

# タスクを完了
print("\n--- タスクを完了 ---")
demo_list.complete_todo(1)
demo_list.complete_todo(4)

# 更新後の一覧
print("\n--- 更新後の一覧 ---")
demo_list.list_todos()

# クリーンアップ
import os
if os.path.exists("demo_todos.json"):
    os.remove("demo_todos.json")

print("\n\n対話型TODOリストアプリを実行するには:")
print("python3 todo_app.py")