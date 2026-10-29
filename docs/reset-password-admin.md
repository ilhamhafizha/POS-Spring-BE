# Reset password Admin

Panduan ini menjelaskan pemulihan akses akun `admin@example.com` yang telah dilakukan pada database lokal. Password baru tidak dicantumkan dalam dokumentasi; nilainya disimpan pada `.env` lokal.

## Mengapa password di `.env` tidak bisa dipakai?

Login memeriksa password terhadap kolom `app_users.password_hash` di PostgreSQL. Password tersimpan dalam bentuk hash BCrypt, sehingga password aslinya tidak dapat dibaca kembali dari database.

Variabel `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env` digunakan untuk membuat akun awal melalui [BootstrapUsers.java](../src/main/java/com/portfolio/pos/account/BootstrapUsers.java). Jika email tersebut sudah ada, proses bootstrap berhenti tanpa mengganti password:

```java
if(users.existsByEmail(email.trim().toLowerCase(java.util.Locale.ROOT)))return;
```

Akibatnya, mengedit `ADMIN_PASSWORD` lalu menjalankan ulang aplikasi tidak mereset password akun yang sudah ada. Mengubah `ADMIN_EMAIL` menjadi email baru justru dapat membuat akun baru ketika bootstrap aktif.

Konfigurasi variabel tersedia di [application.properties](../src/main/resources/application.properties). Spring Boot membaca `.env` lokal melalui `spring.config.import` pada `application.properties`. Environment proses juga dapat digunakan.

## Langkah yang dilakukan saat pemulihan

1. Memeriksa daftar ID, email, dan role pada `app_users`. Ditemukan akun `admin@example.com` dengan role `Admin`.
2. Mencoba login menggunakan password dari `.env`. Server mengembalikan **401**, sehingga nilainya memang tidak cocok dengan akun database.
3. Setelah mendapat persetujuan reset, membuat password acak baru menggunakan `secrets.token_urlsafe(18)` di Python.
4. Membuat hash BCrypt dari password baru menggunakan pustaka Spring Security yang sudah tersedia pada dependency project, dengan cost **12** dan salt acak.
5. Mengubah hanya `password_hash` milik akun dengan email `admin@example.com` dan role `Admin`. Hasil SQL diperiksa agar tepat **1 akun** diperbarui.
6. Menyamakan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` pada `.env`, lalu mengatur izin berkas menjadi **0600**: hanya pemilik berkas yang dapat membaca dan menulis.
7. Menguji login dengan password baru, memeriksa profil dan role Admin, membuka endpoint khusus Admin, lalu logout dari sesi pengujian.

Reset ini tidak menghapus atau membuat ulang akun. ID pengguna, email, role, akun kasir, produk, pengaturan toko, dan transaksi dipertahankan. Tidak ada perubahan kode aplikasi atau migrasi database untuk reset tersebut.

## Detail pembuatan hash

Aplikasi memakai `BCryptPasswordEncoder` pada [SecurityConfig.java](../src/main/java/com/portfolio/pos/security/SecurityConfig.java). Saat pemulihan, hash dibuat melalui kelas `BCrypt` dari dependency yang sama:

```java
import org.springframework.security.crypto.bcrypt.BCrypt;

String hash = BCrypt.hashpw(passwordBaru, BCrypt.gensalt(12));
```

Password diberikan ke helper Java melalui **stdin**, bukan sebagai argumen command line. Hash ditangkap oleh script untuk diteruskan ke SQL. Password dan hash tidak dicetak ke log proses reset. Kredensial baru disampaikan kepada pemilik akun setelah login berhasil diverifikasi.

Hash BCrypt memuat salt dan cost-nya sendiri. Walaupun encoder aplikasi menggunakan konfigurasi default saat membuat akun, encoder tetap dapat memverifikasi hash cost 12 yang dibuat pada reset ini. Password mentah tidak disimpan pada kolom `password_hash`.

## Bentuk perubahan database

Database lokal memakai service Docker Compose `postgres`, database `pos_db`, dan pengguna `pos_user` dari [compose.yaml](../compose.yaml).

Periksa target akun terlebih dahulu:

```sh
docker compose exec -T postgres psql -U pos_user -d pos_db \
  -c "SELECT id, email, role FROM app_users ORDER BY id;"
