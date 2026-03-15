<?php
/**
 * API - Products
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

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
    echo json_encode(['error' => 'Database error']);
    exit;
}

$action = $_GET['action'] ?? 'list';

try {
    switch ($action) {
        case 'add':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $title = $_POST['title'] ?? '';
                $url = $_POST['url'] ?? '';
                $description = $_POST['description'] ?? '';
                $priority = intval($_POST['priority'] ?? 0);
                
                if ($title && $url) {
                    $stmt = $pdo->prepare("
                        INSERT INTO products (title, url, description, display_priority, is_active)
                        VALUES (?, ?, ?, ?, 1)
                    ");
                    $stmt->execute([$title, $url, $description, $priority]);
                    
                    header('Location: ../admin/');
                    exit;
                }
            }
            break;
            
        case 'list':
        default:
            $stmt = $pdo->query("
                SELECT id, title, description, url, image_url, display_priority, is_active
                FROM products
                WHERE is_active = 1
                ORDER BY display_priority DESC
            ");
            echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
