# Sumber Dataset

Status: **sebagian terverifikasi**. TrashNet dan Custom Waste Classification sudah diperiksa. Garbage Classification belum dipakai dan belum dicek.

| # | Dataset | Sumber | Kelas asli | Pemetaan ke target | Lisensi | Status |
|---|---------|--------|-----------|--------------------|---------|--------|
| 1 | Garbage Classification (Kaggle) | kaggle.com, cari "garbage classification 12 classes" (URL dugaan tidak ditemukan, HTTP 404) | battery, biological, brown-glass, cardboard, clothes, green-glass, metal, paper, plastic, shoes, trash, white-glass | biological→organic, paper+cardboard→paper, plastic→plastic | ? | belum dicek, perlu URL yang benar |
| 2 | TrashNet | github.com/garythung/trashnet | glass 501, paper 594, cardboard 403, plastic 482, metal 410, trash 137 (total 2527) | paper+cardboard→paper (997), plastic→plastic (482); tidak ada organic | MIT (tercantum di halaman repo, teks lisensi belum dibaca langsung); README meminta sitasi | terverifikasi via halaman repo (diambil 2026-11-04) |
| 2b | Custom Waste Classification Dataset (wasifmahmood01) | kaggle.com/datasets/wasifmahmood01/custom-waste-classification-dataset, diunduh manual ke `~/Downloads/wastes` | 9 kelas: E-waste, automobile wastes, battery waste, glass waste, light bulbs, metal waste, organic waste, paper waste, plastic waste. Sudah ada split `train/` dan `test/` | organic waste→organic (889 train + 223 test = 1112), plastic waste→plastic (1315 + 329 = 1644), paper waste→paper (1370 + 343 = 1713). Enam kelas lain tidak dipakai | CC BY-NC-SA 4.0 (dikonfirmasi user): hanya non-komersial, wajib atribusi, turunan wajib dibagikan dengan lisensi sama | **dipakai**: disalin ke `data/raw/{organic,plastic,paper}/`, nama file diberi prefix `train_` / `test_` |
| 3 | Foto mandiri | kamera HP | organic, plastic, paper | langsung | milik sendiri | belum dimulai |

## Catatan
- Subset yang dipakai di fase ini: 70 gambar per kelas (210 total) dari 4.396 gambar setelah dedup (`configs/train.yaml`, `data.max_per_class`). Gambar lain tetap di `data/raw/` dan tidak dipakai.
- Kelas organic belum tercakup oleh TrashNet, sehingga perlu dari dataset #1 atau foto mandiri.
- Setiap dataset yang dipakai wajib dicatat lisensi dan tanggal pengunduhannya di sini.
