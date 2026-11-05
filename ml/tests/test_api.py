"""Test REST API: kontrak /predict dan /health, validasi upload, dan kesesuaian dengan jalur CLI."""

import io
import sys
from pathlib import Path

import pytest
import torch
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

pytest.importorskip("fastapi")  # extra `api`; dilewati bila belum terpasang
pytest.importorskip("httpx2")  # backend TestClient starlette
from fastapi.testclient import TestClient

from waste_classifier.api import create_app
from waste_classifier.model import build_model
from waste_classifier.predict import predict_paths

CLASSES = ["organic", "plastic", "paper"]
MAX_BYTES = 200_000


def _checkpoint(path: Path) -> Path:
    model = build_model("mobilenet_v3_large", len(CLASSES), pretrained=False)
    torch.save(
        {
            "state_dict": model.state_dict(),
            "model_name": "mobilenet_v3_large",
            "classes": CLASSES,
            "image_size": 224,
            "epoch": "head:1",
        },
        path,
    )
    return path


def _jpeg(size=(64, 48), color=(10, 200, 30), orientation=None) -> bytes:
    img = Image.new("RGB", size, color)
    buf = io.BytesIO()
    if orientation is None:
        img.save(buf, format="JPEG")
    else:
        exif = Image.Exif()
        exif[0x0112] = orientation
        img.save(buf, format="JPEG", exif=exif.tobytes())
    return buf.getvalue()


@pytest.fixture
def client(tmp_path):
    app = create_app(_checkpoint(tmp_path / "best.pt"), max_upload_bytes=MAX_BYTES)
    with TestClient(app) as c:
        yield c


def test_health_reports_model_and_classes(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["classes"] == CLASSES
    assert body["checkpoint_epoch"] == "head:1"


def test_predict_returns_label_confidence_and_probabilities(client):
    r = client.post("/predict", files={"file": ("a.jpg", _jpeg(), "image/jpeg")})
    assert r.status_code == 200
    body = r.json()
    assert body["label"] in CLASSES
    assert set(body["probabilities"]) == set(CLASSES)
    assert abs(sum(body["probabilities"].values()) - 1.0) < 1e-4
    assert body["confidence"] == pytest.approx(body["probabilities"][body["label"]])


def test_predict_rejects_non_image(client):
    r = client.post("/predict", files={"file": ("a.jpg", b"bukan gambar", "image/jpeg")})
    assert r.status_code == 400


def test_predict_rejects_empty_file(client):
    r = client.post("/predict", files={"file": ("a.jpg", b"", "image/jpeg")})
    assert r.status_code == 400


def test_predict_rejects_oversized_file(client):
    r = client.post("/predict", files={"file": ("a.jpg", b"0" * (MAX_BYTES + 1), "image/jpeg")})
    assert r.status_code == 413


def test_predict_requires_file_field(client):
    assert client.post("/predict").status_code == 422


def test_missing_checkpoint_fails_fast(tmp_path):
    with pytest.raises(RuntimeError, match="Checkpoint tidak ditemukan"):
        create_app(tmp_path / "tidak_ada.pt")


def test_rotated_photo_gives_same_result_as_cli(tmp_path):
    """Foto dengan orientasi EXIF harus diproses sama oleh API dan CLI (dan tidak diputar dua kali)."""
    ckpt = _checkpoint(tmp_path / "best.pt")
    data = _jpeg(size=(40, 20), orientation=6)
    photo = tmp_path / "potret.jpg"
    photo.write_bytes(data)

    with TestClient(create_app(ckpt, max_upload_bytes=MAX_BYTES)) as c:
        body = c.post("/predict", files={"file": ("potret.jpg", data, "image/jpeg")}).json()
    ref = predict_paths([photo], ckpt)[0]

    for name in CLASSES:
        assert body["probabilities"][name] == pytest.approx(ref["probabilities"][name], abs=1e-5)
