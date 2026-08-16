# Divenic V2 — Frontend Guide

Panduan lengkap untuk membangun Divenic V2 (vanilla HTML/CSS/JS, tanpa framework/build-tool): dari refactor card hardcode menjadi data-driven, hingga animasi performa-first, layout navigasi, dan progressive disclosure untuk mobile.

> **Riwayat revisi:** Dokumen ini menggantikan versi sebelumnya (`yearbook-card-refactor`) yang masih merujuk theme "Mocha Luxe", interaksi flip-click 3D, domino wave, dan entrance 360° — semua itu **sudah tidak berlaku**. Lihat Langkah 12 & 13 untuk keputusan final V2.

> **Prinsip utama project ini: Performa adalah prioritas pertama. Animasi harus terasa premium tanpa membebani — semua efek visual wajib melewati filter performa sebelum diimplementasi.**

## Kapan skill ini dipakai

- User punya HTML dengan blok card yang di-copy-paste manual (file ratusan/ribuan baris)
- User mau menambah jenis card baru ke yearbook yang sudah ada
- User mengeluhkan file terlalu besar / susah di-debug
- User minta cek apakah konten JS-rendered ramah SEO
- User minta efek blur mobile pada carousel, animasi domino card, atau loading screen intro
- User mengeluhkan gambar tidak muncul / card tidak ter-render (kemungkinan bug ES Module via `file://`)
- User minta panduan navigasi (single vs double nav, footer quick-nav)
- User ingin batasi data tampil di mobile (progressive disclosure)
- User minta performa dioptimalkan tanpa mengorbankan visual
- User minta halaman Landing, Login/Register, Guest, Gender Selection, Member Selection, atau Loading dibuat/diperbaiki
- User bertanya soal design token, semantic color alias, atau font project
- User minta URL Cloudinary dirapikan lewat satu service terpusat

## Langkah 1 — Diagnosis dulu, jangan langsung refactor

Sebelum menulis kode apa pun, periksa kondisi project:

```bash
wc -l *.html js/*.js          # file mana yang gemuk?
grep -c "class=\"X-card\"" file.html   # berapa kali blok card diulang manual?
ls data/*.json 2>/dev/null     # sudah ada sumber data terpisah atau belum?
```

Klasifikasikan tiap jenis card ke salah satu kondisi:

| Kondisi | Ciri | Tindakan |
|---|---|---|
| **A. Hardcoded penuh** | Blok HTML diulang manual di `.html`, tidak ada `data/*.json` terkait | Perlu dibuatkan data file + builder dari nol |
| **B. Data-driven tapi builder tercampur** | Sudah ada `fetchData()` + render loop, tapi fungsi builder-nya numpuk di file JS besar bareng fungsi lain | Pindahkan builder ke file sendiri, tanpa ubah logic |
| **C. Sudah rapi** | Builder sudah di file terpisah, < 450 baris | Tidak perlu disentuh, kecuali user minta tambah fitur |

Jangan asumsikan semua card dalam kondisi sama. Dalam satu project biasanya kondisinya campur — periksa tiap jenis card satu per satu sebelum membuat rencana.

## Langkah 2 — Pola refactor: builder per-jenis card, BUKAN mesin generik

**Keputusan desain (penting, jangan menyimpang tanpa alasan kuat):** gunakan satu file builder per jenis card, bukan satu fungsi generik `createCard(type, data)` dengan config terpusat.

Alasannya: tiap jenis card pada yearbook (member, event, mentor, album, memory-wall) biasanya punya field dan kebutuhan tampilan yang **berbeda secara struktural**, bukan cuma beda isi — member butuh sosmed+ultah+modal profil, event butuh tanggal+kategori+timeline position, memory-wall cuma butuh teks+author. Memaksakan semuanya lewat satu mesin config menambah lapisan indirection yang tidak sepadan untuk project sekecil ini (biasanya 4-6 jenis card). Lihat `references/why-not-generic-factory.md` untuk argumen lengkap jika user bertanya/ragu soal ini.

### Struktur folder target

```
js/
├── components/
│   ├── event-card.js     (builder timeline/event card)
│   ├── member-card.js    (builder member card + modal trigger)
│   ├── mentor-card.js    (builder mentor card)
│   ├── photo-card.js     (builder photo/album card — lihat Langkah 3, beda kontrak)
│   └── memory-card.js    (builder memory-wall card)
├── utils.js               (sudah ada: el(), fetchData(), qs(), staggerReveal(), dst — JANGAN duplikat, reuse)
├── gallery.js              (ramping: cuma fetch + loop + append, import builder dari components/)
├── member.js
└── home.js
```

Kalau project belum punya folder `components/`, buat di dalam `js/` (sejajar dengan file JS lain), bukan di root project.

### Kontrak fungsi builder (konsisten di semua jenis card)

```javascript
// js/components/member-card.js
import { el } from '../utils.js';

/**
 * @param {object} data - satu item data (mis. satu member)
 * @param {number} index - posisi dalam list (untuk stagger delay / alternating layout)
 * @returns {HTMLElement}
 */
export function buildMemberCard(data, index = 0) {
  const card = el('article', 'member-card');
  card.dataset.id = data.id;
  card.setAttribute('aria-label', `Profil ${data.name}`);

  card.innerHTML = `
    <div class="member-avatar-wrap">
      <img src="${data.avatar}" alt="Foto ${data.name}" loading="lazy"
           onerror="this.src='asset/icons/person.png'">
      <div class="member-card-overlay"><p class="member-card-quote">"${data.quote}"</p></div>
    </div>
    <div class="member-card-body">
      <h3 class="member-card-name">${data.name}</h3>
      <p class="member-card-meta">${data.division} · ${data.class}</p>
    </div>
  `;

  return card;
}
```

Aturan:
- **Nama fungsi**: `build<JenisCard>Card(data, index)` — konsisten, gampang ditebak, gampang di-grep.
- **Selalu return `HTMLElement`**, bukan string HTML. Pemanggil (`member.js` dll) yang tanggung jawab append ke grid.
- **Pakai helper `el()` yang sudah ada di `utils.js`** untuk membuat elemen. Jangan bikin helper baru yang fungsinya sama.
- **Satu file = satu jenis card.** Jangan gabung 2 builder dalam satu file kecuali keduanya benar-benar trivial (<15 baris masing-masing) dan sangat berkaitan.
- Builder **tidak melakukan fetch data sendiri** — itu tanggung jawab file `init...()` (mis. `initMembers()` di `member.js`). Builder murni terima data, kembalikan elemen.
- Event listener spesifik per-card (klik untuk buka modal, dst) **didelegasikan di parent** (`document.addEventListener('click', e => e.target.closest('.member-card')...)`), bukan di-attach satu-satu per card saat builder dipanggil — ini pola yang sudah benar dipakai project, pertahankan, karena lebih hemat memory saat card banyak dan grid sering di-render ulang.

### Memindahkan builder yang sudah ada (kondisi B di Langkah 1)

Kalau builder sudah ada tapi numpuk di file besar (mis. 3 fungsi `buildX` di satu `gallery.js`):
1. Pindahkan fungsi `buildXCard` apa adanya ke `components/x-card.js` — **jangan ubah logic-nya** dalam langkah ini, murni pindah lokasi.
2. Tambahkan `export` di depan fungsi.
3. Di file asal, ganti definisi fungsi dengan `import { buildXCard } from './components/x-card.js';`
4. Jalankan/cek render di browser — pastikan tampilan tidak berubah sama sekali sebelum lanjut ke card berikutnya.
5. Ulangi satu jenis card per satu kali edit — jangan pindahkan semua sekaligus, supaya kalau ada yang rusak, gampang dilacak.

### Membuat builder baru dari hardcoded HTML (kondisi A)

1. Ambil **satu** contoh blok HTML hardcode dari project sebagai acuan struktur (jangan tebak-tebak field-nya).
2. Buat `data/<jenis>.json` dengan field yang sesuai field yang muncul di blok HTML tadi.
3. Tulis builder yang outputnya **identik secara visual** dengan blok HTML asli (cek dengan browser, bandingkan side-by-side).
4. Hapus semua blok hardcode, ganti dengan container kosong + `id` (mis. `<div id="mentor-grid"></div>`) dan teks loading placeholder, sama seperti pola yang sudah dipakai event/member/album.
5. Tulis `init<Jenis>()` di file JS yang sesuai: fetch data → loop → panggil builder → append ke grid → panggil `staggerReveal()` jika dipakai jenis card lain.

