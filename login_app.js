// タブ切り替え
function showTab(tabName) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    if (tabName === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        tabBtns[0].classList.add('active');
        tabBtns[1].classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        tabBtns[0].classList.remove('active');
        tabBtns[1].classList.add('active');
    }
    
    clearMessage();
}

// メッセージ表示
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
}

// メッセージクリア
function clearMessage() {
    const messageEl = document.getElementById('message');
    messageEl.className = 'message';
    messageEl.textContent = '';
}

// ログイン処理
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('ログインしました。リダイレクトしています...', 'success');
            
            // 元のページまたはダッシュボードにリダイレクト
            const redirect = new URLSearchParams(window.location.search).get('redirect') || '/tourism_web.html';
            setTimeout(() => {
                window.location.href = redirect;
            }, 1000);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('通信エラーが発生しました', 'error');
    }
}

// 登録処理
async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;
    
    // パスワード確認
    if (password !== passwordConfirm) {
        showMessage('パスワードが一致しません', 'error');
        return;
    }
    
    try {
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('登録が完了しました。ログインしてください。', 'success');
            
            // ログインタブに切り替え
            setTimeout(() => {
                showTab('login');
                document.getElementById('login-username').value = username;
                document.getElementById('login-password').value = '';
            }, 1500);
        } else {
            showMessage(data.message, 'error');
        }
    } catch (error) {
        showMessage('通信エラーが発生しました', 'error');
    }
}

// 認証チェック（他のページで使用）
async function checkAuth() {
    try {
        const response = await fetch('/auth/check');
        const data = await response.json();
        
        return data.authenticated ? data.username : null;
    } catch (error) {
        return null;
    }
}

// ログアウト処理（他のページで使用）
async function logout() {
    try {
        const response = await fetch('/auth/logout');
        const data = await response.json();
        
        if (data.success) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ページ読み込み時の処理
document.addEventListener('DOMContentLoaded', () => {
    // URLパラメータからメッセージを取得
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    
    if (message === 'logout') {
        showMessage('ログアウトしました', 'success');
    } else if (message === 'required') {
        showMessage('ログインが必要です', 'error');
    }
});