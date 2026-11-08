# AL-KARAM SHOP — Website v1

A mobile-first shop inventory website with barcode lookup, product management, overview, backup/restore and shared Supabase inventory.

## Important before using it

This source code is ready to configure, but it is **not connected to your real database or published yet**. The camera must be tested on your actual Android phone over HTTPS. Do not use it for live shop pricing until you have completed the checklist below.

## 1. Create the shared database

1. Create a free project at https://supabase.com/.
2. Choose a strong database password and keep it private.
3. Open **SQL Editor** in your Supabase project.
4. Open `supabase-schema.sql`, copy all its contents and run it.
5. Open **Project Settings → API** (or API Keys).
6. Copy the **Project URL** and the **Publishable key**. An older project may call this the `anon` key.
7. Open `config.js` and replace the two placeholder values:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`

Never copy a `service_role` key or a `secret` key into `config.js`.

## 2. Create accounts for your two phones

1. In Supabase, open **Authentication → Users**.
2. Create one user for you and one for your father.
3. Use email addresses you control and strong passwords.
4. Do not enable public sign-up for this private shop website.
5. Both phones sign in with their own account. They will see the same inventory.

The SQL policies let any account in this one Supabase project manage the shop products. Only create accounts for people you trust.

## 3. Test on a computer first

You need a local web server; opening `index.html` directly as a `file://` page is not a valid camera test.

If Python is installed, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. Sign in and test product adding, editing, search, backup and restore. The camera may be unavailable on a plain LAN address; use HTTPS hosting for the phone camera test.

## 4. Free publishing

GitHub Pages can host these static files for free from a public GitHub repository:

1. Create a GitHub account if needed.
2. Create a new **public** repository, for example `al-karam-shop`.
3. Upload all files from this folder, including `config.js`.
4. Open repository **Settings → Pages**.
5. Under build/deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
6. Wait for the Pages URL to appear and open it on both phones.
7. Sign in on each phone and test the camera permission.

Because this is a public repository, do not put passwords, database administrator keys, or other secrets in it. The Supabase publishable key is intended for browser use when RLS is enabled as in the supplied SQL. The source code and shop UI will be public; the inventory data is protected by sign-in and database policies.

## 5. Test checklist before relying on it

- [ ] Both phones can sign in.
- [ ] Add a test product with a barcode and price.
- [ ] Search it by name and barcode.
- [ ] Scan its physical barcode on Android over HTTPS.
- [ ] Confirm the exact price and stock appear.
- [ ] Change its price on phone A; confirm phone B updates.
- [ ] Look up an unknown barcode; confirm it says PRODUCT NOT FOUND.
- [ ] Edit and delete test products.
- [ ] Download a backup and restore it.
- [ ] Remove all test products so the real inventory starts empty.

## Current scope / limitations

- The inventory starts empty.
- Unknown barcodes never get an online guessed price; only your own saved records are used.
- Low stock means 5 units or fewer.
- Stock value is price multiplied by quantity, so it is an estimate based on selling price, not purchase cost.
- The backup file contains product names, barcodes, prices and quantities. Keep it somewhere private.
- This first version uses an authenticated shared shop account model. Every trusted signed-in shop user can edit the inventory.
- Barcode camera support depends on the phone browser, camera permission, HTTPS and the barcode type. Manual barcode entry is provided as a fallback.
- This is website stage 1 plus the database integration files. PWA installation and Android home-screen polish are deliberately left for the later stage.

## Existing Tiiny Host site

Keep `https://al-karamshop.tiiny.site` unchanged until the replacement passes the test checklist. Then you can decide whether to replace its files (if your Tiiny plan supports it) or use the new GitHub Pages address. A domain/subdomain change requires control of the relevant DNS settings.