## Langkah 3 — Pengecualian: card yang datanya terus bertambah (mis. album/photo)

Jenis card yang isinya akan terus ditambah dari waktu ke waktu (foto baru tiap event, dst) **butuh kontrak builder berbeda** dari card yang jumlahnya relatif tetap (member, mentor, event biasanya tidak meledak jumlahnya).

Untuk jenis card ini, builder harus **siap dipanggil per-batch sejak awal**, meskipun infinite-scroll/pagination belum diimplementasikan penuh sekarang:

```javascript
// js/components/photo-card.js
import { el } from '../utils.js';

export function buildPhotoCard(data, index = 0) {
  // builder satu kartu — TETAP sederhana, sama seperti card lain
  const item = el('div', 'photo-item');
  item.dataset.index = index;
  item.innerHTML = `
    <img src="${data.url}" alt="${data.caption}" loading="lazy">
    <div class="photo-item-overlay"><span class="photo-zoom-icon">&#x2315;</span></div>
  `;
  return item;
}

/**
 * Render satu batch foto ke grid. Dipanggil ulang dengan offset baru
 * saat scroll mendekati bawah (lihat initInfiniteScroll di gallery.js).
 * @param {Array} allPhotos - seluruh data foto (sudah di-fetch sekali di awal)
 * @param {number} offset
 * @param {number} limit
 * @param {HTMLElement} grid
 * @returns {number} jumlah foto yang baru ditambahkan (0 = habis)
 */
export function renderPhotoBatch(allPhotos, offset, limit, grid) {
  const batch = allPhotos.slice(offset, offset + limit);
  batch.forEach((photo, i) => grid.appendChild(buildPhotoCard(photo, offset + i)));
  return batch.length;
}
```

Lalu di `gallery.js`, `initGallery()` memanggil `renderPhotoBatch()` pertama kali dengan `offset=0`, dan menyiapkan satu `IntersectionObserver` pada elemen sentinel di bawah grid yang memanggil `renderPhotoBatch()` lagi dengan offset berikutnya saat sentinel terlihat. Implementasi observer-nya boleh ditulis sekarang atau nanti — yang penting **kontrak fungsi `renderPhotoBatch(offset, limit)` sudah ada dari awal**, supaya tidak perlu bongkar ulang builder saat infinite-scroll benar-benar diimplementasi.

Jangan terapkan pola batch ini ke jenis card yang jumlahnya stabil (member, mentor) — itu over-engineering untuk kebutuhan yang tidak ada.

## Langkah 4 — Batas ukuran file

Target keras: **tidak ada file melebihi 500 baris.** Target lunak (lebih disiplin): mulai pecah file begitu mendekati **200-300 baris**, supaya ada ruang tumbuh sebelum mentok.

Contoh nyata kenapa ini penting (dari project yang pernah diaudit): satu file `member.html` yang berisi card hardcode manual bisa tembus **1600+ baris** hanya dari ~25 baris per card dikalikan puluhan member. Begitu pola ini dibiarkan, debugging satu typo kecil di tengah file jadi sangat lambat — ini alasan utama kenapa skill ini ada.

Saat memecah file:
- Pecah **per jenis card**, bukan per jumlah baris arbitrer (jangan potong di tengah satu builder cuma karena pas 300 baris).
- File `init...()` (fetch + orchestration) boleh tetap satu file untuk beberapa jenis card terkait erat (mis. `gallery.js` boleh tetap punya `initEventTimeline()`, `initGallery()`, `initMemoryWall()` bersama) **selama total tidak mendekati 300 baris** — yang dipecah ke `components/` adalah bagian *builder*-nya, bukan otomatis tiap `init` harus punya file sendiri juga.
- Kalau satu HTML page (bukan SPA) sudah dekat 300 baris karena section yang banyak, pertimbangkan apakah section tersebut layak jadi halaman terpisah (`mentor.html` sendiri) daripada terus ditambah ke satu file.

## Langkah 5 — [DEPRECATED] Rotate-on-click micro-interaction

**Sudah tidak dipakai di V2.** `setupMobileRotateFeedback()` dan efek rotate-Z saat card diklik dihapus dari `member.js` — digantikan sepenuhnya oleh bottom-sheet slide-up panel (lihat Langkah 13). Kalau masih menemukan fungsi ini di kode, hapus, jangan dipertahankan meski "sudah jalan" — ini konflik langsung dengan keputusan V2.

## Langkah 6 — Aturan performa untuk semua animasi/transisi di project ini

Saat menulis atau mereview animasi apa pun di project yearbook ini (termasuk hook rotate di atas, reveal-on-scroll yang sudah ada, dll), patuhi:

- **Hanya animasikan `transform` dan `opacity`.** Properti seperti `width`, `height`, `top`, `left`, `margin` memicu reflow/layout — mahal, terutama di grid dengan banyak card.
- Kalau pakai `will-change`, pastikan dilepas setelah animasi selesai (lewat `transitionend` atau timeout), jangan dibiarkan permanen — itu memboroskan memory GPU terutama di grid besar.
- Jangan attach event listener animasi per-card di dalam builder. Selalu delegasikan di parent (lihat pola `initMemberModal` yang sudah benar di project ini) — ini paling krusial saat jenis card-nya berjumlah banyak (album/photo).
- `IntersectionObserver` untuk reveal-on-scroll (pola `initScrollReveal` yang sudah ada) sudah merupakan pendekatan yang tepat secara performa — pertahankan, jangan ganti ke `scroll` event listener manual.
- **Waspada kombinasi `overflow: hidden` + `border-radius` pada elemen yang dianimasikan** — ini pernah menyebabkan presentation delay (INP tinggi) karena memblokir GPU compositing. Kalau card/panel butuh keduanya, animasikan elemen wrapper terpisah dari elemen yang di-`overflow:hidden`, atau uji `content-visibility`/`contain` sebelum ship.

## Langkah 7 — Slider background-blur untuk mobile (carousel hero)

Jika project punya carousel/hero slider dan versi mobile-nya terasa kurang hidup (foto kecil dengan banyak ruang kosong di sekitarnya), pertimbangkan pola background-blur berikut — diadaptasi dari implementasi yang pernah dipakai di versi awal project sejenis:

**Konsep:** di breakpoint mobile, gambar slide yang sedang aktif dijadikan background full-screen yang di-blur, sementara slider utama mengecil jadi elemen mengambang di tengah layar.

```css
/* css/home.css atau css/responsive.css, sesuaikan breakpoint mobile project (cek media query yang sudah ada, jangan asal pakai angka baru) */
.slider-background {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: blur(15px);
  z-index: 1;
  display: none;
}

@media (max-width: 480px) { /* ganti sesuai breakpoint mobile yang SUDAH dipakai di project — cek css/responsive.css dulu */
  .slider-background {
    display: block;
  }
  .carousel {
    position: relative;
    width: 90%;
    height: 60%;
    margin: 0 auto;
    border-radius: 15px;
    z-index: 2;
  }
}
```

```javascript
// di fungsi yang mengganti slide aktif (mis. showSlide()/initCarousel() di home.js)
function updateSliderBackground(activeSlideImg) {
  const bg = document.querySelector('.slider-background');
  if (!bg || window.innerWidth > 480) return; // sesuaikan breakpoint
  bg.style.backgroundImage = `url(${activeSlideImg.src})`;
}
```

Panggil `updateSliderBackground()` setiap kali slide berganti (baik otomatis maupun lewat tombol prev/next), bukan cuma sekali saat load.

**Sebelum menerapkan:** selalu cek breakpoint mobile yang **sudah dipakai** di `css/responsive.css` project ini (`grep "@media" css/responsive.css`) dan pakai angka yang sama — jangan perkenalkan breakpoint baru yang tidak konsisten dengan yang sudah ada.

## Langkah 8 — Konten JS-rendered dan SEO

