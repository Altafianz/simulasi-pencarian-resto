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

const $ = (id) => document.getElementById(id);

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

// ============================================================================
// 6. STATE & TAMPILAN
// ============================================================================
let peta;
let daftarResto;
let penandaResto;
let daftarKonsumen;
let hasilAwal;
let hasilOptimasi;
let waktuAwal = null;
let waktuOptimasi = null;
let animasi = null; // { raf, prefix, hasil, waktu }

// Warna kotak tiap resto (mirip palet pada gambar referensi)
const PALET = [
  "#4caf50",
  "#37c9b8",
  "#8e44ad",
  "#f39c12",
  "#2e86de",
  "#e84393",
  "#16a085",
  "#d35400",
  "#7f8c8d",
  "#c0392b",
];

function clampBulat(nilai, min, max, cadangan) {
  const angka = Math.round(Number(nilai));
  if (!Number.isFinite(angka)) return cadangan;
  return Math.min(max, Math.max(min, angka));
}

// Baca input langsung dari user, lalu rapikan supaya selalu valid
function bacaInput() {
  const n = clampBulat($("n").value, 5, 20, 9);
  const V = n * n;
  const r = clampBulat($("r").value, 1, Math.min(50, V - 1), 4);
  const k = clampBulat($("k").value, 1, V - r, 20);

  $("n").value = n;
  $("r").value = r;
  $("k").value = k;
  $("r").max = Math.min(50, V - 1);
  $("k").max = V - r;

  return { n, r, k };
}

function isiRingkasan() {
  $("ringkasResto").textContent = daftarResto.length;
  $("ringkasKonsumen").textContent = daftarKonsumen.length;
}

function formatMs(nilai) {
  if (nilai == null || !Number.isFinite(nilai)) return "–";
  if (nilai < 0.01) return "<0.01";
  if (nilai < 10) return nilai.toFixed(2);
  return nilai.toFixed(1);
}

function isiPanel(prefix, hasil, waktu) {
  $("waktu" + prefix).textContent = formatMs(waktu);
  $("node" + prefix).textContent = hasil.nodeDiproses.toLocaleString("id-ID");
  $("cek" + prefix).textContent = hasil.cekTetangga.toLocaleString("id-ID");
  $("run" + prefix).textContent = hasil.jumlahDijkstra + "×";
}

function tampilkanProgresPanel(prefix, hasil, t) {
  $("node" + prefix).textContent = Math.round(
    hasil.nodeDiproses * t,
  ).toLocaleString("id-ID");
  $("cek" + prefix).textContent = Math.round(
    hasil.cekTetangga * t,
  ).toLocaleString("id-ID");
}

function perbaruiBanding() {
  if (!hasilAwal || !hasilOptimasi) return;

  const sama = hasilSama(hasilAwal, hasilOptimasi);
  const cekA = hasilAwal.cekTetangga;
  const cekB = hasilOptimasi.cekTetangga;
  const hemat = cekA > 0 ? (1 - cekB / cekA) * 100 : 0;

  let teks = `<b>Hasil ${sama ? "identik" : "berbeda"}</b> pada kedua algoritma. `;

  if (hemat > 0.5) {
    teks += `Pengecekan tetangga ${hemat.toFixed(0)}% lebih sedikit.`;
  } else {
    teks +=
      "Pengecekan tetangga belum lebih sedikit — tambah jumlah konsumen.";
  }

  if (waktuAwal > 0 && waktuOptimasi > 0) {
    const rasio = waktuAwal / waktuOptimasi;
    if (rasio >= 1.05) {
      teks += ` Waktu proses ±${rasio.toFixed(1)}× lebih cepat.`;
    }
  }

  $("banding").innerHTML = teks;
}

function isiDaftarHasil() {
  $("daftar").textContent = hasilOptimasi.hasil
    .map(
      (h, i) =>
        `Konsumen #${i + 1} (node ${daftarKonsumen[i]}) → resto node ${h.resto}, jarak ${h.jarak.toFixed(1)}`,
    )
    .join("\n");
}

// ============================================================================
// 7. MENGGAMBAR PETA
//    jumlahTampil = berapa konsumen yang rutenya sudah ditampilkan.
//    Dipakai untuk animasi: 0 = belum ada rute, N = semua rute.
// ============================================================================
let cacheJalan = { peta: null, svg: "" };

// Gambar jalan hanya dibuat ulang kalau objek petanya berganti (mis. Reset).
function svgJalan() {
  if (cacheJalan.peta === peta) return cacheJalan.svg;

  let svg = "";
  for (let u = 0; u < peta.V; u++) {
    for (const [v] of peta.adj[u]) {
      if (u < v) {
        svg += `<line x1="${peta.x[u].toFixed(1)}" y1="${peta.y[u].toFixed(1)}"
                      x2="${peta.x[v].toFixed(1)}" y2="${peta.y[v].toFixed(1)}"
                      stroke="#d8d8d8" stroke-width="2.2" stroke-linecap="round"/>`;
      }
    }
  }

  cacheJalan = { peta, svg };
  return svg;
}

