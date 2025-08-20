document.addEventListener("DOMContentLoaded", () => {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) loadingScreen.style.display = "flex";
    setTimeout(() => {
        const buyerView = document.getElementById("buyerView");
        const sellerView = document.getElementById("sellerView");

        let currentUser = JSON.parse(localStorage.getItem("user")) || null;
        let selectedCategoryId = "";
        let allProducts = [];

        // ----------- NAVBAR UPDATE FUNCTION -----------
        function updateNavBar() {
            const navRight = document.getElementById("nav-right");
            if (!navRight) return;
            if (currentUser) {
                navRight.innerHTML = `
                    <button id="profile-btn" class="btn btn-outline-light me-2" data-bs-toggle="modal" data-bs-target="#profileModal">Profile</button>
                    <button id="logout-btn" class="btn btn-outline-danger">Logout</button>
                `;
                document.getElementById("logout-btn").onclick = function() {
                    localStorage.removeItem("user");
                    currentUser = null;
                    location.reload();
                };
            } else {
                navRight.innerHTML = `
                    <button class="btn btn-outline-light me-2" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
                    <button class="btn btn-outline-info" data-bs-toggle="modal" data-bs-target="#registerModal">Register</button>
                `;
            }
        }
        updateNavBar();

        // ---------------- FETCH CATEGORIES ----------------
        async function fetchCategories() {
            try {
                const res = await fetch("api.php?action=getCategories");
                if (!res.ok) throw new Error("Network error");
                const data = await res.json();
                const select = document.getElementById("product-category");
                if (data.success && select) {
                    select.innerHTML = `<option value="" disabled selected>Category</option>`;
                    data.categories.forEach(cat => {
                        let option = document.createElement("option");
                        option.value = cat.id;
                        option.textContent = cat.name;
                        select.appendChild(option);
                    });
                }
                const catList = document.getElementById("categories-list");
                if (data.success && catList) {
                    catList.innerHTML = `<li><a class="dropdown-item" href="#" data-id="">All Categories</a></li>`;
                    data.categories.forEach(cat => {
                        let li = document.createElement("li");
                        li.innerHTML = `<a class="dropdown-item" href="#" data-id="${cat.id}">${cat.name}</a>`;
                        catList.appendChild(li);
                    });
                }
            } catch (err) {
                alert("Failed to fetch categories.");
            }
        }

        // ---------------- FETCH PRODUCTS (BUYER LIST) ----------------
        async function fetchProducts(search = "", categoryId = "") {
            try {
                let url = "api.php?action=getProducts";
                if (search || categoryId) {
                    url += `&search=${encodeURIComponent(search)}&category_id=${encodeURIComponent(categoryId)}`;
                }
                const res = await fetch(url);
                if (!res.ok) throw new Error("Network error");
                const data = await res.json();
                allProducts = data.products || [];
                renderProducts(allProducts);
            } catch (err) {
                alert("Failed to fetch products.");
            }
        }

        function renderProducts(products) {
            const container = document.getElementById("product-list");
            if (!container) return;
            container.innerHTML = "";
            if (!products.length) {
                container.innerHTML = "<p>No products found.</p>";
                return;
            }
            products.forEach(prod => {
                const div = document.createElement("div");
                div.className = "col-md-6 col-lg-4";
                div.innerHTML = `
                    <div class="card h-100">
                        <img src="${prod.image || 'placeholder.png'}" alt="${prod.name}" class="product-image card-img-top" onerror="this.src='placeholder.png'">
                        <div class="card-body">
                            <h5 class="card-title">${escapeHTML(prod.name)}</h5>
                            <p class="card-text">${escapeHTML(prod.description || '')}</p>
                            <p class="mb-1"><strong>$${Number(prod.price).toFixed(2)}</strong></p>
                            <p class="mb-1">Category: ${escapeHTML(prod.category || 'N/A')}</p>
                            <p class="mb-2">Seller: ${escapeHTML(prod.seller || 'Unknown')}</p>
                            ${currentUser && currentUser.role === "buyer" ? `<button class="add-to-cart-btn btn btn-sm btn-success w-100" data-id="${prod.id}">Add to Cart</button>` : ""}
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
            // Attach event listeners for Add to Cart buttons
            if (currentUser && currentUser.role === "buyer") {
                container.querySelectorAll(".add-to-cart-btn").forEach(btn => {
                    btn.addEventListener("click", () => addToCart(Number(btn.dataset.id)));
                });
            }
        }

        // ---------------- FETCH CART (BUYER) ----------------
        async function fetchCart() {
            if (!currentUser || currentUser.role !== "buyer") return;
            try {
                const res = await fetch(`api.php?action=getCart&user_id=${currentUser.id}`);
                if (!res.ok) throw new Error("Network error");
                const data = await res.json();
                const cartItems = document.getElementById("cart-items");
                const cartTotal = document.getElementById("cart-total");
                if (!cartItems || !cartTotal) return;

                cartItems.innerHTML = "";
                let total = 0;
                if (data.success && Array.isArray(data.cart) && data.cart.length > 0) {
                    data.cart.forEach(item => {
                        total += Number(item.price) * Number(item.quantity);
                        const li = document.createElement("li");
                        li.className = "list-group-item bg-transparent text-light d-flex justify-content-between align-items-center";
                        li.innerHTML = `
                            <span>${escapeHTML(item.name)} <small>x${item.quantity}</small></span>
                            <span>$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
                        `;
                        cartItems.appendChild(li);
                    });
                } else {
                    cartItems.innerHTML = "<li class='list-group-item bg-transparent text-secondary'>Cart is empty</li>";
                }
                cartTotal.textContent = total.toFixed(2);
            } catch (err) {
                alert("Failed to fetch cart.");
            }
        }

        // ---------------- ADD TO CART ----------------
        async function addToCart(productId) {
            if (!currentUser || currentUser.role !== "buyer") {
                alert("Please login as buyer to add to cart");
                return;
            }
            try {
                const res = await fetch("api.php?action=addToCart", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: currentUser.id, product_id: productId })
                });
                if (!res.ok) throw new Error("Network error");
                const data = await res.json();
                alert(data.message);
                if (data.success) {
                    await fetchCart();
                }
            } catch (err) {
                alert("Failed to add to cart.");
            }
        }
        window.addToCart = addToCart;

        // ---------------- SELLER: ADD PRODUCT ----------------
        const addProductForm = document.getElementById("add-product-form");
        if (addProductForm) {
            addProductForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                if (!currentUser || currentUser.role !== "seller") {
                    alert("Only sellers can add products");
                    return;
                }
                const formData = new FormData(addProductForm);
                formData.append("seller_id", currentUser.id);

                try {
                    const res = await fetch("api.php?action=addProduct", {
                        method: "POST",
                        body: formData
                    });
                    if (!res.ok) throw new Error("Network error");
                    const data = await res.json();
                    alert(data.message);
                    if (data.success) {
                        await fetchSellerProducts();
                        await fetchProducts();
                        addProductForm.reset();
                    }
                } catch (err) {
                    alert("Failed to add product.");
                }
            });
        }

        // ---------------- SELLER: FETCH OWN PRODUCTS ----------------
        async function fetchSellerProducts() {
            if (!currentUser || currentUser.role !== "seller") return;
            try {
                const res = await fetch(`api.php?action=getSellerProducts&seller_id=${currentUser.id}`);
                if (!res.ok) throw new Error("Network error");
                const data = await res.json();
                const container = document.getElementById("seller-products");
                if (!container) return;

                container.innerHTML = "";
                if (data.success && Array.isArray(data.products) && data.products.length > 0) {
                    data.products.forEach(prod => {
                        const div = document.createElement("div");
                        div.className = "col-md-6 col-lg-4";
                        div.innerHTML = `
                            <div class="card h-100">
                                <img src="${prod.image || 'placeholder.png'}" alt="${prod.name}" class="product-image card-img-top" onerror="this.src='placeholder.png'">
                                <div class="card-body">
                                    <h5 class="card-title">${escapeHTML(prod.name)}</h5>
                                    <p class="card-text">${escapeHTML(prod.description || '')}</p>
                                    <p class="mb-1"><strong>$${Number(prod.price).toFixed(2)}</strong></p>
                                    <p class="mb-1">Category: ${escapeHTML(prod.category || 'N/A')}</p>
                                </div>
                            </div>
                        `;
                        container.appendChild(div);
                    });
                } else {
                    container.innerHTML = "<p>No products yet. Add one above.</p>";
                }
            } catch (err) {
                alert("Failed to fetch your products.");
            }
        }

        // ---------------- FETCH ORDER HISTORY (BUYER) ----------------
        async function fetchOrderHistory() {
            if (!currentUser || currentUser.role !== "buyer") return;
            try {
                const res = await fetch(`api.php?action=getOrders&user_id=${currentUser.id}`);
                const data = await res.json();
                const orderList = document.getElementById("order-history");
                if (!orderList) return;
                orderList.innerHTML = "";
                if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
                    let lastOrderId = null;
                    data.orders.forEach(item => {
                        if (item.id !== lastOrderId) {
                            const li = document.createElement("li");
                            li.className = "list-group-item bg-transparent text-light";
                            li.innerHTML = `<strong>Order #${item.id}</strong> <span class="text-secondary float-end">${item.created_at}</span>`;
                            orderList.appendChild(li);
                            lastOrderId = item.id;
                        }
                        const li = document.createElement("li");
                        li.className = "list-group-item bg-transparent text-secondary ps-4";
                        li.innerHTML = `${escapeHTML(item.name)} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`;
                        orderList.appendChild(li);
                    });
                } else {
                    orderList.innerHTML = "<li class='list-group-item bg-transparent text-secondary'>No orders yet.</li>";
                }
            } catch (err) {
                alert("Failed to fetch order history.");
            }
        }

        // ---------------- FETCH SALES HISTORY (SELLER) ----------------
        async function fetchSalesHistory() {
            if (!currentUser || currentUser.role !== "seller") return;
            try {
                const res = await fetch(`api.php?action=getSales&seller_id=${currentUser.id}`);
                const data = await res.json();
                const salesList = document.getElementById("sales-history");
                if (!salesList) return;
                salesList.innerHTML = "";
                if (data.success && Array.isArray(data.sales) && data.sales.length > 0) {
                    let lastOrderId = null;
                    data.sales.forEach(item => {
                        if (item.id !== lastOrderId) {
                            const li = document.createElement("li");
                            li.className = "list-group-item bg-transparent text-light";
                            li.innerHTML = `<strong>Order #${item.id}</strong> <span class="text-secondary float-end">${item.created_at}</span>`;
                            salesList.appendChild(li);
                            lastOrderId = item.id;
                        }
                        const li = document.createElement("li");
                        li.className = "list-group-item bg-transparent text-secondary ps-4";
                        li.innerHTML = `${escapeHTML(item.name)} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`;
                        salesList.appendChild(li);
                    });
                } else {
                    salesList.innerHTML = "<li class='list-group-item bg-transparent text-secondary'>No sales yet.</li>";
                }
            } catch (err) {
                alert("Failed to fetch sales history.");
            }
        }

        // ---------------- TOGGLE VIEWS ----------------
        function showView(view) {
            if (buyerView) buyerView.style.display = "none";
            if (sellerView) sellerView.style.display = "none";
            if (view === "buyer" && buyerView) buyerView.style.display = "block";
            if (view === "seller" && sellerView) sellerView.style.display = "block";
        }

        // ---------------- REGISTRATION HANDLER ----------------
        const registerForm = document.getElementById("register-form");
        if (registerForm) {
            registerForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const username = document.getElementById("register-username").value.trim();
                const email = document.getElementById("register-email").value.trim();
                const password = document.getElementById("register-password").value;
                const role = document.getElementById("register-role").value;
                if (!username || !email || !password || !role) {
                    alert("All fields are required.");
                    return;
                }
                const data = { username, email, password, role };
                try {
                    const res = await fetch("api.php?action=register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data)
                    });
                    const result = await res.json();
                    alert(result.message);
                    if (result.success) {
                        const registerModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('registerModal'));
                        registerModal.hide();
                        const loginModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal'));
                        loginModal.show();
                    }
                } catch (err) {
                    alert("Registration failed.");
                }
            });
        }

        // ---------------- LOGIN HANDLER ----------------
        const loginForm = document.getElementById("login-form");
        if (loginForm) {
            loginForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const email = document.getElementById("login-username").value.trim();
                const password = document.getElementById("login-password").value;
                if (!email || !password) {
                    alert("Both fields are required.");
                    return;
                }
                const data = { email, password };
                try {
                    const res = await fetch("api.php?action=login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data)
                    });
                    const result = await res.json();
                    if (result.success && result.user) {
                        localStorage.setItem("user", JSON.stringify(result.user));
                        alert("Login successful!");
                        const loginModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal'));
                        loginModal.hide();
                        currentUser = result.user;
                        updateNavBar();
                        location.reload();
                    } else {
                        alert(result.message || "Login failed.");
                    }
                } catch (err) {
                    alert("Login failed.");
                }
            });
        }

        // ---------------- PROFILE HANDLER ----------------
        const profileForm = document.getElementById("profile-form");
        if (profileForm) {
            document.getElementById("profileModal").addEventListener("show.bs.modal", async () => {
                if (!currentUser) return;
                try {
                    const res = await fetch(`api.php?action=getProfile&user_id=${currentUser.id}`);
                    const data = await res.json();
                    if (data.success && data.profile) {
                        document.getElementById("profile-username").value = data.profile.username;
                        document.getElementById("profile-email").value = data.profile.email;
                    }
                } catch (err) {}
            });
            profileForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const username = document.getElementById("profile-username").value.trim();
                const email = document.getElementById("profile-email").value.trim();
                if (!username || !email) {
                    alert("All fields are required.");
                    return;
                }
                try {
                    const res = await fetch("api.php?action=updateProfile", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ user_id: currentUser.id, username, email })
                    });
                    const data = await res.json();
                    alert(data.message);
                    if (data.success) {
                        currentUser.username = username;
                        currentUser.email = email;
                        localStorage.setItem("user", JSON.stringify(currentUser));
                        updateNavBar();
                        const profileModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('profileModal'));
                        profileModal.hide();
                    }
                } catch (err) {
                    alert("Failed to update profile.");
                }
            });
        }

        // ---------------- CHECKOUT HANDLER ----------------
        const checkoutBtn = document.getElementById("checkout-button");
        if (checkoutBtn) {
            checkoutBtn.addEventListener("click", async () => {
                if (!currentUser || currentUser.role !== "buyer") {
                    alert("Please login as buyer to checkout.");
                    return;
                }
                try {
                    const res = await fetch(`api.php?action=checkout&user_id=${currentUser.id}`, {
                        method: "POST"
                    });
                    const data = await res.json();
                    alert(data.message || "Checked out!");
                    await fetchCart();
                    await fetchOrderHistory();
                } catch (err) {
                    alert("Checkout failed.");
                }
            });
        }

        // ---------------- SEARCH AND FILTER EVENTS ----------------
        const searchInput = document.getElementById("product-search");
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                fetchProducts(searchInput.value, selectedCategoryId);
            });
        }
        const catList = document.getElementById("categories-list");
        if (catList) {
            catList.addEventListener("click", (e) => {
                if (e.target.matches(".dropdown-item")) {
                    selectedCategoryId = e.target.dataset.id || "";
                    fetchProducts(searchInput.value, selectedCategoryId);
                    document.getElementById("categoriesBtn").textContent = e.target.textContent;
                }
            });
        }

        // ---------------- HTML ESCAPE ----------------
        function escapeHTML(str) {
            return String(str).replace(/[&<>"'`=\/]/g, function (s) {
                return ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
                    '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
                })[s];
            });
        }

        // ---------------- INITIAL LOAD ----------------
        (async function initialLoad() {
            await fetchCategories();
            if (!currentUser) {
                showView("buyer");
                await fetchProducts();
            } else if (currentUser.role === "buyer") {
                showView("buyer");
                await fetchProducts();
                await fetchCart();
                await fetchOrderHistory();
            } else if (currentUser.role === "seller") {
                showView("seller");
                await fetchSellerProducts();
                await fetchSalesHistory();
            }
            if (loadingScreen) loadingScreen.style.display = "none";
        })();
    }, 3000);
});