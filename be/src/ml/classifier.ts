import * as ort from "onnxruntime-node";

import { env } from "../config/env.js";
import { preprocessImage } from "./preprocess.js";

export const CLASSES = ["organic", "plastic", "paper"] as const;
export type Category = (typeof CLASSES)[number];

export type Classification = {
  category: Category;
  confidence: number;
  probabilities: Record<Category, number>;
  needsReview: boolean;
};

let session: ort.InferenceSession | undefined;

export async function loadClassifier(path = env.ML_MODEL_PATH): Promise<void> {
  session = await ort.InferenceSession.create(path, { executionProviders: ["cpu"] });
}

export function classifierReady(): boolean {
  return session !== undefined;
}

export async function classifyImage(input: Buffer): Promise<Classification> {
  const data = await preprocessImage(input);
  if (!session) throw new Error("model klasifikasi belum dimuat");

  const tensor = new ort.Tensor("float32", data, [1, 3, 224, 224]);
  const outputs = await session.run({ image: tensor });
  const logits = outputs.logits?.data;
  if (!(logits instanceof Float32Array) || logits.length !== CLASSES.length) {
    throw new Error("output model tidak sesuai kontrak");
  }

  const max = Math.max(...logits);
  const exps = Array.from(logits, (value) => Math.exp(value - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  const probabilities = Object.fromEntries(
    CLASSES.map((label, i) => [label, (exps[i] ?? 0) / total]),
  ) as Record<Category, number>;

  let category: Category = CLASSES[0];
  for (const label of CLASSES) {
    if (probabilities[label] > probabilities[category]) category = label;
  }
  const confidence = probabilities[category];

  return { category, confidence, probabilities, needsReview: confidence < 0.5 };
}
