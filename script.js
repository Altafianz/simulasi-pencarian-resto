// ============================================================================
// SIMULASI RESTO TERDEKAT UNTUK BANYAK KONSUMEN
//
// Dua cara dibandingkan:
//   SEBELUM : Dijkstra dijalankan satu kali PER KONSUMEN, berhenti di resto
//             pertama yang ditemukan (early exit).
//   SESUDAH : Dijkstra MULTI-SOURCE. Semua resto jadi titik awal (jarak 0),
//             Dijkstra dijalankan SATU KALI, lalu tiap konsumen tinggal
//             membaca resto terdekatnya. Ini sah karena jalan dua arah.
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

// ============================================================================
// 2. PEMBUAT PETA
//    Peta berbentuk grid n x n. Posisi tiap node digeser sedikit secara acak
//    supaya terlihat seperti peta jalan. Bobot jalan = jarak garis lurus.
//    adj[u] = daftar tetangga u, berisi pasangan [tetangga, bobot].
// ============================================================================
function buatPeta(n) {
  const V = n * n;
  const x = [];
  const y = [];
  const adj = Array.from({ length: V }, () => []);
  const ukuranSel = 1000 / n;

  // posisi tiap node
  for (let baris = 0; baris < n; baris++) {
    for (let kolom = 0; kolom < n; kolom++) {
      const geserX = (Math.random() - 0.5) * 0.6;
      const geserY = (Math.random() - 0.5) * 0.6;
      x.push((kolom + 0.5 + geserX) * ukuranSel);
      y.push((baris + 0.5 + geserY) * ukuranSel);
    }
  }

  // jalan dua arah antara dua node
  function tambahJalan(a, b) {
    const bobot = Math.hypot(x[a] - x[b], y[a] - y[b]);
    adj[a].push([b, bobot]);
    adj[b].push([a, bobot]);
  }

  // hubungkan tiap node ke kanan dan ke bawah
  for (let baris = 0; baris < n; baris++) {
    for (let kolom = 0; kolom < n; kolom++) {
      const i = baris * n + kolom;
      if (kolom < n - 1) tambahJalan(i, i + 1);
      if (baris < n - 1) tambahJalan(i, i + n);
    }
  }

  return { V, x, y, adj, n };
}

// Pilih k node acak (boleh mengecualikan node tertentu)
function pilihAcak(V, k, dikecualikan) {
  const kandidat = [];
  for (let i = 0; i < V; i++) {
    if (!dikecualikan || !dikecualikan[i]) kandidat.push(i);
  }

  const jumlah = Math.min(k, kandidat.length);
  for (let i = 0; i < jumlah; i++) {
    const j = i + Math.floor(Math.random() * (kandidat.length - i));
    [kandidat[i], kandidat[j]] = [kandidat[j], kandidat[i]];
  }
  return kandidat.slice(0, jumlah);
}

// Ubah daftar node menjadi array penanda (penanda[i] = 1 jika i ada di daftar)
function buatPenanda(V, daftar) {
  const penanda = new Uint8Array(V);
  daftar.forEach((i) => (penanda[i] = 1));
  return penanda;
}

// ============================================================================
// 3. VERSI SEBELUM: Dijkstra per konsumen
//    Untuk tiap konsumen: jalankan Dijkstra dari konsumen itu, dan berhenti
//    begitu resto pertama keluar dari priority queue.
// ============================================================================
function dijkstraPerKonsumen(peta, penandaResto, daftarKonsumen) {
  const V = peta.V;
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
      nodeDiproses++;

      // EARLY EXIT: resto pertama yang keluar dari heap = resto terdekat
      if (penandaResto[u]) {
        restoDitemukan = u;
        break;
      }

      for (const [v, bobot] of peta.adj[u]) {
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
// 4. VERSI SESUDAH: Dijkstra multi-source
//    Semua resto dimasukkan ke heap dengan jarak 0, lalu Dijkstra dijalankan
//    sekali sampai selesai. Tiap node mencatat resto asalnya (asal[]).
// ============================================================================
function dijkstraMultiSource(peta, daftarResto, daftarKonsumen) {
  const V = peta.V;
  const dist = new Float64Array(V).fill(Infinity);
  const parent = new Int32Array(V).fill(-1);
  const asal = new Int32Array(V).fill(-1); // resto terdekat dari tiap node
  const heap = new Heap();

  let nodeDiproses = 0;
  let cekTetangga = 0;

  // semua resto = titik awal
  for (const resto of daftarResto) {
    dist[resto] = 0;
    asal[resto] = resto;
    heap.push(0, resto);
  }

  while (heap.size > 0) {
    const [jarak, u] = heap.pop();

    if (jarak > dist[u]) continue;
    nodeDiproses++;

    for (const [v, bobot] of peta.adj[u]) {
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
// 5. PENGECEKAN: apakah jarak tiap konsumen sama di kedua versi?
//    Yang dibandingkan JARAKNYA, bukan nomor restonya, karena dua resto yang
//    berjarak sama boleh terpilih berbeda dan keduanya tetap benar.
// ============================================================================
function hasilSama(a, b) {
  return a.hasil.every((h, i) => {
    const selisih = Math.abs(h.jarak - b.hasil[i].jarak);
    return h.jarak === b.hasil[i].jarak || selisih < 1e-9;
  });
}
