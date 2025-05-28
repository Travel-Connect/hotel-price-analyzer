#!/usr/bin/env python3
import json
import os
from datetime import datetime, timedelta
from collections import Counter, defaultdict

class TaskAnalyzer:
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
    
    def analyze(self):
        if not self.todos:
            print("📊 分析するタスクがありません。")
            return
        
        print("📊 タスク統計レポート")
        print("=" * 60)
        
        self.basic_stats()
        self.priority_analysis()
        self.completion_rate()
        self.time_analysis()
        self.task_patterns()
        self.productivity_score()
    
    def basic_stats(self):
        total = len(self.todos)
        completed = sum(1 for t in self.todos if t.get('completed', False))
        pending = total - completed
        
        print("\n📈 基本統計:")
        print(f"  • 総タスク数: {total}")
        print(f"  • 完了タスク: {completed}")
        print(f"  • 未完了タスク: {pending}")
        print(f"  • 完了率: {completed/total*100:.1f}%" if total > 0 else "  • 完了率: 0%")
    
    def priority_analysis(self):
        print("\n🎯 優先度別分析:")
        
        priority_counts = Counter()
        priority_completed = defaultdict(int)
        
        for todo in self.todos:
            priority = todo.get('priority', 'medium')
            priority_counts[priority] += 1
            if todo.get('completed', False):
                priority_completed[priority] += 1
        
        priority_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
        priority_order = ['high', 'medium', 'low']
        
        for priority in priority_order:
            if priority in priority_counts:
                total = priority_counts[priority]
                completed = priority_completed[priority]
                rate = completed/total*100 if total > 0 else 0
                emoji = priority_emoji.get(priority, '')
                print(f"  {emoji} {priority.capitalize()}: {total}個 (完了: {completed}個, {rate:.1f}%)")
    
    def completion_rate(self):
        print("\n⏱️ 完了率の詳細:")
        
        # Calculate completion rates by priority
        rates = {}
        for priority in ['high', 'medium', 'low']:
            priority_todos = [t for t in self.todos if t.get('priority', 'medium') == priority]
            if priority_todos:
                completed = sum(1 for t in priority_todos if t.get('completed', False))
                rates[priority] = completed / len(priority_todos) * 100
        
        # Performance evaluation
        if 'high' in rates and rates['high'] >= 80:
            print("  ✨ 素晴らしい！高優先度タスクの完了率が高いです。")
        elif 'high' in rates and rates['high'] < 50:
            print("  ⚠️  高優先度タスクの完了率が低いです。重要なタスクに集中しましょう。")
        
        # Create visual bar chart
        print("\n  完了率グラフ:")
        for priority, rate in rates.items():
            bar = "█" * int(rate / 5)  # Each block represents 5%
            print(f"  {priority:6}: [{bar:<20}] {rate:.1f}%")
    
    def time_analysis(self):
        print("\n📅 時間分析:")
        
        # Parse dates and analyze
        completed_by_day = defaultdict(int)
        created_by_day = defaultdict(int)
        
        for todo in self.todos:
            created_at = todo.get('created_at', '')
            if created_at:
                try:
                    # Handle different date formats
                    if '/' in created_at:  # Japanese format: 2025/05/27 18:06:03
                        date = datetime.strptime(created_at.split()[0], "%Y/%m/%d")
                    else:  # Standard format: 2025-05-27 18:06:03
                        date = datetime.strptime(created_at.split()[0], "%Y-%m-%d")
                    
                    day = date.strftime("%A")
                    created_by_day[day] += 1
                    
                    if todo.get('completed', False):
                        completed_by_day[day] += 1
                except:
                    pass
        
        if created_by_day:
            most_productive = max(completed_by_day.items(), key=lambda x: x[1]) if completed_by_day else None
            most_created = max(created_by_day.items(), key=lambda x: x[1])
            
            print(f"  • 最も多くタスクを作成した曜日: {most_created[0]} ({most_created[1]}個)")
            if most_productive:
                print(f"  • 最も多くタスクを完了した曜日: {most_productive[0]} ({most_productive[1]}個)")
    
    def task_patterns(self):
        print("\n🔍 タスクパターン分析:")
        
        # Analyze common words in tasks
        words = []
        for todo in self.todos:
            task = todo.get('task', '')
            # Split by common delimiters and filter short words
            task_words = [w for w in task.split() if len(w) > 2]
            words.extend(task_words)
        
        if words:
            word_counts = Counter(words)
            common_words = word_counts.most_common(5)
            
            print("  よく使われるキーワード:")
            for word, count in common_words:
                print(f"    • {word}: {count}回")
    
    def productivity_score(self):
        print("\n🏆 生産性スコア:")
        
        score = 0
        reasons = []
        
        # Calculate score based on various factors
        total = len(self.todos)
        if total > 0:
            completed = sum(1 for t in self.todos if t.get('completed', False))
            completion_rate = completed / total
            
            # Completion rate contribution (max 40 points)
            score += int(completion_rate * 40)
            
            # High priority completion (max 30 points)
            high_priority = [t for t in self.todos if t.get('priority') == 'high']
            if high_priority:
                high_completed = sum(1 for t in high_priority if t.get('completed', False))
                high_rate = high_completed / len(high_priority)
                score += int(high_rate * 30)
                if high_rate >= 0.8:
                    reasons.append("高優先度タスクの優れた完了率")
            
            # Task volume (max 20 points)
            if total >= 10:
                score += 20
                reasons.append("適切なタスク量の管理")
            elif total >= 5:
                score += 10
            
            # Balance (max 10 points)
            priority_dist = Counter(t.get('priority', 'medium') for t in self.todos)
            if len(priority_dist) >= 2:  # Using multiple priorities
                score += 10
                reasons.append("優先度のバランスの良い使用")
        
        # Display score with emoji
        if score >= 80:
            emoji = "🌟"
            message = "素晴らしい！"
        elif score >= 60:
            emoji = "👍"
            message = "良好です！"
        elif score >= 40:
            emoji = "📈"
            message = "改善の余地があります"
        else:
            emoji = "💪"
            message = "頑張りましょう！"
        
        print(f"\n  {emoji} スコア: {score}/100 - {message}")
        if reasons:
            print("  良い点:")
            for reason in reasons:
                print(f"    ✓ {reason}")
        
        # Suggestions
        print("\n  💡 改善のヒント:")
        if score < 40:
            print("    • より多くのタスクを完了させましょう")
        if len([t for t in self.todos if t.get('priority') == 'high' and not t.get('completed', False)]) > 2:
            print("    • 高優先度の未完了タスクに注目してください")
        if total < 5:
            print("    • もっとタスクを追加して進捗を追跡しましょう")

