# Simulasi Resto Terdekat untuk Banyak Konsumen

Aplikasi berbasis web untuk membandingkan efisiensi pencarian restoran terdekat bagi banyak konsumen menggunakan algoritma Dijkstra.

## Algoritma

Aplikasi membandingkan dua pendekatan:

- **Baseline:** Dijkstra dijalankan secara terpisah untuk setiap konsumen dengan Early Exit.
- **Optimized:** Multi-Source Dijkstra, yaitu seluruh restoran dijadikan titik awal dalam satu kali proses pencarian.

Keduanya menggunakan graf berbobot, adjacency list, dan Min-Heap.

## Fitur

- Simulasi pencarian restoran terdekat.
- Pengaturan jumlah konsumen, restoran, dan ukuran peta (default 20×20).
- Peta kota organik: jalan arteri panjang, jalan kecil bercabang, jalan buntu/cul-de-sac, dan blok bangunan yang mengikuti bentuk jalan.
- Visualisasi proses pencarian pada peta dengan animasi rute yang mengalir.
- Mode hambatan dinamis: klik jalan atau persimpangan untuk menutup/membukanya.
- Rute kedua algoritma langsung dihitung ulang setelah hambatan berubah, termasuk saat animasi sedang berjalan.
- Tombol Reset Hambatan untuk membuka semua hambatan tanpa mengubah data konsumen/restoran.
- Perbandingan waktu eksekusi kedua algoritma.
- Benchmark menggunakan graf hingga 10.000 node.

## Hambatan Dinamis

Hambatan diperlakukan sebagai pengurangan edge/node aktif pada graf:

- `hambatanSisi` berisi kunci jalan `u-v` yang ditutup.
- `hambatanNode` berisi nomor persimpangan yang ditutup.

Dijkstra tidak mengubah graf asli; kedua algoritma hanya melewati edge/node yang ada di himpunan hambatan. Karena itu hasilnya tetap Dijkstra biasa pada subgraf yang masih terbuka. Kompleksitas terburuk tidak berubah, hanya jumlah edge/node aktif yang mengecil.

Hambatan disimpan saat menekan Save (selama ukuran peta tidak berubah). Jika ukuran peta diganti atau Reset ditekan, hambatan dibersihkan.

## Teknologi

- HTML
- CSS
- JavaScript

## Menjalankan Aplikasi

Tidak memerlukan instalasi atau dependency tambahan.

1. Clone repository:
   ```bash
   git clone <url-repository>
   ```
2. Buka folder proyek.
3. Jalankan `index.html` melalui browser.

## Deployment

Aplikasi dapat di-deploy menggunakan [Vercel](https://simulasi-pencarian-resto.vercel.app/) sebagai proyek static website.