Card yang di-render lewat `fetch()` + `innerHTML` setelah `DOMContentLoaded` punya risiko SEO: HTML awal yang dikirim ke browser/crawler hanya berisi teks placeholder ("Memuat anggota...", dst), bukan konten asli. Search engine modern bisa render JS, tapi tidak selalu sempurna, dan crawler lain (preview link sosial media, mesin pencari lama) sering tidak menjalankan JS sama sekali.

Saat user bertanya soal ini atau saat melakukan refactor card, sampaikan/lakukan hal berikut (bukan keputusan otomatis — ini punya trade-off, diskusikan dengan user dulu sebelum eksekusi besar):

- **Quick win, aman dilakukan tanpa diskusi panjang**: ganti teks placeholder loading ("Memuat anggota...") jadi lebih deskriptif dan relevan SEO (mis. nama section + konteks singkat), karena ini yang akan terlihat sesaat sebelum JS jalan, dan oleh crawler yang tidak render JS sama sekali.
- **Perlu didiskusikan dulu dengan user, jangan dieksekusi sepihak**: apakah project ini perlu pindah ke multi-page (tiap card-type dapat URL sendiri, seperti pola v1) demi SEO, atau tetap SPA dengan trade-off itu diterima. Ini keputusan arsitektur besar, di luar scope "refactor card" — jangan diam-diam diubah saat user cuma minta refactor card.
- Pastikan `<title>` dan `<meta name="description">` tetap representatif kalau project berbentuk SPA satu halaman dengan banyak section (karena SPA hanya py.unya satu title/description untuk semua section, beda dengan multi-page yang bisa unik per halaman).
- Field `alt` pada gambar card (foto member, foto event) tetap diisi dari data asli (`alt="Foto ${data.name}"`), bukan generik ("image1.jpg") — ini sudah jadi pola yang benar di project, pertahankan saat menulis builder baru.

Jangan menjanjikan "akan muncul teratas di pencarian" ke user — itu tidak bisa dijamin oleh perubahan kode semata. Posisikan ini sebagai "memperbesar peluang terindeks dengan baik", bukan jaminan ranking.

## Langkah 9 — Debug: gambar tidak muncul / card tidak ter-render

Ini masalah paling umum di project ini dan **sering disalahartikan sebagai bug kode**, padahal penyebabnya adalah environment, bukan logika JS.

### Diagnosis cepat

```
Symptom: grid kosong, tidak ada card sama sekali, console error "Failed to fetch"
Penyebab paling mungkin: file dibuka via file:// bukan HTTP server
```

Browser **memblokir** `fetch()` dan `import` dari ES Module saat URL-nya `file://...`. Ini bukan bug kode — ini kebijakan keamanan browser yang tidak bisa diakali. Solusinya:

```bash
# Opsi 1 — paling mudah, tidak perlu install apapun (Node.js sudah ada)
npx serve .

# Opsi 2 — VS Code: install ekstensi "Live Server", klik kanan index.html → Open with Live Server

# Opsi 3 — Python (kalau tidak ada Node)
python -m http.server 8000
```

Setelah server berjalan, buka `http://localhost:3000` (atau port yang muncul) — bukan dengan double-click file HTML.

### Gambar Cloudinary tidak muncul meski server sudah benar

Kemungkinan: file belum di-upload ke Cloudinary account. URL di `members.json` seperti `https://res.cloudinary.com/divenic/image/upload/v1/members/annas.webp` hanya akan berhasil kalau file `annas.webp` benar-benar sudah ada di Cloudinary dashboard. Cek via:

1. Buka Cloudinary Dashboard → Media Library
2. Cari file dengan nama yang sesuai
3. Kalau tidak ada → upload dulu, atau sementara pakai URL placeholder untuk development

Karena project sudah mengaktifkan **auto-optimasi di Cloudinary** dan format sudah WebP, tidak perlu tambahan transformasi URL manual (seperti `f_auto,q_auto`). URL polos sudah cukup.

### `onerror` fallback sudah ada — pastikan path-nya benar

Builder sudah punya `onerror="this.src='asset/icons/person.png'"`. Pastikan file placeholder tersebut benar-benar ada di path itu, kalau tidak fallback juga gagal dan gambar tetap broken.

---

## Langkah 10 — Navigasi: single vs double, dan footer quick-nav

### Kapan double navigasi boleh dipakai

Double navigasi (navbar atas + secondary nav) hanya tepat kalau **keduanya punya fungsi yang berbeda dan tidak overlap**:

| Nav | Fungsi |
|---|---|
| Navbar atas | Berpindah antar halaman (`/`, `/member.html`, `/gallery.html`) |
| Secondary nav | Shortcut section **dalam halaman yang sedang aktif** |

Kalau secondary nav hanya menduplikat link yang ada di navbar atas → **hapus secondary nav**, gantinya pakai footer quick-nav.

### Pola yang dipakai project ini (setelah revisi)

`blog-nav` dihapus. Navigasi dalam halaman ditangani oleh **footer 2 kolom**:

```html
<!-- footer — selalu ada di semua halaman -->
<footer class="site-footer">
  <div class="footer-inner">

    <!-- Kolom kiri: identitas -->
    <div class="footer-brand">
      <!-- Logo dibungkus .logo-wrap supaya tidak gepeng -->
      <div class="logo-wrap">
        <img
          src="asset/img/logo.png"
          alt="Logo Divenic"
          class="footer-logo"
          loading="lazy"
        >
        <div class="footer-wordmark">
          Divenic
          <span>Buku Tahunan Digital</span>
        </div>
      </div>
      <p class="footer-desc">Bukan sekadar website, melainkan rumah bagi persahabatan yang tetap terjaga.</p>
    </div>

    <!-- Kolom kanan: quick navigation -->
    <nav class="footer-nav" aria-label="Quick navigation">
      <h3 class="footer-nav-title">Navigasi</h3>
      <ul class="footer-nav-list">
        <li><a href="#hero"         class="footer-link">Beranda</a></li>
        <li><a href="#events"       class="footer-link">Event</a></li>
        <li><a href="#mentors"      class="footer-link">Mentor</a></li>
        <li><a href="#members"      class="footer-link">Member</a></li>
        <li><a href="#gallery"      class="footer-link">Galeri</a></li>
        <li><a href="#kaleidoskop"  class="footer-link">Kaleidoskop</a></li>
      </ul>
    </nav>

  </div>

  <!-- Copyright bar -->
  <p class="footer-copy">© 2025 Divenic. Semua kenangan tersimpan di sini.</p>
</footer>
```

```css
/* css/footer.css */
.site-footer {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 3rem var(--spacing-page) 2rem;
}

.footer-inner {
  display: grid;
  /* kolom kiri punya min-width 180px — logo tidak bisa gepeng */
  grid-template-columns: minmax(180px, 1.2fr) 1fr;
  gap: 2.5rem;
  align-items: start;
  max-width: var(--max-width);
  margin: 0 auto;
}

@media (max-width: 640px) {
  .footer-inner {
    grid-template-columns: 1fr; /* stack di mobile */
  }
}

/* ── Brand kolom kiri ── */
.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Container logo — kunci agar logo tidak gepeng */
.logo-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  width: fit-content; /* tidak ikut melebar mengisi kolom */
}

.footer-logo {
  /* Ukuran tetap — WAJIB ada width DAN height supaya tidak gepeng */
  width: 44px;
  height: 44px;
  object-fit: contain; /* jaga proporsi asli logo */
  flex-shrink: 0;      /* tidak boleh menyempit walau container sempit */
  border-radius: 10px;
}

.footer-wordmark {
  font-size: 16px;
  font-weight: 700;
  color: var(--desc-color-1);
  line-height: 1;
  white-space: nowrap; /* nama brand tidak wrap ke baris baru */
}

.footer-wordmark span {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: var(--desc-color-2);
  margin-top: 3px;
  letter-spacing: 0.02em;
}

.footer-desc {
  font-size: 0.875rem;
  color: var(--desc-color-2);
  line-height: 1.6;
  max-width: 260px; /* batas lebar teks agar nyaman dibaca */
}

/* ── Nav kolom kanan ── */
.footer-nav-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--desc-color-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}

.footer-nav-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-link {
  color: var(--desc-color-2);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--element-color);
}

/* ── Copyright bar ── */
.footer-copy {
  font-size: 11px;
  color: var(--desc-color-2);
  text-align: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 0.5px solid var(--color-border);
  opacity: 0.7;
  max-width: var(--max-width);
  margin-left: auto;
  margin-right: auto;
}
```

