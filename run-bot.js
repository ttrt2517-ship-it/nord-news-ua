/**
 * RUN-BOT.JS — Покращена версія
 * 
 * 1. Перевірка дублікатів
 * 2. Спочатку сайт → потім Telegram
 * 3. Перевірка доступності статті
 * 4. Покращений slug
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ==================== CONFIG ====================
const CONFIG = {
    telegram: {
        token: process.env.TELEGRAM_TOKEN,
        chatId: -1003646311493
    },
    github: {
        token: process.env.GITHUB_TOKEN,
        repo: 'ttrt2517-ship-it/nord-news-ua'
    },
    translate: {
        apiKey: process.env.TRANSLATE_API_KEY
    },
    unsplash: {
        accessKey: process.env.UNSPLASH_ACCESS_KEY
    },
    sources: [
        // Головні норвезькі ЗМІ (працюють ✅)
        { name: 'NRK Nyheter', url: 'https://www.nrk.no/nyheter/siste.rss', lang: 'no' },
        
        // Міжнародні про Норвегію
        { name: 'The Local Norway', url: 'https://feeds.thelocal.com/rss/no', lang: 'en' }
    ],
    keywords: ['Ukraina', 'ukrainsk', 'flyktning', 'krig', 'energi', 'NATO', 'immigr', 'språk'],
    maxPosts: 5,
    delayBetweenPosts: 60000
};

// ==================== UTILS ====================
function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString('uk-UA');
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📌';
    console.log(`[${time}] ${prefix} ${msg}`);
}

function fetch(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'NordBot/1.0' } }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                resolve({ data, status: res.statusCode });
            });
        }).on('error', reject);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== FETCH FULL ARTICLE ====================
async function fetchFullArticle(url) {
    return new Promise((resolve) => {
        https.get(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            } 
        }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                try {
                    // Вилучаємо текст з HTML
                    let text = data;
                    
                    // Видаляємо скрипти, стилі, коментарі
                    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
                    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
                    text = text.replace(/<!--[\s\S]*?-->/g, '');
                    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
                    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
                    text = text.replace(/<header[\s\S]*?<\/header>/gi, '');
                    text = text.replace(/<aside[\s\S]*?<\/aside>/gi, '');
                    
                    // Знаходимо article або main контент
                    const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
                    const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
                    const contentMatch = text.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
                    const bodyMatch = text.match(/<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
                    
                    let content = articleMatch?.[1] || mainMatch?.[1] || contentMatch?.[1] || bodyMatch?.[1] || text;
                    
                    // Витягуємо параграфи
                    const paragraphs = [];
                    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
                    let match;
                    
                    while ((match = pRegex.exec(content)) !== null) {
                        let p = match[1]
                            .replace(/<[^>]+>/g, '') // Видаляємо HTML теги
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .replace(/&hellip;/g, '...')
                            .replace(/&mdash;/g, '—')
                            .replace(/&ndash;/g, '–')
                            .replace(/&rsquo;/g, "'")
                            .replace(/&lsquo;/g, "'")
                            .replace(/&rdquo;/g, '"')
                            .replace(/&ldquo;/g, '"')
                            .replace(/&[a-zA-Z]+;/g, match => {
                                // Залишаємо тільки відомі сутності
                                const entities = {
                                    '&amp;': '&',
                                    '&lt;': '<',
                                    '&gt;': '>',
                                    '&quot;': '"',
                                    '&apos;': "'"
                                };
                                return entities[match] || '';
                            })
                            .trim();
                        
                        if (p.length > 50) { // Тільки значущі параграфи
                            paragraphs.push(p);
                        }
                    }
                    
                    const fullText = paragraphs.join('\n\n');
                    
                    if (fullText.length > 300) {
                        resolve(fullText.substring(0, 5000)); // Обмеження 5000 символів
                    } else {
                        resolve(''); // Якщо не знайшли повний текст
                    }
                } catch (error) {
                    resolve('');
                }
            });
        }).on('error', () => resolve(''));
    });
}

// ==================== RATE LIMIT ====================
const STATE_FILE = path.join(__dirname, '.bot-state.json');

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (e) {}
    return { lastPostTime: 0, postsToday: 0, lastDate: '' };
}

function saveState(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {}
}

function canPost(state) {
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    const today = new Date().toISOString().split('T')[0];
    
    // Новий день - скидаємо лічильник
    if (state.lastDate !== today) {
        return { canPost: true, reason: 'new day' };
    }
    
    // Перевірка: не більше 5 постів за день
    if (state.postsToday >= 5) {
        return { canPost: false, reason: 'daily limit reached (5)' };
    }
    
    // Перевірка: мінімум 2 години між постами
    if (now - state.lastPostTime < twoHours) {
        const minsLeft = Math.ceil((twoHours - (now - state.lastPostTime)) / 60000);
        return { canPost: false, reason: `wait ${minsLeft} min` };
    }
    
    return { canPost: true, reason: 'ok' };
}

// ==================== DUPLICATE CHECK ====================
function loadExistingArticles() {
    // Перевіряємо де знаходиться articles.json (локально або на GitHub Actions)
    const localPath = path.join(__dirname, 'website', 'data', 'articles.json');
    const githubPath = path.join(__dirname, 'data', 'articles.json');
    const articlesPath = fs.existsSync(localPath) ? localPath : githubPath;
    
    if (fs.existsSync(articlesPath)) {
        return JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    }
    return [];
}

function isDuplicate(url, existingArticles, title = null) {
    // Перевірка по URL
    const urlExists = existingArticles.some(a => a.original_url === url);
    if (urlExists) return true;
    
    // Перевірка по схожості заголовка
    if (title) {
        const normalizedTitle = title.toLowerCase().trim();
        
        for (const article of existingArticles) {
            const existingTitle = article.title.toLowerCase().trim();
            
            // Точний збіг
            if (normalizedTitle === existingTitle) return true;
            
            // Схожість > 80%
            const similarity = calculateSimilarity(normalizedTitle, existingTitle);
            if (similarity > 0.8) return true;
        }
    }
    
    return false;
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    
    return dp[m][n];
}

// ==================== TRANSLATE ====================
async function translate(text, targetLang = 'uk', sourceLang = null) {
    if (!text || text.trim().length === 0) return '';
    
    const body = JSON.stringify({
        q: text.substring(0, 5000),
        target: targetLang,
        format: 'text',
        ...(sourceLang && { source: sourceLang })
    });

    return new Promise((resolve) => {
        const req = https.request(
            `https://translation.googleapis.com/language/translate/v2?key=${CONFIG.translate.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            },
            (res) => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) return resolve(text);
                        const data = Buffer.concat(chunks).toString('utf8');
                        const json = JSON.parse(data);
                        resolve(json.data.translations[0].translatedText);
                    } catch { resolve(text); }
                });
            }
        );
        req.on('error', () => resolve(text));
        req.write(body);
        req.end();
    });
}

// ==================== RSS PARSER ====================
function parseRSS(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];
        const getText = (tag) => {
            const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
            const m = itemXml.match(regex);
            return m ? (m[1] || m[2] || '').trim() : '';
        };
        
        items.push({
            title: getText('title'),
            link: getText('link'),
            description: getText('description'),
            pubDate: getText('pubDate')
        });
    }
    return items;
}

function filterByKeywords(items, keywords) {
    return items.filter(item => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        return keywords.some(kw => text.includes(kw.toLowerCase()));
    });
}

// ==================== UNSPLASH ====================
// Мапа ключових слів на теми для Unsplash
const TOPIC_KEYWORDS = {
    'ukraina': 'ukraine,kyiv,war,conflict',
    'krig': 'war,military,conflict,soldier',
    'flyktning': 'refugees,migration,people,helping',
    'nato': 'military,army,soldier,defense',
    'energi': 'energy,wind,solar,power',
    'strøm': 'electricity,power,energy',
    'regjering': 'government,parliament,politics',
    'priser': 'money,economy,shopping,market',
    'oslo': 'oslo,city,urban,street',
    'bergen': 'bergen,mountain,fjord,nature',
    'trondheim': 'trondheim,city,university',
    'tromsø': 'tromso,northern lights,arctic,snow',
    'stavanger': 'stavanger,oil,industry',
    'språk': 'language,books,learning,study',
    'arbeid': 'work,office,business',
    'sunnhet': 'health,hospital,medical',
    'klima': 'climate,nature,environment,forest',
    'default': 'norway,fjord,mountain,nature,scandinavia'
};

function detectTopic(text) {
    const lowerText = text.toLowerCase();
    for (const [keyword, query] of Object.entries(TOPIC_KEYWORDS)) {
        if (lowerText.includes(keyword)) {
            return query;
        }
    }
    return TOPIC_KEYWORDS.default;
}

async function getUnsplashImage(query) {
    return new Promise((resolve) => {
        const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${CONFIG.unsplash.accessKey}`;
        
        https.get(url, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                try {
                    const data = Buffer.concat(chunks).toString('utf8');
                    if (res.statusCode === 200) {
                        const json = JSON.parse(data);
                        const imageUrl = json.urls?.regular || json.urls?.small || json.urls?.raw;
                        if (imageUrl) {
                            log(`   Unsplash: ${json.alt_description || 'OK'}`, 'success');
                            resolve(imageUrl);
                        } else {
                            resolve(getFallbackImage());
                        }
                    } else {
                        log(`   Unsplash API error: ${res.statusCode}`, 'warning');
                        resolve(getFallbackImage());
                    }
                } catch (error) {
                    log(`   Unsplash parse error: ${error.message}`, 'warning');
                    resolve(getFallbackImage());
                }
            });
        }).on('error', (error) => {
            log(`   Unsplash fetch error: ${error.message}`, 'warning');
            resolve(getFallbackImage());
        });
    });
}

function getFallbackImage() {
    const images = [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1520769669658-f07657e5b307?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=400&fit=crop',
        'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&h=400&fit=crop'
    ];
    return images[Math.floor(Math.random() * images.length)];
}

// ==================== ARTICLE GENERATOR ====================
function generateSlug(title) {
    const map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
        'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'i', 'к': 'k', 'л': 'l',
        'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu', 'я': 'ya',
        ' ': '-', '_': '-', ',': '', '.': '', '!': '', '?': '', ':': '', ';': '', '"': '', "'": ''
    };
    
    let slug = title.toLowerCase();
    for (const [char, replacement] of Object.entries(map)) {
        slug = slug.split(char).join(replacement);
    }
    
    slug = slug.replace(/[^\w-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    if (!slug || slug.length < 3) {
        slug = 'article-' + Date.now();
    }
    
    return slug.substring(0, 80);
}

async function generateArticle(item, translated) {
    // 1. Спочатку отримуємо повний текст
    log(`   Отримання повного тексту...`);
    let fullText = await fetchFullArticle(item.link);
    
    // Якщо не вдалося отримати повний текст, використовуємо description
    if (!fullText || fullText.length < 200) {
        log(`   Використовуємо description (повний текст недоступний)`, 'warning');
        fullText = translated.content;
    } else {
        // Перекладаємо повний текст
        log(`   Переклад повного тексту (${fullText.length} символів)...`);
        fullText = await translate(fullText, 'uk', item.lang === 'en' ? 'en' : 'no');
    }
    
    // 2. Визначаємо кількість картинок за довжиною тексту
    const imageCount = fullText.length >= 1000 ? 3 : 2;
    log(`   Текст: ${fullText.length} символів → ${imageCount} картинки`);
    
    // 3. Визначаємо тему для картинок
    const topic = detectTopic(translated.title + ' ' + fullText);
    log(`   Тема: ${topic.split(',')[0]}`);
    
    // 4. Отримуємо картинки
    log(`   Отримання ${imageCount} картинок...`);
    const images = [];
    
    for (let i = 0; i < imageCount; i++) {
        try {
            const image = await getUnsplashImage(topic);
            images.push(image);
            log(`   Картинка ${i + 1}/${imageCount} ✓`, 'success');
            await sleep(300);
        } catch (error) {
            log(`   Картинка ${i + 1}/${imageCount}: fallback`, 'warning');
            images.push(getFallbackImage());
        }
    }
    
    return {
        id: Date.now() + Math.random(),
        title: translated.title,
        slug: generateSlug(translated.title),
        content: fullText,
        excerpt: fullText.substring(0, 200) + '...',
        image: images[0], // Головна картинка (для Telegram)
        images: images, // Картинки для сайту (2 або 3)
        original_url: item.link,
        source_name: item.sourceName,
        published_at: item.pubDate || new Date().toISOString(),
        created_at: new Date().toISOString()
    };
}

function generateTelegramPost(article) {
    // Короткий пост для Telegram
    let shortText = article.excerpt.substring(0, 150);
    
    // Видаляємо "..." з кінця якщо є
    if (shortText.endsWith('...')) {
        shortText = shortText.slice(0, -3);
    }
    
    const articleUrl = `https://ttrt2517-ship-it.github.io/nord-news-ua/article.html?slug=${article.slug}`;
    
    return `📰 <b>${article.title}</b>

${shortText}

🔗 <a href="${articleUrl}">Читати повністю</a>

#Норвегія #УкраїнціВНорвегії`;
}

// ==================== TELEGRAM ====================
async function sendToTelegram(chatId, text, imageUrl = null) {
    // Якщо є картинка - відправляємо як фото з підписом
    if (imageUrl) {
        const body = JSON.stringify({
            chat_id: chatId,
            photo: imageUrl,
            caption: text,
            parse_mode: 'HTML'
        });

        return new Promise((resolve, reject) => {
            const req = https.request(
                `https://api.telegram.org/bot${CONFIG.telegram.token}/sendPhoto`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
                },
                (res) => {
                    const chunks = [];
                    res.on('data', chunk => chunks.push(chunk));
                    res.on('end', () => {
                        const data = Buffer.concat(chunks).toString('utf8');
                        res.statusCode === 200 ? resolve(JSON.parse(data)) : reject(new Error(data));
                    });
                }
            );
            req.on('error', reject);
            req.write(body);
            req.end();
        });
    }
    
    // Без картинки - звичайний текст
    const body = JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            `https://api.telegram.org/bot${CONFIG.telegram.token}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            },
            (res) => {
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const data = Buffer.concat(chunks).toString('utf8');
                    res.statusCode === 200 ? resolve(JSON.parse(data)) : reject(new Error(data));
                });
            }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ==================== SAVE & DEPLOY ====================
function saveArticles(articles) {
    // Перевіряємо де знаходиться articles.json (локально або на GitHub Actions)
    const localPath = path.join(__dirname, 'website', 'data', 'articles.json');
    const githubPath = path.join(__dirname, 'data', 'articles.json');
    const articlesPath = fs.existsSync(localPath) ? localPath : githubPath;
    const websitePath = fs.existsSync(localPath) ? path.join(__dirname, 'website') : __dirname;
    
    let existing = [];
    if (fs.existsSync(articlesPath)) {
        existing = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    }
    
    const all = [...articles, ...existing];
    const unique = all.filter((a, i, arr) => 
        arr.findIndex(x => x.original_url === a.original_url) === i
    ).slice(0, 50);
    
    fs.writeFileSync(articlesPath, JSON.stringify(unique, null, 2), 'utf8');
    log(`Збережено ${unique.length} статей`, 'success');
    return unique;
}

function deployToGitHub() {
    try {
        // Перевіряємо де знаходиться website директорія
        const localWebsite = path.join(__dirname, 'website');
        const cwd = fs.existsSync(localWebsite) ? localWebsite : __dirname;
        execSync('git add data/articles.json', { cwd, stdio: 'pipe' });
        execSync(`git commit -m "Update articles ${new Date().toISOString()}"`, { cwd, stdio: 'pipe' });
        execSync('git push nord-news main', { cwd, stdio: 'pipe' });
        log('Сайт оновлено на GitHub Pages (nord-news-ua)', 'success');
        return true;
    } catch (error) {
        log('GitHub деплой: немає нових змін', 'info');
        return false;
    }
}

// ==================== VERIFY ARTICLE ====================
async function verifyArticle(slug, maxAttempts = 12) {
    const url = `https://ttrt2517-ship-it.github.io/nord-news-ua/data/articles.json`;
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(url);
            if (response.status === 200) {
                const articles = JSON.parse(response.data);
                const found = articles.some(a => a.slug === slug);
                if (found) {
                    log(`✓ Стаття доступна на сайті (спроба ${i + 1})`, 'success');
                    return true;
                }
            }
        } catch (error) {
            // Ignore
        }
        
        log(`⏳ Очікування GitHub Pages... (${i + 1}/${maxAttempts})`, 'warning');
        await sleep(15000); // Чекаємо 15 сек між спробами
    }
    
    return false;
}

// ==================== MAIN ====================
async function main() {
    console.log('\n🚀 НОРД — Запуск системи v2.1\n');
    const startTime = Date.now();
    
    // Перевірка rate limit
    const state = loadState();
    const postCheck = canPost(state);
    
    if (!postCheck.canPost) {
        log(`⏸️ Публікація пропущена: ${postCheck.reason}`, 'warning');
        return { skipped: true, reason: postCheck.reason };
    }
    
    log(`✓ Перевірка пройдена: ${postCheck.reason}`, 'success');
    
    const stats = {
        startedAt: new Date().toISOString(),
        duplicates: 0,
        articlesGenerated: 0,
        sitePublished: 0,
        telegramPosts: 0,
        errors: []
    };
    
    try {
        // Load existing articles
        const existingArticles = loadExistingArticles();
        log(`В базі ${existingArticles.length} статей`);
        
        // 1. Parse RSS
        log('📡 Парсинг RSS-потоків...');
        const allItems = [];
        
        for (const source of CONFIG.sources) {
            try {
                log(`   ${source.name}...`);
                const response = await fetch(source.url);
                if (response.status === 200) {
                    const items = parseRSS(response.data);
                    const filtered = filterByKeywords(items, CONFIG.keywords);
                    
                    // Filter duplicates
                    const newItems = filtered.filter(item => !isDuplicate(item.link, existingArticles, item.title));
                    
                    filtered.forEach(item => {
                        item.sourceName = source.name;
                        item.lang = source.lang;
                    });
                    
                    log(`      Знайдено: ${items.length}, після фільтру: ${filtered.length}, нових: ${newItems.length}`);
                    allItems.push(...newItems);
                    
                    stats.duplicates += filtered.length - newItems.length;
                }
            } catch (error) {
                log(`   Помилка: ${error.message}`, 'error');
                stats.errors.push({ source: source.name, error: error.message });
            }
            await sleep(500);
        }
        
        log(`\n📊 Нових статей: ${allItems.length}\n`);
        
        if (allItems.length === 0) {
            log('Немає нових статей для публікації', 'warning');
            return stats;
        }
        
        // 2. Process items
        const articles = [];
        const toProcess = allItems.slice(0, CONFIG.maxPosts);
        
        for (let i = 0; i < toProcess.length; i++) {
            const item = toProcess[i];
            log(`📝 [${i + 1}/${toProcess.length}] ${item.title.substring(0, 50)}...`);
            
            // Translate
            const translatedTitle = await translate(item.title, 'uk', item.lang === 'en' ? 'en' : 'no');
            const translatedContent = await translate(item.description, 'uk', item.lang === 'en' ? 'en' : 'no');
            
            // Generate article
            const article = await generateArticle(item, {
                title: translatedTitle,
                content: translatedContent
            });
            
            articles.push(article);
            log(`   Перекладено + картинка`, 'success');
        }
        
        stats.articlesGenerated = articles.length;
        
        // 3. Save to website
        log('\n💾 Збереження на сайт...');
        saveArticles(articles);
        
        // 4. Deploy to GitHub
        log('\n🌐 Деплой на GitHub...');
        const deployed = deployToGitHub();
        
        if (!deployed) {
            log('Пропускаємо публікацію в Telegram (сайт не оновлено)', 'error');
            return stats;
        }
        
        // 6. Wait 3 minutes for GitHub Pages cache to update
        log('\n⏳ Очікування 3 хвилини (GitHub Pages cache)...');
        await sleep(180000);
        
        // 7. Post to Telegram
        log('\n📤 Публікація в Telegram...');
        
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            const post = generateTelegramPost(article);
            
            try {
                await sendToTelegram(CONFIG.telegram.chatId, post, article.image);
                log(`   [${i + 1}/${articles.length}] ✅ Опубліковано з картинкою`, 'success');
                stats.telegramPosts++;
                
                // Оновлюємо state
                const today = new Date().toISOString().split('T')[0];
                state.lastPostTime = Date.now();
                state.lastDate = today;
                state.postsToday = state.lastDate === today ? (state.postsToday || 0) + 1 : 1;
                saveState(state);
                
                if (i < articles.length - 1) {
                    log(`   ⏳ Очікування 5 хв...`);
                    await sleep(CONFIG.delayBetweenPosts);
                }
            } catch (error) {
                log(`   Помилка: ${error.message}`, 'error');
                stats.errors.push({ telegram: error.message });
            }
        }
        
    } catch (error) {
        log(`Критична помилка: ${error.message}`, 'error');
        stats.errors.push({ critical: error.message });
    }
    
    // Summary
    stats.duration = Math.round((Date.now() - startTime) / 1000) + 's';
    
    console.log('\n' + '='.repeat(50));
    console.log('✨ ГОТОВО!');
    console.log('='.repeat(50));
    console.log(`📰 Дублікатів відфільтровано: ${stats.duplicates}`);
    console.log(`📝 Статей оброблено: ${stats.articlesGenerated}`);
    console.log(`📤 Постів в Telegram: ${stats.telegramPosts}`);
    console.log(`⏱️ Час роботи: ${stats.duration}`);
    if (stats.errors.length > 0) {
        console.log(`❌ Помилок: ${stats.errors.length}`);
    }
    console.log('='.repeat(50) + '\n');
    
    return stats;
}

// Run
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
