# Rencana Pengembangan Game Tebak Kata P2P (Compatibility Game)

Dokumen ini berisi arsitektur sistem, alur kerja peer-to-peer, skema data pertanyaan, serta integrasi pemrosesan semantik teks menggunakan Google MediaPipe Text Embedder.

---

## 1. Ikhtisar Proyek

* **Nama Konsep:** Bestie Match / Seberapa Kenal Lu (P2P Text Game)
* **Pemain:** 2 Orang (1 Host, 1 Guest / Peer)
* **Teknologi Utama:**
  * **Frontend:** HTML5, CSS3 (Tailwind CSS atau custom styling), Vanilla JS / React
  * **Networking (P2P):** PeerJS (WebRTC DataChannel)
  * **NLP / AI Engine:** MediaPipe Tasks Text (`universal_sentence_encoder.tflite`)
  * **Sumber Pertanyaan:** Eksternal JSON (`questions.json`)

---

## 2. Arsitektur & Topologi Jaringan

```
[ Pemain 1: Host ] <======= WebRTC DataChannel (P2P) ======> [ Pemain 2: Guest ]
       |                                                            |
       +---> Memuat questions.json                                  |
       +---> Menjalankan MediaPipe Text Embedder (Wasit)            |
       +---> Sinkronisasi State & Skor =============================+
```

### Karakteristik Peran:
* **Host:**
  * Menginisialisasi Peer room & membagikan Connection Code/Link.
  * Mengambil data pertanyaan dari `questions.json`.
  * Bertindak sebagai *autoritative node* (menghitung cosine similarity via MediaPipe dan menentukan perolehan skor).
* **Guest:**
  * Menghubungkan diri ke Host via Peer ID.
  * Menerima prompt soal, mengirimkan input jawaban ke Host, dan menerima hasil evaluasi.

---

## 3. Skema Data Pertanyaan (`questions.json`)

File pertanyaan dapat diperbarui secara mandiri oleh pembuat game tanpa perlu mengubah struktur kode aplikasi.

```json
[
  {
    "id": "q001",
    "kategori": "Makanan & Minuman",
    "template": "Apa buah favorit {target}?",
    "threshold": 0.75
  },
  {
    "id": "q002",
    "kategori": "Kebiasaan",
    "template": "Apa kebiasaan buruk yang sering dilakukan {target} saat santai?",
    "threshold": 0.70
  },
  {
    "id": "q003",
    "kategori": "Preferensi",
    "template": "Kalau diajak liburan, kota mana yang ingin dikunjungi oleh {target}?",
    "threshold": 0.72
  },
  {
    "id": "q004",
    "kategori": "Emosi & Karakter",
    "template": "Apa hal yang paling mudah membuat {target} kesal?",
    "threshold": 0.68
  }
]
```

> **Catatan:** Tag `{target}` akan digantikan secara dinamis dengan nama pemain yang sedang menjadi subjek pertanyaan pada ronde tersebut.

---

## 4. Alur Permainan (Game Loop State Machine)

```
[ 1. LOBBY ] 
   └── Pemain masuk, bertukar Peer ID, input nama -> Status: CONNECTED

[ 2. INISIALISASI MODEL ]
   └── Model MediaPipe diunduh & dimuat di latar belakang (Host)

[ 3. RONDE DIMULAI ]
   ├── Penentuan Subjek: (Ganjil: Pemain 1 | Genap: Pemain 2)
   ├── Soal dipilih acak dari questions.json
   └── Soal dikirim ke kedua layar

[ 4. INPUT JAWABAN (RAHASIA) ]
   ├── Target mengisi jawaban sebenarnya
   ├── Lawan menebak jawaban target
   └── Jawaban dikunci & dikirim ke Host

[ 5. EVALUASI JAWABAN (MediaPipe) ]
   ├── Pembersihan teks (trim, lowercasing)
   ├── Embedding vektor via Universal Sentence Encoder
   └── Hitung Cosine Similarity:
       - Skoring >= Threshold -> Status: MATCH (Poin +1)
       - Skoring < Threshold  -> Status: MISMATCH (Poin +0)

[ 6. REVEAL & SKOR ]
   ├── Kedua jawaban dan persentase kemiripan ditampilkan
   └── Navigasi ke ronde berikutnya / Game Over
```