**Tiga kunci agar logo tidak gepeng:**
1. `width` dan `height` keduanya disetel eksplisit di `.footer-logo` (bukan hanya satu)
2. `object-fit: contain` — menjaga proporsi asli gambar apapun ukuran container
3. `flex-shrink: 0` di `.footer-logo` — logo tidak boleh menyempit walau flex container menyempit

### Navbar atas — tidak perlu diubah

Navbar atas tetap seperti V2 (fixed, hamburger mobile). Cukup pastikan link-nya mengarah ke halaman, bukan anchor section — supaya tidak overlap fungsi dengan footer quick-nav.

---

## Langkah 11 — Progressive disclosure: batasi data di mobile

Menampilkan 59 member sekaligus di mobile adalah UX yang buruk dan berat untuk parser. Solusi: tampilkan sebagian dulu, sisanya di halaman terpisah.

### Pola implementasi

```javascript
// js/member.js
const MOBILE_LIMIT = 10;   // jumlah card yang ditampilkan di SPA mobile
const DESKTOP_LIMIT = 18;  // jumlah card yang ditampilkan di SPA desktop

export async function initMembers() {
  const grid = qs('#member-grid');
  if (!grid) return;

  const members = await fetchData(MEMBER_DATA_PATH);
  if (!members) return;

  const limit = isMobile() ? MOBILE_LIMIT : DESKTOP_LIMIT;
  const visible = members.slice(0, limit);
  const hasMore = members.length > limit;

  grid.innerHTML = '';
  visible.forEach((member, i) => {
    const card = buildMemberCard(member, i);
    grid.appendChild(card);
  });

  staggerReveal([...grid.children]);
  initMemberModal(members); // modal tetap bisa akses semua data

  // Tombol "Lihat Semua Member"
  if (hasMore) {
    const viewAll = el('a', 'btn-view-all');
    viewAll.href = 'member.html';
    viewAll.textContent = `Lihat Semua ${members.length} Member →`;
    grid.parentElement.appendChild(viewAll);
  }
}
```

### Batas yang disarankan per section

| Section | Mobile (SPA) | Desktop (SPA) | Halaman penuh |
|---|---|---|---|
| Member | 10 card | 18 card | `member.html` |
| Mentor | 6 card | semua | `mentor.html` |
| Album/Galeri | 8 foto | 16 foto | `gallery.html` |
| Memory wall | 6 card | 12 card | (opsional) |

Angka ini bukan aturan kaku — sesuaikan dengan desain grid. Yang penting: **jangan render semua data sekaligus di mobile.**

### Halaman penuh (`member.html`, dll)

Halaman penuh tidak perlu batasan — render semua data, tapi tetap pakai `IntersectionObserver` untuk reveal bertahap supaya tidak semua card animate sekaligus saat halaman baru dibuka.

---

## Langkah 12 — Design token: palet Divenic (bukan lagi Mocha Luxe)

**Palet lama "Mocha Luxe" (krem-espresso-caramel) sudah tidak berlaku.** Palet resmi V2 memakai warna yang sudah tervalidasi dan berjalan di seluruh `css/global.css` project: `--cream`, `--copper`, `--slate`, `--sage`, `--blush`, dkk. Jangan perkenalkan palet warna baru — kalau butuh warna tambahan, turunkan dari token raw yang sudah ada (mis. `rgba()` dari salah satu token, atau varian opacity), bukan hex baru.

```css
/* css/global.css — SATU sumber kebenaran, semua file CSS pakai var() dari sini */
:root {

  /* ── Raw palette — sudah proven, JANGAN diubah tanpa alasan kuat ── */
  --cream:      #FFF8F0;
  --warm-white: #FEFAF5;
  --parchment:  #F5E6D3;
  --blush:      #FAD4C0;
  --peach:      #FFB899;
  --copper:     #B65D3D;
  --rust:       #8B3A1E;
  --sage:       #7A9E7E;
  --slate:      #314E52;
  --charcoal:   #2A2A2A;
  --mid-grey:   #6B6B6B;   /* tambahan untuk desc-color-2, kalau belum ada cek global.css aktual dulu */

  /* ── Semantic: per-konteks pemakaian, BUKAN per-section hardcode ── */
  --intro-bg:      var(--slate);
  --intro-text:    var(--cream);

  --hero-bg:       var(--cream);
  --hero-accent:   var(--copper);

  --title-color:   var(--charcoal);
  --title-font:    var(--font-display);   /* Playfair Display — semua judul section (h2) */

  --desc-color-1:  var(--charcoal);       /* body text utama, paragraf, bio */
  --desc-color-2:  var(--mid-grey);       /* meta info, caption, timestamp, teks sekunder */

  --element-color: var(--copper);         /* CTA, badge, border aktif, ikon interaktif */
  --element-font:  var(--font-ui);        /* label kecil, tombol, UI chrome */

  /* ── Typography (dikonfirmasi final — JANGAN ganti ke Open Sans/Montserrat) ── */
  --font-display: "Playfair Display", Georgia, serif;   /* judul section, nama member besar */
  --font-story:   "Lora", Georgia, serif;                /* quote, bio, narasi panjang */
  --font-ui:      "Nunito", system-ui, -apple-system, sans-serif; /* navbar, tombol, label, meta */
}
```

### Aturan pemakaian token

- **Jangan panggil raw palette langsung di komponen** (mis. `color: var(--copper)` di `.member-card-name`). Selalu lewat semantic alias (`var(--element-color)`) — ini yang bikin ganti tema section jadi satu titik ubah, bukan cari-ganti di puluhan file.
- Setiap section (`Intro`, `Hero`, `About`, `Event`, `Mentor`, `Member`, `Album`, `Kaleidoskop`, `Memory Wall`, `Footer`) boleh punya override semantic-nya sendiri (mis. `--intro-bg` vs `--hero-bg`) tapi tetap harus nunjuk ke raw palette yang sama — tidak ada section yang "boleh" pakai hex baru di luar 10 token raw di atas.
- Kalau di kode ternyata ada token raw lain yang belum tercatat di sini (project sudah berjalan duluan sebelum dokumen ini direvisi), jangan hapus — laporkan ke user untuk dikonfirmasi masuk daftar resmi atau dibersihkan.
- Font weight: pakai minimal yang perlu di-load. Playfair Display & Lora umumnya cukup 400 + 600/700 (regular + semi-bold untuk judul), Nunito cukup 400 + 700. Jangan import semua weight availabe di Google Fonts — ini beban render awal yang sia-sia.

### Cara migrasi kalau menemukan sisa token lama

Kalau saat mengerjakan file tertentu masih ketemu `--color-base`, `--color-accent`, `--color-dark-*`, dst (peninggalan draft Mocha Luxe), pemetaan amannya:

| Token lama (Mocha Luxe) | Ganti ke |
|---|---|
| `--color-base` / `--color-surface` | `var(--cream)` atau `var(--hero-bg)` |
| `--color-text` | `var(--desc-color-1)` |
| `--color-text-muted` | `var(--desc-color-2)` |
| `--color-accent` / `--color-accent-dark` | `var(--element-color)` |
| `--color-dark-base` / `--color-dark-surface` | `var(--intro-bg)` |
| `--color-dark-text` | `var(--intro-text)` |
| `--font-serif` | `var(--font-display)` (judul) atau `var(--font-story)` (narasi) |
| `--font-sans` | `var(--font-ui)` |

Jangan lakukan migrasi ini otomatis tanpa cek — beberapa nilai lama (gradient, shadow, radius) mungkin masih relevan sebagai token independen (`--card-radius`, `--card-shadow`, dst), yang perlu dipindah bukan dihapus.

## Langkah 13 — Interaksi card: bottom-sheet slide-up panel (bukan flip, bukan center modal)

**Keputusan final V2:** klik card member/mentor memicu panel yang **slide dari bawah viewport** (bottom-sheet), bukan flip 3D dan bukan modal yang muncul di tengah layar. Nama/foto tetap terlihat di card grid; info lengkap (bio, quote, sosmed) baru muncul di panel setelah card diklik.

