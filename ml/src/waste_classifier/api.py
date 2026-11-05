"""REST API klasifikasi sampah (PLAN §9): POST /predict menerima satu gambar.

Butuh extra `api`: uv sync --extra api

Pemakaian (dari folder ml/):
    uv run waste-api                    # hanya localhost, dokumentasi di http://127.0.0.1:8000/docs
    uv run waste-api --host 0.0.0.0     # bisa diakses dari jaringan lain (belum ada autentikasi)

Variabel lingkungan:
    WASTE_CHECKPOINT   path checkpoint (default: models/best.pt)
"""

from __future__ import annotations

import argparse
import io
import os
import sys
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image
from pydantic import BaseModel

from waste_classifier.data import to_rgb
from waste_classifier.predict import DEFAULT_CKPT, Predictor

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class PredictResponse(BaseModel):
    label: str
    confidence: float
    probabilities: dict[str, float]


class HealthResponse(BaseModel):
    status: str
    model: str
    checkpoint_epoch: str
    classes: list[str]


def create_app(
    checkpoint: str | Path | None = None,
    max_upload_bytes: int = MAX_UPLOAD_BYTES,
) -> FastAPI:
    """Buat aplikasi FastAPI. Model dimuat sekali di sini; gagal cepat jika checkpoint tidak ada."""
    ckpt_path = Path(checkpoint or os.environ.get("WASTE_CHECKPOINT", DEFAULT_CKPT))
    if not ckpt_path.is_file():
        raise RuntimeError(f"Checkpoint tidak ditemukan: {ckpt_path}. Jalankan waste-train dulu.")
    predictor = Predictor(ckpt_path)

    app = FastAPI(title="Waste Classifier API", version="0.1.0")

    @app.get("/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            model=predictor.model_name,
            checkpoint_epoch=predictor.epoch,
            classes=predictor.classes,
        )

    @app.post("/predict", response_model=PredictResponse)
    async def predict(file: Annotated[UploadFile, File()]) -> PredictResponse:
        # Batasi ukuran sebelum membaca penuh, supaya upload besar tidak memenuhi memori.
        data = await file.read(max_upload_bytes + 1)
        if len(data) > max_upload_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"Ukuran file melebihi {max_upload_bytes // (1024 * 1024)} MB",
            )
        if not data:
            raise HTTPException(status_code=400, detail="File kosong")

        try:
            with Image.open(io.BytesIO(data)) as im:
                img = to_rgb(im)
        except (OSError, SyntaxError, ValueError, Image.DecompressionBombError):
            raise HTTPException(status_code=400, detail="File bukan gambar yang valid") from None

        # Inferensi CPU-bound dijalankan di thread terpisah agar event loop tidak macet.
        result = await run_in_threadpool(predictor.predict_image, img)
        return PredictResponse(**result)

    return app


def main(argv: list[str] | None = None) -> int:
    import uvicorn

    parser = argparse.ArgumentParser(description="Jalankan REST API klasifikasi sampah.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--checkpoint", default=None, help="default: $WASTE_CHECKPOINT atau models/best.pt")
    args = parser.parse_args(argv)

    try:
        app = create_app(args.checkpoint)
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1
    uvicorn.run(app, host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
