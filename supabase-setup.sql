-- ═══════════════════════════════════════════════════════════════
-- RAW THREADS — Supabase Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ═══════════════════════════════════════════════════════════════

-- ─── Products Table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Enable Row Level Security ──────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ─── Public read access (anyone can view products) ──────────
CREATE POLICY "Public can view products"
  ON products FOR SELECT
  USING (true);

-- ─── Service role can do everything (admin via server) ──────
CREATE POLICY "Service role full access"
  ON products FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── Seed Data ──────────────────────────────────────────────
INSERT INTO products (name, price, category, description, image, stock, featured) VALUES
  ('Classic Logo Hoodie', 15000, 'hoodies', 'Premium heavyweight hoodie featuring the iconic Raw Threads logo. Made from 100% brushed cotton fleece for ultimate comfort. Ribbed cuffs and hem with a kangaroo pocket.', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop', 15, true),
  ('Street Culture Tee', 8000, 'tshirts', 'Oversized streetwear tee with bold graphic print on the back. Drop shoulder fit, 100% combed cotton. Available in multiple colorways.', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', 25, true),
  ('Raw Threads Cap', 5000, 'caps', 'Structured snapback cap with embroidered Raw Threads branding. Adjustable snap closure fits all sizes. Premium cotton twill construction.', 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400&h=400&fit=crop', 30, false),
  ('Urban Cargo Joggers', 12000, 'joggers', 'Relaxed fit cargo joggers with utility pockets. Elastic waistband with drawcord. Tapered leg with elasticated cuffs. Perfect for street and casual wear.', 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=400&h=400&fit=crop', 18, true),
  ('Graphic Print Tee', 9000, 'tshirts', 'Statement graphic tee with Raw Threads original artwork. Relaxed fit, soft-touch fabric. Screen printed for vibrant, long-lasting colors.', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop', 20, false),
  ('Premium Zip Hoodie', 18000, 'hoodies', 'Full-zip hoodie in premium heavyweight fabric. Double-layered hood, metal zip, and split kangaroo pockets. The ultimate layering piece.', 'https://images.unsplash.com/photo-1578768079470-571d26b36067?w=400&h=400&fit=crop', 10, true),
  ('Essential Crew Neck', 7500, 'tshirts', 'Everyday essential crew neck tee. Clean minimalist design with subtle Raw Threads embroidery on chest. Super soft ringspun cotton.', 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop', 35, false),
  ('Varsity Bomber Jacket', 22000, 'jackets', 'Classic varsity-style bomber jacket with Raw Threads lettering. Wool blend body with faux leather sleeves. Ribbed collar, cuffs, and hem.', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop', 8, true);