### Yang resmi DIHAPUS dari kode (jangan dipertahankan meski sudah terlanjur ada)

| Fitur | Lokasi biasanya ditemukan | Alasan dihapus |
|---|---|---|
| `initDominoEffect()` | `js/member.js` | Diganti bottom-sheet; ripple hover berantai tidak dipakai lagi di V2 |
| `.domino-ripple` / `@keyframes dominoTilt` | `css/animations.css` | Pasangan dari `initDominoEffect()` di atas |
| `setupMobileRotateFeedback()` | `js/member.js` | Diganti bottom-sheet; rotate-tap di mobile tidak relevan lagi |
| `.is-active-rotate` | `css/animations.css` | Pasangan dari fungsi di atas |
| Interaksi flip-click 3D (kalau masih ada sisa di CSS/HTML lama) | — | Tidak pernah dipakai konsisten di V2, superseded oleh bottom-sheet |
| Entrance 360° saat card muncul | — | Excessive animation, sudah masuk daftar dihapus sejak awal V2 |

Kalau Antigravity menemukan fungsi-fungsi ini saat mengerjakan file terkait, hapus sekalian — jangan hanya "tidak dipanggil lagi" tapi kodenya dibiarkan menumpuk (dead code menambah beban baca file dan risiko re-attach tidak sengaja).

### Konversi: center modal → bottom-sheet

Struktur JS (`initMemberModal`, event delegation, fetch data by `data-id`) **tetap dipakai** — yang berubah cuma CSS posisi & animasi masuk/keluarnya. Base state sekarang:

```css
/* css/member.css — SEBELUM (center modal, hapus blok ini) */
#member-modal {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
}
.modal-card {
  border-radius: var(--radius-xl);
  max-width: 520px;
  transform: translateY(24px);
}
```

```css
/* css/member.css — SESUDAH (bottom-sheet) */
#member-modal {
  display: flex;
  align-items: flex-end;       /* <- panel nempel ke bawah viewport */
  justify-content: center;
  padding: 0;                  /* full-bleed di mobile, sheet yang punya padding sendiri */
}

.modal-card {
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;  /* rounded cuma di atas */
  max-width: 640px;            /* di desktop sheet tetap center dgn max-width, bukan full-width */
  width: 100%;
  max-height: 85dvh;
  transform: translateY(100%); /* mulai dari luar viewport bawah */
  transition: transform var(--duration-base) var(--ease-out);
}

#member-modal.open .modal-card {
  transform: translateY(0);
}

/* Grip handle — sinyal visual bahwa ini bisa di-swipe/dismiss, pola umum bottom-sheet */
.modal-card::before {
  content: '';
  display: block;
  width: 40px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--parchment);
  margin: var(--space-sm) auto;
}
```

`.modal-close`, `.modal-avatar-wrap`, `.modal-body`, `.modal-name`, dst — **tidak perlu diubah**, sudah kompatibel dengan struktur bottom-sheet (cuma posisi container induknya yang berubah).

### Dismiss gesture (opsional, prioritas rendah)

Kalau mau menambah swipe-down-to-dismiss di mobile, ini pola ringan yang aman secara performa (pointer events, bukan library gesture):

```javascript
// tambahkan di initMemberModal, HANYA listen di .modal-card, bukan di seluruh modal
let startY = 0;
modalCard.addEventListener('pointerdown', e => { startY = e.clientY; });
modalCard.addEventListener('pointerup', e => {
  if (e.clientY - startY > 80) closeMemberModal(); // swipe turun > 80px = tutup
});
```

Ini opsional — kalau user tidak minta secara eksplisit, cukup tombol close (`.modal-close`) dan klik backdrop yang sudah ada.

### Yang TETAP dipertahankan (tidak berubah)

- **Loading screen preloader** (fade-out saat asset siap) — pola ini independen dari perubahan card, tidak tersentuh.
- **Hover-lift** pada card grid (`transform: translateY(-Npx)` + shadow saat hover, sebelum diklik) — tetap dipakai, ini micro-feedback ringan yang tidak melanggar aturan performa Langkah 6.
- **Reveal-on-scroll** via `IntersectionObserver` (fade + translateY saat section masuk viewport) — tetap dipakai untuk semua section.
- **Backdrop blur saat sheet terbuka** (`backdrop-filter: blur(4px)` di `.modal-backdrop`) — tetap dipakai, ini bagian dari bottom-sheet, bukan efek yang dihapus.

Ringkasnya: animasi yang lolos filter performa-first V2 hanya empat kategori — **fade, reveal-on-scroll, hover-lift, dan transisi bottom-sheet**. Di luar empat ini, anggap default-nya "tidak dipakai" kecuali user secara eksplisit minta dan itu pun tetap harus lolos aturan Langkah 6 (transform/opacity only, delegated listener, dst).

### Loading screen / intro website

Loading screen berfungsi ganda: kesan visual pertama yang kuat + waktu untuk preload aset penting di background. **Catatan:** ini loading screen di dalam `index.html` (preloader saat asset di-fetch) — beda dengan halaman `Loading` di alur pre-content (lihat Langkah 17), yang muncul setelah Member Selection dan sebelum Intro.

```html
<!-- index.html — taruh tepat setelah <body>, sebelum semua konten lain -->
<div id="loading-screen" aria-hidden="true">
  <div class="loading-inner">
    <img src="asset/img/logo.png" alt="Divenic" class="loading-logo">
    <p class="loading-tagline">Memuat kenangan...</p>
    <div class="loading-bar"><div class="loading-bar-fill"></div></div>
  </div>
</div>
```

```css
/* css/loading.css */
#loading-screen {
  position: fixed;
  inset: 0;
  background: var(--cream);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}
#loading-screen.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.loading-logo {
  height: 60px;
  animation: pulse 1.5s ease-in-out infinite;
}
.loading-bar {
  width: 180px; height: 3px;
  background: rgba(0,0,0,0.1);
  border-radius: 99px;
  margin-top: 1.5rem;
  overflow: hidden;
}
.loading-bar-fill {
  height: 100%;
  background: var(--element-color);
  border-radius: 99px;
  animation: loadBar 2s ease forwards;
}
@keyframes loadBar {
  from { width: 0%; }
  to   { width: 100%; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.7; transform: scale(0.97); }
}
```

```javascript
// js/animation.js
export function initLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;

  window.__hideLoading = () => screen.classList.add('hidden');

  // Fallback: paksa hilang setelah 3 detik agar tidak stuck kalau fetch gagal
  setTimeout(() => screen.classList.add('hidden'), 3000);
}
```

```javascript
// index.html — script module
document.addEventListener('DOMContentLoaded', async () => {
  initLoadingScreen();
  initNavbar();
  initMobileMenu();
  initCarousel();

  await Promise.all([initMembers(), initMentors(), initEventTimeline(), initGallery(), initMemoryWall()]);
  window.__hideLoading?.();
  initScrollReveal();
});
```

Durasi maksimal loading screen: **3 detik**.

### Hover-lift pada card grid (bukan bounce+flip — flip sudah dihapus)

Card di grid (sebelum diklik) boleh punya micro-feedback saat hover, terlepas dari bottom-sheet:

```css
/* css/member.css — berlaku sama untuk mentor via mentor-card.js */
.member-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.member-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-lg);
}
```

Tidak butuh JS tambahan — murni CSS `:hover`. Di mobile otomatis tidak aktif (tidak ada hover state di touch device), tidak perlu guard tambahan.

### Scroll reveal per-section

```css
/* css/animations.css */
[data-reveal] {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
[data-reveal].revealed {
  opacity: 1;
  transform: translateY(0);
}

/* Hero: fade langsung, tanpa geser */
.hero [data-reveal] {
  transform: none;
  transition: opacity 0.8s ease;
}

/* Card grid member & mentor */
.member-grid [data-reveal],
.mentor-list [data-reveal] {
  transform: translateY(32px);
  transition: opacity 0.45s ease, transform 0.45s ease;
}

/* Timeline event: geser dari samping */
.timeline-item[data-reveal]:nth-child(odd)  { transform: translateX(-20px); }
.timeline-item[data-reveal]:nth-child(even) { transform: translateX(20px); }
.timeline-item[data-reveal].revealed        { transform: translateX(0); }

/* Memory wall: scale naik */
.memory-card[data-reveal]          { transform: scale(0.95); transition: opacity 0.4s ease, transform 0.4s ease; }
.memory-card[data-reveal].revealed { transform: scale(1); }
```