---

## 5. Implementasi Pencocokan Semantik (MediaPipe)

Komputasi dilakukan sepenuhnya di browser Host tanpa backend tambahan.

### Algoritma Evaluasi:
1. **Normalisasi:**
   $$\text{clean}(s) = \text{trim}(\text{lowercase}(s))$$
2. **Kecocokan Mutlak:** Jika $\text{clean}(A) = \text{clean}(B)$, kemiripan = $1.0$ ($100\%$).
3. **Kecocokan Semantik (MediaPipe Tasks Text):**
   * Vektorisasi: $v_A = \text{Embedder}(A)$, $v_B = \text{Embedder}(B)$
   * Cosine Similarity:
     $$\text{Similarity} = \frac{v_A \cdot v_B}{\|v_A\| \|v_B\|}$$
4. **Keputusan:** Cocok jika $\text{Similarity} \ge \text{Threshold}$.

---

## 6. Protokol Pesan P2P (DataChannel Schema)

Format payload JSON yang dikirimkan melalui PeerJS:

| Type | Pengirim | Deskripsi Payload |
| :--- | :--- | :--- |
| `PLAYER_READY` | Guest $\rightarrow$ Host | Mengirimkan nama pemain tamu. |
| `GAME_START` | Host $\rightarrow$ Guest | Daftar ronde, nama pemain, dan status awal. |
| `NEW_ROUND` | Host $\rightarrow$ Guest | `{ round: 1, target: "Budi", questionText: "..." }` |
| `SUBMIT_ANSWER`| Guest $\rightarrow$ Host | `{ round: 1, answer: "Mangga Arumanis" }` |
| `ROUND_RESULT` | Host $\rightarrow$ Guest | `{ round: 1, answerTarget: "...", answerGuess: "...", similarity: 0.84, isMatch: true, totalScore: 1 }` |
| `NEXT_ROUND` | Host $\rightarrow$ Guest | Instruksi lanjut ke ronde berikutnya. |

---

## 7. Roadmap & Tahapan Pengerjaan

### Fase 1: Dasar Jaringan & Data (Hari 1-2)
- [ ] Siapkan struktur UI dasar (Lobby, Game Screen, Result Modal).
- [ ] Buat file `questions.json` dengan minimal 15–20 pertanyaan variatif.
- [ ] Implementasikan modul PeerJS untuk Handshake (buat Room ID, Join Room, status koneksi).

### Fase 2: Integrasi MediaPipe (Hari 3)
- [ ] Muat modul `@mediapipe/tasks-text` via CDN/WASM.
- [ ] Unduh dan cache model `universal_sentence_encoder.tflite`.
- [ ] Buat unit test sederhana di browser untuk menguji akurasi embedding terhadap sinonim bahasa Indonesia/Inggris.

### Fase 3: Logika Sinkronisasi Game (Hari 4-5)
- [ ] Bangun penanganan state giliran (`target` vs `guesser`).
- [ ] Sinkronisasi penguncian jawaban (mencegah jawaban terlihat sebelum keduanya mengirim).
- [ ] Hubungkan output MediaPipe ke pencatatan skor dan pengiriman hasil ke Guest.

### Fase 4: Pengujian & Polish UI (Hari 6)
- [ ] Tangani *edge cases* (koneksi terputus tiba-tiba, input jawaban kosong).
- [ ] Tambahkan animasi pembukaan jawaban (*reveal animation*), indikator persentase kemiripan, dan layar akhir evaluasi skor.