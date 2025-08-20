<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

$dsn = "mysql:host=localhost;dbname=market;charset=utf8mb4";
$db_user = "root"; // change if needed
$db_pass = "";     // change if needed

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "DB Connection failed"]);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {

    // ----------- REGISTER -----------
    case "register":
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) { echo json_encode(["success" => false, "message" => "Invalid input"]); exit; }
        $username = trim($data['username'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? "buyer";
        if (!$username || !$email || !$password || !$role) {
            echo json_encode(["success" => false, "message" => "All fields required."]);
            exit;
        }
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        try {
            $stmt = $pdo->prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)");
            $stmt->execute([$username, $email, $passwordHash, $role]);
            echo json_encode(["success" => true, "message" => "User registered successfully"]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Registration failed: " . $e->getMessage()]);
        }
        break;

    // ----------- LOGIN -----------
    case "login":
        $data = json_decode(file_get_contents("php://input"), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? OR username = ?");
        $stmt->execute([$email, $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user && password_verify($password, $user['password'])) {
            unset($user['password']);
            echo json_encode(["success" => true, "user" => $user]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid credentials"]);
        }
        break;

    // ----------- GET CATEGORIES -----------
    case "getCategories":
        $stmt = $pdo->query("SELECT * FROM categories");
        echo json_encode(["success" => true, "categories" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ----------- GET PRODUCTS (with search/filter) -----------
    case "getProducts":
        $search = $_GET['search'] ?? '';
        $category_id = $_GET['category_id'] ?? '';
        $sql = "SELECT p.*, c.name AS category, u.username AS seller 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN users u ON p.seller_id = u.id
                WHERE 1";
        $params = [];
        if ($search) {
            $sql .= " AND (p.name LIKE ? OR p.description LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        if ($category_id) {
            $sql .= " AND p.category_id = ?";
            $params[] = $category_id;
        }
        $sql .= " ORDER BY p.created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["success" => true, "products" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ----------- GET SELLER PRODUCTS -----------
    case "getSellerProducts":
        $seller_id = $_GET['seller_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT p.*, c.name AS category 
                               FROM products p 
                               LEFT JOIN categories c ON p.category_id = c.id
                               WHERE p.seller_id = ?
                               ORDER BY p.created_at DESC");
        $stmt->execute([$seller_id]);
        echo json_encode(["success" => true, "products" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ----------- ADD PRODUCT (SELLER ONLY) -----------
    case "addProduct":
        $seller_id = $_POST['seller_id'] ?? 0;
        $name = $_POST['name'] ?? '';
        $desc = $_POST['description'] ?? '';
        $price = $_POST['price'] ?? 0;
        $cat = $_POST['category_id'] ?? null;
        $imagePath = null;
        if (!empty($_FILES['image']['name'])) {
            $filename = time() . "_" . basename($_FILES['image']['name']);
            $target = "uploads/" . $filename;
            if (move_uploaded_file($_FILES['image']['tmp_name'], $target)) {
                $imagePath = $target;
            }
        }
        try {
            $stmt = $pdo->prepare("INSERT INTO products (name, description, price, category_id, seller_id, image) 
                                   VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $desc, $price, $cat, $seller_id, $imagePath]);
            echo json_encode(["success" => true, "message" => "Product added successfully"]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Failed to add product: " . $e->getMessage()]);
        }
        break;

    // ----------- ADD TO CART (BUYER ONLY) -----------
    case "addToCart":
        $data = json_decode(file_get_contents("php://input"), true);
        if (!$data) { echo json_encode(["success" => false, "message" => "Invalid input"]); exit; }
        $user_id = $data['user_id'] ?? 0;
        $product_id = $data['product_id'] ?? 0;
        try {
            $stmt = $pdo->prepare("SELECT * FROM cart WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$user_id, $product_id]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                $pdo->prepare("UPDATE cart SET quantity = quantity + 1 WHERE id = ?")
                    ->execute([$existing['id']]);
            } else {
                $pdo->prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, 1)")
                    ->execute([$user_id, $product_id]);
            }
            echo json_encode(["success" => true, "message" => "Product added to cart"]);
        } catch (Exception $e) {
            echo json_encode(["success" => false, "message" => "Failed to add to cart: " . $e->getMessage()]);
        }
        break;

    // ----------- GET CART (BUYER ONLY) -----------
    case "getCart":
        $user_id = $_GET['user_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT c.*, p.name, p.price FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?");
        $stmt->execute([$user_id]);
        echo json_encode(["success" => true, "cart" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ----------- CHECKOUT (BUYER ONLY, creates order) -----------
    case "checkout":
        $user_id = $_GET['user_id'] ?? 0;
        // Fetch cart items
        $stmt = $pdo->prepare("SELECT * FROM cart WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $cart = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$cart) {
            echo json_encode(["success" => false, "message" => "Cart is empty."]);
            break;
        }
        try {
            $pdo->beginTransaction();
            $pdo->prepare("INSERT INTO orders (user_id, created_at) VALUES (?, NOW())")->execute([$user_id]);
            $order_id = $pdo->lastInsertId();
            $itemStmt = $pdo->prepare("INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)");
            foreach ($cart as $item) {
                $itemStmt->execute([$order_id, $item['product_id'], $item['quantity']]);
            }
            $pdo->prepare("DELETE FROM cart WHERE user_id = ?")->execute([$user_id]);
            $pdo->commit();
            echo json_encode(["success" => true, "message" => "Order placed!"]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Checkout failed: " . $e->getMessage()]);
        }
        break;

    // ----------- GET ORDER HISTORY (BUYER) -----------
    case "getOrders":
        $user_id = $_GET['user_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT o.id, o.created_at, oi.product_id, oi.quantity, p.name, p.price
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC, o.id DESC");
        $stmt->execute([$user_id]);
        echo json_encode(["success" => true, "orders" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ----------- GET SALES HISTORY (SELLER) -----------
    case "getSales":
        $seller_id = $_GET['seller_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT o.id, o.created_at, oi.product_id, oi.quantity, p.name, p.price
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE p.seller_id = ?
            ORDER BY o.created_at DESC, o.id DESC");
        $stmt->execute([$seller_id]);
        echo json_encode(["success" => true, "sales" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        break;

    // ----------- GET PROFILE -----------
    case "getProfile":
        $user_id = $_GET['user_id'] ?? 0;
        $stmt = $pdo->prepare("SELECT id, username, email, role FROM users WHERE id = ?");
        $stmt->execute([$user_id]);
        echo json_encode(["success" => true, "profile" => $stmt->fetch(PDO::FETCH_ASSOC)]);
        break;

    // ----------- UPDATE PROFILE -----------
    case "updateProfile":
        $data = json_decode(file_get_contents("php://input"), true);
        $user_id = $data['user_id'] ?? 0;
        $username = $data['username'] ?? '';
        $email = $data['email'] ?? '';
        $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ? WHERE id = ?");
        $stmt->execute([$username, $email, $user_id]);
        echo json_encode(["success" => true, "message" => "Profile updated."]);
        break;

    default:
        echo json_encode(["success" => false, "message" => "Invalid action"]);
}