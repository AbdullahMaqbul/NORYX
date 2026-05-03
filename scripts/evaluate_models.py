"""
Model Evaluation Script
=======================
Evaluates the fine-tuned BERT category and compliance models on the held-out
test split (same split used at training time, random_state=42, test_size=0.15)
so the models have never seen these rows.

Reports per model:
  - Accuracy, macro/weighted precision/recall/F1
  - Per-class precision/recall/F1/support
  - Confusion matrix
  - Average inference latency (ms/sample)

Also writes a JSON report to backend/evaluation_report.json so results can
be tracked across model versions.

Usage:
    python scripts/evaluate_models.py
    python scripts/evaluate_models.py --sample 500   # quick run
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from transformers import AutoModelForSequenceClassification, AutoTokenizer

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

DATA_PATH = BACKEND / "training_data_evidence.csv"
CAT_MODEL_DIR = BACKEND / "bert_category_model"
COMP_MODEL_DIR = BACKEND / "bert_compliance_model"
REPORT_PATH = BACKEND / "evaluation_report.json"

CATEGORIES = ['access', 'antivirus', 'backup', 'encryption', 'firewall',
              'irrelevant', 'logging', 'network', 'patch']
STATUSES = ['fail', 'need_review', 'pass']

TEST_SIZE = 0.15
SEED = 42
MAX_LEN = 128
BATCH_SIZE = 64


def load_model(model_dir: Path):
    if not model_dir.exists():
        raise FileNotFoundError(f"Model not found: {model_dir}")
    tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))
    model.eval()
    return tokenizer, model


def predict_batch(texts, tokenizer, model, device):
    preds = []
    total_ms = 0.0
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        enc = tokenizer(batch, padding="max_length", truncation=True,
                        max_length=MAX_LEN, return_tensors="pt").to(device)
        t0 = time.perf_counter()
        with torch.no_grad():
            logits = model(**enc).logits
        total_ms += (time.perf_counter() - t0) * 1000
        preds.extend(logits.argmax(dim=-1).cpu().numpy().tolist())
    return preds, total_ms


def evaluate_model(name, model_dir, texts, labels, label_names, device):
    print(f"\n{'=' * 60}")
    print(f"  Evaluating: {name}")
    print(f"{'=' * 60}")

    tokenizer, model = load_model(model_dir)
    model.to(device)

    preds, total_ms = predict_batch(texts, tokenizer, model, device)

    acc = accuracy_score(labels, preds)
    p_macro, r_macro, f_macro, _ = precision_recall_fscore_support(
        labels, preds, average="macro", zero_division=0)
    p_wtd, r_wtd, f_wtd, _ = precision_recall_fscore_support(
        labels, preds, average="weighted", zero_division=0)

    present_labels = sorted(set(labels) | set(preds))
    target_names = [label_names[i] for i in present_labels]

    print(f"\nSamples evaluated     : {len(texts)}")
    print(f"Accuracy              : {acc:.4f}")
    print(f"Macro    P/R/F1       : {p_macro:.4f} / {r_macro:.4f} / {f_macro:.4f}")
    print(f"Weighted P/R/F1       : {p_wtd:.4f} / {r_wtd:.4f} / {f_wtd:.4f}")
    print(f"Avg latency per sample: {total_ms / max(len(texts), 1):.2f} ms")

    print("\nPer-class report:")
    print(classification_report(labels, preds, labels=present_labels,
                                target_names=target_names, digits=4,
                                zero_division=0))

    cm = confusion_matrix(labels, preds, labels=present_labels)
    print("Confusion matrix (rows=true, cols=pred):")
    header = "          " + " ".join(f"{n[:6]:>7}" for n in target_names)
    print(header)
    for name_i, row in zip(target_names, cm):
        print(f"  {name_i[:8]:<8}" + " ".join(f"{v:>7}" for v in row))

    return {
        "name": name,
        "samples": len(texts),
        "accuracy": round(acc, 4),
        "precision_macro": round(p_macro, 4),
        "recall_macro": round(r_macro, 4),
        "f1_macro": round(f_macro, 4),
        "precision_weighted": round(p_wtd, 4),
        "recall_weighted": round(r_wtd, 4),
        "f1_weighted": round(f_wtd, 4),
        "avg_latency_ms": round(total_ms / max(len(texts), 1), 2),
        "per_class": classification_report(
            labels, preds, labels=present_labels,
            target_names=target_names, output_dict=True, zero_division=0),
        "confusion_matrix": {
            "labels": target_names,
            "matrix": cm.tolist(),
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=None,
                        help="Evaluate only N rows from the test set (faster).")
    parser.add_argument("--cpu", action="store_true", help="Force CPU.")
    args = parser.parse_args()

    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training data not found: {DATA_PATH}")

    device = torch.device("cpu" if args.cpu or not torch.cuda.is_available() else "cuda")
    print(f"Device: {device}")

    df = pd.read_csv(DATA_PATH).dropna(subset=["text", "category", "status"])
    print(f"Loaded {len(df)} rows from {DATA_PATH.name}")

    cat2id = {c: i for i, c in enumerate(CATEGORIES)}
    stat2id = {s: i for i, s in enumerate(STATUSES)}

    # --- Category split (mirror train_bert_models.py exactly) ---
    df_cat = df.copy()
    df_cat["label"] = df_cat["category"].map(cat2id)
    df_cat = df_cat.dropna(subset=["label"])
    df_cat["label"] = df_cat["label"].astype(int)
    _, cat_test = train_test_split(df_cat, test_size=TEST_SIZE,
                                   random_state=SEED, stratify=df_cat["label"])

    # --- Compliance split (mirror training: prefixes category into text) ---
    df_stat = df.copy()
    df_stat["text"] = "[" + df_stat["category"] + "] " + df_stat["text"]
    df_stat["label"] = df_stat["status"].map(stat2id)
    df_stat = df_stat.dropna(subset=["label"])
    df_stat["label"] = df_stat["label"].astype(int)
    _, stat_test = train_test_split(df_stat, test_size=TEST_SIZE,
                                    random_state=SEED, stratify=df_stat["label"])

    if args.sample:
        cat_test = cat_test.sample(n=min(args.sample, len(cat_test)), random_state=SEED)
        stat_test = stat_test.sample(n=min(args.sample, len(stat_test)), random_state=SEED)

    results = {}

    if CAT_MODEL_DIR.exists():
        results["category_model"] = evaluate_model(
            name="BERT Category Classifier",
            model_dir=CAT_MODEL_DIR,
            texts=cat_test["text"].tolist(),
            labels=cat_test["label"].tolist(),
            label_names=CATEGORIES,
            device=device,
        )
    else:
        print(f"\n[skip] Category model dir not found: {CAT_MODEL_DIR}")

    if COMP_MODEL_DIR.exists():
        results["compliance_model"] = evaluate_model(
            name="BERT Compliance Classifier",
            model_dir=COMP_MODEL_DIR,
            texts=stat_test["text"].tolist(),
            labels=stat_test["label"].tolist(),
            label_names=STATUSES,
            device=device,
        )
    else:
        print(f"\n[skip] Compliance model dir not found: {COMP_MODEL_DIR}")

    if not results:
        print("\nNo models found to evaluate.")
        return

    report = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "dataset": str(DATA_PATH.name),
        "test_size": TEST_SIZE,
        "seed": SEED,
        "device": str(device),
        "results": results,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2))
    print(f"\nReport written → {REPORT_PATH}")

    # Quick pass/fail against target thresholds
    print(f"\n{'=' * 60}")
    print("  Requirement check (tune thresholds to your targets)")
    print(f"{'=' * 60}")
    targets = {"category_model": 0.85, "compliance_model": 0.80}
    for key, target in targets.items():
        if key in results:
            f1 = results[key]["f1_macro"]
            status = "PASS" if f1 >= target else "FAIL"
            print(f"  {key:20s}  macro-F1 {f1:.4f}  target {target:.2f}  [{status}]")


if __name__ == "__main__":
    main()
