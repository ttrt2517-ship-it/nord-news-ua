# 📁 Структура сайту для деплою

## Файли (завантажити на сервер)

```
website/
├── index.html           ✅ Головна сторінка
├── 404.html             ✅ Сторінка помилки
├── .htaccess            ✅ Налаштування Apache
│
├── css/
│   └── styles.css       ✅ Стилі
│
├── js/
│   └── app.js           ✅ JavaScript
│
├── api/
│   ├── articles.php     ✅ API статей
│   ├── products.php     ✅ API продуктів
│   └── groups.php       ✅ API груп
│
├── admin/
│   └── index.php        ✅ Адмін-панель + Дашборд
│
└── data/
    ├── articles.json    ✅ Дані статей
    └── bot-logs.json    ✅ Логи бота
```

---

## Підключення через FileZilla

```
Хост: access-5019998868.webspace-host.com
Користувач: a843749
Пароль: ho1iu23687069786a9s@!#
Порт: 22 (SFTP)
```

**Віддалена папка:** `/new/`

---

## Після деплою перевір

| URL | Що має бути |
|-----|-------------|
| https://glf-bikube.info/ | Головна сторінка |
| https://glf-bikube.info/css/styles.css | CSS файл |
| https://glf-bikube.info/admin/ | Адмінка (пароль: nord2026admin) |
| https://glf-bikube.info/api/articles.php | JSON [] |
| https://glf-bikube.info/api/products.php | JSON з продуктами |

---

## Можливі проблеми

### 403 Forbidden
- Перевір права: папки 755, файли 644
- Перевір що .htaccess не блокує

### Біла сторінка в admin/
- Перевір підключення до MySQL
- Подивись error_log на хостингу

### CSS не завантажується
- Перевір шляхи
- Очисти кеш браузера (Ctrl+F5)
