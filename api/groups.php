<?php
/**
 * API - Groups
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
                $name = $_POST['name'] ?? '';
                $chatId = $_POST['chat_id'] ?? '';
                $language = $_POST['language'] ?? 'uk';
                
                if ($name && $chatId) {
                    $stmt = $pdo->prepare("
                        INSERT INTO telegram_groups (name, chat_id, language, is_active)
                        VALUES (?, ?, ?, 1)
                    ");
                    $stmt->execute([$name, $chatId, $language]);
                    
                    header('Location: ../admin/');
                    exit;
                }
            }
            break;
            
        case 'list':
        default:
            $stmt = $pdo->query("SELECT * FROM telegram_groups ORDER BY id");
            echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);
            break;
    }
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
