// ============================================================================
// UI, ANIMASI, DAN BENCHMARK
//
// File ini mengatur tampilan dan interaksi. Logika algoritma berada di
// script.js, sedangkan render peta kartun berada di peta.js.
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
let animasi = null; // { raf, mulai, durasi, jenis, prefix, hasil, waktu, jumlahTampil }

// Hambatan dinamis. Sisi memakai kunci "u-v", node memakai nomor simpul.
let hambatanSisi = new Set();
let hambatanNode = new Set();
let modeHambatan = false;

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
  const n = clampBulat($("n").value, 5, 20, 20);
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
  $("ringkasHambatan").textContent = hambatanSisi.size + hambatanNode.size;
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

  const takTerjangkau = hasilOptimasi.hasil.filter((h) => h.resto < 0).length;
  if (takTerjangkau > 0) {
    teks += ` <b>${takTerjangkau} konsumen tidak punya rute</b> karena hambatan.`;
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
    .map((h, i) => {
      const awal = `Konsumen #${i + 1} (node ${daftarKonsumen[i]})`;
      if (h.resto < 0) return `${awal} → tidak ada rute (terhalang)`;
      return `${awal} → resto node ${h.resto}, jarak ${h.jarak.toFixed(1)}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// HITUNG & TAMPILKAN
// ---------------------------------------------------------------------------
function hitungDanTampilkan() {
  // jalankan kedua versi pada peta yang sama, ukur waktunya
  const t0 = performance.now();
  const sebelum = dijkstraPerKonsumen(
    peta,
    penandaResto,
    daftarKonsumen,
    hambatanSisi,
    hambatanNode,
  );
  const t1 = performance.now();
  const sesudah = dijkstraMultiSource(
    peta,
    daftarResto,
    daftarKonsumen,
    hambatanSisi,
    hambatanNode,
  );
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

  // Kalau animasi sedang berjalan, jangan tampilkan semua rute sekaligus.
  // Cukup perbarui data animasinya supaya frame berikutnya memakai hasil baru.
  if (animasi) {
    animasi.hasil = animasi.jenis === "awal" ? hasilAwal : hasilOptimasi;
    animasi.waktu = animasi.jenis === "awal" ? waktuAwal : waktuOptimasi;
  }

  const hasilTampil = animasi ? animasi.hasil : hasilOptimasi;
  const jumlahTampil = animasi
    ? animasi.jumlahTampil
    : daftarKonsumen.length;

  gambarPeta(hasilTampil, jumlahTampil);
  perbaruiHambatan();
}

function kosongkanHambatan() {
  hambatanSisi.clear();
  hambatanNode.clear();
}

function terapkanData(buatPetaBaru = false) {
  hentikanAnimasi();

  const { n, r, k } = bacaInput();

  if (buatPetaBaru || !peta || peta.n !== n) {
    peta = buatPeta(n);
    // Topologi baru: kunci jalan dan nomor simpul lama tidak berlaku lagi.
    kosongkanHambatan();
  }

  // Jangan menaruh resto/konsumen baru di simpul yang sedang ditutup.
  const tertutup = new Uint8Array(peta.V);
  for (const node of hambatanNode) tertutup[node] = 1;

  daftarResto = pilihAcak(peta.V, r, tertutup);
  penandaResto = buatPenanda(peta.V, daftarResto);

  const dipakai = new Uint8Array(peta.V);
  for (const resto of daftarResto) dipakai[resto] = 1;
  for (const node of hambatanNode) dipakai[node] = 1;
  daftarKonsumen = pilihAcak(peta.V, k, dipakai);

  hitungDanTampilkan();

  $("progressWrap").hidden = true;
  setProgress(0);
  const jumlahHambatan = hambatanSisi.size + hambatanNode.size;
  $("statusText").textContent =
    jumlahHambatan > 0
      ? `Peta siap. ${jumlahHambatan} hambatan tetap aktif. Tekan ▶ untuk memutar simulasi.`
      : "Peta siap. Tekan ▶ untuk memutar simulasi.";
}

function resetData(pesanReset) {
  $("n").value = 20;
  $("r").value = 4;
  $("k").value = 20;
  peta = null;
  kosongkanHambatan();
  setModeHambatan(false);
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

function durasiAnimasi(jenis, total) {
  // Sengaja lambat supaya aliran rute terlihat jelas dan user sempat
  // mengklik hambatan di tengah animasi.
  if (jenis === "awal") {
    return Math.min(30000, Math.max(12000, total * 300));
  }
  return Math.min(20000, Math.max(8000, total * 200));
}

function mulaiAnimasi(jenis, prefix, hasil, waktu) {
  const total = daftarKonsumen.length;
  const durasi = durasiAnimasi(jenis, total);
  const mulai = performance.now();
  const tombol = jenis === "awal" ? $("playAwal") : $("playOpt");

  tombol.classList.add("playing");
  $("progressWrap").hidden = false;
  setProgress(0);
  tampilkanProgresPanel(prefix, hasil, 0);

  const langkah = (sekarang) => {
    if (!animasi) return;

    const t = Math.min(1, (sekarang - animasi.mulai) / animasi.durasi);
    // Simpan sebagai pecahan supaya rute bisa tergambar sebagian.
    const jumlahTampil = t * total;
    const jumlahSelesai = Math.min(total, Math.floor(jumlahTampil));
    animasi.jumlahTampil = jumlahTampil;

    // Selalu baca dari animasi.hasil supaya hambatan yang diklik di tengah
    // animasi langsung memakai hasil perhitungan ulang.
    const hasilKini = animasi.hasil;
    const prefixKini = animasi.prefix;

    gambarPeta(hasilKini, jumlahTampil);
    setProgress(t * 100);
    tampilkanProgresPanel(prefixKini, hasilKini, t);

    if (animasi.jenis === "awal") {
      $("statusText").textContent =
        `Algoritma awal: ${jumlahSelesai}/${total} konsumen diproses ` +
        `(${total}× Dijkstra)...`;
    } else {
      $("statusText").textContent =
        `Optimisasi: ${jumlahSelesai}/${total} konsumen terlayani ` +
        "(1× Dijkstra)...";
    }

    if (t < 1) {
      animasi.raf = requestAnimationFrame(langkah);
      return;
    }

    const hasilAkhir = animasi.hasil;
    const prefixAkhir = animasi.prefix;
    const waktuAkhir = animasi.waktu;
    const terlayani = hasilAkhir.hasil.filter((h) => h.resto >= 0).length;
    const takTerjangkau = total - terlayani;

    animasi = null;
    tombol.classList.remove("playing");
    isiPanel(prefixAkhir, hasilAkhir, waktuAkhir);

    const infoHambatan =
      takTerjangkau > 0
        ? ` ${takTerjangkau} konsumen tidak punya rute karena hambatan.`
        : "";

    if (jenis === "awal") {
      $("statusText").textContent =
        `Selesai — ${terlayani}/${total} konsumen dilayani dengan ${total}× ` +
        `Dijkstra (${formatMs(waktuAkhir)} ms).${infoHambatan}`;
    } else {
      $("statusText").textContent =
        `Selesai — ${terlayani}/${total} konsumen dilayani dengan 1× ` +
        `Dijkstra (${formatMs(waktuAkhir)} ms).${infoHambatan}`;
    }

    perbaruiBanding();
  };

  animasi = {
    raf: 0,
    mulai,
    durasi,
    jenis,
    prefix,
    hasil,
    waktu,
    jumlahTampil: 0,
  };
  animasi.raf = requestAnimationFrame(langkah);
}

function putarSimulasi(jenis) {
  if (!peta || !daftarKonsumen || daftarKonsumen.length === 0) return;

  hentikanAnimasi();

  if (jenis === "awal") {
    const t0 = performance.now();
    const hasil = dijkstraPerKonsumen(
      peta,
      penandaResto,
      daftarKonsumen,
      hambatanSisi,
      hambatanNode,
    );
    const waktu = performance.now() - t0;

    hasilAwal = hasil;
    waktuAwal = waktu;
    isiPanel("Awal", hasil, waktu);
    perbaruiBanding();
    mulaiAnimasi("awal", "Awal", hasil, waktu);
  } else {
    const t0 = performance.now();
    const hasil = dijkstraMultiSource(
      peta,
      daftarResto,
      daftarKonsumen,
      hambatanSisi,
      hambatanNode,
    );
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
// MODE HAMBATAN
// ---------------------------------------------------------------------------
function setModeHambatan(aktif) {
  modeHambatan = aktif;

  $("modeHambatan").classList.toggle("aktif", aktif);
  $("modeHambatan").setAttribute("aria-pressed", String(aktif));
  $("peta").classList.toggle("mode-hambatan", aktif);

  if (!animasi) {
    $("statusText").textContent = aktif
      ? "Mode hambatan aktif: klik jalan atau persimpangan untuk menutup/membuka."
      : "Mode hambatan nonaktif. Tekan ▶ untuk memutar simulasi.";
  }
}

function tanganiKlikPeta(event) {
  if (!modeHambatan || !peta) return;

  const target = event.target.closest("[data-jenis]");
  if (!target) return;

  const jenis = target.dataset.jenis;
  let ditutup = false;
  let label = "";

  if (jenis === "sisi") {
    const kunci = target.dataset.kunci;
    if (!kunci) return;
    ditutup = !hambatanSisi.has(kunci);
    if (ditutup) hambatanSisi.add(kunci);
    else hambatanSisi.delete(kunci);
    label = "Jalan";
  } else if (jenis === "node") {
    const node = Number(target.dataset.node);
    if (!Number.isInteger(node)) return;
    ditutup = !hambatanNode.has(node);
    if (ditutup) hambatanNode.add(node);
    else hambatanNode.delete(node);
    label = "Persimpangan";
  } else {
    return;
  }

  hitungDanTampilkan();

  const totalHambatan = hambatanSisi.size + hambatanNode.size;
  const takTerjangkau = hasilOptimasi.hasil.filter(
    (h) => h.resto < 0,
  ).length;

  let teks = `${label} ${ditutup ? "ditutup" : "dibuka"}.`;
  if (totalHambatan > 0) teks += ` Hambatan aktif: ${totalHambatan}.`;
  if (takTerjangkau > 0) {
    teks += ` ${takTerjangkau} konsumen tidak punya rute.`;
  }
  if (animasi) teks += " Rute dihitung ulang saat animasi berjalan.";

  $("statusText").textContent = teks;
}

function resetHambatan() {
  if (hambatanSisi.size === 0 && hambatanNode.size === 0) {
    $("statusText").textContent = "Tidak ada hambatan yang aktif.";
    return;
  }

  hambatanSisi.clear();
  hambatanNode.clear();
  hitungDanTampilkan();

  $("statusText").textContent = animasi
    ? "Semua hambatan dibuka. Rute dihitung ulang saat animasi berjalan."
    : "Semua hambatan dibuka. Rute sudah dihitung ulang.";
}

// ---------------------------------------------------------------------------
// EVENT LISTENER & TAMPILAN AWAL
// ---------------------------------------------------------------------------
$("save").addEventListener("click", () => terapkanData(false));
$("reset").addEventListener("click", () => resetData());

$("modeHambatan").addEventListener("click", () => {
  setModeHambatan(!modeHambatan);
});
$("resetHambatan").addEventListener("click", resetHambatan);
$("peta").addEventListener("click", tanganiKlikPeta);

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