Semua via `IntersectionObserver` dari `initScrollReveal()` yang sudah ada — jangan ganti ke `scroll` listener manual (lihat Langkah 6).

### Video kaleidoskop — performa tanpa mengorbankan visual

```html
<div class="kaleidoskop-wrap" data-reveal>
  <video
    class="kaleidoskop-video"
    poster="asset/img/kaleidoskop-poster.webp"
    preload="none"
    loop muted playsinline
  >
    <source src="asset/video/kaleidoskop.mp4" type="video/mp4">
  </video>
  <div class="kaleidoskop-overlay">
    <!-- keterangan ditambahkan di sini -->
  </div>
  <button class="kaleidoskop-play-btn" aria-label="Putar video kaleidoskop">▶</button>
</div>
```

```javascript
// js/home.js
export function initKaleidoskop() {
  const video  = document.querySelector('.kaleidoskop-video');
  const playBtn = document.querySelector('.kaleidoskop-play-btn');
  if (!video) return;

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { video.play();  playBtn?.classList.add('hidden'); }
    else                       { video.pause(); }
  }, { threshold: 0.5 });

  observer.observe(video.parentElement);
  playBtn?.addEventListener('click', () => {
    video.play();
    playBtn.classList.add('hidden');
  });
}
```

`preload="none"` — video tidak di-download saat halaman load, hanya saat diputar.

## Langkah 14 — Album: masonry hybrid (row pertama & terakhir rata)

**Konsep:** row pertama dan terakhir album semua card sama tinggi (rata/flat). Row tengah masonry mengikuti ukuran gambar asli. Ini menyelesaikan masalah visual "ujung tidak rapi" yang sering terjadi di pure masonry.

```javascript
// js/components/photo-card.js
export function buildAlbumGrid(photos = [], container) {
  if (!photos.length || !container) return;

  const COLS = window.innerWidth <= 640 ? 2 : 3;
  const lastRowStart = photos.length - (photos.length % COLS || COLS);

  photos.forEach((photo, i) => {
    const isFirstRow = i < COLS;
    const isLastRow  = i >= lastRowStart;
    const isFlat     = isFirstRow || isLastRow; // row awal & akhir = rata

    const item = buildPhotoCard(photo, isFlat);
    container.appendChild(item);
  });
}

function buildPhotoCard(photo, forceFlat = false) {
  const wrap = document.createElement('div');
  wrap.className = forceFlat ? 'photo-item flat' : 'photo-item';

  const img = document.createElement('img');
  img.src     = photo.url;   // ⚠️ BAGIAN HUMAN: URL Cloudinary diisi manual
  img.alt     = photo.caption || '';
  img.loading = 'lazy';
  img.onerror = () => wrap.classList.add('broken');

  wrap.appendChild(img);
  if (photo.caption) {
    const cap = document.createElement('p');
    cap.className   = 'photo-caption';
    cap.textContent = photo.caption;
    wrap.appendChild(cap);
  }

  return wrap;
}
```

```css
/* css/gallery.css */

/* Container — CSS columns untuk masonry di tengah */
.album-grid {
  columns: 3;
  column-gap: var(--grid-gap);
  padding: 32px 0;
}

@media (max-width: 640px) {
  .album-grid { columns: 2; column-gap: var(--grid-gap-mobile); }
}

/* Semua card: break-inside prevent agar tidak terpotong */
.photo-item {
  break-inside: avoid;
  margin-bottom: var(--grid-gap);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.photo-item img {
  width: 100%;
  height: auto;      /* masonry — tinggi mengikuti gambar asli */
  display: block;
  border-radius: 12px;
  transition: transform 0.3s ease;
}

/* Row pertama & terakhir — FLAT (tinggi seragam) */
.photo-item.flat img {
  height: 200px;     /* tinggi seragam */
  object-fit: cover; /* crop supaya proporsional */
}

.photo-item:hover img { transform: scale(1.03); }

.photo-caption {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(transparent, rgba(42,26,10,0.7));
  color: #F5EFE6;
  font-size: 11px;
  padding: 24px 10px 8px;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.photo-item:hover .photo-caption { opacity: 1; }
```

> **⚠️ CATATAN HUMAN:** URL setiap foto di `data/albums.json` (field `url`) diisi manual oleh pemilik project setelah foto di-upload ke Cloudinary. AI vibe code tidak boleh mengisi atau menebak URL ini.

---

## Langkah 15 — Navigasi SPA: smooth scroll via JS (bukan antar file)

Semua link navigasi — baik di navbar maupun footer quick-nav — menggunakan **smooth scroll ke section dalam satu halaman**, bukan redirect ke file HTML terpisah. Ini membuat transisi terasa lebih smooth dan konsisten dengan arsitektur SPA.

```javascript
// js/utils.js — tambahkan fungsi ini (reuse, jangan duplikat)

/**
 * Inisialisasi smooth scroll untuk semua link navigasi
 * Berlaku untuk navbar, footer quick-nav, dan tombol CTA apapun
 * yang menggunakan href="#section-id"
 */
export function initSmoothNav() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href').slice(1);
    const target   = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    // Hitung offset untuk navbar fixed (tinggi navbar ≈ 64px)
    const navHeight = document.querySelector('.navbar')?.offsetHeight ?? 64;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

    window.scrollTo({ top, behavior: 'smooth' });

    // Update URL hash tanpa reload
    history.pushState(null, '', `#${targetId}`);

    // Tutup mobile menu kalau sedang terbuka
    document.querySelector('.nav-menu')?.classList.remove('active');
  });
}
```

```javascript
// index.html — script module, tambahkan ke boot sequence
import { initSmoothNav } from './js/utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initSmoothNav(); // panggil sekali — berlaku untuk semua link #anchor
  // ... init lain
});
```

```html
<!-- Contoh link navbar — semua pakai #id, bukan href ke file lain -->
<nav class="navbar">
  <a href="#hero"        class="nav-link">Beranda</a>
  <a href="#events"      class="nav-link">Event</a>
  <a href="#mentors"     class="nav-link">Mentor</a>
  <a href="#members"     class="nav-link">Member</a>
  <a href="#gallery"     class="nav-link">Galeri</a>
  <a href="#kaleidoskop" class="nav-link">Kaleidoskop</a>
</nav>

<!-- Footer quick-nav — sama, semua #anchor -->
<ul class="footer-nav-list">
  <li><a href="#hero"        class="footer-link">Beranda</a></li>
  <li><a href="#events"      class="footer-link">Event</a></li>
  <li><a href="#mentors"     class="footer-link">Mentor</a></li>
  <li><a href="#members"     class="footer-link">Member</a></li>
  <li><a href="#gallery"     class="footer-link">Galeri</a></li>
  <li><a href="#kaleidoskop" class="footer-link">Kaleidoskop</a></li>
</ul>
```

**Active state navbar — highlight link section yang sedang aktif:**

```javascript
// js/utils.js — tambahkan setelah initSmoothNav
export function initNavActiveState() {
  const sections = [...document.querySelectorAll('section[id]')];
  const navLinks = [...document.querySelectorAll('.nav-link[href^="#"]')];

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        link.classList.toggle(
          'active',
          link.getAttribute('href') === `#${entry.target.id}`
        );
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' }); // aktif saat section di tengah viewport

  sections.forEach(s => observer.observe(s));
}
```

```css
/* css/navbar.css */
.nav-link.active {
  color: var(--element-color);
  font-weight: 600;
}
.nav-link.active::after {
  content: '';
  display: block;
  width: 100%;
  height: 2px;
  background: var(--element-color);
  border-radius: 99px;
  margin-top: 2px;
}
```

**Halaman terpisah (`member.html`, `gallery.html`) tetap ada** untuk progressive disclosure — tapi link di navbar utama (`index.html`) selalu pakai `#anchor`, bukan link ke file lain.

---

## Langkah 16 — Panduan tim 2 orang: pembagian tugas & anti-duplikat

