# Dokumentasi URL tanpa ekstensi HTML

Aplikasi menggunakan route Spring MVC untuk menampilkan halaman melalui URL seperti `/settings`. Berkas aslinya tetap bernama `settings.html` di `src/main/resources/static`. Browser meminta `/settings`, kemudian server mengirim isi berkas tersebut dengan tipe `text/html`, sehingga alamat browser tetap `/settings`.

Contoh alamat aplikasi lokal: `http://localhost:8081/login`.

## Pemetaan halaman

| URL yang tampil | Berkas di `src/main/resources/static` |
| --- | --- |
| `/login` | `login.html` |
| `/cashier` | `index.html` |
| `/admin` | `admin.html` |
| `/catalog` | `catalog.html` |
| `/reports` | `reports.html` |
| `/settings` | `settings.html` |
| `/profile` | `profile.html` |

Alamat `/` dialihkan ke `/cashier`. Pengguna yang belum login kemudian diarahkan oleh frontend ke `/login` saat sesi diperiksa.

## 1. Melayani halaman melalui controller

Implementasi ada di [PageController.java](../src/main/java/com/portfolio/pos/web/PageController.java).

Map `PAGES` menghubungkan URL dengan nama berkas:

```java
private static final Map<String,String> PAGES=Map.of(
    "/cashier","index.html","/admin","admin.html","/catalog","catalog.html",
    "/reports","reports.html","/settings","settings.html",
    "/profile","profile.html","/login","login.html");
```

Method `page()` menerima GET untuk URL yang terdaftar pada `@GetMapping`. Controller mengambil nama berkas dari map dan mengembalikan `ClassPathResource`:

```java
return ResponseEntity.ok()
    .contentType(MediaType.TEXT_HTML)
    .cacheControl(CacheControl.noCache())
    .body(new ClassPathResource("static/" + PAGES.get(
        request.getRequestURI().substring(request.getContextPath().length()))));
```

Ini mengirim isi HTML langsung. URL bersih tetap dapat dibuka langsung atau di-refresh karena server memiliki pemetaan untuk halaman tersebut.

## 2. Mengalihkan alamat lama

Method `legacy()` menangani alamat `.html` lama dan mengembalikan HTTP **302 Found** beserta header `Location` menuju URL baru.

Contoh:

```text
GET /settings.html
302 Location: /settings

GET /login.html?next=reports.html
302 Location: /login?next=reports.html
```

Parameter query dipertahankan. Helper `safeNext()` menerjemahkan tujuan lama seperti `reports.html` menjadi `/reports`, dan hanya menerima tujuan halaman yang dikenal.

## 3. Memperbarui tautan dan pengalihan frontend

Gunakan URL route pada tautan, bukan nama berkas:

```html
<a href="/settings">Settings</a>
```

Pengalihan JavaScript juga memakai URL baru:

```js
location.replace('/login');
```

Bagian yang sudah disesuaikan:

| File | Tanggung jawab |
| --- | --- |
| `src/main/resources/static/shell.mjs` | Sidebar, halaman aktif, profil, pemeriksaan sesi dan akses halaman |
| `src/main/resources/static/login.js` | Tujuan setelah login: Admin ke `/admin`, Cashier ke `/cashier` atau tujuan yang diizinkan |
| `src/main/resources/static/api.mjs` | Pengalihan ketika sesi berakhir dan setelah logout |
| `src/main/resources/static/pos-store.mjs` | Validasi `safeNext()`, kompatibilitas tujuan lama, helper logout |
| `src/main/resources/static/account.js` | Tautan Edit My Profile |
| `src/main/resources/static/admin.html` dan `reports.html` | Tautan Open Cashier |

Berkas CSS, JavaScript, font dan gambar tetap dilayani sebagai aset statis menggunakan nama berkasnya. API tetap menggunakan `/api/...` dan aturan otorisasi pada `SecurityConfig.java`.

Implementasi tautan `/settings` saat ini mengasumsikan aplikasi dipasang pada root domain, misalnya `https://contoh.com/settings`. Jika aplikasi dipasang pada subpath seperti `/pos`, tautan absolut dan URL API frontend juga perlu disesuaikan dengan prefix tersebut.

## Menambahkan halaman baru

Contoh menambahkan halaman `/customers`:

1. Buat `src/main/resources/static/customers.html` beserta script yang diperlukan.
2. Tambahkan pasangan `"/customers", "customers.html"` pada `PAGES` di `PageController`.
3. Tambahkan `"/customers"` pada daftar `@GetMapping` method `page()`.
4. Tambahkan `"/customers.html"` pada daftar `@GetMapping` method `legacy()` jika alamat lama ingin didukung.
5. Tambahkan tautan `/customers` pada menu di `shell.mjs`. Tentukan akses peran dan penanda halaman aktif sesuai kebutuhan.
6. Tambahkan `/customers` pada daftar tujuan `safeNext()` bila halaman boleh menjadi tujuan setelah login. Tambahkan alias `customers.html` pada map `legacy` di helper tersebut jika diperlukan.
7. Sesuaikan daftar tujuan yang boleh dibuka Cashier di `login.js` jika halaman ini tersedia untuk Cashier. Endpoint data baru harus mendapat aturan akses di backend sesuai kebutuhan.
8. Tambahkan pengujian URL baru dan pengalihannya pada `PosApiIntegrationTest`.

`Map.of()` mendukung paling banyak 10 pasangan. Jika jumlah halaman melebihi 10, ubah deklarasi menjadi `Map.ofEntries(Map.entry(...), ...)`.

## Menjalankan dan memeriksa perubahan

Jalankan dari direktori project. Muat konfigurasi `.env` lokal tanpa menampilkan isinya:

```sh
set -a
. ./.env
set +a
./mvnw spring-boot:run
```

Jika aplikasi sedang berjalan, mulai ulang proses aplikasi setelah mengubah controller. Hindari menjalankan dua proses pada port yang sama. Pertahankan konfigurasi akun bootstrap lokal yang sudah digunakan; perubahan routing tidak memerlukan perubahan akun atau database.

Periksa alamat dan pengalihan:

```sh
curl -i http://localhost:8081/settings
curl -i http://localhost:8081/settings.html
```

Hasil yang diharapkan: `/settings` mengembalikan **200** dengan `Content-Type: text/html`, sedangkan `/settings.html` mengembalikan **302** dengan `Location: /settings`. Halaman memeriksa sesi melalui JavaScript; respons HTML 200 tidak berarti endpoint data dapat diakses tanpa login.

Jalankan pengujian:

```sh
./mvnw test
node --test src/test/frontend/*.test.mjs
```

Tes URL mencakup ketujuh halaman, pengalihan URL lama dengan query, alamat `/`, aset CSS, dan API yang tetap memerlukan autentikasi. Setelah aplikasi dimulai ulang, buka `/login`, coba navigasi dan refresh langsung pada `/reports` atau `/settings`. Gunakan Cmd+Shift+R jika browser masih memuat script lama.

## Jika URL baru menghasilkan 404

- Pastikan URL terdaftar pada `PAGES` dan `@GetMapping` method `page()`.
- Pastikan berkas HTML ada di `src/main/resources/static` dan ejaan namanya sesuai.
- Pastikan server sudah dimulai ulang setelah controller diubah.
- Buka aplikasi melalui server Spring Boot di port yang digunakan, bukan melalui `file://` atau server statis terpisah.
- Jika memakai reverse proxy, teruskan request URL halaman ke Spring Boot agar route controller dapat dijalankan.
