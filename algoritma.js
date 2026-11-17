// ============================================================================
// IMPLEMENTASI ALGORITMA DIJKSTRA
//
// File ini khusus berisi:
//   1. Min-Heap sebagai priority queue.
//   2. Dijkstra per konsumen (algoritma awal).
//   3. Dijkstra multi-source (algoritma optimisasi).
//   4. Pembanding hasil kedua algoritma.
//
// Pembuatan peta, pemilihan resto/konsumen, render SVG, dan UI berada di file
// lain. Kedua algoritma menerima objek `peta` yang sudah jadi.
//
// Hambatan dinamis:
//   - hambatanSisi : Set berisi kunci jalan "u-v" yang ditutup.
//   - hambatanNode : Set berisi nomor persimpangan yang ditutup.
// Hambatan hanya menyaring edge/node saat relaksasi, jadi graf asli tidak
// diubah dan hasilnya tetap Dijkstra biasa pada subgraf yang masih terbuka.
// ============================================================================

// ============================================================================
// 1. MIN-HEAP (priority queue)
//    JavaScript tidak punya priority queue bawaan, jadi dibuat sendiri.
//    Isi heap: pasangan [jarak, node]. Yang jaraknya terkecil selalu di atas.
// ============================================================================
class Heap {
  constructor() {
    this.data = [];
  }

  get size() {
    return this.data.length;
  }

  // Masukkan elemen baru, lalu naikkan sampai posisinya benar
  push(jarak, node) {
    const a = this.data;
    a.push([jarak, node]);

    let i = a.length - 1;
    while (i > 0) {
      const induk = (i - 1) >> 1;
      if (a[induk][0] <= a[i][0]) break;

      [a[induk], a[i]] = [a[i], a[induk]];
      i = induk;
    }
  }

  // Ambil elemen dengan jarak terkecil, lalu rapikan heap
  pop() {
    const a = this.data;
    const teratas = a[0];
    const terakhir = a.pop();

    if (a.length > 0) {
      a[0] = terakhir;

      let i = 0;
      while (true) {
        let terkecil = i;
        const kiri = 2 * i + 1;
        const kanan = kiri + 1;

        if (kiri < a.length && a[kiri][0] < a[terkecil][0]) terkecil = kiri;
        if (kanan < a.length && a[kanan][0] < a[terkecil][0]) terkecil = kanan;
        if (terkecil === i) break;

        [a[terkecil], a[i]] = [a[i], a[terkecil]];
        i = terkecil;
      }
    }
    return teratas;
  }
}

// Kunci jalan dua arah. Dipakai agar (u,v) dan (v,u) dianggap jalan yang sama.
function kunciSisi(u, v) {
  return u < v ? `${u}-${v}` : `${v}-${u}`;
}

// Set kosong dipakai saat benchmark memanggil algoritma tanpa hambatan.
const SISI_KOSONG = new Set();
const NODE_KOSONG = new Set();

// ============================================================================
// 2. VERSI SEBELUM: Dijkstra per konsumen
//    Untuk tiap konsumen: jalankan Dijkstra dari konsumen itu, dan berhenti
//    begitu resto pertama keluar dari priority queue.
// ============================================================================
function dijkstraPerKonsumen(
  peta,
  penandaResto,
  daftarKonsumen,
  hambatanSisi = null,
  hambatanNode = null,
) {
  const V = peta.V;
  const sisiTutup = hambatanSisi || SISI_KOSONG;
  const nodeTutup = hambatanNode || NODE_KOSONG;
  const adaHambatan = sisiTutup.size > 0 || nodeTutup.size > 0;
  const dist = new Float64Array(V);
  const parent = new Int32Array(V);
  const dilihat = new Int32Array(V); // penanda "sudah diisi pada putaran ini"

  const hasil = [];
  let nodeDiproses = 0;
  let cekTetangga = 0;
  let putaran = 0;

  for (const konsumen of daftarKonsumen) {
    putaran++;
    const heap = new Heap();

    dist[konsumen] = 0;
    parent[konsumen] = -1;
    dilihat[konsumen] = putaran;
    heap.push(0, konsumen);

    let restoDitemukan = -1;

    while (heap.size > 0) {
      const [jarak, u] = heap.pop();

      // entri usang (sudah ada jarak yang lebih baik), lewati
      if (jarak > dist[u]) continue;

      // persimpangan yang ditutup tidak boleh diproses/dilewati
      if (adaHambatan && nodeTutup.has(u)) continue;
      nodeDiproses++;

      // EARLY EXIT: resto pertama yang keluar dari heap = resto terdekat
      if (penandaResto[u]) {
        restoDitemukan = u;
        break;
      }

      for (const [v, bobot] of peta.adj[u]) {
        // lewati persimpangan atau jalan yang sedang ditutup
        if (adaHambatan && (nodeTutup.has(v) || sisiTutup.has(kunciSisi(u, v))))
          continue;
        cekTetangga++;

        const jarakBaru = jarak + bobot;
        const belumPernahDiisi = dilihat[v] !== putaran;

        if (belumPernahDiisi || jarakBaru < dist[v]) {
          dilihat[v] = putaran;
          dist[v] = jarakBaru;
          parent[v] = u;
          heap.push(jarakBaru, v);
        }
      }
    }

    // susun rute resto -> konsumen dari array parent
    const rute = [];
    if (restoDitemukan >= 0) {
      for (let c = restoDitemukan; c !== -1; c = parent[c]) {
        rute.push(c);
      }
    }

    hasil.push({
      resto: restoDitemukan,
      jarak: restoDitemukan < 0 ? Infinity : dist[restoDitemukan],
      rute: rute,
    });
  }

  return {
    hasil,
    nodeDiproses,
    cekTetangga,
    jumlahDijkstra: daftarKonsumen.length,
  };
}

