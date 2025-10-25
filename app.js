class TextShieldApp {
    constructor() {
        this.initEventListeners();
        this.checkPWA();
    }

    initEventListeners() {
        // Переключение вкладок
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Кнопки шифрования/дешифрования
        document.getElementById('encryptBtn').addEventListener('click', () => {
            this.encryptText();
        });

        document.getElementById('decryptBtn').addEventListener('click', () => {
            this.decryptText();
        });

        // Кнопки копирования
        document.getElementById('copyEncrypt').addEventListener('click', () => {
            this.copyToClipboard('encryptResult');
        });

        document.getElementById('copyDecrypt').addEventListener('click', () => {
            this.copyToClipboard('decryptResult');
        });

        // Enter для быстрого действия
        document.getElementById('encryptPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.encryptText();
        });

        document.getElementById('decryptPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.decryptText();
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }

    async encryptText() {
        const text = document.getElementById('encryptText').value.trim();
        const password = document.getElementById('encryptPassword').value;

        if (!text) {
            this.showMessage('Please enter some text to encrypt', 'error');
            return;
        }

        if (!password) {
            this.showMessage('Please enter a password', 'error');
            return;
        }

        if (password.length < 4) {
            this.showMessage('Please use a longer password (at least 4 characters)', 'error');
            return;
        }

        try {
            const encryptBtn = document.getElementById('encryptBtn');
            encryptBtn.textContent = 'Encrypting...';
            encryptBtn.disabled = true;

            // Реальное шифрование
            const encryptedData = await this.encrypt(text, password);
            document.getElementById('encryptResult').value = encryptedData;
            
            this.showMessage('Text encrypted successfully!', 'success');
            
        } catch (error) {
            console.error('Encryption error:', error);
            this.showMessage('Encryption failed. Please try again.', 'error');
        } finally {
            encryptBtn.textContent = 'Encrypt Text';
            encryptBtn.disabled = false;
        }
    }

    async decryptText() {
        const encryptedText = document.getElementById('decryptText').value.trim();
        const password = document.getElementById('decryptPassword').value;

        if (!encryptedText) {
            this.showMessage('Please enter encrypted text', 'error');
            return;
        }

        if (!password) {
            this.showMessage('Please enter the password', 'error');
            return;
        }

        try {
            const decryptBtn = document.getElementById('decryptBtn');
            decryptBtn.textContent = 'Decrypting...';
            decryptBtn.disabled = true;

            // Реальное дешифрование
            const decryptedText = await this.decrypt(encryptedText, password);
            document.getElementById('decryptResult').value = decryptedText;
            
            this.showMessage('Text decrypted successfully!', 'success');
            
        } catch (error) {
            console.error('Decryption error:', error);
            this.showMessage('Decryption failed. Wrong password or corrupted data.', 'error');
        } finally {
            decryptBtn.textContent = 'Decrypt Text';
            decryptBtn.disabled = false;
        }
    }

    // Реальное шифрование с использованием Web Crypto API
    async encrypt(plaintext, password) {
        // Генерируем случайную соль и IV
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Создаем ключ из пароля
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        
        // Шифруем текст
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            key,
            new TextEncoder().encode(plaintext)
        );
        
        // Объединяем соль, IV и зашифрованные данные
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);
        
        // Конвертируем в base64 для удобства хранения
        return btoa(String.fromCharCode(...combined));
    }

    // Реальное дешифрование с использованием Web Crypto API
    async decrypt(encryptedData, password) {
        try {
            // Декодируем из base64
            const combined = new Uint8Array(
                atob(encryptedData).split('').map(char => char.charCodeAt(0))
            );
            
            // Извлекаем соль, IV и зашифрованные данные
            const salt = combined.slice(0, 16);
            const iv = combined.slice(16, 28);
            const encrypted = combined.slice(28);
            
            // Создаем ключ из пароля
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveKey']
            );
            
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );
            
            // Дешифруем
            const decrypted = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                encrypted
            );
            
            return new TextDecoder().decode(decrypted);
            
        } catch (error) {
            throw new Error('Decryption failed - wrong password or corrupted data');
        }
    }

    copyToClipboard(elementId) {
        const textarea = document.getElementById(elementId);
        if (!textarea.value.trim()) {
            this.showMessage('Nothing to copy', 'error');
            return;
        }

        textarea.select();
        document.execCommand('copy');
        
        this.showMessage('Copied to clipboard!', 'success');
    }

    showMessage(message, type = 'info') {
        // Создаем или находим элемент для сообщений
        let messageEl = document.getElementById('message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'message';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 6px;
                color: white;
                font-weight: 600;
                z-index: 1000;
                max-width: 300px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            document.body.appendChild(messageEl);
        }

        // Устанавливаем стиль в зависимости от типа
        const styles = {
            success: 'background: #28a745;',
            error: 'background: #dc3545;',
            info: 'background: #2E86AB;'
        };
        
        messageEl.style.cssText += styles[type] || styles.info;
        messageEl.textContent = message;

        // Автоматически скрываем через 3 секунды
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);
    }

    checkPWA() {
        // Проверяем, установлено ли приложение как PWA
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('Running as PWA');
        }
        
        // Регистрируем Service Worker для оффлайн-работы
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => console.log('SW registered'))
                .catch(error => console.log('SW registration failed'));
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new TextShieldApp();
});