Project ini dikerjakan oleh **2 orang**: pemilik project (human) + AI vibe code. Pembagian yang jelas mencegah duplikat kerja dan bug yang tidak perlu.

### Pembagian tugas

| Tugas | Dikerjakan oleh | Catatan |
|---|---|---|
| Upload foto ke Cloudinary | **HUMAN** | AI tidak bisa akses Cloudinary |
| Isi URL avatar di `members.json` | **HUMAN** | Setelah upload selesai |
| Isi username sosmed di `members.json` | **HUMAN** | Per member |
| Isi data `mentors.json` | **HUMAN** | Nama, foto, mapel |
| Isi data `events.json` | **HUMAN** | Tanggal, judul, deskripsi |
| Isi data `albums.json` | **HUMAN** | URL foto + caption |
| Upload/siapkan file favicon | **HUMAN** | `.ico`, `.svg`, atau `.png` |
| Semua kode HTML/CSS/JS | **AI** | Berdasarkan panduan skill ini |
| Refactor & optimasi kode | **AI** | Anti-duplikat, konsistensi |
| Debug render/animasi | **AI** | Jalankan via HTTP server |

### Aturan anti-duplikat untuk AI vibe code

Sebelum menulis fungsi atau CSS baru, AI **wajib** cek dulu:

```bash
# Cek apakah fungsi sudah ada di utils.js
grep -n "export function\|export const" js/utils.js

# Cek apakah CSS variable sudah didefinisikan
grep -n "^  --" css/variables.css

# Cek apakah class sudah ada di CSS
grep -rn "\.member-card\|\.photo-item\|\.memory-card" css/
```

**Aturan:**
- `el()`, `fetchData()`, `qs()`, `staggerReveal()`, `initSmoothNav()`, `initScrollReveal()` — **hanya ada di `utils.js`**, jangan ditulis ulang di file lain
- CSS custom property (`--card-radius`, `--grid-gap`, dll) — **hanya ada di `variables.css`**, jangan didefinisikan ulang di file CSS lain
- Builder card — **satu builder per file** di `js/components/`, jangan ada fungsi build yang sama di dua file
- Event listener — **selalu via delegation di parent**, jangan attach di dalam builder atau per-card

### Cara mark bagian "HUMAN" di kode

Kalau ada bagian yang harus diisi pemilik project, AI wajib beri komentar yang jelas:

```javascript
// ⚠️ BAGIAN HUMAN — diisi oleh pemilik project, bukan AI
// Jangan ubah atau hapus komentar ini sampai nilai sudah diisi
avatar: "CLOUDINARY_URL_DIISI_MANUAL",
```

```html
<!-- ⚠️ BAGIAN HUMAN: file favicon belum tersedia, tambahkan setelah file disiapkan -->
<!-- <link rel="icon" href="asset/img/favicon.svg"> -->
```

## Checklist sebelum menyatakan refactor selesai (AI vibe code)

**Urutan & struktur**
- [ ] Urutan section: `Intro → Hero → About → Event → Mentor → Member → Album → Kaleidoskop → Memory Wall → Footer`
- [ ] Kaleidoskop background **terang**, Memory Wall background **gelap** (swap sudah final, jangan dibalik lagi)
- [ ] Semua card builder di `js/components/`, satu file per jenis, tidak ada duplikat
- [ ] Tidak ada file >500 baris
- [ ] Tidak ada listener animasi di dalam builder — semua via delegation di parent

**Design token**
- [ ] `css/global.css` menjadi satu-satunya sumber semua custom property (`:root`)
- [ ] Tidak ada hex/warna hardcode di file CSS lain — selalu lewat `var(--semantic-token)`
- [ ] Judul section pakai `font-family: var(--font-display)` (Playfair Display)
- [ ] Body/bio/quote pakai `var(--font-story)` (Lora); UI/label/navbar pakai `var(--font-ui)` (Nunito)
- [ ] Tidak ada sisa token `--color-base` / `--color-accent` / `--color-dark-*` / `--font-serif` / `--font-sans` (lihat tabel migrasi Langkah 12)
- [ ] Favicon sudah ditautkan (atau ada komentar `⚠️ BAGIAN HUMAN` kalau file belum ada)

**Card member & mentor (sinkron)**
- [ ] Struktur HTML identik antara member card dan mentor card
- [ ] Interaksi: klik → bottom-sheet slide-up panel (`#member-modal` posisi `align-items: flex-end`, `.modal-card` `transform: translateY(100%→0)`)
- [ ] `initDominoEffect()`, `setupMobileRotateFeedback()`, `.domino-ripple`, `.is-active-rotate`, flip-click sudah **dihapus** dari `js/member.js` dan `css/animations.css` — tidak ada sisa kode mati
- [ ] Hover-lift di card grid (`translateY(-6px)` + shadow) tetap ada, tidak konflik dengan bottom-sheet
- [ ] Panel menampilkan: nickname, nama lengkap, kelas/divisi, quote, bio, sosmed
- [ ] Sosmed render **hanya kalau field ada dan tidak kosong** di JSON
- [ ] Field `avatar` dan `sosmed` di JSON ada komentar `⚠️ BAGIAN HUMAN`
- [ ] Gap grid minimum **40px** desktop, 28px mobile

**Album masonry hybrid**
- [ ] Row pertama dan terakhir: `height: 200px; object-fit: cover` (flat/rata)
- [ ] Row tengah: `height: auto` (masonry mengikuti gambar)
- [ ] Field `url` di `albums.json` ada komentar `⚠️ BAGIAN HUMAN`

**Navigasi SPA**
- [ ] `initSmoothNav()` dipanggil sekali di boot sequence
- [ ] Semua link navbar dan footer quick-nav pakai `href="#id"`, bukan link ke file
- [ ] `initNavActiveState()` aktif — link section yang aktif punya class `.active`
- [ ] Mobile menu tertutup otomatis setelah link diklik

**Performa**
- [ ] Semua animasi hanya `transform` + `opacity`
- [ ] Tidak ada kombinasi `overflow: hidden` + `border-radius` pada elemen yang dianimasikan tanpa dipisah wrapper-nya (lihat Langkah 6 — pemicu INP)
- [ ] Video kaleidoskop: `preload="none"` + poster image
- [ ] Semua gambar: `loading="lazy"` (kecuali hero: `eager`) + `onerror` fallback ke `asset/icons/person.png`
- [ ] `IntersectionObserver` untuk scroll reveal, bukan scroll event listener
- [ ] Loading screen ≤3 detik, ada fallback timeout
- [ ] `prefers-reduced-motion` di-check sebelum animasi apa pun yang lebih dari fade sederhana

**Mobile**
- [ ] Hover-lift otomatis tidak aktif di touch device — pastikan tidak ada JS yang force-trigger
- [ ] Bottom-sheet full-width di mobile, max-width center di desktop
- [ ] Progressive disclosure: batas card di SPA + tombol "Lihat Semua"
- [ ] Carousel mobile: blur-box aktif (Spotify album-cover aesthetic — lihat Langkah 7)

**Alur pre-content (lihat Langkah 17)**
- [ ] Landing, Login/Register, Continue as Guest, Gender Selection, Member Selection, Loading masing-masing punya file/section sendiri, bukan digabung ke `index.html`
- [ ] Female flow menampilkan "Coming Soon", tidak redirect ke Male secara diam-diam
- [ ] State pilihan gender & member tersimpan (session-level) supaya tidak diminta ulang saat navigasi balik

**Tim & anti-duplikat**
- [ ] Semua utility functions hanya di `utils.js`, tidak ada duplikat di file lain
- [ ] Semua CSS variables hanya di `global.css`
- [ ] Setiap bagian yang perlu diisi human ada komentar `⚠️ BAGIAN HUMAN`
- [ ] Tidak ada URL Cloudinary yang di-hardcode atau ditebak oleh AI — selalu lewat `asset.service.js` (lihat Langkah 18)

## Langkah 17 — Alur pre-content: Landing → Login/Register → Guest → Gender Selection → Member Selection → Loading

