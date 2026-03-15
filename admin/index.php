<?php
/**
 * Admin Panel + Dashboard — Combined
 */

session_start();

// Simple auth (in production, use proper auth)
$adminPassword = 'nord2026admin'; // Change this!

if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: ?');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
    if ($_POST['password'] === $adminPassword) {
        $_SESSION['admin_logged_in'] = true;
    } else {
        $error = 'Невірний пароль';
    }
}

if (!isset($_SESSION['admin_logged_in']) || !$_SESSION['admin_logged_in']) {
    ?>
    <!DOCTYPE html>
    <html lang="uk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Норд — Вхід</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .login-box {
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                width: 100%;
                max-width: 400px;
            }
            h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
            p { color: #64748b; margin-bottom: 1.5rem; }
            .error { color: #ef4444; margin-bottom: 1rem; }
            input {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #e2e8f0;
                border-radius: 0.5rem;
                font-size: 1rem;
                margin-bottom: 1rem;
            }
            button {
                width: 100%;
                padding: 0.75rem;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-size: 1rem;
                cursor: pointer;
            }
            button:hover { background: #2563eb; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h1>🇳🇴 Норд</h1>
            <p>Адмін-панель</p>
            <?php if (isset($error)): ?>
                <p class="error"><?= $error ?></p>
            <?php endif; ?>
            <form method="POST">
                <input type="password" name="password" placeholder="Пароль" required>
                <button type="submit">Увійти</button>
            </form>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Database connection
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
    die("Database error: " . $e->getMessage());
}

// Get stats
$statsToday = $pdo->query("SELECT COUNT(*) FROM articles WHERE DATE(created_at) = CURDATE()")->fetchColumn();
$statsWeek = $pdo->query("SELECT COUNT(*) FROM articles WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")->fetchColumn();
$statsTotal = $pdo->query("SELECT COUNT(*) FROM articles")->fetchColumn();
$statsViews = $pdo->query("SELECT COALESCE(SUM(views), 0) FROM articles")->fetchColumn();

// Get recent articles
$recentArticles = $pdo->query("
    SELECT id, title, source_name, published_at, views, is_featured, language
    FROM articles
    ORDER BY created_at DESC
    LIMIT 15
")->fetchAll();

// Get telegram groups
$groups = $pdo->query("SELECT * FROM telegram_groups ORDER BY id")->fetchAll();

// Get products
$products = $pdo->query("SELECT * FROM products ORDER BY display_priority DESC")->fetchAll();

// Get bot logs (from JSON file if exists)
$botLogs = [];
$logsFile = __DIR__ . '/../data/bot-logs.json';
if (file_exists($logsFile)) {
    $botLogs = json_decode(file_get_contents($logsFile), true) ?: [];
    $botLogs = array_slice(array_reverse($botLogs), 0, 20);
}
?>
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Норд — Адмін + Дашборд</title>
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-D28BSPKB28"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-D28BSPKB28');
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: #3b82f6;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --dark: #0f172a;
            --gray: #64748b;
            --light: #f8fafc;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--light);
            color: var(--dark);
            min-height: 100vh;
        }
        
        /* Header */
        .header {
            background: white;
            border-bottom: 1px solid #e2e8f0;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header h1 { font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .header-right { display: flex; align-items: center; gap: 1rem; }
        .status-dot {
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .logout { color: var(--danger); text-decoration: none; font-size: 0.875rem; }
        
        /* Container */
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-left: 4px solid var(--primary);
        }
        .stat-card.success { border-color: var(--success); }
        .stat-card.warning { border-color: var(--warning); }
        .stat-card h3 { font-size: 0.75rem; color: var(--gray); margin-bottom: 0.5rem; text-transform: uppercase; }
        .stat-card .value { font-size: 2rem; font-weight: 700; }
        .stat-card .change { font-size: 0.75rem; color: var(--success); margin-top: 0.25rem; }
        
        /* Tabs */
        .tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 2rem;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 1rem;
            overflow-x: auto;
        }
        .tab {
            padding: 0.5rem 1rem;
            background: none;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.875rem;
            color: var(--gray);
            white-space: nowrap;
        }
        .tab:hover { background: #e2e8f0; }
        .tab.active { background: var(--primary); color: white; }
        
        /* Section */
        .section {
            background: white;
            border-radius: 0.75rem;
            padding: 1.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 1.5rem;
        }
        .section h2 { font-size: 1.125rem; margin-bottom: 1rem; }
        
        /* Table */
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { font-weight: 600; color: var(--gray); font-size: 0.75rem; text-transform: uppercase; }
        tr:hover { background: #f8fafc; }
        
        /* Buttons */
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
        }
        .btn-primary { background: var(--primary); color: white; }
        .btn-success { background: var(--success); color: white; }
        .btn-warning { background: var(--warning); color: white; }
        .btn-danger { background: var(--danger); color: white; }
        .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
        .btn:hover { opacity: 0.9; }
        
        /* Badge */
        .badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.7rem;
            font-weight: 600;
        }
        .badge-blue { background: #dbeafe; color: #1d4ed8; }
        .badge-green { background: #d1fae5; color: #059669; }
        .badge-yellow { background: #fef3c7; color: #d97706; }
        .badge-red { background: #fee2e2; color: #dc2626; }
        
        /* Info Box */
        .info-box {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 1rem;
        }
        .info-box h4 { color: #0369a1; margin-bottom: 0.5rem; }
        .info-box p { margin-bottom: 0.25rem; font-size: 0.875rem; }
        .info-box code { background: white; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.8rem; }
        
        /* Form */
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; font-size: 0.875rem; }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #e2e8f0;
            border-radius: 0.375rem;
            font-size: 0.875rem;
        }
        
        /* Log */
        .log-item {
            font-family: monospace;
            font-size: 0.8rem;
            padding: 0.5rem 0.75rem;
            border-left: 3px solid var(--success);
            margin-bottom: 0.5rem;
            background: #f8fafc;
            border-radius: 0 0.25rem 0.25rem 0;
        }
        .log-item.error { border-color: var(--danger); }
        .log-item.warning { border-color: var(--warning); }
        .log-time { color: var(--gray); }
        
        /* Quick Actions */
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .action-card {
            background: white;
            padding: 1rem;
            border-radius: 0.75rem;
            text-align: center;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid #e2e8f0;
        }
        .action-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .action-card .icon { font-size: 2rem; margin-bottom: 0.5rem; }
        .action-card .label { font-weight: 500; font-size: 0.875rem; }
        
        .hidden { display: none !important; }
        
        /* Responsive */
        @media (max-width: 768px) {
            .container { padding: 1rem; }
            .form-row { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header class="header">
        <h1>🇳🇴 Норд <span style="color: var(--gray); font-weight: 400;">— Адмін</span></h1>
        <div class="header-right">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="status-dot"></div>
                <span style="font-size: 0.75rem; color: var(--gray);">Система активна</span>
            </div>
            <a href="?logout=1" class="logout">Вийти</a>
        </div>
    </header>
    
    <div class="container">
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Сьогодні</h3>
                <div class="value"><?= $statsToday ?></div>
                <div class="change">публікацій</div>
            </div>
            <div class="stat-card success">
                <h3>Цього тижня</h3>
                <div class="value"><?= $statsWeek ?></div>
                <div class="change">публікацій</div>
            </div>
            <div class="stat-card">
                <h3>Всього статей</h3>
                <div class="value"><?= $statsTotal ?></div>
            </div>
            <div class="stat-card warning">
                <h3>Переглядів</h3>
                <div class="value"><?= number_format($statsViews) ?></div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="quick-actions">
            <div class="action-card" onclick="runBot()">
                <div class="icon">▶️</div>
                <div class="label">Запустити бота</div>
            </div>
            <div class="action-card" onclick="showTab('articles')">
                <div class="icon">📰</div>
                <div class="label">Статті</div>
            </div>
            <div class="action-card" onclick="showTab('groups')">
                <div class="icon">👥</div>
                <div class="label">Групи</div>
            </div>
            <div class="action-card" onclick="showTab('analytics')">
                <div class="icon">📊</div>
                <div class="label">Аналітика</div>
            </div>
        </div>
        
        <!-- Tabs -->
        <div class="tabs">
            <button class="tab active" onclick="showTab('dashboard')">📊 Дашборд</button>
            <button class="tab" onclick="showTab('articles')">📰 Статті</button>
            <button class="tab" onclick="showTab('groups')">👥 Групи</button>
            <button class="tab" onclick="showTab('products')">🎯 Продукти</button>
            <button class="tab" onclick="showTab('analytics')">📈 Аналітика</button>
            <button class="tab" onclick="showTab('settings')">⚙️ Налаштування</button>
            <button class="tab" onclick="showTab('roadmap')">🗺️ Roadmap</button>
        </div>
        
        <!-- Dashboard Tab -->
        <div id="tab-dashboard" class="tab-content">
            <div class="section">
                <h2>🤖 Останні запуски бота</h2>
                <?php if (empty($botLogs)): ?>
                    <p style="color: var(--gray);">Поки немає логів. Запустіть бота.</p>
                <?php else: ?>
                    <?php foreach ($botLogs as $log): ?>
                        <div class="log-item <?= $log['level'] ?? '' ?>">
                            <span class="log-time">[<?= date('H:i', strtotime($log['timestamp'])) ?>]</span>
                            <?= htmlspecialchars($log['message']) ?>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            
            <div class="section">
                <h2>📰 Останні статті</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Заголовок</th>
                            <th>Джерело</th>
                            <th>Мова</th>
                            <th>Час</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach (array_slice($recentArticles, 0, 5) as $article): ?>
                        <tr>
                            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                                <?= htmlspecialchars(mb_substr($article['title'], 0, 60)) ?>
                                <?php if ($article['is_featured']): ?>
                                    <span class="badge badge-yellow">⭐</span>
                                <?php endif; ?>
                            </td>
                            <td><?= htmlspecialchars($article['source_name']) ?></td>
                            <td><span class="badge badge-blue"><?= $article['language'] ?></span></td>
                            <td style="font-size: 0.75rem; color: var(--gray);">
                                <?= $article['published_at'] ? date('d.m H:i', strtotime($article['published_at'])) : '—' ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Articles Tab -->
        <div id="tab-articles" class="tab-content hidden">
            <div class="section">
                <h2>Всі статті</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Заголовок</th>
                            <th>Джерело</th>
                            <th>Мова</th>
                            <th>Перегляди</th>
                            <th>Опубліковано</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recentArticles as $article): ?>
                        <tr>
                            <td style="max-width: 300px;">
                                <?= htmlspecialchars(mb_substr($article['title'], 0, 50)) ?>...
                                <?php if ($article['is_featured']): ?>
                                    <span class="badge badge-yellow">Головна</span>
                                <?php endif; ?>
                            </td>
                            <td><?= htmlspecialchars($article['source_name']) ?></td>
                            <td><span class="badge badge-blue"><?= $article['language'] ?></span></td>
                            <td><?= $article['views'] ?></td>
                            <td style="font-size: 0.75rem;">
                                <?= $article['published_at'] ? date('d.m H:i', strtotime($article['published_at'])) : '—' ?>
                            </td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="featureArticle(<?= $article['id'] ?>)">⭐</button>
                                <button class="btn btn-warning btn-sm" onclick="markTop(<?= $article['id'] ?>)">📊</button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Groups Tab -->
        <div id="tab-groups" class="tab-content hidden">
            <div class="section">
                <h2>Telegram групи</h2>
                
                <div class="info-box">
                    <h4>📖 Як додати групу</h4>
                    <p>1. Створи бота через <a href="https://t.me/BotFather" target="_blank">@BotFather</a></p>
                    <p>2. Додай бота в групу як адміна</p>
                    <p>3. Дізнайся Chat ID через <a href="https://t.me/getidsbot" target="_blank">@getidsbot</a></p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Назва</th>
                            <th>Chat ID</th>
                            <th>Мова</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($groups as $group): ?>
                        <tr>
                            <td><?= htmlspecialchars($group['name']) ?></td>
                            <td><code><?= $group['chat_id'] ?></code></td>
                            <td><span class="badge badge-blue"><?= strtoupper($group['language']) ?></span></td>
                            <td>
                                <span class="badge <?= $group['is_active'] ? 'badge-green' : 'badge-red' ?>">
                                    <?= $group['is_active'] ? 'Активна' : 'Вимкнена' ?>
                                </span>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                
                <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Додати групу</h3>
                <form method="POST" action="api/groups.php">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Назва групи</label>
                            <input type="text" name="name" placeholder="Українці в Осло" required>
                        </div>
                        <div class="form-group">
                            <label>Chat ID</label>
                            <input type="text" name="chat_id" placeholder="-1001234567890" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Мова контенту</label>
                        <select name="language">
                            <option value="uk">🇺🇦 Українська</option>
                            <option value="no">🇳🇴 Норвезька</option>
                            <option value="en">🇬🇧 Англійська</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Додати групу</button>
                </form>
            </div>
        </div>
        
        <!-- Products Tab -->
        <div id="tab-products" class="tab-content hidden">
            <div class="section">
                <h2>Твої продукти</h2>
                
                <div class="info-box">
                    <h4>💡 Про продукти</h4>
                    <p>Ці продукти будуть відображатися на сайті та в Telegram ненав'язливо.</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Назва</th>
                            <th>URL</th>
                            <th>Пріоритет</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($products as $product): ?>
                        <tr>
                            <td><?= htmlspecialchars($product['title']) ?></td>
                            <td><a href="<?= htmlspecialchars($product['url']) ?>" target="_blank">Посилання ↗</a></td>
                            <td><?= $product['display_priority'] ?></td>
                            <td>
                                <span class="badge <?= $product['is_active'] ? 'badge-green' : 'badge-red' ?>">
                                    <?= $product['is_active'] ? 'Активний' : 'Вимкнений' ?>
                                </span>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                
                <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Додати продукт</h3>
                <form method="POST" action="api/products.php?action=add">
                    <div class="form-group">
                        <label>Назва</label>
                        <input type="text" name="title" placeholder="Безкоштовний курс норвезької" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>URL</label>
                            <input type="url" name="url" placeholder="https://..." required>
                        </div>
                        <div class="form-group">
                            <label>Пріоритет</label>
                            <input type="number" name="priority" value="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Опис</label>
                        <textarea name="description" rows="2" placeholder="Короткий опис"></textarea>
                    </div>
                    <button type="submit" class="btn btn-success">Додати продукт</button>
                </form>
            </div>
        </div>
        
        <!-- Analytics Tab -->
        <div id="tab-analytics" class="tab-content hidden">
            <div class="section">
                <h2>📈 Аналітика</h2>
                
                <div class="info-box">
                    <h4>📊 Google Analytics</h4>
                    <p>ID: <code>G-D28BSPKB28</code></p>
                    <p><a href="https://analytics.google.com" target="_blank">Переглянути статистику ↗</a></p>
                </div>
                
                <h3>Telegram статистика</h3>
                <p style="color: var(--gray); margin-top: 0.5rem;">
                    Статистика переглядів та реакцій збирається автоматично при кожному запуску бота.
                </p>
                
                <table style="margin-top: 1rem;">
                    <thead>
                        <tr>
                            <th>Група</th>
                            <th>Постів</th>
                            <th>Переглядів</th>
                            <th>Реакцій</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($groups as $group): ?>
                        <tr>
                            <td><?= htmlspecialchars($group['name']) ?></td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Settings Tab -->
        <div id="tab-settings" class="tab-content hidden">
            <div class="section">
                <h2>⚙️ Налаштування</h2>
                
                <div class="info-box">
                    <h4>🤖 Telegram Bot</h4>
                    <p>Bot: <a href="https://t.me/nord_smm_bot" target="_blank">@nord_smm_bot</a></p>
                    <p>Токен налаштований в системі OpenClaw</p>
                </div>
                
                <div class="info-box">
                    <h4>🗄️ База даних</h4>
                    <p>Хост: <code>db5020016325.hosting-data.io</code></p>
                    <p>База: <code>dbs15437376</code></p>
                    <p>Статус: <span class="badge badge-green">Підключено</span></p>
                </div>
                
                <div class="info-box">
                    <h4>📅 Cron розклад</h4>
                    <p>09:00 — Morning news</p>
                    <p>15:00 — Afternoon news</p>
                    <p>18:00 — Evening news</p>
                    <p>21:00 — Night news</p>
                </div>
            </div>
        </div>
        
        <!-- Roadmap Tab -->
        <div id="tab-roadmap" class="tab-content hidden">
            <div class="section">
                <h2>🗺️ Roadmap</h2>
                
                <h3 style="margin-top: 1rem; color: var(--success);">✅ v1.0 — Поточна</h3>
                <ul style="margin-left: 1.5rem; line-height: 2;">
                    <li>✅ RSS парсинг (NRK, VG, Aftenposten)</li>
                    <li>✅ Переклад Google Translate</li>
                    <li>✅ Telegram постинг</li>
                    <li>✅ Веб-сайт + Адмінка</li>
                    <li>✅ Cron автоматизація</li>
                </ul>
                
                <h3 style="margin-top: 1.5rem; color: var(--warning);">⏳ v2.0 — Наступна</h3>
                <ul style="margin-left: 1.5rem; line-height: 2;">
                    <li>📅 Події — Facebook Events парсинг</li>
                    <li>🌤️ Погода — wttr.in інтеграція</li>
                    <li>💬 Чат-бот — Telegram бот для пошуку</li>
                    <li>📱 PUSH-сповіщення</li>
                    <li>📚 Поради — парсинг UDI, NAV</li>
                </ul>
                
                <h3 style="margin-top: 1.5rem; color: var(--primary);">🚀 v3.0 — Майбутнє</h3>
                <ul style="margin-left: 1.5rem; line-height: 2;">
                    <li>📱 Мобільний додаток (React Native)</li>
                    <li>🤖 AI рекомендації</li>
                    <li>🌍 Багатомовність (UA/NO/EN)</li>
                </ul>
            </div>
        </div>
    </div>
    
    <script>
        function showTab(tabId) {
            // Hide all
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
            
            // Show selected
            document.getElementById('tab-' + tabId).classList.remove('hidden');
            event.target.classList.add('active');
        }
        
        function runBot() {
            if (confirm('Запустити бота зараз?\n\nЦе запустить парсинг RSS та публікацію в Telegram.')) {
                // This would trigger OpenClaw via API
                alert('Бот буде запущений за розкладом (09:00, 15:00, 18:00, 21:00)');
            }
        }
        
        function featureArticle(id) {
            fetch('api/articles.php?action=feature&id=' + id, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) location.reload();
                    else alert('Помилка: ' + data.error);
                });
        }
        
        function markTop(id) {
            fetch('api/articles.php?action=top&id=' + id, { method: 'POST' })
                .then(() => alert('Позначено як топ!'));
        }
        
        // Auto-refresh stats every 30s
        setInterval(() => {
            // Could fetch updated stats here
        }, 30000);
    </script>
</body>
</html>
