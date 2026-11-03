# Simulasi Resto Terdekat untuk Banyak Konsumen

Aplikasi berbasis web untuk membandingkan efisiensi pencarian restoran terdekat bagi banyak konsumen menggunakan algoritma Dijkstra.

## Algoritma

Aplikasi membandingkan dua pendekatan:

- **Baseline:** Dijkstra dijalankan secara terpisah untuk setiap konsumen dengan Early Exit.
- **Optimized:** Multi-Source Dijkstra, yaitu seluruh restoran dijadikan titik awal dalam satu kali proses pencarian.

Keduanya menggunakan graf berbobot, adjacency list, dan Min-Heap.

## Fitur

- Simulasi pencarian restoran terdekat.
- Pengaturan jumlah konsumen dan restoran.
- Visualisasi proses pencarian pada peta.
- Perbandingan waktu eksekusi kedua algoritma.
- Benchmark menggunakan graf hingga 10.000 node.

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