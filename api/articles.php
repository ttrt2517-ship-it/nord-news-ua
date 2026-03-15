<?php
/**
 * API - Articles
 * GET /api/articles.php?lang=ua&page=1
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Database config
define('DB_HOST', 'db5020016325.hosting-data.io');
define('DB_USER', 'dbu2700031');
define('DB_PASS', 'ho1iu23687069786a9s@!#');
define('DB_NAME', 'dbs15437376');

// Connect to database
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Get parameters
$lang = $_GET['lang'] ?? 'ua';
$page = max(1, intval($_GET['page'] ?? 1));
$perPage = 9;
$offset = ($page - 1) * $perPage;

// Validate language
$allowedLangs = ['ua', 'no', 'en'];
if (!in_array($lang, $allowedLangs)) {
    $lang = 'ua';
}

// Map language code
$langMap = [
    'ua' => 'uk',
    'no' => 'no',
    'en' => 'en'
];
$dbLang = $langMap[$lang];

try {
    // Get featured article
    $featuredStmt = $pdo->prepare("
        SELECT id, title, slug, excerpt, image_url as image, source_name as source, 
               category, published_at
        FROM articles
        WHERE language = ? AND is_featured = 1 AND published_at IS NOT NULL
        ORDER BY published_at DESC
        LIMIT 1
    ");
    $featuredStmt->execute([$dbLang]);
    $featured = $featuredStmt->fetch();
    
    // Get articles (excluding featured)
    $excludeId = $featured ? $featured['id'] : 0;
    $articlesStmt = $pdo->prepare("
        SELECT title, slug, excerpt, image_url as image, source_name as source,
               category, published_at
        FROM articles
        WHERE language = ? AND id != ? AND published_at IS NOT NULL
        ORDER BY published_at DESC
        LIMIT ? OFFSET ?
    ");
    $articlesStmt->execute([$dbLang, $excludeId, $perPage, $offset]);
    $articles = $articlesStmt->fetchAll();
    
    echo json_encode([
        'featured' => $featured ?: null,
        'articles' => $articles,
        'page' => $page,
        'hasMore' => count($articles) === $perPage
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Query failed']);
}
