"""
Sklearn Evidence Validation Model Trainer
==========================================
Trains two TF-IDF + SGD classifier pipelines from training_data_evidence.csv:

  Model A  category_model.pkl       — classifies evidence type (12 categories)
  Model B  compliance_model_v2.pkl  — classifies compliance status (pass/fail/need_review)

Usage:
    python train_sklearn_models.py
"""

import os
import csv
import random
import joblib
import numpy as np
from collections import Counter
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import SGDClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

random.seed(42)
np.random.seed(42)

_DIR      = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(_DIR, "training_data_evidence.csv")
CAT_OUT   = os.path.join(_DIR, "category_model.pkl")
COMP_OUT  = os.path.join(_DIR, "compliance_model_v2.pkl")


def load_data():
    rows = []
    with open(DATA_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"  Loaded {len(rows):,} samples from {DATA_PATH}")
    cats = Counter(r["category"] for r in rows)
    print(f"  Categories ({len(cats)}): {dict(sorted(cats.items()))}")
    return rows


def train_category_model(rows):
    print("\n" + "="*60)
    print("  Model A: Category Classifier (TF-IDF + SGD)")
    print("="*60)

    texts  = [r["text"]     for r in rows]
    labels = [r["category"] for r in rows]

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.15, random_state=42, stratify=labels
    )

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=80_000,
            sublinear_tf=True,
            min_df=2,
        )),
        ("clf", SGDClassifier(
            loss="modified_huber",
            alpha=1e-4,
            max_iter=200,
            tol=1e-4,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    pipe.fit(X_train, y_train)
    preds = pipe.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"\n  Test Accuracy: {acc:.4f}")
    print("\n" + classification_report(y_test, preds))

    joblib.dump(pipe, CAT_OUT)
    size_kb = os.path.getsize(CAT_OUT) / 1024
    print(f"  Saved -> {CAT_OUT}  ({size_kb:.0f} KB)")
    return pipe


def train_compliance_model(rows):
    print("\n" + "="*60)
    print("  Model B: Compliance Classifier (TF-IDF + SGD)")
    print("="*60)

    # Prefix text with detected category so the model is category-aware
    texts  = [f"[{r['category']}] {r['text']}" for r in rows]
    labels = [r["status"] for r in rows]

    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.15, random_state=42, stratify=labels
    )

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=80_000,
            sublinear_tf=True,
            min_df=2,
        )),
        ("clf", SGDClassifier(
            loss="modified_huber",
            alpha=5e-5,
            max_iter=200,
            tol=1e-4,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )),
    ])

    pipe.fit(X_train, y_train)
    preds = pipe.predict(X_test)
    acc = accuracy_score(y_test, preds)

    print(f"\n  Test Accuracy: {acc:.4f}")
    print("\n" + classification_report(y_test, preds))

    joblib.dump(pipe, COMP_OUT)
    size_kb = os.path.getsize(COMP_OUT) / 1024
    print(f"  Saved -> {COMP_OUT}  ({size_kb:.0f} KB)")
    return pipe


def smoke_test(cat_model, comp_model):
    print("\n" + "="*60)
    print("  Smoke Tests")
    print("="*60)

    tests = [
        ("Azure AD Multi-Factor Authentication Status Report MFA enabled all privileged accounts 100% compliance",
         "access", "pass"),
        ("BitLocker Drive Encryption AES-256 all drives encrypted TPM protection on compliance 100%",
         "encryption", "pass"),
        ("Tenable Nessus vulnerability scan critical 0 high 3 patch compliance 98%",
         "vulnerability", "pass"),
        ("Incident response tabletop exercise completed ransomware simulation pass all scenarios IRP approved CISO",
         "incident_response", "pass"),
        ("KnowBe4 security awareness training completion 100 percent phishing click rate 3 percent pass",
         "training", "pass"),
        ("Vendor security assessment register all critical vendors assessed DPA signed NCA ECC-4 compliant",
         "third_party", "pass"),
        ("Google Chrome new tab YouTube Facebook Instagram social media desktop icons",
         "irrelevant", "fail"),
        ("Firewall disabled domain profile off public off device not protected",
         "firewall", "fail"),
    ]

    print(f"\n  {'Input (first 60 chars)':<62} {'Expected Cat':<18} {'Got Cat':<18} {'Status':<12} {'OK?'}")
    print("  " + "-" * 120)
    correct = 0
    for text, exp_cat, exp_status in tests:
        pred_cat    = cat_model.predict([text])[0]
        model_input = f"[{pred_cat}] {text}"
        pred_status = comp_model.predict([model_input])[0]
        cat_ok      = pred_cat == exp_cat
        stat_ok     = pred_status == exp_status
        ok          = cat_ok and stat_ok
        if ok:
            correct += 1
        print(f"  {text[:60]:<62} {exp_cat:<18} {pred_cat:<18} {pred_status:<12} {'OK' if ok else 'FAIL'}")
    print(f"\n  Smoke test: {correct}/{len(tests)} correct")


if __name__ == "__main__":
    print("="*60)
    print("  Evidence Model Retraining Pipeline")
    print("="*60)

    rows      = load_data()
    cat_model = train_category_model(rows)
    comp_model= train_compliance_model(rows)
    smoke_test(cat_model, comp_model)

    print("\n" + "="*60)
    print("  Done. Both models retrained and saved.")
    print("  Restart uvicorn to load the new models.")
    print("="*60)
