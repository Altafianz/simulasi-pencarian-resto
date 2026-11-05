// ============================================================================
// RENDER PETA KARTUN
//
// Semua isi file ini hanya untuk visual peta. Tidak ada algoritma di sini.
// Peta dibuat dari SVG murni, tanpa API map atau gambar eksternal.
// ============================================================================

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

const PETA_VIEW = {
  lebar: 1200,
  tinggi: 900,
  skala: 0.82,
  dx: 190,
  dy: 40,
};

const TRANSFORM_PETA = `translate(${PETA_VIEW.dx} ${PETA_VIEW.dy}) scale(${PETA_VIEW.skala})`;

let cachePeta = { peta: null, svg: "" };

// ---------------------------------------------------------------------------
// HELPER DASAR
// ---------------------------------------------------------------------------
function acakSel(i, salt = 0) {
  let x = Math.imul(i + 1, 374761393) ^ Math.imul(salt + 1, 668265263);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

function fmt(nilai) {
  return Number(nilai).toFixed(1);
}

function jarak(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function pusat(pts) {
  return [
    pts.reduce((total, p) => total + p[0], 0) / pts.length,
    pts.reduce((total, p) => total + p[1], 0) / pts.length,
  ];
}

function poin(pts) {
  return pts.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join(" ");
}

function insetPolygon(pts, faktor) {
  const tengah = pusat(pts);
  return pts.map((p) => [
    tengah[0] + (p[0] - tengah[0]) * faktor,
    tengah[1] + (p[1] - tengah[1]) * faktor,
  ]);
}

function sudutSel(peta, baris, kolom) {
  const n = peta.n;
  const i = baris * n + kolom;
  return [
    [peta.x[i], peta.y[i]],
    [peta.x[i + 1], peta.y[i + 1]],
    [peta.x[i + n + 1], peta.y[i + n + 1]],
    [peta.x[i + n], peta.y[i + n]],
  ];
}

// ---------------------------------------------------------------------------
// DEKORASI KECIL
// ---------------------------------------------------------------------------
function pohon(x, y, r) {
  return `<g>
    <ellipse cx="${fmt(x)}" cy="${fmt(y + r * 0.65)}" rx="${(r * 0.8).toFixed(1)}" ry="${(r * 0.3).toFixed(1)}" fill="rgba(36,56,47,.12)"/>
    <circle cx="${fmt(x)}" cy="${fmt(y)}" r="${r.toFixed(1)}" fill="#73b46b" stroke="#4d8b4a" stroke-width="1.2"/>
    <circle cx="${fmt(x - r * 0.25)}" cy="${fmt(y - r * 0.25)}" r="${(r * 0.4).toFixed(1)}" fill="#a9d79e"/>
  </g>`;
}

// ---------------------------------------------------------------------------
// BLOK KOTA
// ---------------------------------------------------------------------------
const WARNA_BANGUNAN = [
  "#f0c49e",
  "#eeb4a6",
  "#f2d88c",
  "#d7c1e6",
  "#b9ddd3",
];

function blokBangunan(pts, idx) {
  const tengah = pusat(pts);
  const sudut = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
  const lebar = (jarak(pts[0], pts[1]) + jarak(pts[3], pts[2])) / 2;
  const tinggi = (jarak(pts[0], pts[3]) + jarak(pts[1], pts[2])) / 2;
  const warna =
    WARNA_BANGUNAN[
      Math.floor(acakSel(idx, 13) * WARNA_BANGUNAN.length) %
        WARNA_BANGUNAN.length
    ];

  let svg = "";
  svg += `<polygon points="${poin(
    pts.map((p) => [p[0], p[1] + 3]),
  )}" fill="rgba(36,56,47,.09)"/>`;
  svg += `<polygon points="${poin(
    pts,
  )}" fill="#f8ebd7" stroke="#dfc7a8" stroke-width="1.4"/>`;

  const duaBangunan = acakSel(idx, 17) > 0.42;
  const jumlah = duaBangunan ? 2 : 1;
  const rotasi = (sudut * 180) / Math.PI;

  for (let j = 0; j < jumlah; j++) {
    const bw = lebar * (0.32 + acakSel(idx, 19 + j) * 0.22);
    const bh = tinggi * (0.3 + acakSel(idx, 29 + j) * 0.2);
    const ox = duaBangunan
      ? (j === 0 ? -1 : 1) * lebar * 0.18
      : 0;
    const oy = (acakSel(idx, 41 + j) - 0.5) * tinggi * 0.16;

    svg += `<g transform="translate(${fmt(tengah[0])} ${fmt(
      tengah[1],
    )}) rotate(${fmt(rotasi)}) translate(${fmt(ox)} ${fmt(oy)})">`;
    svg += `<rect x="${fmt(-bw / 2 + 2)}" y="${fmt(
      -bh / 2 + 2,
    )}" width="${fmt(bw)}" height="${fmt(
      bh,
    )}" rx="3" fill="rgba(36,56,47,.10)"/>`;
    svg += `<rect x="${fmt(-bw / 2)}" y="${fmt(-bh / 2)}" width="${fmt(
      bw,
    )}" height="${fmt(
      bh,
    )}" rx="3" fill="${warna}" stroke="#b88f70" stroke-width="1.2"/>`;
    svg += `<rect x="${fmt(-bw / 2 + 4)}" y="${fmt(
      -bh / 2 + 4,
    )}" width="${fmt(Math.max(2, bw - 8))}" height="${fmt(
      Math.max(2, bh - 8),
    )}" rx="1.5" fill="none" stroke="rgba(36,56,47,.18)" stroke-width=".9"/>`;
    svg += `</g>`;
  }

  return svg;
}

function blokTaman(pts, idx) {
  const tengah = pusat(pts);
  const lebar = (jarak(pts[0], pts[1]) + jarak(pts[3], pts[2])) / 2;
  const tinggi = (jarak(pts[0], pts[3]) + jarak(pts[1], pts[2])) / 2;

  let svg = `<polygon points="${poin(
    pts.map((p) => [p[0], p[1] + 3]),
  )}" fill="rgba(36,56,47,.07)"/>`;
  svg += `<polygon points="${poin(
    pts,
  )}" fill="#cbe3b9" stroke="#a9c98e" stroke-width="1.4"/>`;

  const jumlah = 3 + Math.floor(acakSel(idx, 23) * 3);
  for (let j = 0; j < jumlah; j++) {
    const x = tengah[0] + (acakSel(idx, 31 + j) - 0.5) * lebar * 0.62;
    const y = tengah[1] + (acakSel(idx, 37 + j) - 0.5) * tinggi * 0.62;
    const r = Math.max(2.2, Math.min(7, Math.min(lebar, tinggi) * 0.1));
    svg += pohon(x, y, r);
  }

  return svg;
}

function blokAir(pts, idx) {
  const tengah = pusat(pts);
  const lebar = (jarak(pts[0], pts[1]) + jarak(pts[3], pts[2])) / 2;
  const tinggi = (jarak(pts[0], pts[3]) + jarak(pts[1], pts[2])) / 2;

  let svg = `<polygon points="${poin(
    pts,
  )}" fill="#b8dfe8" stroke="#91c6d4" stroke-width="1.4"/>`;

  for (let j = 0; j < 2; j++) {
    const y = tengah[1] + (j === 0 ? -0.14 : 0.16) * tinggi;
    const x1 = tengah[0] - lebar * 0.28;
    svg += `<path d="M ${fmt(x1)} ${fmt(y)} q ${fmt(
      lebar * 0.09,
    )} ${fmt(-tinggi * 0.06)}, ${fmt(lebar * 0.18)} 0 t ${fmt(
      lebar * 0.18,
    )} 0" fill="none" stroke="#e8f7fa" stroke-width="2" stroke-linecap="round" opacity=".85"/>`;
  }

  svg += `<circle cx="${fmt(
    tengah[0] + lebar * 0.18,
  )}" cy="${fmt(tengah[1] - tinggi * 0.14)}" r="${Math.max(
    1.5,
    Math.min(3.5, lebar * 0.03),
  ).toFixed(1)}" fill="#e8f7fa" opacity=".8"/>`;

  return svg;
}

function blokPlaza(pts, idx) {
  const tengah = pusat(pts);
  const lebar = (jarak(pts[0], pts[1]) + jarak(pts[3], pts[2])) / 2;
  const tinggi = (jarak(pts[0], pts[3]) + jarak(pts[1], pts[2])) / 2;

  let svg = `<polygon points="${poin(
    pts,
  )}" fill="#efe2c8" stroke="#d6c3a0" stroke-width="1.4"/>`;

  for (let j = 0; j < 5; j++) {
    const x = tengah[0] + (acakSel(idx, 53 + j) - 0.5) * lebar * 0.5;
    const y = tengah[1] + (acakSel(idx, 61 + j) - 0.5) * tinggi * 0.5;
    const r = Math.max(1, Math.min(3, lebar * 0.025));
    svg += `<circle cx="${fmt(x)}" cy="${fmt(
      y,
    )}" r="${r.toFixed(1)}" fill="#d8c4a2"/>`;
  }

  return svg;
}

function blokKota(peta) {
  const n = peta.n;
  const faktor = n >= 15 ? 0.8 : 0.86;
  let svg = "";

  for (let baris = 0; baris < n - 1; baris++) {
    for (let kolom = 0; kolom < n - 1; kolom++) {
      const idx = baris * (n - 1) + kolom;
      const pts = insetPolygon(sudutSel(peta, baris, kolom), faktor);
      const roll = acakSel(idx, 7);

      if (roll < 0.62) {
        svg += blokBangunan(pts, idx);
      } else if (roll < 0.77) {
        svg += blokTaman(pts, idx);
      } else if (roll < 0.86) {
        svg += blokAir(pts, idx);
      } else if (roll < 0.98) {
        svg += blokPlaza(pts, idx);
      } else {
        svg += `<polygon points="${poin(
          pts,
        )}" fill="#efe4cc" opacity=".55"/>`;
      }
    }
  }

  return svg;
}

// ---------------------------------------------------------------------------
// JALAN
// ---------------------------------------------------------------------------
function jalanUtama(peta, u, v) {
  const n = peta.n;
  if (v === u + 1) return Math.floor(u / n) % 3 === 0;
  if (v === u + n) return (u % n) % 3 === 0;
  return false;
}

function gambarJalan(peta) {
  const n = peta.n;
  const lebarCasing = Math.max(12, Math.min(26, 220 / n));
  const lebarIsi = lebarCasing * 0.62;

  let casing = "";
  let isi = "";
  let marka = "";

  for (let u = 0; u < peta.V; u++) {
    for (const [v] of peta.adj[u]) {
      if (u >= v) continue;

      const utama = jalanUtama(peta, u, v);
      const cw = utama ? lebarCasing * 1.18 : lebarCasing;
      const fw = utama ? lebarIsi * 1.18 : lebarIsi;
      const x1 = fmt(peta.x[u]);
      const y1 = fmt(peta.y[u]);
      const x2 = fmt(peta.x[v]);
      const y2 = fmt(peta.y[v]);

      casing += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d8c7a5" stroke-width="${cw.toFixed(
        1,
      )}" stroke-linecap="round"/>`;
      isi += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fffdf6" stroke-width="${fw.toFixed(
        1,
      )}" stroke-linecap="round"/>`;

      if (utama) {
        marka += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e6d7b8" stroke-width="${Math.max(
          1,
          fw * 0.12,
        ).toFixed(1)}" stroke-dasharray="${Math.max(5, fw * 0.6).toFixed(
          1,
        )} ${Math.max(6, fw * 0.8).toFixed(
          1,
        )}" stroke-linecap="round" opacity=".8"/>`;
      }
    }
  }

  return `<g>${casing}</g><g>${isi}</g><g>${marka}</g>`;
}

// ---------------------------------------------------------------------------
// DEKORASI TEPI PETA
// ---------------------------------------------------------------------------
function dekorasiTepi() {
  return `<g aria-hidden="true">
    <path d="M 100 -30 C 64 140, 154 250, 108 400 C 62 550, 158 680, 104 930" fill="none" stroke="#b8dfe8" stroke-width="64" stroke-linecap="round"/>
    <path d="M 100 -30 C 64 140, 154 250, 108 400 C 62 550, 158 680, 104 930" fill="none" stroke="#d7eef3" stroke-width="42" stroke-linecap="round"/>
    <path d="M 100 -30 C 64 140, 154 250, 108 400 C 62 550, 158 680, 104 930" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="14 20" opacity=".38"/>

    <path d="M 1050 120 C 1100 88, 1175 108, 1188 186 C 1200 260, 1160 320, 1170 390 C 1180 470, 1205 540, 1170 610 C 1138 674, 1060 676, 1038 600 C 1016 524, 1044 460, 1028 390 C 1010 314, 1032 230, 1050 120 Z" fill="#cfe5ba" stroke="#b5d39a" stroke-width="3"/>
    <path d="M 1060 620 C 1100 540, 1080 460, 1120 380 C 1150 320, 1140 220, 1100 160" fill="none" stroke="#fffaf0" stroke-width="6" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="1120" cy="500" rx="26" ry="16" fill="#b8dfe8" stroke="#91c6d4" stroke-width="2"/>
    ${pohon(1080, 210, 9)}
    ${pohon(1148, 250, 8)}
    ${pohon(1070, 330, 10)}
    ${pohon(1150, 380, 7)}
    ${pohon(1090, 580, 9)}
    ${pohon(1150, 610, 8)}

    <g transform="translate(1125 82)">
      <circle r="29" fill="#fffaf0" stroke="#24382f" stroke-width="2"/>
      <circle r="22" fill="none" stroke="#d9c9a8" stroke-width="1.5" stroke-dasharray="3 3"/>
      <path d="M 0 -20 L 7 5 L 0 0 L -7 5 Z" fill="#ef5b3f" stroke="#24382f" stroke-width="1.5"/>
      <path d="M 0 20 L -5 2 L 0 0 L 5 2 Z" fill="#fffaf0" stroke="#24382f" stroke-width="1.5"/>
      <text x="0" y="-35" text-anchor="middle" font-size="10" font-weight="800" fill="#24382f" font-family="Trebuchet MS, sans-serif">U</text>
    </g>

    <g transform="translate(48 846)">
      <rect x="-12" y="-18" width="150" height="36" rx="10" fill="#fffaf0" stroke="#d9c9a8" stroke-width="1.5"/>
      <line x1="8" y1="0" x2="118" y2="0" stroke="#24382f" stroke-width="2"/>
      <line x1="8" y1="-5" x2="8" y2="5" stroke="#24382f" stroke-width="2"/>
      <line x1="63" y1="-4" x2="63" y2="4" stroke="#24382f" stroke-width="1.5"/>
      <line x1="118" y1="-5" x2="118" y2="5" stroke="#24382f" stroke-width="2"/>
      <text x="8" y="15" text-anchor="middle" font-size="8" fill="#5d6f63">0</text>
      <text x="63" y="15" text-anchor="middle" font-size="8" fill="#5d6f63">250 m</text>
      <text x="118" y="15" text-anchor="middle" font-size="8" fill="#5d6f63">500 m</text>
    </g>

    <text x="104" y="410" transform="rotate(-90 104 410)" text-anchor="middle" font-size="11" font-weight="800" letter-spacing="4" fill="#6ba3ad" opacity=".8" font-family="Trebuchet MS, sans-serif">SUNGAI</text>
    <text x="1118" y="690" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="2.5" fill="#6f9261" opacity=".85" font-family="Trebuchet MS, sans-serif">TAMAN KOTA</text>
  </g>`;
}

// ---------------------------------------------------------------------------
// PETA STATIS
// ---------------------------------------------------------------------------
function buatPetaStatis(peta) {
  return `<title>Peta kota simulasi resto terdekat</title>
    <desc>Peta ilustrasi dengan jalan, blok kota, resto, konsumen, dan rute.</desc>
    <defs>
      <pattern id="pola-titik-peta" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1.1" fill="#d8c9a8" opacity=".42"/>
      </pattern>
    </defs>
    <rect width="${PETA_VIEW.lebar}" height="${PETA_VIEW.tinggi}" fill="#f3ecd9"/>
    <rect width="${PETA_VIEW.lebar}" height="${PETA_VIEW.tinggi}" fill="url(#pola-titik-peta)"/>
    ${dekorasiTepi()}
    <g transform="${TRANSFORM_PETA}">
      ${blokKota(peta)}
      ${gambarJalan(peta)}
    </g>`;
}

// ---------------------------------------------------------------------------
// MARKER DINAMIS
// ---------------------------------------------------------------------------
function svgPin(x, y, warna, nomor, r, tampilNomor) {
  const rr = r * 0.8;
  const cy = -r * 1.45;
  const d = `M 0 0 C ${(-0.25 * r).toFixed(1)} ${(-0.5 * r).toFixed(
    1,
  )}, ${(-rr).toFixed(1)} ${(-0.9 * r).toFixed(1)}, ${(-rr).toFixed(
    1,
  )} ${cy.toFixed(1)} A ${rr.toFixed(1)} ${rr.toFixed(
    1,
  )} 0 1 1 ${rr.toFixed(1)} ${cy.toFixed(
    1,
  )} C ${rr.toFixed(1)} ${(-0.9 * r).toFixed(1)}, ${(0.25 * r).toFixed(
    1,
  )} ${(-0.5 * r).toFixed(1)}, 0 0 Z`;

  let svg = `<g transform="translate(${fmt(x)} ${fmt(y)})">`;
  svg += `<ellipse cx="0" cy="2" rx="${(r * 0.62).toFixed(
    1,
  )}" ry="${(r * 0.2).toFixed(1)}" fill="rgba(36,56,47,.18)"/>`;
  svg += `<path d="${d}" fill="${warna}" stroke="#24382f" stroke-width="${Math.max(
    1.8,
    r * 0.09,
  ).toFixed(1)}" stroke-linejoin="round"/>`;
  svg += `<circle cx="0" cy="${cy.toFixed(1)}" r="${(
    rr * 0.58
  ).toFixed(1)}" fill="#fffaf0" stroke="rgba(36,56,47,.18)" stroke-width=".8"/>`;

  if (tampilNomor) {
    svg += `<text x="0" y="${(cy + rr * 0.04).toFixed(
      1,
    )}" text-anchor="middle" dominant-baseline="middle" font-size="${(
      rr * 0.72
    ).toFixed(1)}" font-weight="800" fill="#24382f" font-family="Trebuchet MS, sans-serif">${nomor}</text>`;
  } else {
    svg += `<circle cx="0" cy="${cy.toFixed(1)}" r="${(
      rr * 0.24
    ).toFixed(1)}" fill="${warna}" stroke="#24382f" stroke-width=".8"/>`;
  }

  svg += `</g>`;
  return svg;
}

function svgKonsumen(x, y, warna, sudah, r) {
  const stroke = sudah ? warna : "#9aa3b2";
  const fill = sudah ? "#fffaf0" : "#f1ede2";
  const opacity = sudah ? 1 : 0.68;
  const dash = sudah
    ? ""
    : `stroke-dasharray="${(r * 0.35).toFixed(1)} ${(r * 0.3).toFixed(1)}"`;

  let svg = `<g opacity="${opacity}">`;
  svg += `<circle cx="${fmt(x)}" cy="${fmt(y + 1.4)}" r="${r.toFixed(
    1,
  )}" fill="rgba(36,56,47,.10)"/>`;
  svg += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${r.toFixed(
    1,
  )}" fill="${fill}" stroke="${stroke}" stroke-width="${Math.max(
    2,
    r * 0.28,
  ).toFixed(1)}" ${dash}/>`;
  if (sudah) {
    svg += `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${(
      r * 0.34
    ).toFixed(1)}" fill="${warna}"/>`;
  }
  svg += `</g>`;
  return svg;
}

// ---------------------------------------------------------------------------
// LAPISAN & RENDER
// ---------------------------------------------------------------------------
function pastikanStruktur(svg) {
  const statis = svg.querySelector("#lapisan-statis");
  const rute = svg.querySelector("#lapisan-rute");
  const penanda = svg.querySelector("#lapisan-penanda");

  if (!statis || !rute || !penanda) {
    svg.innerHTML = `<g id="lapisan-statis"></g>
      <g id="lapisan-rute" transform="${TRANSFORM_PETA}"></g>
      <g id="lapisan-penanda" transform="${TRANSFORM_PETA}"></g>`;
    cachePeta = { peta: null, svg: "" };
  }
}

function gambarPeta(hasil, jumlahTampil) {
  const svg = document.getElementById("peta");
  if (!svg || !peta) return;

  const total = daftarKonsumen.length;
  const tampil = Math.max(
    0,
    Math.min(jumlahTampil == null ? total : jumlahTampil, total),
  );

  pastikanStruktur(svg);

  if (cachePeta.peta !== peta) {
    const statis = buatPetaStatis(peta);
    svg.querySelector("#lapisan-statis").innerHTML = statis;
    cachePeta = { peta, svg: statis };
  }

  const warna = new Map();
  daftarResto.forEach((resto, i) => {
    warna.set(resto, PALET[i % PALET.length]);
  });

  const n = peta.n;
  const casingRute = Math.max(6, Math.min(11, 100 / n));
  const isiRute = casingRute * 0.58;

  let ruteSvg = "";
  for (let i = 0; i < tampil; i++) {
    const h = hasil.hasil[i];
    if (!h || h.resto < 0 || h.rute.length < 2) continue;

    const titik = h.rute
      .map((node) => `${fmt(peta.x[node])},${fmt(peta.y[node])}`)
      .join(" ");

    ruteSvg += `<polyline points="${titik}" fill="none" stroke="#fffdf6" stroke-width="${casingRute.toFixed(
      1,
    )}" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>`;
    ruteSvg += `<polyline points="${titik}" fill="none" stroke="#f0543a" stroke-width="${isiRute.toFixed(
      1,
    )}" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>`;
  }

  const rPin = Math.max(14, Math.min(26, 230 / n));
  const rKonsumen = Math.max(6, Math.min(11, 100 / n));
  let penandaSvg = "";

  daftarKonsumen.forEach((konsumen, i) => {
    const h = hasil.hasil[i];
    const sudah = i < tampil && h && h.resto >= 0;
    const warnaCincin = sudah ? warna.get(h.resto) : "#9aa3b2";
    penandaSvg += svgKonsumen(
      peta.x[konsumen],
      peta.y[konsumen],
      warnaCincin,
      Boolean(sudah),
      rKonsumen,
    );
  });

  daftarResto.forEach((resto, i) => {
    penandaSvg += svgPin(
      peta.x[resto],
      peta.y[resto],
      PALET[i % PALET.length],
      i + 1,
      rPin,
      daftarResto.length <= 10,
    );
  });

  svg.querySelector("#lapisan-rute").innerHTML = ruteSvg;
  svg.querySelector("#lapisan-penanda").innerHTML = penandaSvg;
}
