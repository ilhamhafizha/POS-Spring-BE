# PadiPos backend

Spring Boot 4.1.1, Java 17, Spring Security, JPA, Flyway, dan PostgreSQL. Frontend pada `src/main/resources/static` sudah memanggil API pada origin yang sama.

## Menjalankan

1. Pastikan Java 17 dan Docker tersedia.
2. Salin `.env.example` menjadi `.env`, kemudian isi `ADMIN_PASSWORD`. Password minimal 10 karakter dan maksimal 72 byte UTF-8. Untuk akun kasir, isi `CASHIER_EMAIL` dan `CASHIER_PASSWORD` juga.
3. Muat variabel dan jalankan:

```sh
set -a
. ./.env
set +a
docker compose up -d postgres
./mvnw spring-boot:run
```

Buka **http://localhost:8081/login**, masuk menggunakan akun yang diisi pada `.env`. Nama pengguna atau peran tidak lagi dipilih bebas dari frontend. Admin dapat mengelola katalog, pengaturan, pengguna, dan laporan. Cashier dapat membuat/membayar pesanan sendiri, melihat laporan transaksinya sendiri dan pengaturan toko, serta mengubah profil sendiri.

Bootstrap hanya membuat email yang belum ada, tidak mengubah password akun yang sudah tersimpan. Jika variabel akun awal tidak diisi, aplikasi dapat berjalan tanpa akun dan mencatat instruksi bootstrap di log. Jangan menghapus volume database untuk mengganti kredensial.

`SEED_REFERENCE_PRODUCT=true` menambahkan Gado-gado Special Rp20.000 beserta metadata Figma hanya jika tabel produk kosong. Pengaturan awal memakai pajak tetap Rp5.000 dan 10 meja; ubah melalui halaman Settings.

Flyway menjalankan V1 dan V2 otomatis. V2 menambahkan metadata produk, akun, pengaturan, pesanan, dan snapshot item tanpa menghapus produk yang sudah ada. Gunakan `DB_URL`, `DB_USERNAME`, dan `DB_PASSWORD` untuk database lain. Kredensial database wajib diisi melalui `.env` atau environment proses; `compose.yaml` menggunakan variabel yang sama. Pada HTTPS, set `COOKIE_SECURE=true`.

## Endpoint

| Method | Endpoint | Akses / fungsi |
| --- | --- | --- |
| GET | `/api/auth/csrf` | Publik; mengambil token dan nama header CSRF |
| POST | `/api/auth/login` | Form URL-encoded `email`, `password`; CSRF wajib; sukses 204 |
| POST | `/api/auth/logout` | Mengakhiri sesi, menghapus cookie sesi; CSRF wajib |
| GET | `/api/auth/me` | Profil akun yang sedang login |
| GET, PUT | `/api/profile` | Membaca/mengubah nama, email, telepon akun sendiri |
| GET, POST | `/api/users` | Admin: daftar atau membuat akun Admin/Cashier |
| GET | `/api/products`, `/api/products/{id}` | Pengguna login: katalog produk |
| POST | `/api/products` | Admin: membuat produk, 201 dan header Location |
| PUT, DELETE | `/api/products/{id}` | Admin: mengubah atau menghapus produk |
| GET | `/api/settings` | Pengguna login: pengaturan toko |
| PUT | `/api/settings` | Admin: menyimpan pengaturan beserta `version` |
| GET | `/api/orders` | 500 transaksi terbaru; Cashier hanya melihat miliknya, Admin melihat semua |
| GET | `/api/orders/{id}` | Detail transaksi; pembatasan pemilik berlaku |
| POST | `/api/orders` | Membuat arsip atau transaksi tunai yang sudah dibayar |
| PUT | `/api/orders/{id}` | Mengubah/membayar arsip dengan pemeriksaan `version` |
| GET | `/api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&zone=Asia/Jakarta` | Transaksi periode, ringkasan, grafik harian, produk terlaris; Admin seluruh toko, Cashier hanya miliknya |

API mengembalikan 401 untuk pengguna belum login, 403 untuk akses/perlindungan CSRF yang ditolak, 400 untuk data tidak valid, 404 untuk data tidak ditemukan/tidak dimiliki kasir, dan 409 untuk konflik versi atau permintaan yang bertabrakan.

## Kontrak utama

Produk mendukung `name`, `price`, `category` (`Foods`, `Beverages`, `Dessert`), `description`, `unit` (`portion`, `cup`, `piece`), `image`, dan `active`. Request lama yang hanya berisi nama/harga tetap diterima. Foto berupa data URL PNG/JPEG/WebP maksimal 1 MB, atau path foto referensi Figma yang diizinkan. Foto disimpan sebagai teks pada database.

Pengaturan toko mendukung `name`, `address`, `phone`, `receipt`, `taxMode` (`fixed`, `percent`, `none`), `taxValue`, `tables` (1–50), dan `version`. Ambil versi terbaru sebelum menyimpan; versi yang sudah tertinggal ditolak dengan 409.

Contoh body pesanan:

```json
{
  "requestId": "3688f46c-44e5-4679-9305-da40a1bbad16",
  "customer": "Anisa",
  "table": "02",
  "service": "Dine in",
  "status": "Paid",
  "items": [{ "productId": 1, "quantity": 2, "note": "Without egg" }],
  "cash": 50000,
  "expectedTotal": 45000,
  "version": null
}
```

Backend mengambil harga produk dari database dan menghitung subtotal, pajak, total, serta kembalian dengan BigDecimal. Harga atau total tambahan dari klien tidak dipakai sebagai nilai transaksi. `expectedTotal` adalah pemeriksaan perubahan harga/pajak sebelum pembayaran, bukan pengganti perhitungan server. `Dine in` wajib memakai meja yang valid saat membayar. Jumlah dibatasi 1–999 per produk dan maksimal 200 produk berbeda per pesanan; nilai uang maksimal Rp1.000.000.000.000 dan dua angka desimal.

`Archived` belum dibayar dan tidak masuk pendapatan. `Paid` tidak bisa diubah atau dibayar ulang. Item menyimpan salinan nama, kategori, satuan, harga dan foto, sehingga perubahan/hapus produk tidak mengubah riwayat. Arsip yang dipulihkan mempertahankan harga item yang sudah tercatat; produk baru memakai harga saat ini. Pajak memakai pengaturan saat checkout.

Gunakan UUID `requestId` yang sama ketika mengulang request yang sama setelah gangguan jaringan. Backend mengembalikan transaksi sebelumnya, tidak membuat pembayaran kedua. Penggunaan ID sama dengan isi berbeda ditolak. Untuk perubahan arsip berikutnya, kirim requestId baru dan version dari respons terbaru. Perubahan arsip diperiksa dan dikunci dalam transaksi database.

Laporan memakai batas hari dalam zona waktu yang dikirim; rentang maksimal satu tahun. Pendapatan, pajak, dan rata-rata hanya menghitung Paid. Daftar transaksi dalam laporan mencakup transaksi sesuai hak akses pada periode tersebut, tidak dibatasi oleh batas 500 pada daftar arsip. CSV diunduh melalui halaman Sales Report dari transaksi server yang sedang difilter.

## Akun dan sesi

Password disimpan sebagai hash BCrypt. Cookie sesi HttpOnly, SameSite=Lax, timeout 30 menit. Semua POST/PUT/DELETE memakai CSRF; ambil token lagi setelah login/logout. Adapter `api.mjs` menangani hal ini untuk frontend. Implementasi sesi mengikuti [form login Spring Security](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/form.html) dan [alur token CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).

Admin dapat membuat akun lewat POST `/api/users` dengan body `name`, `email`, `password`, dan `role` (`Admin`/`Cashier`), menggunakan sesi Admin dan header CSRF. Tidak ada registrasi publik atau password default admin. Endpoint profil tidak menerima perubahan role atau password.

## Validasi

```sh
./mvnw test
node --test src/test/frontend/*.test.mjs
./mvnw -DskipTests package
```

Tes backend menggunakan H2 dalam mode PostgreSQL, menjalankan migrasi Flyway dan validasi skema JPA. Cakupannya meliputi login/logout/CSRF, hak akses, isolasi data kasir, perhitungan server, rollback pembayaran gagal, idempotensi termasuk request bersamaan, snapshot item, konflik versi, profil, dan laporan. Sebelas tes integrasi API juga dijalankan pada PostgreSQL 17 di container terpisah, termasuk pembayaran bersamaan. Pemeriksaan DOM frontend terhubung ke API nyata lolos 27 pemeriksaan. Total suite Maven terbaru: 16 tes; helper frontend: 22 tes.

Frontend lama yang dijalankan dengan `python3 -m http.server` tidak menyediakan API dan tidak lagi menjadi cara menjalankan aplikasi lengkap. Data localStorage preview lama tidak diimpor otomatis ke database dan tidak dihapus. Draft keranjang masih memakai sessionStorage, terpisah per akun; katalog, profil, pengaturan, sesi login, dan transaksi resmi berasal dari server. Pembayaran saat ini mencatat tunai, belum terhubung ke payment gateway.

Cashier navigation includes Cashier, Sales Report, and Settings. Sales Report and CSV export contain only the signed-in cashier’s transactions; Admin reports include all transactions. Cashiers can view store settings and edit their own profile; changing store settings remains Admin-only.

URL halaman: `/login`, `/cashier`, `/admin`, `/catalog`, `/reports`, `/settings`, dan `/profile`. Spring MVC melayani berkas HTML melalui route tersebut. URL `.html` lama dan `/` dialihkan otomatis ke URL baru; parameter query dipertahankan. Tautan menu, tujuan setelah login, dan logout menggunakan URL tanpa ekstensi.

Panduan implementasi, file yang diubah, penambahan route, dan verifikasi tersedia pada [Dokumentasi URL tanpa HTML](url-tanpa-html.md).

Cara kerja kredensial bootstrap, prosedur pemulihan akun, pembaruan hash BCrypt dan `.env`, serta hasil verifikasi dijelaskan pada [Dokumentasi reset password Admin](reset-password-admin.md).