// ============================================================================
// 3. VERSI SESUDAH: Dijkstra multi-source
//    Semua resto dimasukkan ke heap dengan jarak 0, lalu Dijkstra dijalankan
//    sekali sampai selesai. Tiap node mencatat resto asalnya (asal[]).
// ============================================================================
function dijkstraMultiSource(
  peta,
  daftarResto,
  daftarKonsumen,
  hambatanSisi = null,
  hambatanNode = null,
) {
  const V = peta.V;
  const sisiTutup = hambatanSisi || SISI_KOSONG;
  const nodeTutup = hambatanNode || NODE_KOSONG;
  const adaHambatan = sisiTutup.size > 0 || nodeTutup.size > 0;
  const dist = new Float64Array(V).fill(Infinity);
  const parent = new Int32Array(V).fill(-1);
  const asal = new Int32Array(V).fill(-1); // resto terdekat dari tiap node
  const heap = new Heap();

  let nodeDiproses = 0;
  let cekTetangga = 0;

  // semua resto yang masih terbuka = titik awal
  for (const resto of daftarResto) {
    if (nodeTutup.has(resto)) continue;
    dist[resto] = 0;
    asal[resto] = resto;
    heap.push(0, resto);
  }

  while (heap.size > 0) {
    const [jarak, u] = heap.pop();

    if (jarak > dist[u]) continue;

    // persimpangan yang ditutup tidak boleh diproses/dilewati
    if (adaHambatan && nodeTutup.has(u)) continue;
    nodeDiproses++;

    for (const [v, bobot] of peta.adj[u]) {
      // lewati persimpangan atau jalan yang sedang ditutup
      if (adaHambatan && (nodeTutup.has(v) || sisiTutup.has(kunciSisi(u, v))))
        continue;
      cekTetangga++;

      const jarakBaru = jarak + bobot;

      if (jarakBaru < dist[v]) {
        dist[v] = jarakBaru;
        parent[v] = u;
        asal[v] = asal[u]; // v mewarisi resto asal dari u
        heap.push(jarakBaru, v);
      }
    }
  }

  // tiap konsumen tinggal membaca hasilnya
  const hasil = daftarKonsumen.map((konsumen) => {
    if (asal[konsumen] < 0) {
      return { resto: -1, jarak: Infinity, rute: [] };
    }

    // parent mengarah ke resto, jadi dibalik agar urutannya resto -> konsumen
    const rute = [];
    for (let c = konsumen; c !== -1; c = parent[c]) {
      rute.push(c);
    }
    rute.reverse();

    return { resto: asal[konsumen], jarak: dist[konsumen], rute: rute };
  });

  return { hasil, nodeDiproses, cekTetangga, jumlahDijkstra: 1 };
}

// ============================================================================
// 4. PENGECEKAN: apakah jarak tiap konsumen sama di kedua versi?
//    Yang dibandingkan JARAKNYA, bukan nomor restonya, karena dua resto yang
//    berjarak sama boleh terpilih berbeda dan keduanya tetap benar.
// ============================================================================
function hasilSama(a, b) {
  return a.hasil.every((h, i) => {
    const selisih = Math.abs(h.jarak - b.hasil[i].jarak);
    return h.jarak === b.hasil[i].jarak || selisih < 1e-9;
  });
}
