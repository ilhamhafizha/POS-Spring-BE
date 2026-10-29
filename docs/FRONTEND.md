# PadiPos frontend

Frontend HTML/CSS/JavaScript dilayani langsung oleh Spring Boot pada origin yang sama dengan API. Ikuti [panduan backend](BACKEND.md) untuk konfigurasi PostgreSQL dan akun awal, lalu buka http://localhost:8081/login.

| Halaman | Fungsi |
| --- | --- |
| `login.html` | Login email/password melalui Spring Security. Peran berasal dari akun server. |
| `admin.html` | Ringkasan penjualan, grafik harian, jenis pesanan, produk terlaris, dan transaksi dari API laporan. |
| `catalog.html` | Admin: tambah/edit/hapus produk, kategori, harga, foto dan status aktif. |
| `index.html` | Kasir beberapa produk, jumlah, catatan per item, meja, arsip, dan pembayaran tunai. |
| `reports.html` | Rentang tanggal, pencarian/status, pagination, detail dan ekspor CSV. Admin seluruh toko; Cashier hanya transaksi miliknya. |
| `settings.html` | Admin: informasi toko, pajak nominal/persentase/tanpa pajak dan meja; Cashier hanya membaca. |
| `profile.html` | Ubah profil akun sendiri dan logout. |

`api.mjs` menangani request, cookie sesi, CSRF, serta cache data server untuk halaman aktif. `shell.mjs` memuat akun dan data awal serta menyusun navigasi, dropdown profil dan menu layar kecil. Role tidak lagi dipilih bebas oleh pengguna. Backend juga memeriksa akses untuk setiap API; menyembunyikan menu bukan satu-satunya pembatasan.

Katalog, pengaturan, profil dan transaksi tidak lagi disimpan melalui localStorage preview. Draft keranjang memakai sessionStorage terpisah per akun; logout menghapus draft akun tersebut. Data preview lama tetap tersedia dalam penyimpanan browser tetapi tidak diimpor otomatis atau dipakai untuk menghitung laporan server.

Saat checkout, frontend memuat kembali katalog/pengaturan, kemudian backend menghitung dan memvalidasi nilai transaksi. Request memakai kunci idempotensi sehingga pengulangan setelah gangguan jaringan tidak membuat pembayaran kedua. Harga snapshot arsip tetap dipertahankan. Pengaturan toko dan arsip menggunakan versi untuk mendeteksi perubahan dari sesi lain.

Foto produk, avatar, ikon dan font Roboto disimpan lokal pada `static/assets`. [Figma POS Sederhana (Copy)](https://www.figma.com/design/yBIaE4PeVjTi2kZGTvYwbw/POS-Sederhana--Copy-?node-id=0-1) berisi Design System, bukan semua layout halaman. Halaman tambahan disusun mengikuti komponen yang tersedia. Bentuk isi Settings masih memerlukan frame/screenshot acuan jika harus dicocokkan dengan desain tertentu.

Tes helper frontend:

```sh
node --test src/test/frontend/*.test.mjs
```

Alur DOM juga diuji terhubung ke backend dan PostgreSQL sementara: login, katalog, pengaturan, profil, logout, akses kasir, pembayaran beberapa item, laporan, CSV, serta keutuhan snapshot setelah produk dihapus. Ini pemeriksaan interaksi, bukan verifikasi visual browser. Pembayaran mencatat tunai dan belum menggunakan payment gateway.

Cashier navigation includes Cashier, Sales Report, and Settings. Sales Report and CSV export contain only the signed-in cashier’s transactions; Admin reports include all transactions. Cashiers can view store settings and edit their own profile; changing store settings remains Admin-only.

Checkout: Pay membuka ringkasan item dan pembayaran tunai. Konfirmasi yang berhasil menampilkan Payment Receipt dari respons server (nomor order, item, pajak, total, tunai, kembalian). Done menampilkan Order Accepted, kemudian New Order kembali ke kasir. Pembayaran gagal mempertahankan keranjang; konfirmasi ganda tidak mengirim pembayaran bersamaan. Alur ini lolos 17 pemeriksaan DOM termasuk respons gagal dan konfirmasi ganda.

URL halaman: `/login`, `/cashier`, `/admin`, `/catalog`, `/reports`, `/settings`, dan `/profile`. Spring MVC melayani berkas HTML melalui route tersebut. URL `.html` lama dan `/` dialihkan otomatis ke URL baru; parameter query dipertahankan. Tautan menu, tujuan setelah login, dan logout menggunakan URL tanpa ekstensi.

Panduan implementasi, file yang diubah, penambahan route, dan verifikasi tersedia pada [Dokumentasi URL tanpa HTML](url-tanpa-html.md).
