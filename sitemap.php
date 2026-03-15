<?php
/**
 * Dynamic Sitemap Generator
 * Generates sitemap.xml from database articles
 */

header('Content-Type: application/xml; charset=utf-8');

define('DB_HOST', 'db5020016325.hosting-data.io');
define('DB_USER', 'dbu2700031');
define('DB_PASS', 'ho1iu23687069786a9s@!#');
define('DB_NAME', 'dbs15437376');

try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    // Fallback to static sitemap
    readfile('sitemap.xml');
    exit;
}

// Get articles
$articles = $pdo->query("
    SELECT slug, published_at, language
    FROM articles
    WHERE published_at IS NOT NULL
    ORDER BY published_at DESC
    LIMIT 1000
")->fetchAll();

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

    <!-- Homepage -->
    <url>
        <loc>https://glf-bikube.info/</loc>
        <lastmod><?= date('Y-m-d') ?></lastmod>
        <changefreq>hourly</changefreq>
        <priority>1.0</priority>
        <xhtml:link rel="alternate" hreflang="uk" href="https://glf-bikube.info/?lang=ua"/>
        <xhtml:link rel="alternate" hreflang="no" href="https://glf-bikube.info/?lang=no"/>
        <xhtml:link rel="alternate" hreflang="en" href="https://glf-bikube.info/?lang=en"/>
    </url>

    <!-- Categories -->
    <url>
        <loc>https://glf-bikube.info/novyny/</loc>
        <changefreq>hourly</changefreq>
        <priority>0.9</priority>
    </url>

    <!-- Articles -->
    <?php foreach ($articles as $article): ?>
    <url>
        <loc>https://glf-bikube.info/article/<?= htmlspecialchars($article['slug']) ?>/</loc>
        <lastmod><?= date('Y-m-d', strtotime($article['published_at'])) ?></lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
        <?php if ($article['language']): ?>
        <xhtml:link rel="alternate" hreflang="<?= $article['language'] === 'uk' ? 'uk' : $article['language'] ?>" 
                    href="https://glf-bikube.info/article/<?= htmlspecialchars($article['slug']) ?>/"/>
        <?php endif; ?>
    </url>
    <?php endforeach; ?>

</urlset>
