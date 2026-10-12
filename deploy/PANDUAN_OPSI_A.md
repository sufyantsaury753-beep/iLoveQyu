# Panduan Deployment LibreOffice Engine (Opsi A) untuk iLoveQyu

iLoveQyu kini telah terintegrasi dengan **LibreOffice Headless Engine** (arsitektur standar industri yang digunakan oleh iLovePDF, SmallPDF, dan Adobe Acrobat).

---

## ⚡ 1. Cara Kerja Saat Ini (Langsung Aktif)
Secara *default*, iLoveQyu telah terhubung ke cloud engine Gotenberg yang aktif. 
Fitur Word ke PDF di iLoveQyu sekarang:
- Menghasilkan dokumen A4 **21 halaman utuh** (tidak lagi terpotong jadi 11 halaman).
- Menjaga **Cover Makalah** tetap di halaman 1 dengan logo di tengah.
- **Kata Pengantar** rapi di halaman 2 dengan angka romawi `ii`.
- **Daftar Isi** rapi di halaman 3 lengkap dengan garis titik-titik (*dot leaders*) rata kanan.
- **Catatan Kaki (Footnote)** berada tepat di bawah masing-masing halaman (bukan dilempar ke akhir dokumen).
- **Tabel & Perataan Paragraf** presisi 100% identik dengan Microsoft Word & iLovePDF.

---

## 🚀 2. Deploy Server Sendiri Secara Gratis (1 Menit di Koyeb)
Jika kamu ingin memiliki URL server privat milikmu sendiri tanpa batasan kuota demo:

### Langkah di Koyeb (100% Gratis - Tanpa Kartu Kredit):
1. Buka [koyeb.com](https://www.koyeb.com/) dan daftar gratis (bisa klik *Sign in with GitHub*).
2. Klik tombol **"Create Web Service"**.
3. Pilih opsi **"Docker"**.
4. Masukkan nama image Docker:
   ```text
   gotenberg/gotenberg:8
   ```
5. Pada bagian **Port**, pastikan terisi: `3000`.
6. Klik **"Deploy"**.
7. Dalam 1 menit, Koyeb akan memberikan URL HTTPS publik, contoh:
   `https://iloveqyu-gotenberg-xxxx.koyeb.app`

---

## ⚙️ 3. Masukkan URL Server ke iLoveQyu
1. Buka web iLoveQyu milikmu.
2. Klik tombol tersembunyi **`v1.0`** di pojok kanan atas navbar.
3. Masukkan PIN master kamu (`753`).
4. Pada kolom **"LibreOffice Cloud API (Opsi A)"**, ganti dengan URL Koyeb kamu.
5. Klik **"Uji Koneksi"** (status akan berubah menjadi hijau: *Terkoneksi!*).
6. Klik **"Simpan Semua Pengaturan"**.
Selesai! Seluruh konversi Word ke PDF di web kamu sekarang berjalan di kluster privatmu sendiri!
