// ============================================================================
// PEMBUATAN PETA & UTILITAS GRAF
//
// File ini hanya menyiapkan data graf:
//   - posisi simpul,
//   - daftar jalan (adjacency list),
//   - blok bangunan,
//   - pemilihan resto/konsumen secara acak.
//
// Implementasi algoritma Dijkstra ada di algoritma.js.
// ============================================================================

// ============================================================================
// 1. PEMBUAT PETA
//    Peta tetap memakai n x n simpul, tetapi jaringannya tidak lagi grid penuh.
//    Jalan dibentuk dari pohon merentang acak + beberapa jalan arteri panjang,
//    sehingga muncul jalan buntu, blok tidak beraturan, dan jalan memutar.
//    Bobot jalan = jarak garis lurus antara dua simpul.
//    adj[u] = daftar tetangga u, berisi pasangan [tetangga, bobot].
// ============================================================================

// Pilih beberapa baris/kolom yang akan dijadikan jalan arteri panjang.
function pilihGarisUtama(n, jumlah) {
  const hasil = [];
  const langkah = n / (jumlah + 1);

  for (let j = 1; j <= jumlah; j++) {
    let pos = Math.round(j * langkah + (Math.random() - 0.5) * langkah * 0.5);
    pos = Math.max(1, Math.min(n - 2, pos));
    if (!hasil.includes(pos)) hasil.push(pos);
  }

  return hasil;
}

