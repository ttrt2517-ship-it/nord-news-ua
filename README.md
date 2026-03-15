# 🇳🇴 Норд — Новини Норвегії українською

## 🚀 Деплой на GitHub Pages

### Крок 1: Створи репозиторій на GitHub

1. Зайди на https://github.com/new
2. Назва: `nord-news` (або інша)
3. Тип: Public
4. **НЕ** додавай README (ми вже маємо файли)
5. Натисни "Create repository"

### Крок 2: Підключи репозиторій

```bash
cd C:\Users\^_^\.openclaw\workspace\norway-news-bot\website

git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TVOY_USERNAME/nord-news.git
git push -u origin main
```

### Крок 3: Включи GitHub Pages

1. Зайди в репозиторій → Settings → Pages
2. Source: GitHub Actions
3. Зачекай 1-2 хвилини
4. Сайт буде доступний: `https://TVOY_USERNAME.github.io/nord-news/`

---

## 📂 Структура

```
website/
├── index.html          # Головна сторінка
├── css/
│   └── styles.css      # Стилі
├── js/
│   └── app.js          # JavaScript
├── data/
│   └── articles.json   # Дані статей
└── .github/
    └── workflows/
        └── deploy.yml  # Авто-деплой
```

---

## 🔄 Оновлення контенту

### Автоматично (через бота):
Бот оновлює `data/articles.json` → GitHub Actions деплоїть

### Вручну:
1. Онови `data/articles.json`
2. `git add . && git commit -m "Update articles" && git push`
3. Зачекай 30 сек — сайт оновиться

---

## 📱 Telegram

Бот: https://t.me/nord_smm_bot

---

## ⚙️ Налаштування

- **Google Analytics:** ID вже в коді (G-D28BSPKB28)
- **Домен:** Можна підключити свій в Settings → Pages → Custom domain
