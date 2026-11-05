"""Test untuk definisi model, pembekuan backbone, dan pemuatan checkpoint."""

import sys
from pathlib import Path

import torch
from torch import nn

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from waste_classifier.model import (
    build_model,
    freeze_backbone,
    load_checkpoint,
    set_train_mode,
    state_dict_sha256,
    unfreeze_all,
)

CLASSES = ["organic", "plastic", "paper"]


def _bn_layers(model: nn.Module) -> list[nn.BatchNorm2d]:
    return [m for m in model.features.modules() if isinstance(m, nn.BatchNorm2d)]


def test_head_has_three_outputs():
    model = build_model("mobilenet_v3_large", 3, pretrained=False)
    out = model(torch.randn(2, 3, 224, 224))
    assert out.shape == (2, 3)


def test_freeze_backbone_only_trains_classifier():
    model = build_model("mobilenet_v3_large", 3, pretrained=False)
    freeze_backbone(model)
    trainable = {n for n, p in model.named_parameters() if p.requires_grad}
    assert trainable
    assert all(n.startswith("classifier") for n in trainable)


def test_unfreeze_all_enables_gradients():
    model = build_model("mobilenet_v3_large", 3, pretrained=False)
    freeze_backbone(model)
    unfreeze_all(model)
    assert all(p.requires_grad for p in model.parameters())


def test_unknown_architecture_raises():
    try:
        build_model("nope", 3, pretrained=False)
    except ValueError:
        return
    raise AssertionError("harus error untuk arsitektur tidak dikenal")


def test_dropout_from_config_is_applied():
    model = build_model("mobilenet_v3_large", 3, pretrained=False, dropout=0.5)
    probs = [m.p for m in model.classifier.modules() if isinstance(m, nn.Dropout)]
    assert probs and all(p == 0.5 for p in probs)


def test_frozen_backbone_bn_stats_do_not_change():
    model = build_model("mobilenet_v3_large", 3, pretrained=False)
    freeze_backbone(model)
    bn = _bn_layers(model)
    before = [m.running_mean.clone() for m in bn]
    set_train_mode(model, frozen_backbone=True)
    model(torch.randn(4, 3, 224, 224) + 5.0)
    assert all(torch.equal(b, m.running_mean) for b, m in zip(before, bn))


def test_unfrozen_bn_stats_do_change():
    # Pembanding: tanpa mode beku, statistik BatchNorm memang ikut berubah.
    model = build_model("mobilenet_v3_large", 3, pretrained=False)
    bn = _bn_layers(model)
    before = [m.running_mean.clone() for m in bn]
    set_train_mode(model, frozen_backbone=False)
    model(torch.randn(4, 3, 224, 224) + 5.0)
    assert any(not torch.equal(b, m.running_mean) for b, m in zip(before, bn))


def test_checkpoint_roundtrip_matches_outputs(tmp_path):
    model = build_model("mobilenet_v3_large", 3, pretrained=False).eval()
    path = tmp_path / "ck.pt"
    torch.save(
        {
            "state_dict": model.state_dict(),
            "model_name": "mobilenet_v3_large",
            "classes": CLASSES,
            "image_size": 224,
        },
        path,
    )
    loaded, ckpt = load_checkpoint(str(path))
    assert ckpt["classes"] == CLASSES
    x = torch.randn(2, 3, 224, 224)
    with torch.no_grad():
        assert torch.allclose(model(x), loaded(x), atol=1e-6)


def test_state_dict_hash_is_stable_and_detects_weight_change():
    model = build_model("mobilenet_v3_large", 3, pretrained=False)
    sd = model.state_dict()
    h = state_dict_sha256(sd)
    assert h == state_dict_sha256(model.state_dict())
    changed = {k: v.clone() for k, v in sd.items()}
    key = next(k for k, v in changed.items() if v.is_floating_point())
    changed[key] = changed[key] + 1.0
    assert state_dict_sha256(changed) != h