function gambarPeta(hasil, jumlahTampil) {
  const total = daftarKonsumen.length;
  const tampil = Math.max(
    0,
    Math.min(jumlahTampil == null ? total : jumlahTampil, total),
  );

  const warna = new Map();
  daftarResto.forEach((resto, i) => {
    warna.set(resto, PALET[i % PALET.length]);
  });

  let svg = "<title>Peta jalan dengan resto dan konsumen</title>" + svgJalan();

  // 1) rute konsumen yang sudah dilayani
  for (let i = 0; i < tampil; i++) {
    const h = hasil.hasil[i];
    if (!h || h.resto < 0 || h.rute.length < 2) continue;

    const titik = h.rute
      .map((node) => `${peta.x[node].toFixed(1)},${peta.y[node].toFixed(1)}`)
      .join(" ");

    svg += `<polyline fill="none" stroke="#e11d1d" stroke-width="4.2"
                      stroke-linecap="round" stroke-linejoin="round"
                      opacity="0.9" points="${titik}"/>`;
  }

  // 2) resto (kotak berwarna)
  daftarResto.forEach((resto, i) => {
    const c = PALET[i % PALET.length];
    svg += `<rect x="${(peta.x[resto] - 15).toFixed(1)}"
                  y="${(peta.y[resto] - 15).toFixed(1)}"
                  width="30" height="30" rx="5"
                  fill="${c}" stroke="#2f3440" stroke-width="2.5"/>`;
  });

  // 3) konsumen (lingkaran merah, cincin sesuai resto yang melayani)
  daftarKonsumen.forEach((konsumen, i) => {
    const h = hasil.hasil[i];
    const sudahDilayani = i < tampil && h && h.resto >= 0;
    const cincin = sudahDilayani ? warna.get(h.resto) : "#9aa3b2";
    const isi = sudahDilayani ? "#d32f2f" : "#ffffff";
    const opacity = sudahDilayani ? 1 : 0.75;

    svg += `<circle cx="${peta.x[konsumen].toFixed(1)}"
                    cy="${peta.y[konsumen].toFixed(1)}" r="11"
                    fill="${isi}" stroke="${cincin}" stroke-width="3"
                    opacity="${opacity}"/>`;
  });

  $("peta").innerHTML = svg;
}

// ============================================================================
// 8. HITUNG & TAMPILKAN
// ============================================================================
function hitungDanTampilkan() {
  // jalankan kedua versi pada peta yang sama, ukur waktunya
  const t0 = performance.now();
  const sebelum = dijkstraPerKonsumen(peta, penandaResto, daftarKonsumen);
  const t1 = performance.now();
  const sesudah = dijkstraMultiSource(peta, daftarResto, daftarKonsumen);
  const t2 = performance.now();

  hasilAwal = sebelum;
  hasilOptimasi = sesudah;
  waktuAwal = t1 - t0;
  waktuOptimasi = t2 - t1;

  isiPanel("Awal", hasilAwal, waktuAwal);
  isiPanel("Opt", hasilOptimasi, waktuOptimasi);
  isiRingkasan();
  perbaruiBanding();
  isiDaftarHasil();
  gambarPeta(hasilOptimasi, daftarKonsumen.length);
}

function terapkanData(buatPetaBaru = false) {
  hentikanAnimasi();

  const { n, r, k } = bacaInput();

  if (buatPetaBaru || !peta || peta.n !== n) {
    peta = buatPeta(n);
  }

  daftarResto = pilihAcak(peta.V, r);
  penandaResto = buatPenanda(peta.V, daftarResto);
  daftarKonsumen = pilihAcak(peta.V, k, penandaResto);

  hitungDanTampilkan();

  $("progressWrap").hidden = true;
  setProgress(0);
  $("statusText").textContent =
    "Peta siap. Tekan ▶ untuk memutar simulasi.";
}

function resetData(pesanReset) {
  $("n").value = 9;
  $("r").value = 4;
  $("k").value = 20;
  peta = null;
  terapkanData(true);
  $("statusText").textContent =
    pesanReset || "Peta direset. Tekan ▶ untuk memutar simulasi.";
}

// ============================================================================
// 9. ANIMASI TOMBOL PLAY
// ============================================================================
function setProgress(persen) {
  $("progressBar").style.width = `${Math.max(0, Math.min(100, persen))}%`;
}

function hentikanAnimasi() {
  if (animasi) {
    cancelAnimationFrame(animasi.raf);
    // pastikan angka panel kembali ke nilai penuh
    isiPanel(animasi.prefix, animasi.hasil, animasi.waktu);
    animasi = null;
  }

  $("playAwal").classList.remove("playing");
  $("playOpt").classList.remove("playing");
}

