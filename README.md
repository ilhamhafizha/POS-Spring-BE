# PadiPos

Aplikasi point of sale berbasis web untuk mengelola katalog, transaksi tunai, dan laporan penjualan. Backend dan frontend berjalan dalam satu aplikasi Spring Boot dengan PostgreSQL sebagai penyimpanan data.

## Fitur

- Autentikasi berbasis sesi dengan peran Admin dan Cashier, hash password BCrypt, dan perlindungan CSRF.
- Pengelolaan produk, kategori, harga, foto, dan status ketersediaan.
- Keranjang beberapa produk, catatan item, meja, arsip pesanan, pembayaran tunai, dan struk.
- Perhitungan harga dan pajak di server, snapshot item transaksi, idempotensi pembayaran, serta pemeriksaan versi perubahan.
- Dashboard dan laporan berdasarkan periode, produk terlaris, serta ekspor CSV. Cashier hanya mengakses transaksi miliknya.
- Pengaturan toko dan profil pengguna.

## Teknologi

Java 17, Spring Boot 4.1.1, Spring Security, Spring Data JPA, Flyway, PostgreSQL 17, serta HTML, CSS, dan JavaScript modules. Pengujian menggunakan JUnit, Spring Boot Test, H2, dan Node.js Test Runner.

## Menjalankan secara lokal

Prasyarat: JDK 17 dan Docker Compose. Node.js diperlukan untuk tes helper frontend.

1. Salin konfigurasi contoh:

   ```sh
   cp .env.example .env
   ```

2. Isi `DB_PASSWORD` dan `ADMIN_PASSWORD` dalam `.env`. Password akun awal minimal 10 karakter dan maksimal 72 byte UTF-8. Isi `CASHIER_EMAIL` dan `CASHIER_PASSWORD` jika membutuhkan akun kasir. Gunakan kredensial database yang sesuai jika memakai volume PostgreSQL yang sudah ada.
3. Jalankan database dan aplikasi:

   ```sh
   docker compose up -d postgres
   ./mvnw spring-boot:run
   ```

4. Buka [halaman login](http://localhost:8081/login) dan masuk menggunakan akun pada `.env`.

Spring Boot membaca `.env` lokal sebagai konfigurasi properties; Docker Compose juga membacanya untuk interpolasi konfigurasi database. Gunakan format `KEY=value` tanpa `export` atau tanda kutip. Environment proses dapat dipakai untuk konfigurasi deployment. Sesuaikan `SERVER_PORT`, `DB_URL`, dan `DB_PORT` jika mengganti port; `DB_URL` harus menunjuk database yang digunakan aplikasi.

Flyway menjalankan migrasi saat startup. Kredensial bootstrap hanya membuat akun yang belum ada; mengubah `.env` tidak mereset password akun yang sudah tersimpan. `SEED_REFERENCE_PRODUCT=true` membuat satu produk contoh jika katalog kosong. Aktifkan `COOKIE_SECURE=true` ketika menggunakan HTTPS.

## Struktur proyek

```text
src/main/java/com/portfolio/pos/
├── account/       # Akun, profil, dan bootstrap pengguna
├── common/        # Penanganan error dan validasi bersama
├── order/         # Pesanan, pembayaran, dan laporan
├── product/       # Katalog dan DTO produk
├── security/      # Autentikasi dan otorisasi
├── settings/      # Pengaturan toko
└── web/           # Route halaman
src/main/resources/
├── db/migration/  # Migrasi skema Flyway
├── static/        # Halaman, script, stylesheet, dan aset
└── application.properties
src/test/          # Tes backend dan helper frontend
```

Kode backend dikelompokkan berdasarkan fitur. Controller menangani HTTP, service menjalankan aturan bisnis, dan repository mengakses database.

## Pengujian

```sh
./mvnw test
node --test src/test/frontend/*.test.mjs
./mvnw -DskipTests package
```

Tes backend menggunakan H2 dalam mode PostgreSQL. Pengujian tersebut tidak menggantikan verifikasi pada PostgreSQL untuk deployment.

## Konfigurasi dan batasan

`.env.example` mendokumentasikan variabel konfigurasi. Untuk kebutuhan clone pribadi, repository ini juga menyertakan snapshot `.env`, konfigurasi IDE, dan hasil build lokal meskipun polanya masih terdaftar dalam `.gitignore`. File yang sudah dilacak tetap ikut dalam commit berikutnya. Dokumentasi pendukung dan referensi desain disimpan dalam `docs/`.

Setelah clone di PC lain, sesuaikan `DB_URL` dan port dalam `.env` bila diperlukan, lalu jalankan PostgreSQL dan aplikasi sesuai langkah di atas. Data PostgreSQL dalam volume Docker berada di luar repository dan tidak ikut saat clone.

Pembayaran saat ini mencatat transaksi tunai; integrasi payment gateway dan pemulihan password melalui UI belum tersedia. Frontend mengasumsikan aplikasi dilayani pada root domain.
