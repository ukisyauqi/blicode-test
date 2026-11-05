import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { classifyImage, loadClassifier } from "../../src/ml/classifier.js";

const referencePath = "../ml/reports/parity_reference.json";
const available =
  existsSync(referencePath) &&
  existsSync("../ml/data/splits/val.csv") &&
  existsSync("models/best.onnx");

type Reference = {
  onnx_sha256: string;
  classes: string[];
  images: Array<{ path: string; label: string; probabilities: number[] }>;
};

describe.skipIf(!available)("paritas ONNX dengan referensi PyTorch", () => {
  let reference: Reference;

  beforeAll(async () => {
    reference = JSON.parse(readFileSync(referencePath, "utf8")) as Reference;
    await loadClassifier();
  });

  it("memakai file model yang sama dengan referensi", () => {
    const hash = createHash("sha256").update(readFileSync("models/best.onnx")).digest("hex");
    expect(hash).toBe(reference.onnx_sha256);
  });

  it("label dan probabilitas semua gambar val sama dengan PyTorch", async () => {
    let maxDifference = 0;
    for (const image of reference.images) {
      const result = await classifyImage(readFileSync(join("../ml", image.path)));
      const expected =
        reference.classes[image.probabilities.indexOf(Math.max(...image.probabilities))];
      expect(result.category, image.path).toBe(expected);

      for (const [index, label] of reference.classes.entries()) {
        const difference = Math.abs(
          result.probabilities[label as keyof typeof result.probabilities] -
            image.probabilities[index]!,
        );
        maxDifference = Math.max(maxDifference, difference);
      }
    }
    expect(maxDifference).toBeLessThan(0.03);
  });
});