function mulaiAnimasi(jenis, prefix, hasil, waktu) {
  const total = daftarKonsumen.length;

  // Algoritma awal sengaja lebih lambat: kerja dilakukan per konsumen.
  const durasi =
    jenis === "awal" ? Math.min(4800, Math.max(1000, total * 60)) : 700;

  const mulai = performance.now();
  const tombol = jenis === "awal" ? $("playAwal") : $("playOpt");

  tombol.classList.add("playing");
  $("progressWrap").hidden = false;
  setProgress(0);
  tampilkanProgresPanel(prefix, hasil, 0);

  const langkah = (sekarang) => {
    const t = Math.min(1, (sekarang - mulai) / durasi);
    const jumlahTampil = Math.round(t * total);

    gambarPeta(hasil, jumlahTampil);
    setProgress(t * 100);
    tampilkanProgresPanel(prefix, hasil, t);

    if (jenis === "awal") {
      $("statusText").textContent =
        `Algoritma awal: ${jumlahTampil}/${total} konsumen diproses ` +
        `(${total}× Dijkstra)...`;
    } else {
      $("statusText").textContent =
        `Optimisasi: ${jumlahTampil}/${total} konsumen terlayani ` +
        "(1× Dijkstra)...";
    }

    if (t < 1) {
      animasi.raf = requestAnimationFrame(langkah);
      return;
    }

    animasi = null;
    tombol.classList.remove("playing");
    isiPanel(prefix, hasil, waktu);

    if (jenis === "awal") {
      $("statusText").textContent =
        `Selesai — ${total} konsumen dilayani dengan ${total}× Dijkstra ` +
        `(${formatMs(waktu)} ms).`;
    } else {
      $("statusText").textContent =
        `Selesai — semua ${total} konsumen dilayani dengan 1× Dijkstra ` +
        `(${formatMs(waktu)} ms).`;
    }

    perbaruiBanding();
  };

  animasi = {
    raf: requestAnimationFrame(langkah),
    prefix,
    hasil,
    waktu,
  };
}

function putarSimulasi(jenis) {
  if (!peta || !daftarKonsumen || daftarKonsumen.length === 0) return;

  hentikanAnimasi();

  if (jenis === "awal") {
    const t0 = performance.now();
    const hasil = dijkstraPerKonsumen(peta, penandaResto, daftarKonsumen);
    const waktu = performance.now() - t0;

    hasilAwal = hasil;
    waktuAwal = waktu;
    isiPanel("Awal", hasil, waktu);
    perbaruiBanding();
    mulaiAnimasi("awal", "Awal", hasil, waktu);
  } else {
    const t0 = performance.now();
    const hasil = dijkstraMultiSource(peta, daftarResto, daftarKonsumen);
    const waktu = performance.now() - t0;

    hasilOptimasi = hasil;
    waktuOptimasi = waktu;
    isiPanel("Opt", hasil, waktu);
    perbaruiBanding();
    mulaiAnimasi("optimasi", "Opt", hasil, waktu);
  }
}

// ============================================================================
// 10. BENCHMARK GRAF BESAR (10.000 node)
// ============================================================================
function jalankanBenchmark() {
  $("out").textContent = "Menjalankan...";
  $("bench").disabled = true;

  // setTimeout agar tulisan "Menjalankan..." sempat tampil dulu
  setTimeout(() => {
    const petaBesar = buatPeta(100); // 100 x 100 = 10.000 node
    const restoBesar = pilihAcak(petaBesar.V, 50);
    const penandaBesar = buatPenanda(petaBesar.V, restoBesar);

    let tabel = `
      <table>
        <tr>
          <th>Konsumen</th>
          <th>Awal (ms)</th>
          <th>Optimasi (ms)</th>
          <th>Sama</th>
        </tr>`;

    for (const jumlah of [10, 100, 1000, 3000]) {
      const konsumen = pilihAcak(petaBesar.V, jumlah, penandaBesar);

      const t0 = performance.now();
      const a = dijkstraPerKonsumen(petaBesar, penandaBesar, konsumen);
      const t1 = performance.now();
      const b = dijkstraMultiSource(petaBesar, restoBesar, konsumen);
      const t2 = performance.now();

      tabel += `
        <tr>
          <td>${jumlah.toLocaleString("id-ID")}</td>
          <td>${(t1 - t0).toFixed(1)}</td>
          <td>${(t2 - t1).toFixed(1)}</td>
          <td>${hasilSama(a, b) ? "ya" : "tidak"}</td>
        </tr>`;
    }

    $("out").innerHTML = tabel + "</table>";
    $("bench").disabled = false;
  }, 30);
}

// ============================================================================
// 11. PASANG EVENT LISTENER, LALU JALANKAN PERTAMA KALI
// ============================================================================
$("save").addEventListener("click", () => terapkanData(false));
$("reset").addEventListener("click", () => resetData());

$("playAwal").addEventListener("click", () => putarSimulasi("awal"));
$("playOpt").addEventListener("click", () => putarSimulasi("optimasi"));

// Enter di dalam input = sama dengan menekan Save
["n", "r", "k"].forEach((id) => {
  $(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") terapkanData(false);
  });
});

$("bench").addEventListener("click", jalankanBenchmark);

// tampilan awal
resetData("Peta siap. Tekan ▶ untuk memutar simulasi.");