**Status saat ini: belum ada satu pun file untuk alur ini.** `index.html` yang ada sekarang langsung berisi seluruh konten utama (Intro/Hero/About/dst) — user yang buka project langsung "nyemplung" ke tengah, tanpa lewat Landing/Login/Gender Selection/Member Selection/Loading dulu. Ini bukan revisi, ini implementasi baru.

### Kenapa terpisah dari `index.html`

Alur ini adalah **gerbang sebelum konten**, bukan bagian dari SPA scroll utama (`Intro → Hero → ... → Footer`). Karena itu masing-masing tahap sebaiknya jadi file HTML sendiri (bukan `<section>` di dalam `index.html`) — behaviornya beda: linear, satu layar penuh per tahap, tidak ada scroll, transisi antar tahap adalah pindah "layar" bukan scroll ke section.

### Struktur file yang ditargetkan

```
frontend/
├── landing.html              (splash/branding, tombol masuk)
├── auth.html                 (Login/Register dalam satu file, tab switch — lihat catatan backend di bawah)
├── gender-selection.html     (pilih Male / Female)
├── male/
│   ├── member-selection.html
│   ├── loading.html
│   └── index.html            (isi index.html saat ini DIPINDAH ke sini setelah split — belum dilakukan, lihat catatan)
├── female/
│   └── coming-soon.html      (satu halaman statis saja, tidak perlu member-selection/loading dulu)
├── config/
│   └── flow.config.js        (urutan tahap + path tiap tahap, satu sumber kebenaran untuk redirect)
├── services/
│   └── session.service.js    (baca/tulis state alur — lihat di bawah)
```

**Catatan penting soal folder `male/`:** pemindahan `index.html` (dan `member.html`, `mentor.html`, `gallery.html`) ke dalam `male/` adalah pekerjaan terpisah dari sekadar menambah halaman flow baru — ini mengubah semua path relatif (`css/`, `js/`, `asset/`) di file-file itu. Jangan gabungkan dua pekerjaan ini dalam satu langkah implementasi; selesaikan flow baru dulu dengan `male/` menunjuk ke `index.html` di root (belum dipindah), baru lakukan pemindahan folder sebagai langkah terpisah dengan verifikasi path satu-satu.

### State antar tahap: `sessionStorage`, bukan backend

Backend (login, JWT, dst) belum mulai dikerjakan — sesuai roadmap, frontend harus stabil dulu. Jadi untuk saat ini:

```javascript
// services/session.service.js
const KEY = 'divenic_session';

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}

export function setSession(patch) {
  const current = getSession();
  sessionStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}
```

Field yang disimpan bertahap: `{ mode: 'guest' | 'account', gender: 'male' | 'female', memberId: 'member-023' }`.

- **`auth.html`** — Login/Register: untuk saat ini **UI saja**, submit tidak memanggil API apa pun (belum ada backend). Kalau user isi form, cukup `setSession({ mode: 'account' })` lalu redirect ke `gender-selection.html`. Tandai form ini dengan komentar `⚠️ BAGIAN HUMAN / TODO BACKEND` di titik submit, supaya jelas ini placeholder.
- **`landing.html`** — dua tombol: "Login/Register" → `auth.html`, "Lanjutkan sebagai Guest" → langsung `setSession({ mode: 'guest' })` lalu redirect `gender-selection.html`.
- **`gender-selection.html`** — dua pilihan. Male → `setSession({ gender: 'male' })` lalu redirect `male/member-selection.html`. Female → `setSession({ gender: 'female' })` lalu redirect `female/coming-soon.html` (tidak lanjut ke member-selection, karena isi Female belum ada).
- **`male/member-selection.html`** — fetch `data/members.json`, filter `gender === 'male'` (field ini **sudah ada** di JSON, tidak perlu diubah), tampilkan sebagai grid pilih-nama (reuse builder pattern dari Langkah 2, bukan bikin builder baru — cukup versi ringkas tanpa modal). Pilih satu → `setSession({ memberId })` → redirect `loading.html`.
- **`male/loading.html`** — preloader singkat (reuse pola `#loading-screen` dari Langkah 13, bukan bikin dari nol) lalu redirect otomatis ke `index.html` (atau `male/index.html` setelah folder dipindah) setelah aset utama siap / minimal setelah durasi tetap (mis. 1.5 detik) kalau tidak ada aset berat untuk dipreload di tahap ini.

### Guard: jangan bisa loncat tahap

Setiap halaman flow, di awal script-nya, cek prasyarat tahap sebelumnya sudah terpenuhi — kalau belum, redirect mundur ke tahap yang benar:

```javascript
// male/member-selection.html — contoh guard
import { getSession } from '../services/session.service.js';
const session = getSession();
if (!session.gender) location.replace('../gender-selection.html');
```

Pola sama untuk tiap tahap (loading.html cek `memberId`, gender-selection cek `mode`, dst). Ini mencegah user buka `loading.html` langsung via URL dan nyangkut karena `memberId` belum ada.

### Yang TIDAK perlu dikerjakan sekarang

- Validasi password / hashing / JWT — itu bagian backend, di luar scope frontend.
- Female flow lengkap (member-selection, loading, isi utama) — cukup satu halaman "Coming Soon", sesuai keputusan yang sudah dikunci.
- Birthdate validation di Register — sudah diputuskan tidak dipakai (lihat register flow di project summary).

## Langkah 18 — `asset.service.js`: satu pintu untuk semua URL Cloudinary

**Status saat ini: belum ada.** Folder `services/` belum dibuat, dan URL Cloudinary di `data/*.json` (mis. `members.json`) di-hardcode langsung per item — tidak lewat fungsi terpusat.

### Kenapa perlu, bukan sekadar rapi-rapi

Kalau tiap builder card manggil `data.avatar` langsung dari JSON, ganti strategi Cloudinary (mis. tambah transformasi resize/crop, ganti cloud name, tambah fallback CDN) berarti edit di banyak file. Dengan satu service, titik ubahnya satu.

```javascript
// services/asset.service.js
const CLOUD_BASE = 'https://res.cloudinary.com/dzbvomjmq/image/upload';

/**
 * @param {string} publicId - id/path Cloudinary tanpa base URL (atau URL penuh, akan di-passthrough)
 * @param {object} [opts] - transformasi opsional, mis. { width: 400, crop: 'fill' }
 */
function buildUrl(publicId, opts = {}) {
  if (!publicId) return 'asset/icons/person.png';
  if (publicId.startsWith('http')) return publicId; // JSON masih simpan URL penuh — passthrough dulu, lihat catatan migrasi

  const transform = Object.entries(opts)
    .map(([k, v]) => `${k[0]}_${v}`) // width -> w_400, crop -> c_fill (singkatan Cloudinary standar)
    .join(',');

  return `${CLOUD_BASE}/${transform ? transform + '/' : ''}${publicId}`;
}

export function getMemberPhoto(member, opts) {
  return buildUrl(member?.avatar, { width: 400, crop: 'fill', ...opts });
}

export function getHeroImage(opts) {
  return buildUrl('hero/hero-main', { width: 1200, ...opts });
}

export function getAlbumPhoto(album, opts) {
  return buildUrl(album?.url, { width: 600, crop: 'fill', ...opts });
}
```

### Catatan migrasi (penting, jangan lakukan otomatis)

`data/members.json` saat ini menyimpan **URL Cloudinary penuh** per item (`https://res.cloudinary.com/dzbvomjmq/image/upload/v.../fachri_cjxehe.webp`), bukan `public_id` mentah. Fungsi `buildUrl()` di atas sudah punya passthrough untuk kasus ini (`if (publicId.startsWith('http')) return publicId`) supaya tidak langsung merusak data yang sudah ada. Migrasi penuh ke `public_id` + transformasi terpusat (biar bisa resize dinamis per konteks) adalah pekerjaan terpisah yang butuh persetujuan eksplisit sebelum ubah struktur `members.json` — jangan diasumsikan sebagai bagian dari implementasi `asset.service.js` ini.

### Yang wajib diubah di builder yang sudah ada

Ganti pemanggilan langsung `data.avatar` di semua builder (`member-card.js`, `mentor-card.js`, `photo-card.js`, dst) menjadi lewat `getMemberPhoto(data)` / `getAlbumPhoto(data)`. Ini satu-satunya perubahan wajib untuk langkah ini — bukan migrasi data.
