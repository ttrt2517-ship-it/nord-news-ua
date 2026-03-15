# 📋 ЧЕК-ЛИСТ ПЕРЕД ДЕПЛОЄМ

## ✅ Файли створено

### SEO файли:
- ✅ `sitemap.xml` — статичний
- ✅ `sitemap.php` — динамічний (з бази)
- ✅ `robots.txt` — налаштування краулерів
- ✅ `manifest.json` — PWA маніфест

### Сторінки:
- ✅ `index.html` — головна
- ✅ `article.php` — сторінка статті
- ✅ `404.html` — сторінка помилки
- ✅ `admin/index.php` — адмінка + дашборд

### API:
- ✅ `api/articles.php`
- ✅ `api/products.php`
- ✅ `api/groups.php`

### Ресурси:
- ✅ `css/styles.css`
- ✅ `js/app.js`
- ✅ `logo.svg`
- ✅ `.htaccess`

### Дані:
- ✅ `data/articles.json`
- ✅ `data/bot-logs.json`

---

## 📦 Структура для завантаження

```
website/
├── index.html           ✅
├── article.php          ✅ NEW!
├── 404.html             ✅
├── sitemap.xml          ✅ NEW!
├── sitemap.php          ✅ NEW!
├── robots.txt           ✅ NEW!
├── manifest.json        ✅ NEW!
├── logo.svg             ✅ NEW!
├── .htaccess            ✅
│
├── css/
│   └── styles.css       ✅
│
├── js/
│   └── app.js           ✅
│
├── api/
│   ├── articles.php     ✅
│   ├── products.php     ✅
│   └── groups.php       ✅ NEW!
│
├── admin/
│   └── index.php        ✅
│
└── data/
    ├── articles.json    ✅
    └── bot-logs.json    ✅
```

---

## 🚀 Після деплою перевірити

| URL | Що має бути |
|-----|-------------|
| https://glf-bikube.info/ | Сайт |
| https://glf-bikube.info/robots.txt | User-agent: * |
| https://glf-bikube.info/sitemap.xml | XML |
| https://glf-bikube.info/sitemap.php | XML (динамічний) |
| https://glf-bikube.info/admin/ | Логін |
| https://glf-bikube.info/article/test/ | 404 (бо нема статті) |

---

## ⚠️ Важливо!

1. **Пароль адмінки** — зміни `nord2026admin` в `admin/index.php`
2. **.htaccess** — перевір що дозволяє PHP
3. **Права на папки:**
   - Папки: `755`
   - Файли: `644`
   - data/: `777` (для запису JSON)

---

## 📊 Після успішного деплою

1. **Google Search Console:**
   - Додай сайт: https://search.google.com/search-console
   - Відправ sitemap: `https://glf-bikube.info/sitemap.php`

2. **Перевір індексацію:**
   - `site:glf-bikube.info` в Google

3. **Запусти бота:**
   - Перший пост в Telegram
   - Перевір що статті з'явились на сайті
