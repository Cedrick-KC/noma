<?php /* Save as index.php in htdocs/ecommerce/ */ ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="icon" type="image/png" href="https://github.com/Cedrick-KC/noma/raw/main/ehaho.png.png">
<title>Ehaho Online Market</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">
<style>
  body { background:#343a40; color:#e9ecef; }
  .navbar, .card, .modal-content, .dropdown-menu { background:#212529 !important; color:#e9ecef; }
  .form-control, .form-select { background:#495057; color:#e9ecef; border-color:#6c757d; }
  .form-control::placeholder { color:#adb5bd; }
  .page{display:none}
  #loading-screen{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);z-index:2000}
  .product-image{width:100%;height:200px;object-fit:cover}
</style>
</head>
<body>


<!-- Loader -->
<div id="loading-screen" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.85);z-index:2000">
  <div class="text-center">
    <div class="spinner-border text-primary mb-3" role="status"></div>
    <h4 class="text-light">Welcome to EHAHO market</h4>
  </div>
</div>

<nav class="navbar navbar-expand-lg navbar-dark">
  <div class="container-fluid">
    <a class="navbar-brand" href="#">Ehaho Online Market</a>
    <div class="ms-auto" id="nav-right">
      <button class="btn btn-outline-light me-2" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
      <button class="btn btn-outline-info" data-bs-toggle="modal" data-bs-target="#registerModal">Register</button>
    </div>
  </div>
</nav>

<div class="container my-4">

  <!-- Buyer View -->
  <div id="buyerView" class="page">
    <div class="row">
      <div class="col-lg-8">
        <div class="d-flex gap-2 mb-3">
          <input id="product-search" class="form-control" placeholder="Search products...">
          <div class="dropdown">
            <button class="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown" id="categoriesBtn">All Categories</button>
            <ul class="dropdown-menu dropdown-menu-dark" id="categories-list"></ul>
          </div>
        </div>
        <div id="product-list" class="row g-3"></div>
        <div class="mt-4">
          <h5>Order History</h5>
          <ul id="order-history" class="list-group"></ul>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="card p-3">
          <h5 class="mb-3"><i class="bi bi-cart-fill"></i> Cart</h5>
          <ul id="cart-items" class="list-group list-group-flush"></ul>
          <p class="fs-5 text-end mt-3">Total: $<span id="cart-total">0.00</span></p>
          <button id="checkout-button" class="btn btn-success w-100">Checkout</button>
        </div>
        <div class="mt-3 small text-secondary" id="checkout-hint">
          You can checkout as guest, but to place an order you’ll be asked to sign up / log in.
        </div>
      </div>
    </div>
  </div>

  <!-- Seller View -->
  <div id="sellerView" class="page">
    <h3 class="mb-3">Seller Dashboard</h3>
    <form id="add-product-form" class="card p-3 mb-4">
      <div class="row g-2">
        <div class="col-md-6">
          <input id="product-name" name="name" class="form-control" placeholder="Product name" required>
        </div>
        <div class="col-md-3">
          <input id="product-price" name="price" type="number" step="0.01" min="0" class="form-control" placeholder="Price" required>
        </div>
        <div class="col-md-3">
          <select id="product-category" name="category_id" class="form-select" required>
            <option value="" disabled selected>Category</option>
          </select>
        </div>
        <div class="col-12">
          <textarea id="product-description" name="description" rows="2" class="form-control" placeholder="Description" required></textarea>
        </div>
        <div class="col-md-6">
          <input id="product-image-upload" name="image" type="file" accept="image/*" class="form-control">
        </div>
        <div class="col-md-6 text-md-end">
          <button class="btn btn-primary">Add Product</button>
        </div>
      </div>
    </form>
    <h5>Your Products</h5>
    <div id="seller-products" class="row g-3"></div>
    <div class="mt-4">
      <h5>Sales History</h5>
      <ul id="sales-history" class="list-group"></ul>
    </div>
  </div>

  <!-- Profile Modal -->
  <div class="modal fade" id="profileModal" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header"><h5 class="modal-title">Profile</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body">
          <form id="profile-form">
            <input id="profile-username" class="form-control mb-2" placeholder="Username" required>
            <input id="profile-email" class="form-control mb-2" placeholder="Email" required>
            <button class="btn btn-primary w-100">Update Profile</button>
          </form>
        </div>
      </div>
    </div>
  </div>

</div>

<!-- Login Modal -->
<div class="modal fade" id="loginModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Login</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <form id="login-form">
          <input id="login-username" class="form-control mb-2" placeholder="Username or Email" required>
          <input id="login-password" type="password" class="form-control mb-3" placeholder="Password" required>
          <button class="btn btn-primary w-100">Login</button>
        </form>
      </div>
    </div>
  </div>
</div>

<!-- Register Modal -->
<div class="modal fade" id="registerModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Register</h5><button class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <form id="register-form">
          <input id="register-username" class="form-control mb-2" placeholder="Username" required>
          <input id="register-email" class="form-control mb-2" placeholder="Email" required>
          <input id="register-password" type="password" class="form-control mb-2" placeholder="Password" required>
          <select id="register-role" class="form-select mb-3" required>
            <option value="" disabled selected>Select role</option>
            <option value="buyer">Buyer</option><option value="seller">Seller</option>
          </select>
          <button class="btn btn-success w-100">Create Account</button>
        </form>
      </div>
    </div>
  </div>
</div>

<footer class="text-center text-secondary my-5">&copy; 2025 Ehaho Online Market</footer>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="app.js"></script>
</body>
</html>