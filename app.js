// ============================================================================
// UI, ANIMASI, DAN BENCHMARK
//
// File ini hanya mengatur tampilan dan interaksi. Semua algoritma tetap berada
// di script.js dan tidak diubah. Render peta kartun berada di peta.js.
// ============================================================================

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
let peta;
let daftarResto;
let penandaResto;
let daftarKonsumen;
let hasilAwal;
let hasilOptimasi;
let waktuAwal = null;
let waktuOptimasi = null;
let animasi = null; // { raf, prefix, hasil, waktu }

// ---------------------------------------------------------------------------
// INPUT & ANGKA
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// HITUNG & TAMPILKAN
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// ANIMASI TOMBOL PLAY
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// BENCHMARK GRAF BESAR (10.000 node)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// EVENT LISTENER & TAMPILAN AWAL
// ---------------------------------------------------------------------------
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