def main():
    print("どのTODOリストを分析しますか？")
    print("1. Python版 (todos.json)")
    print("2. Web版 (ローカルストレージから抽出)")
    print("3. カスタムファイル")
    
    choice = input("\n選択 (1-3): ").strip()
    
    if choice == '1':
        analyzer = TaskAnalyzer("todos.json")
    elif choice == '2':
        # Extract from web localStorage (demo data)
        print("\n注意: Web版の分析にはブラウザから手動でエクスポートする必要があります。")
        print("ブラウザのコンソールで以下を実行してください:")
        print("copy(localStorage.getItem('todos'))")
        print("\nデモデータで分析を続けます...")
        
        # Create demo web data
        web_todos = [
            {"id": 1, "task": "ウェブサイトのデザイン更新", "completed": True, "priority": "high", "createdAt": "2025/5/25 10:00:00"},
            {"id": 2, "task": "APIドキュメント作成", "completed": True, "priority": "medium", "createdAt": "2025/5/25 14:00:00"},
            {"id": 3, "task": "バグ修正", "completed": True, "priority": "high", "createdAt": "2025/5/26 09:00:00"},
            {"id": 4, "task": "テストケース追加", "completed": False, "priority": "medium", "createdAt": "2025/5/26 11:00:00"},
            {"id": 5, "task": "リファクタリング", "completed": False, "priority": "low", "createdAt": "2025/5/27 15:00:00"},
        ]
        
        # Convert to Python format
        converted_todos = []
        for todo in web_todos:
            converted_todos.append({
                'id': todo['id'],
                'task': todo['task'],
                'completed': todo['completed'],
                'priority': todo['priority'],
                'created_at': todo['createdAt'].replace('/', '-').replace('5', '05')
            })
        
        with open('web_todos_temp.json', 'w', encoding='utf-8') as f:
            json.dump(converted_todos, f, ensure_ascii=False)
        
        analyzer = TaskAnalyzer("web_todos_temp.json")
        
        # Clean up temp file
        import os
        os.remove('web_todos_temp.json')
        
    elif choice == '3':
        filename = input("ファイル名を入力: ").strip()
        analyzer = TaskAnalyzer(filename)
    else:
        print("無効な選択です。")
        return
    
    analyzer.analyze()

if __name__ == "__main__":
    main()