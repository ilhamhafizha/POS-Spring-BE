# Data referensi POS dari Figma

Data diambil dari komponen `Menu & Card` pada file [POS Sederhana (Copy)](https://www.figma.com/design/yBIaE4PeVjTi2kZGTvYwbw/POS-Sederhana--Copy-?node-id=126-9751).
File hanya berisi halaman Design System. Satu produk unik ditemukan; variasi kartu menggunakan produk yang sama.

- `products.sql`: seed manual untuk tabel `products` setelah migrasi V1. Tidak dijalankan otomatis dan tidak mengubah produk dengan nama yang sudah ada.
- `pos-reference.json`: detail produk dan satu contoh pesanan konsisten dari desain. Referensi ini berasal dari tahap awal desain; skema aplikasi saat ini juga mendukung metadata produk, pesanan, dan pembayaran.

Payload produk yang sesuai dengan `CreateProductRequest`:

```json
{ "name": "Gado-gado Special", "price": 20000.00 }
```

Nama pada kartu menu adalah `Gado-gado Special`, sedangkan contoh pesanan menggunakan ejaan `Gado-gado Spesial`. Referensi ini menyamakan keduanya ke nama kartu menu.
`All Menu` merupakan filter, bukan kategori produk. Label `Food` pada kartu dipetakan ke kategori `Foods` pada tab.
Pajak Rp5.000 disalin dari contoh tampilan, bukan aturan perhitungan pajak.
Nomor pesanan, pelanggan, dan meja merupakan contoh desain.
