<?php
/**
 * Article Page - Individual article display
 * URL: /article/{slug}/
 */

define('DB_HOST', 'db5020016325.hosting-data.io');
define('DB_USER', 'dbu2700031');
define('DB_PASS', 'ho1iu23687069786a9s@!#');
define('DB_NAME', 'dbs15437376');

// Get slug from URL
$slug = $_GET['slug'] ?? '';

if (!$slug) {
    header('HTTP/1.0 404 Not Found');
    include '404.html';
    exit;
}

// Connect to database
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    die("Database error");
}

// Get article
$stmt = $pdo->prepare("
    SELECT * FROM articles 
    WHERE slug = ? AND published_at IS NOT NULL 
    LIMIT 1
");
$stmt->execute([$slug]);
$article = $stmt->fetch();

if (!$article) {
    header('HTTP/1.0 404 Not Found');
    include '404.html';
    exit;
}

// Increment views
$pdo->prepare("UPDATE articles SET views = views + 1 WHERE id = ?")
    ->execute([$article['id']]);

// Get related articles
$related = $pdo->prepare("
    SELECT title, slug, image_url, published_at
    FROM articles
    WHERE language = ? AND id != ? AND published_at IS NOT NULL
    ORDER BY published_at DESC
    LIMIT 3
");
$related->execute([$article['language'], $article['id']]);
$relatedArticles = $related->fetchAll();

// Meta tags
$title = htmlspecialchars($article['title']);
$description = htmlspecialchars(mb_substr($article['excerpt'] ?? $article['content'], 0, 160));
$url = "https://glf-bikube.info/article/{$article['slug']}/";
$image = $article['image_url'] ?: 'https://glf-bikube.info/images/og-default.jpg';
?>
<!DOCTYPE html>
<html lang="<?= $article['language'] === 'uk' ? 'uk' : $article['language'] ?>" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $title ?> — Норд</title>
    <meta name="description" content="<?= $description ?>">
    
    <!-- Open Graph -->
    <meta property="og:title" content="<?= $title ?>">
    <meta property="og:description" content="<?= $description ?>">
    <meta property="og:type" content="article">
    <meta property="og:url" content="<?= $url ?>">
    <meta property="og:image" content="<?= $image ?>">
    <meta property="og:locale" content="<?= $article['language'] === 'uk' ? 'uk_UA' : ($article['language'] === 'no' ? 'no_NO' : 'en_GB') ?>">
    <meta property="article:published_time" content="<?= $article['published_at'] ?>">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= $title ?>">
    <meta name="twitter:description" content="<?= $description ?>">
    
    <!-- Canonical -->
    <link rel="canonical" href="<?= $url ?>">
    
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-D28BSPKB28"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-D28BSPKB28');
    </script>
    
    <!-- Styles -->
    <link rel="stylesheet" href="../css/styles.css">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": "<?= addslashes($article['title']) ?>",
        "description": "<?= addslashes($description) ?>",
        "image": "<?= $image ?>",
        "datePublished": "<?= $article['published_at'] ?>",
        "dateModified": "<?= $article['created_at'] ?>",
        "author": {
            "@type": "Organization",
            "name": "Норд"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Норд",
            "logo": {
                "@type": "ImageObject",
                "url": "https://glf-bikube.info/logo.png"
            }
        }
    }
    </script>
</head>
<body>
    <!-- Header -->
    <header class="header">
        <div class="container">
            <a href="/" class="logo">
                <span class="logo-icon">🇳🇴</span>
                <span class="logo-text">Норд</span>
            </a>
            <nav class="nav">
                <a href="/" class="nav-link">Новини</a>
                <a href="/porady/" class="nav-link">Поради</a>
                <a href="/mova/" class="nav-link">Мова</a>
                <a href="/podii/" class="nav-link">Події</a>
            </nav>
            <div class="header-actions">
                <button class="theme-toggle" aria-label="Перемкнути тему">
                    <span class="theme-icon sun">☀️</span>
                    <span class="theme-icon moon">🌙</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main">
        <article class="article-full">
            <div class="container" style="max-width: 800px;">
                <!-- Breadcrumbs -->
                <nav class="breadcrumbs" style="margin-bottom: 1rem; font-size: 0.875rem; color: var(--text-muted);">
                    <a href="/">Головна</a> / 
                    <a href="/novyny/">Новини</a> / 
                    <span><?= mb_substr($article['title'], 0, 50) ?>...</span>
                </nav>
                
                <!-- Article Header -->
                <header class="article-header" style="margin-bottom: 2rem;">
                    <span class="category-badge"><?= $article['category'] ?? 'Новини' ?></span>
                    <h1 style="font-size: 2rem; line-height: 1.3; margin: 1rem 0;">
                        <?= htmlspecialchars($article['title']) ?>
                    </h1>
                    <div class="article-meta" style="display: flex; gap: 1rem; color: var(--text-muted); font-size: 0.875rem;">
                        <span>📰 <?= htmlspecialchars($article['source_name']) ?></span>
                        <span>🕐 <?= date('d.m.Y, H:i', strtotime($article['published_at'])) ?></span>
                        <span>👁️ <?= $article['views'] ?> переглядів</span>
                    </div>
                </header>
                
                <!-- Featured Image -->
                <?php if ($article['image_url']): ?>
                <div class="article-image" style="margin-bottom: 2rem;">
                    <img src="<?= htmlspecialchars($article['image_url']) ?>" 
                         alt="<?= htmlspecialchars($article['title']) ?>"
                         style="width: 100%; border-radius: 0.75rem;">
                </div>
                <?php endif; ?>
                
                <!-- Article Content -->
                <div class="article-content" style="font-size: 1.125rem; line-height: 1.8;">
                    <?= nl2br(htmlspecialchars($article['content'])) ?>
                </div>
                
                <!-- Tags -->
                <div class="article-tags" style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border-color);">
                    <strong>Теги:</strong>
                    <span class="tag">#Норвегія</span>
                    <span class="tag">#УкраїнціВНорвегії</span>
                    <?php if ($article['category']): ?>
                    <span class="tag">#<?= $article['category'] ?></span>
                    <?php endif; ?>
                </div>
                
                <!-- Share -->
                <div class="share-buttons" style="margin-top: 2rem; display: flex; gap: 0.5rem;">
                    <strong style="margin-right: 1rem;">Поділитись:</strong>
                    <a href="https://t.me/share/url?url=<?= urlencode($url) ?>&text=<?= urlencode($article['title']) ?>" 
                       target="_blank" class="btn btn-primary btn-sm">Telegram</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=<?= urlencode($url) ?>" 
                       target="_blank" class="btn btn-primary btn-sm">Facebook</a>
                    <a href="https://twitter.com/intent/tweet?url=<?= urlencode($url) ?>&text=<?= urlencode($article['title']) ?>" 
                       target="_blank" class="btn btn-primary btn-sm">Twitter</a>
                </div>
                
                <!-- Original Source -->
                <?php if ($article['original_url']): ?>
                <div class="original-source" style="margin-top: 2rem; padding: 1rem; background: var(--bg-secondary); border-radius: 0.5rem;">
                    <small style="color: var(--text-muted);">
                        📎 Оригінал: <a href="<?= htmlspecialchars($article['original_url']) ?>" target="_blank" rel="nofollow">
                            <?= htmlspecialchars($article['source_name']) ?> ↗
                        </a>
                    </small>
                </div>
                <?php endif; ?>
                
                <!-- Related Articles -->
                <?php if ($relatedArticles): ?>
                <section class="related-articles" style="margin-top: 3rem;">
                    <h2 style="margin-bottom: 1rem;">Читати також</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                        <?php foreach ($relatedArticles as $rel): ?>
                        <a href="/article/<?= htmlspecialchars($rel['slug']) ?>/" class="article-card" style="text-decoration: none;">
                            <div class="article-card-image" style="background-image: url('<?= htmlspecialchars($rel['image_url']) ?>')"></div>
                            <div class="article-card-content">
                                <h3 style="font-size: 1rem; color: var(--text-primary);">
                                    <?= htmlspecialchars(mb_substr($rel['title'], 0, 60)) ?>...
                                </h3>
                                <small style="color: var(--text-muted);">
                                    <?= date('d.m.Y', strtotime($rel['published_at'])) ?>
                                </small>
                            </div>
                        </a>
                        <?php endforeach; ?>
                    </div>
                </section>
                <?php endif; ?>
            </div>
        </article>
    </main>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <div style="text-align: center; padding: 2rem 0;">
                <p style="color: var(--text-muted);">© 2026 Норд. Новини Норвегії українською.</p>
            </div>
        </div>
    </footer>

    <script src="../js/app.js"></script>
</body>
</html>
