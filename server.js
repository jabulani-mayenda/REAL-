require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Supabase Client (service role for admin ops) ───────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── File Upload Config ─────────────────────────────────────
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  }
});

// ─── Fallback: JSON file if Supabase not configured ─────────
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

function readProductsJSON() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function writeProductsJSON(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

// ─── Admin Auth ─────────────────────────────────────────────
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'rawthreads2024';
let adminTokens = new Set();

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !adminTokens.has(token)) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─── Auth Routes ────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt - Username: "${username}", Expected: "${ADMIN_USER}"`);
  console.log(`Login attempt - Password: "${password}", Expected: "${ADMIN_PASS}"`);

  if (username === ADMIN_USER && password === ADMIN_PASS) {

    const token = generateToken();
    adminTokens.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  adminTokens.delete(token);
  res.json({ success: true });
});

app.get('/api/auth/verify', requireAdmin, (req, res) => {
  res.json({ valid: true });
});

// ═══════════════════════════════════════════════════════════════
// PRODUCT ROUTES — Uses Supabase if configured, else JSON file
// ═══════════════════════════════════════════════════════════════

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    if (USE_SUPABASE) {
      let query = supabase.from('products').select('*');
      if (req.query.category && req.query.category !== 'all') {
        query = query.eq('category', req.query.category);
      }
      if (req.query.featured === 'true') {
        query = query.eq('featured', true);
      }
      if (req.query.search) {
        query = query.ilike('name', `%${req.query.search}%`);
      }
      if (req.query.newStock === 'true') {
        query = query.eq('new_stock', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    // Fallback: JSON file
    let products = readProductsJSON();
    if (req.query.category && req.query.category !== 'all') {
      products = products.filter(p => p.category === req.query.category);
    }
    if (req.query.featured === 'true') {
      products = products.filter(p => p.featured);
    }
    if (req.query.search) {
      const q = req.query.search.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q));
    }
    if (req.query.newStock === 'true') {
      products = products.filter(p => p.new_stock);
    }

    res.json(products);
  } catch (err) {
    console.error('GET /api/products error:', err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product
app.get('/api/products/:id', async (req, res) => {
  try {
    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Product not found' });
      return res.json(data);
    }

    const products = readProductsJSON();
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('GET /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create product (admin)
app.post('/api/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const product = {
      name: req.body.name,
      price: parseFloat(req.body.price),
      category: req.body.category || 'general',
      description: req.body.description || '',
      image: req.file ? '/uploads/' + req.file.filename : (req.body.image || ''),
      stock: parseInt(req.body.stock) || 0,
      featured: req.body.featured === 'true',
      new_stock: req.body.new_stock === 'true'
    };
    console.log('Product to save:', JSON.stringify(product, null, 2));



    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('products').insert(product).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    const products = readProductsJSON();
    product.id = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    product.createdAt = new Date().toISOString();
    products.push(product);
    writeProductsJSON(products);
    res.status(201).json(product);
  } catch (err) {
    console.error('POST /api/products error:', err.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product (admin)
app.put('/api/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.price) updates.price = parseFloat(req.body.price);
    if (req.body.category) updates.category = req.body.category;
    if (req.body.description) updates.description = req.body.description;
    if (req.body.stock !== undefined) updates.stock = parseInt(req.body.stock);
    if (req.body.featured !== undefined) updates.featured = req.body.featured === 'true';
    if (req.body.new_stock !== undefined) updates.new_stock = req.body.new_stock === 'true';
    console.log(`Updating product ${req.params.id}:`, JSON.stringify(updates, null, 2));


    if (req.file) updates.image = '/uploads/' + req.file.filename;

    if (USE_SUPABASE) {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
    }

    const products = readProductsJSON();
    const index = products.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Product not found' });
    products[index] = { ...products[index], ...updates };
    writeProductsJSON(products);
    res.json(products[index]);
  } catch (err) {
    console.error('PUT /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product (admin)
app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    if (USE_SUPABASE) {
      const { error } = await supabase.from('products').delete().eq('id', req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    }

    let products = readProductsJSON();
    const index = products.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Product not found' });
    if (products[index].image?.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, 'public', products[index].image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    products.splice(index, 1);
    writeProductsJSON(products);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/products/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET all unique categories
app.get('/api/categories', async (req, res) => {
  try {
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('products').select('category');
      if (error) throw error;
      const categories = [...new Set(data.map(i => i.category.toLowerCase()))].filter(Boolean);
      return res.json(categories);
    }
    const products = readProductsJSON();
    const categories = [...new Set(products.map(p => p.category.toLowerCase()))].filter(Boolean);
    res.json(categories);
  } catch (err) {
    console.error('GET /api/categories error:', err.message);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ─── Admin Stats ────────────────────────────────────────────

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    let products;
    if (USE_SUPABASE) {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      products = data;
    } else {
      products = readProductsJSON();
    }

    const totalProducts = products.length;
    const lowStock = products.filter(p => p.stock <= 3).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newThisWeek = products.filter(p => new Date(p.created_at || p.createdAt) >= weekAgo).length;

    res.json({ totalProducts, newThisWeek, lowStock, totalValue });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ─── Page Routes ────────────────────────────────────────────
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'shop.html')));
app.get('/product', (req, res) => res.sendFile(path.join(__dirname, 'public', 'product.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));
app.get('/xrt-admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html')));
app.get('/xrt-admin/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html')));
app.get('/xrt-admin/add-product', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'add-product.html')));
app.get('/xrt-admin/edit-product', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin', 'edit-product.html')));

// ─── Start Server ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🧵 Raw Threads server running at http://localhost:${PORT}`);
  console.log(`   Admin panel: http://localhost:${PORT}/xrt-admin`);
  console.log(`   Database: ${USE_SUPABASE ? 'Supabase ✅' : 'JSON file (fallback)'}`);
});