function buatPeta(n) {
  const V = n * n;
  const ukuranSel = 1000 / n;
  const x = new Array(V);
  const y = new Array(V);
  const adj = Array.from({ length: V }, () => []);
  const jepit = (nilai, min, maks) => Math.max(min, Math.min(maks, nilai));

  // Posisi simpul: grid yang digeser halus supaya tidak terlihat kotak.
  for (let baris = 0; baris < n; baris++) {
    for (let kolom = 0; kolom < n; kolom++) {
      const i = baris * n + kolom;
      const lengkungX =
        Math.sin((baris + 1) * 0.61 + (kolom + 1) * 0.23) * 0.09 +
        Math.sin((baris + 1) * 0.17 - (kolom + 1) * 0.47) * 0.05;
      const lengkungY =
        Math.cos((baris + 1) * 0.19 + (kolom + 1) * 0.57) * 0.09 +
        Math.sin((baris + 1) * 0.43 + (kolom + 1) * 0.11) * 0.05;
      const geserX = (Math.random() - 0.5) * 0.44;
      const geserY = (Math.random() - 0.5) * 0.44;

      x[i] = jepit(
        (kolom + 0.5 + geserX + lengkungX) * ukuranSel,
        0.035 * 1000,
        0.965 * 1000,
      );
      y[i] = jepit(
        (baris + 0.5 + geserY + lengkungY) * ukuranSel,
        0.035 * 1000,
        0.965 * 1000,
      );
    }
  }

  // Semua kemungkinan sisi grid menjadi kandidat jalan.
  const kandidat = [];
  for (let baris = 0; baris < n; baris++) {
    for (let kolom = 0; kolom < n; kolom++) {
      const i = baris * n + kolom;
      if (kolom < n - 1) {
        kandidat.push({ u: i, v: i + 1, baris, kolom });
      }
      if (baris < n - 1) {
        kandidat.push({ u: i, v: i + n, baris, kolom });
      }
    }
  }

  // Beberapa baris/kolom dibuat arteri panjang, seperti jalan utama.
  const jumlahArteri = Math.max(2, Math.round(n / 6));
  const barisArteri = pilihGarisUtama(n, jumlahArteri);
  const kolomArteri = pilihGarisUtama(n, jumlahArteri);
  const setBarisArteri = new Set(barisArteri);
  const setKolomArteri = new Set(kolomArteri);
  const arteri = new Set();

  for (const baris of barisArteri) {
    const mulai = Math.floor(Math.random() * Math.max(1, n * 0.16));
    const akhir = n - 1 - Math.floor(Math.random() * Math.max(1, n * 0.16));
    for (let kolom = mulai; kolom < akhir; kolom++) {
      arteri.add(kunciSisi(baris * n + kolom, baris * n + kolom + 1));
    }
  }
  for (const kolom of kolomArteri) {
    const mulai = Math.floor(Math.random() * Math.max(1, n * 0.16));
    const akhir = n - 1 - Math.floor(Math.random() * Math.max(1, n * 0.16));
    for (let baris = mulai; baris < akhir; baris++) {
      arteri.add(kunciSisi(baris * n + kolom, (baris + 1) * n + kolom));
    }
  }

  // Arteri didahulukan, sisanya diacak agar jaringan jalan kecil tidak seragam.
  for (const sisi of kandidat) {
    const kunci = kunciSisi(sisi.u, sisi.v);
    sisi.arteri = arteri.has(kunci);
    sisi.bobot = sisi.arteri ? Math.random() * 0.05 : Math.random();
  }
  kandidat.sort((a, b) => a.bobot - b.bobot);

  // Kruskal: pohon merentang acak membuat semua simpul pasti terhubung.
  const induk = Array.from({ length: V }, (_, i) => i);
  function cari(a) {
    while (induk[a] !== a) {
      induk[a] = induk[induk[a]];
      a = induk[a];
    }
    return a;
  }
  function gabung(a, b) {
    a = cari(a);
    b = cari(b);
    if (a === b) return false;
    induk[b] = a;
    return true;
  }

  const dipilih = new Set();
  for (const sisi of kandidat) {
    if (gabung(sisi.u, sisi.v)) {
      dipilih.add(kunciSisi(sisi.u, sisi.v));
    }
  }

  // Semua arteri tetap dipasang supaya jalan utama benar-benar panjang.
  for (const kunci of arteri) dipilih.add(kunci);

  // Tambah sebagian jalan kecil: cukup untuk membuat blok, loop, dan memutar.
  const targetSisi = Math.round(V * 1.32);
  for (const sisi of kandidat) {
    if (dipilih.size >= targetSisi) break;
    const kunci = kunciSisi(sisi.u, sisi.v);
    if (dipilih.has(kunci)) continue;
    dipilih.add(kunci);
  }

  // Bangun adjacency + kelas jalan (0 kecil, 1 kolektor, 2 arteri).
  const kelasSisi = new Map();
  for (const kunci of dipilih) {
    const [u, v] = kunci.split("-").map(Number);
    const bobot = Math.hypot(x[u] - x[v], y[u] - y[v]);
    let kelas = 0;

    if (arteri.has(kunci)) {
      kelas = 2;
    } else if (v === u + 1) {
      if (setBarisArteri.has(Math.floor(u / n))) kelas = 1;
    } else if (v === u + n) {
      if (setKolomArteri.has(u % n)) kelas = 1;
    }

    adj[u].push([v, bobot]);
    adj[v].push([u, bobot]);
    kelasSisi.set(kunci, kelas);
  }

  // Simpul berderajat 1 = jalan buntu; nanti digambar seperti cul-de-sac.
  const buntu = new Set();
  for (let i = 0; i < V; i++) {
    if (adj[i].length === 1) buntu.add(i);
  }

  // Blok kota = kumpulan sel yang tidak dipisahkan oleh jalan.
  const jumlahSel = (n - 1) * (n - 1);
  const indukSel = Array.from({ length: jumlahSel }, (_, i) => i);
  function cariSel(a) {
    while (indukSel[a] !== a) {
      indukSel[a] = indukSel[indukSel[a]];
      a = indukSel[a];
    }
    return a;
  }
  function gabungSel(a, b) {
    a = cariSel(a);
    b = cariSel(b);
    if (a !== b) indukSel[b] = a;
  }
  const sel = (baris, kolom) => baris * (n - 1) + kolom;

  // Sel yang tidak dipisahkan jalan digabung menjadi satu blok bangunan.
  for (let baris = 0; baris < n - 2; baris++) {
    for (let kolom = 0; kolom < n - 1; kolom++) {
      const u = (baris + 1) * n + kolom;
      if (!dipilih.has(kunciSisi(u, u + 1))) {
        gabungSel(sel(baris, kolom), sel(baris + 1, kolom));
      }
    }
  }
  for (let baris = 0; baris < n - 1; baris++) {
    for (let kolom = 0; kolom < n - 2; kolom++) {
      const u = baris * n + kolom + 1;
      if (!dipilih.has(kunciSisi(u, u + n))) {
        gabungSel(sel(baris, kolom), sel(baris, kolom + 1));
      }
    }
  }

  const blok = new Array(jumlahSel);
  for (let i = 0; i < jumlahSel; i++) blok[i] = cariSel(i);

  return { V, x, y, adj, n, kelasSisi, buntu, blok };
}

// ============================================================================
// 2. UTILITAS PEMILIHAN SIMPUL
// ============================================================================

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
