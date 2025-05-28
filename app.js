class TodoApp {
    constructor() {
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.currentFilter = 'all';
        this.nextId = this.todos.length > 0 ? Math.max(...this.todos.map(t => t.id)) + 1 : 1;
        
        this.initializeElements();
        this.attachEventListeners();
        this.render();
    }
    
    initializeElements() {
        this.todoInput = document.getElementById('todoInput');
        this.prioritySelect = document.getElementById('prioritySelect');
        this.addButton = document.getElementById('addButton');
        this.todoList = document.getElementById('todoList');
        this.clearCompletedBtn = document.getElementById('clearCompleted');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.totalTasksSpan = document.getElementById('totalTasks');
        this.completedTasksSpan = document.getElementById('completedTasks');
    }
    
    attachEventListeners() {
        this.addButton.addEventListener('click', () => this.addTodo());
        this.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.updateFilterButtons();
                this.render();
            });
        });
    }
    
    addTodo() {
        const task = this.todoInput.value.trim();
        if (!task) return;
        
        const todo = {
            id: this.nextId++,
            task: task,
            completed: false,
            priority: this.prioritySelect.value,
            createdAt: new Date().toLocaleString('ja-JP')
        };
        
        this.todos.push(todo);
        this.saveTodos();
        this.todoInput.value = '';
        this.render();
    }
    
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.render();
        }
    }
    
    deleteTodo(id) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.render();
    }
    
    clearCompleted() {
        this.todos = this.todos.filter(t => !t.completed);
        this.saveTodos();
        this.render();
    }
    
    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }
    
    updateFilterButtons() {
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }
    
    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }
    
    getSortedTodos(todos) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return todos.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    
    render() {
        const filteredTodos = this.getFilteredTodos();
        const sortedTodos = this.getSortedTodos([...filteredTodos]);
        
        if (sortedTodos.length === 0) {
            this.todoList.innerHTML = '<div class="empty-state">タスクがありません</div>';
        } else {
            this.todoList.innerHTML = sortedTodos.map(todo => this.createTodoHTML(todo)).join('');
            
            // Attach event listeners to newly created elements
            this.todoList.querySelectorAll('.checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.toggleTodo(parseInt(e.target.dataset.id));
                });
            });
            
            this.todoList.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.deleteTodo(parseInt(e.target.dataset.id));
                });
            });
        }
        
        this.updateStats();
    }
    
    createTodoHTML(todo) {
        const priorityEmoji = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        
        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <span class="priority-indicator">${priorityEmoji[todo.priority]}</span>
                <input type="checkbox" class="checkbox" data-id="${todo.id}" ${todo.completed ? 'checked' : ''}>
                <div class="todo-content">
                    <div class="todo-text">${this.escapeHtml(todo.task)}</div>
                    <div class="todo-date">${todo.createdAt}</div>
                </div>
                <button class="delete-btn" data-id="${todo.id}">削除</button>
            </div>
        `;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        
        this.totalTasksSpan.textContent = `タスク数: ${total}`;
        this.completedTasksSpan.textContent = `完了: ${completed}`;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});