```

Bentuk SQL yang digunakan saat reset:

```sql
UPDATE app_users
SET password_hash = '<HASH_BCRYPT_DARI_PASSWORD_BARU>'
WHERE email = 'admin@example.com'
  AND role = 'Admin'
RETURNING id;
```

`<HASH_BCRYPT_DARI_PASSWORD_BARU>` adalah placeholder dokumentasi, bukan nilai yang boleh langsung dijalankan. Gunakan hash dari password baru yang dipilih. Pada pemulihan yang dilakukan, script memvalidasi format hash, mengirim SQL melalui stdin ke `psql` dengan `ON_ERROR_STOP=1`, dan memeriksa hasil `UPDATE 1`.

Jika menjalankan SQL secara manual, gunakan transaksi agar hasil dapat diperiksa sebelum disimpan:

```sql
BEGIN;

UPDATE app_users
SET password_hash = '<HASH_BCRYPT_DARI_PASSWORD_BARU>'
WHERE email = 'admin@example.com'
  AND role = 'Admin'
RETURNING id, email, role;

-- Jika tepat 1 akun yang benar diperbarui:
COMMIT;
-- Jika hasil tidak sesuai, gunakan ROLLBACK sebagai pengganti COMMIT.
```

Jangan meletakkan hash BCrypt langsung di dalam command shell berpetik ganda: karakter `$` pada hash dapat diekspansi oleh shell. Gunakan pengiriman stdin melalui script seperti saat pemulihan ini, parameter database, atau input SQL interaktif.

## Menyamakan `.env`

Setelah perubahan database berhasil, ubah dua variabel ini pada `.env` lokal:

```dotenv
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<PASSWORD_BARU_YANG_SAMA>
```

Placeholder di atas harus diganti dengan password mentah yang digunakan untuk membuat hash. Jangan memasukkan hash BCrypt sebagai `ADMIN_PASSWORD`.

```sh
chmod 600 .env
```

Berkas `.env` sudah diabaikan melalui [.gitignore](../.gitignore). Password tidak perlu dimasukkan ke dokumentasi, source code, atau commit. Sinkronisasi `.env` menjaga catatan konfigurasi lokal sesuai akun; perubahan password login sendiri terjadi melalui pembaruan hash di database.

## Verifikasi setelah reset

Buka [halaman login lokal](http://localhost:8081/login) dan masuk menggunakan email Admin serta password baru dari `.env`.

Pemeriksaan yang sudah dilakukan:

| Pemeriksaan | Hasil |
| --- | --- |
| GET `/api/auth/csrf` | Token CSRF diperoleh beserta sesi cookie |
| POST `/api/auth/login` dengan email, password, cookie dan token CSRF | **204**, login berhasil |
| GET `/api/auth/me` pada sesi yang sama | Email `admin@example.com`, role `Admin` |
| GET `/api/users` | **200**, akses endpoint khusus Admin berhasil |
| GET `/settings` | **200**, halaman tersedia |
| POST `/api/auth/logout` dengan token CSRF sesi terbaru | **204**, sesi pengujian diakhiri |

Login dan logout membutuhkan penanganan cookie serta CSRF; POST tanpa token yang sesuai dapat ditolak dengan **403** meskipun password benar. Respons HTML `/settings` saja tidak membuktikan hak akses; verifikasi role dan endpoint `/api/users` yang memastikan akses Admin telah pulih.

Aplikasi tidak perlu di-restart untuk menggunakan password baru: proses login memuat akun dari database. Proses aplikasi yang sudah berjalan tidak otomatis memuat ulang `.env`, tetapi login menggunakan hash dari database, bukan password bootstrap di environment proses.

Reset melalui SQL ini **tidak otomatis mencabut sesi lain yang sudah aktif**. Logout pada pengujian hanya mengakhiri sesi pengujian tersebut. Fitur forgot/reset password melalui UI belum dibuat; langkah ini merupakan pemulihan administratif pada database lokal.
