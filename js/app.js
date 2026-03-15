/**
 * Nord News - GitHub Pages version
 */

// Theme toggle
const ThemeManager = {
    init() {
        const saved = localStorage.getItem('nord-theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        this.bindToggle();
    },

    bindToggle() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggle());
        }
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('nord-theme', next);
    }
};

// Articles loader
const ArticleManager = {
    async init() {
        const grid = document.getElementById('articles-grid');
        if (!grid) return;

        try {
            // Try to load from data/articles.json
            const response = await fetch('data/articles.json');
            if (response.ok) {
                const articles = await response.json();
                this.render(articles);
            } else {
                this.showEmpty();
            }
        } catch (error) {
            this.showEmpty();
        }
    },

    render(articles) {
        const grid = document.getElementById('articles-grid');
        
        if (!articles || articles.length === 0) {
            this.showEmpty();
            return;
        }

        grid.innerHTML = articles.slice(0, 12).map(article => `
            <article class="article-card">
                <div class="article-card-image" style="background-image: url('${article.image || 'https://source.unsplash.com/800x400/?norway'}')"></div>
                <div class="article-card-content">
                    <h3><a href="${article.url || article.original_url}" target="_blank">${this.escape(article.title)}</a></h3>
                    <p>${this.escape(article.excerpt || '').substring(0, 120)}...</p>
                    <div class="article-meta">
                        <span>${article.source_name || 'Норд'}</span>
                        <span>${this.formatDate(article.published_at)}</span>
                    </div>
                </div>
            </article>
        `).join('');
    },

    showEmpty() {
        const grid = document.getElementById('articles-grid');
        grid.innerHTML = `
            <div class="loading">
                <p>Новини будуть доступні незабаром!</p>
                <p style="margin-top: 1rem;">
                    <a href="https://t.me/nord_smm_bot" class="btn btn-primary" target="_blank">
                        Підписатись на Telegram
                    </a>
                </p>
            </div>
        `;
    },

    escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    ArticleManager.init();
});
