/* ═══════════════════════════════════════════════════════════════
   RAW THREADS — Shared JavaScript v2
   ═══════════════════════════════════════════════════════════════ */

// ─── CART MANAGEMENT ────────────────────────────────────────
function getCart() {
    try { return JSON.parse(localStorage.getItem('rawthreads_cart')) || []; }
    catch { return []; }
}

function saveCart(cart) {
    localStorage.setItem('rawthreads_cart', JSON.stringify(cart));
}

function addToCart(product, qty = 1) {
    let cart = getCart();
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
        existing.quantity += qty;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: qty
        });
    }
    saveCart(cart);
    updateCartBadge(true);
    showToast(`${product.name} added to cart`, 'success');
}

function updateCartBadge(animate = false) {
    const cart = getCart();
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = totalItems;
        if (animate) {
            el.classList.remove('bounce');
            void el.offsetWidth; // force reflow
            el.classList.add('bounce');
        }
    });
}

function formatPrice(amount) {
    return new Intl.NumberFormat('en-MW').format(Math.round(amount));
}

// ─── PRODUCT CARD (Clean — matches reference) ──────────────
function createProductCard(product) {
    return `
    <div class="product-card reveal" onclick="goToProduct(event, ${product.id})">
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
      </div>
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="product-price"><span class="currency">MK </span>${formatPrice(product.price)}</div>
        <button class="add-to-cart-btn" onclick="quickAdd(event, ${product.id}, '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image}')">
          Add to Cart
        </button>
      </div>
    </div>
  `;
}

function goToProduct(e, id) {
    // Don't navigate if they clicked the Add to Cart button
    if (e.target.closest('.add-to-cart-btn')) return;
    window.location.href = `/product?id=${id}`;
}

function quickAdd(e, id, name, price, image) {
    e.stopPropagation();
    const btn = e.target;
    const product = { id, name, price, image };
    addToCart(product, 1);

    // Button feedback animation
    btn.textContent = '✓ Added';
    btn.classList.add('added');
    setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.classList.remove('added');
    }, 1200);
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

// ─── NAVBAR ─────────────────────────────────────────────────
function toggleMobileNav() {
    const nav = document.getElementById('navLinks');
    const burger = document.getElementById('navHamburger');
    nav.classList.toggle('open');
    burger.classList.toggle('active');
}

// Navbar scroll effect
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const scrollY = window.scrollY;
    navbar.classList.toggle('scrolled', scrollY > 30);
    lastScroll = scrollY;
});

// ─── SCROLL REVEAL ──────────────────────────────────────────
function refreshReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
        if (!el.classList.contains('visible')) observer.observe(el);
    });
}

// ─── BUTTON RIPPLE ──────────────────────────────────────────
document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});

// ─── PAGE LOADER ────────────────────────────────────────────
function initPageLoader() {
    const loader = document.getElementById('pageLoader');
    const brand = document.getElementById('loaderBrand');
    const cart = document.getElementById('loaderCart');
    if (!loader || !brand || !cart) return;

    // Split "RAW THREADS" into characters
    const text = brand.textContent;
    brand.innerHTML = '';
    [...text].forEach((char, i) => {
        const span = document.createElement('span');
        if (char === ' ') {
            span.className = 'space';
        } else {
            span.className = 'char';
            span.textContent = char;
            span.style.animationDelay = `${i * 0.08}s`;
        }
        brand.appendChild(span);
    });

    window.addEventListener('load', () => {
        // Timeline:
        // 1. Letters finish writing (approx 12 * 0.08 = 0.96s)
        // 2. Cart rolls in
        // 3. Loader disappears

        setTimeout(() => {
            // Cart rolls in
            cart.classList.add('roll-in');

            setTimeout(() => {
                // Fade out loader
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 600);
            }, 1200); // Give time for cart to wobble and settle
        }, 1200); // Wait for letters to finish
    });
}


// ─── HERO LETTER ANIMATION ─────────────────────────────────
function animateHeroLetters() {
    const title = document.querySelector('.hero-title');
    if (!title) return;
    const text = title.getAttribute('data-text') || title.textContent;
    title.innerHTML = '';
    let delay = 0.3;
    [...text].forEach(char => {
        if (char === ' ') {
            const space = document.createElement('span');
            space.innerHTML = '&nbsp;';
            space.style.display = 'inline-block';
            title.appendChild(space);
        } else {
            const span = document.createElement('span');
            span.textContent = char;
            span.className = 'letter';
            span.style.animationDelay = `${delay}s`;
            title.appendChild(span);
            delay += 0.07;
        }
    });
}

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    refreshReveal();
    initPageLoader();
    animateHeroLetters();
});
