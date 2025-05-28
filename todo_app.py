#!/usr/bin/env python3
import json
import os
from datetime import datetime

class TodoList:
    def __init__(self, filename="todos.json"):
        self.filename = filename
        self.todos = self.load_todos()
    
    def load_todos(self):
        if os.path.exists(self.filename):
            try:
                with open(self.filename, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def save_todos(self):
        with open(self.filename, 'w', encoding='utf-8') as f:
            json.dump(self.todos, f, ensure_ascii=False, indent=2)
    
    def add_todo(self, task, priority='medium'):
        todo = {
            'id': len(self.todos) + 1,
            'task': task,
            'completed': False,
            'priority': priority,
            'created_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        self.todos.append(todo)
        self.save_todos()
        priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
        print(f"✅ タスクを追加しました: {task} {priority_emoji.get(priority, '')}")
    
    def list_todos(self):
        if not self.todos:
            print("📋 タスクはありません。")
            return
        
        print("\n📋 TODOリスト:")
        print("-" * 60)
        
        # Sort by priority (high first) then by id
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        sorted_todos = sorted(self.todos, 
                            key=lambda x: (priority_order.get(x.get('priority', 'medium'), 1), x['id']))
        
        priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
        
        for todo in sorted_todos:
            status = "✓" if todo['completed'] else "○"
            priority = todo.get('priority', 'medium')
            emoji = priority_emoji.get(priority, '')
            print(f"{todo['id']}. [{status}] {emoji} {todo['task']}")
            print(f"   優先度: {priority} | 作成日: {todo['created_at']}")
    
    def complete_todo(self, todo_id):
        for todo in self.todos:
            if todo['id'] == todo_id:
                todo['completed'] = True
                self.save_todos()
                print(f"✅ タスクを完了しました: {todo['task']}")
                return
        print(f"❌ ID {todo_id} のタスクが見つかりません。")
    
    def delete_todo(self, todo_id):
        for i, todo in enumerate(self.todos):
            if todo['id'] == todo_id:
                removed = self.todos.pop(i)
                self.save_todos()
                print(f"🗑️  タスクを削除しました: {removed['task']}")
                return
        print(f"❌ ID {todo_id} のタスクが見つかりません。")
    
    def clear_completed(self):
        original_count = len(self.todos)
        self.todos = [todo for todo in self.todos if not todo['completed']]
        removed_count = original_count - len(self.todos)
        if removed_count > 0:
            self.save_todos()
            print(f"🗑️  {removed_count}個の完了済みタスクを削除しました。")
        else:
            print("完了済みタスクはありません。")

def main():
    todo_list = TodoList()
    
    print("📝 シンプルTODOリストアプリ")
    print("=" * 30)
    
    while True:
        print("\n操作を選択してください:")
        print("1. タスクを追加")
        print("2. タスク一覧を表示")
        print("3. タスクを完了にする")
        print("4. タスクを削除")
        print("5. 完了済みタスクをクリア")
        print("6. 終了")
        
        choice = input("\n選択 (1-6): ").strip()
        
        if choice == '1':
            task = input("新しいタスクを入力: ").strip()
            if task:
                print("優先度を選択:")
                print("1. 高 (High) 🔴")
                print("2. 中 (Medium) 🟡")
                print("3. 低 (Low) 🟢")
                priority_choice = input("選択 (1-3) [デフォルト: 2]: ").strip()
                
                priority_map = {'1': 'high', '2': 'medium', '3': 'low'}
                priority = priority_map.get(priority_choice, 'medium')
                
                todo_list.add_todo(task, priority)
            else:
                print("タスクが空です。")
        
        elif choice == '2':
            todo_list.list_todos()
        
        elif choice == '3':
            todo_list.list_todos()
            try:
                todo_id = int(input("\n完了にするタスクのIDを入力: "))
                todo_list.complete_todo(todo_id)
            except ValueError:
                print("無効なIDです。")
        
        elif choice == '4':
            todo_list.list_todos()
            try:
                todo_id = int(input("\n削除するタスクのIDを入力: "))
                todo_list.delete_todo(todo_id)
            except ValueError:
                print("無効なIDです。")
        
        elif choice == '5':
            todo_list.clear_completed()
        
        elif choice == '6':
            print("👋 TODOリストアプリを終了します。")
            break
        
        else:
            print("無効な選択です。もう一度お試しください。")

if __name__ == "__main__":
    main()