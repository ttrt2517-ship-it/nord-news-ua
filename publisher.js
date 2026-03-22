/**
 * PUBLISHER.JS — Публікація статей за розкладом
 * 
 * Запускається о 09:00, 12:00, 15:00, 18:00, 21:00
 * Бере статтю з черги, публікує в Telegram + сайт
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
    }
};

// ==================== UTILS ====================
function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString('uk-UA');
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '📌';
    console.log(`[${time}] ${prefix} ${msg}`);
}

function truncateToWord(text, maxLen = 180) {
    if (!text || text.length <= maxLen) return text || '';
    let truncated = text.substring(0, maxLen);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLen * 0.7) {
        truncated = truncated.substring(0, lastSpace);
    }
    truncated = truncated.replace(/[,\s\-–—:;]+$/, '');
    return truncated + '...';
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
}

function loadArticles() {
    const articlesPath = path.join(__dirname, 'data', 'articles.json');
    if (fs.existsSync(articlesPath)) {
        return JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    }
    return [];
}

function saveArticles(articles) {
    const articlesPath = path.join(__dirname, 'data', 'articles.json');
    const dataDir = path.dirname(articlesPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf8');
}

// ==================== TELEGRAM ====================
function generateTelegramPost(article) {
    // Повний текст для Telegram без обрізання
    const articleUrl = `https://ttrt2517-ship-it.github.io/nord-news-ua/article.html?slug=${article.slug}`;
    
    // Беремо повний excerpt (до 950 символів - ліміт Telegram caption)
    let text = article.excerpt || article.content || '';
    if (text.length > 950) {
        // Якщо дуже довго, обрізаємо до повного слова без "..."
        text = text.substring(0, 950);
        const lastSpace = text.lastIndexOf(' ');
        if (lastSpace > 800) {
            text = text.substring(0, lastSpace);
        }
    }
    
    return `📰 <b>${article.title}</b>

${text}

🔗 <a href="${articleUrl}">Читати повністю на сайті</a>

#Норвегія #УкраїнціВНорвегії`;
}

async function sendToTelegram(chatId, text, imageUrl = null) {
    const body = JSON.stringify(
        imageUrl 
            ? { chat_id: chatId, photo: imageUrl, caption: text, parse_mode: 'HTML' }
            : { chat_id: chatId, text: text, parse_mode: 'HTML', disable_web_page_preview: false }
    );

    const endpoint = imageUrl ? 'sendPhoto' : 'sendMessage';

    return new Promise((resolve, reject) => {
        const req = https.request(
            `https://api.telegram.org/bot${CONFIG.telegram.token}/${endpoint}`,
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

// ==================== GITHUB DEPLOY ====================
function deployToGitHub() {
    try {
        // Publisher вже в website/, тому використовуємо поточну директорію
        const cwd = __dirname;
        execSync('git add data/articles.json', { cwd, stdio: 'pipe' });
        execSync(`git commit -m "Publish article ${new Date().toISOString()}"`, { cwd, stdio: 'pipe' });
        execSync('git push nord-news main', { cwd, stdio: 'pipe' });
        log('Сайт оновлено на GitHub Pages', 'success');
        return true;
    } catch (error) {
        log('GitHub деплой: немає нових змін або помилка', 'info');
        log(`Помилка: ${error.message}`, 'warning');
        return false;
    }
}

// ==================== MAIN ====================
async function main() {
    console.log('\n📤 PUBLISHER — Публікація статей\n');
    
    const queue = loadQueue();
    
    // Знаходимо першу статтю зі статусом pending
    const article = queue.articles.find(a => a.status === 'pending');
    
    if (!article) {
        log('Немає статей для публікації', 'warning');
        return;
    }
    
    log(`Публікація: ${article.title}`);
    
    try {
        // 1. Додаємо статтю на сайт
        const articles = loadArticles();
        article.published_at = new Date().toISOString();
        article.status = 'published';
        articles.unshift(article);
        saveArticles(articles.slice(0, 50));
        log('Стаття збережена для сайту', 'success');
        
        // 2. Публікуємо в Telegram
        const post = generateTelegramPost(article);
        await sendToTelegram(CONFIG.telegram.chatId, post, article.image);
        log('Опубліковано в Telegram', 'success');
        
        // 3. Оновлюємо чергу
        const index = queue.articles.findIndex(a => a.id === article.id);
        if (index !== -1) {
            queue.articles[index] = article;
        }
        queue.stats.totalPublished++;
        queue.stats.lastPublish = new Date().toISOString();
        saveQueue(queue);
        
        // 4. Деплоїмо на GitHub (workflow зробить git push)
        log('Файли готові для коміту в GitHub', 'success');
        
        console.log(`\n✅ Стаття опублікована успішно!`);
        console.log(`   URL: https://ttrt2517-ship-it.github.io/nord-news-ua/article.html?slug=${article.slug}`);
        
    } catch (error) {
        log(`Помилка публікації: ${error.message}`, 'error');
        
        // Повертаємо статус pending
        article.status = 'pending';
        article.published_at = null;
        saveQueue(queue);
        
        process.exit(1);
    }
}

main().catch(console.error);
