/**
 * PARSER.JS — Збір статей з RSS
 * 
 * Запускається кожні 2 години
 * Парсить RSS, перекладає, зберігає в чергу
 * НЕ публікує!
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIG ====================
const CONFIG = {
    translate: {
        apiKey: process.env.TRANSLATE_API_KEY
    },
    unsplash: {
        accessKey: process.env.UNSPLASH_ACCESS_KEY
    },
    sources: [
        { name: 'NRK Nyheter', url: 'https://www.nrk.no/nyheter/siste.rss', lang: 'no' },
        { name: 'The Local Norway', url: 'https://feeds.thelocal.com/rss/no', lang: 'en' }
    ],
    keywords: [
        'Ukraina', 'ukrainsk', 'flyktning', 'krig', 'NATO',
        'energi', 'strøm', 'pris', 'økonomi', 'inflasjon', 'rente', 'krone',
        'politikk', 'regjering', 'storting', 'valg',
        'immigr', 'språk', 'samfunn', 'innvandr',
        'bolig', 'leie', 'jobb', 'arbeid', 'lønn', 'hus',
        'helse', 'sykehus', 'utdanning', 'skole',
        'transport', 'tog', 'fly', 'vei',
        'skatt'
    ]
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

function truncateToWord(text, maxLen = 300) {
    if (!text || text.length <= maxLen) return text || '';
    let truncated = text.substring(0, maxLen);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLen * 0.7) {
        truncated = truncated.substring(0, lastSpace);
    }
    truncated = truncated.replace(/[,\s\-–—:;]+$/, '');
    return truncated + '...';
}

function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\sа-яіїєґ]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60);
}

// ==================== DATABASE ====================
function loadQueue() {
    const queuePath = path.join(__dirname, 'database', 'queue.json');
    if (fs.existsSync(queuePath)) {
        return JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    }
    return { articles: [], stats: { totalFetched: 0, totalPublished: 0, lastFetch: null, lastPublish: null } };
}

function saveQueue(queue) {
    const queuePath = path.join(__dirname, 'database', 'queue.json');
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2), 'utf8');
    log(`Черга збережена: ${queue.articles.length} статей`, 'success');
}

function isDuplicate(url, queue) {
    return queue.articles.some(a => a.original_url === url);
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

// ==================== FETCH FULL ARTICLE ====================
async function fetchFullArticle(url) {
    return new Promise((resolve) => {
        https.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const data = Buffer.concat(chunks).toString('utf8');
                try {
                    let text = data;
                    text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
                    text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
                    text = text.replace(/<!--[\s\S]*?-->/g, '');
                    
                    const articleMatch = text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
                    const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
                    let content = articleMatch?.[1] || mainMatch?.[1] || text;
                    
                    const paragraphs = [];
                    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
                    let match;
                    
                    while ((match = pRegex.exec(content)) !== null) {
                        let p = match[1]
                            .replace(/<[^>]+>/g, '')
                            .replace(/&nbsp;/g, ' ')
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .trim();
                        if (p.length > 50) paragraphs.push(p);
                    }
                    
                    resolve(paragraphs.join('\n\n'));
                } catch (error) {
                    resolve('');
                }
            });
        }).on('error', () => resolve(''));
    });
}

// ==================== UNSPLASH ====================
async function getImage(query) {
    if (!CONFIG.unsplash.accessKey) return null;
    
    try {
        const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${CONFIG.unsplash.accessKey}`;
        const response = await fetch(url);
        if (response.status === 200) {
            const data = JSON.parse(response.data);
            return data.urls?.regular || null;
        }
    } catch (error) {
        log(`Unsplash error: ${error.message}`, 'warning');
    }
    return null;
}

// ==================== MAIN ====================
async function main() {
    console.log('\n📥 PARSER — Збір статей\n');
    const startTime = Date.now();
    
    const queue = loadQueue();
    let newCount = 0;
    
    for (const source of CONFIG.sources) {
        log(`Джерело: ${source.name}`);
        
        try {
            const response = await fetch(source.url);
            if (response.status !== 200) {
                log(`Помилка ${response.status}`, 'error');
                continue;
            }
            
            const items = parseRSS(response.data);
            log(`Знайдено: ${items.length} статей`);
            
            const filtered = filterByKeywords(items, CONFIG.keywords);
            log(`Після фільтра: ${filtered.length} статей`);
            
            for (const item of filtered.slice(0, 3)) {
                if (isDuplicate(item.link, queue)) {
                    log(`  Пропуск (дублікат): ${item.title.substring(0, 50)}...`, 'warning');
                    continue;
                }
                
                log(`  Обробка: ${item.title.substring(0, 50)}...`);
                
                // Отримуємо повний текст
                const fullText = await fetchFullArticle(item.link);
                if (!fullText || fullText.length < 200) {
                    log(`  Пропуск (короткий текст)`, 'warning');
                    continue;
                }
                
                // Переклад
                const translatedTitle = await translate(item.title, 'uk', source.lang === 'en' ? 'en' : 'no');
                const translatedContent = await translate(fullText, 'uk', source.lang === 'en' ? 'en' : 'no');
                
                // Зображення
                const keywords = translatedTitle.split(' ').slice(0, 3).join(',');
                const image = await getImage(`norway,${keywords}`);
                
                // Створюємо статтю
                const article = {
                    id: Date.now() + Math.random(),
                    title: translatedTitle,
                    slug: generateSlug(translatedTitle),
                    content: translatedContent,
                    excerpt: truncateToWord(translatedContent, 300),
                    image: image,
                    original_url: item.link,
                    source_name: source.name,
                    fetched_at: new Date().toISOString(),
                    published_at: null,
                    status: 'pending'
                };
                
                queue.articles.unshift(article);
                newCount++;
                log(`  ✅ Додано в чергу`, 'success');
                
                await sleep(1000);
            }
        } catch (error) {
            log(`Помилка: ${error.message}`, 'error');
        }
    }
    
    // Обрізаємо чергу до 50 статей
    queue.articles = queue.articles.slice(0, 50);
    
    // Оновлюємо статистику
    queue.stats.totalFetched += newCount;
    queue.stats.lastFetch = new Date().toISOString();
    
    saveQueue(queue);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n📊 Готово за ${elapsed}с`);
    console.log(`   Нових статей: ${newCount}`);
    console.log(`   В черзі: ${queue.articles.filter(a => a.status === 'pending').length}`);
}

main().catch(console.error);
