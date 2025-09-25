# Zuccess Quoter - Smart Home Quotation System

A modern, responsive web application for building smart home quotations with brand-aware catalogues, Supabase storage, and offline fallbacks.

## Features

- **Multi-brand catalogues**: Login-first workflow with Orvibo and Zuccess Standard live today, and ABB/Schneider/Siemens/GVS placeholders ready to enable.
- **Guided quotation flow**: Stepper interface covering catalog, labor, customer, and review stages with autosave between steps.
- **Supabase integration**: Read/write quotations and product data via Supabase with row-level security and graceful fallbacks.
- **Rich product feedback**: Category availability, quantity animations, sticky summaries, and colour-coded total updates.
- **PDF output**: Generates a branded document containing the selected catalogue logo, company header, and approval stamp.

## Setup Instructions

### 1. Supabase configuration

1. Create a project at [supabase.com](https://supabase.com).
2. Duplicate `runtime-config.example.json`, save it as `runtime-config.json`, and fill in the Supabase URL and anon key. Keep the real file out of version control when deploying so credentials remain private.
3. Open the Supabase SQL editor and run `supabase-setup.sql`. The script will:
   - create `admin_users`, `products`, and `quotations` tables with indexes and RLS policies
   - seed the development admin accounts (`yazan`, `jamal`, `anas`)
   - allow anonymous inserts into `quotations` for the SPA
   - repopulate the `products` table from the bundled CSV snapshot

Re-run the script whenever `Products.csv` changes so Supabase remains the source of truth.

### 2. Regenerate fallback assets

The SPA ships with an offline snapshot used whenever Supabase is unreachable. After changing `Products.csv`, rebuild the fallback artefacts:

```bash
python scripts/generate_products_snapshot.py
```

This command rewrites `products-data.json` and `products-data.js`, which the frontend consumes when a fetch to Supabase fails or when the app is opened directly from the filesystem.

### 3. Local development

```bash
# Option A: Python
python -m http.server 8000

# Option B: Node.js
npx serve .

# Option C: PHP
php -S localhost:8000
```

Visit `http://localhost:8000` in a modern browser to start the SPA.

## Usage

1. **Login** with one of the seeded admin accounts (`yazan/yazan123`, `jamal/jamal123`, or `anas/anas123`).
2. **Choose brand**: the launch modal lists all catalogue keys. Orvibo and Zuccess Standard are active; other entries display as “Coming Soon”.
3. **Select products**: browse the synced catalogue, adjust quantities, and monitor the sticky summary.
4. **Enter labor costs**: program/installation/discount inputs recalculate totals with visual feedback.
5. **Capture customer details** and open the review modal to double-check all values.
6. **Confirm & generate** a PDF that includes the brand logo, company header, and approval stamp. The quotation is then stored in Supabase (or queued locally if offline).

## Product catalogue workflow

- Update `Products.csv` to change the master catalogue.
- Re-run `python scripts/generate_products_snapshot.py` to refresh the fallback assets.
- Execute `supabase-setup.sql` inside Supabase to push the latest data to the hosted database.
- Restart or reload the SPA; it will pull live data from Supabase and fall back to the snapshot only when necessary.

## File structure

```
|-- index.html                      # Application shell
|-- styles.css                      # Styling and responsive rules
|-- app.js                          # Core application logic
|-- config.js                       # Brand registry + runtime Supabase loader
|-- runtime-config.example.json     # Template for runtime Supabase secrets (copy to runtime-config.json)
|-- products-data.json              # Flat snapshot generated from Products.csv
|-- products-data.js                # window.PRODUCT_SNAPSHOT fallback map
|-- scripts/
|   \-- generate_products_snapshot.py  # Helper to rebuild fallback assets
|-- supabase-setup.sql              # Database schema & seed script
|-- Products.csv                    # Authoritative product export
\-- README.md                      # Project documentation
|-- supabase-setup.sql              # Database schema & seed script
|-- Products.csv                    # Authoritative product export
\-- README.md                      # Project documentation
```



Enjoy quoting!


