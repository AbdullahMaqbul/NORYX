"""
Train Smart Evidence Validation Models
=======================================

Trains two models from synthetic data:

  Model A — Category Classifier
    Input:  OCR text
    Output: firewall | antivirus | access | logging | patch | encryption | backup | network | irrelevant

  Model B — Compliance Classifier
    Input:  OCR text + control category
    Output: pass | fail | need_review

Both use TF-IDF + Logistic Regression (lightweight, fast, interpretable).
"""

import os
import csv
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.pipeline import Pipeline

DATA_PATH    = os.path.join(os.path.dirname(__file__), 'training_data_evidence.csv')
MODEL_A_PATH = os.path.join(os.path.dirname(__file__), 'category_model.pkl')
MODEL_B_PATH = os.path.join(os.path.dirname(__file__), 'compliance_model_v2.pkl')


def load_data():
    """Load the synthetic training data."""
    rows = []
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def train_category_model(rows):
    """Train Model A: OCR text → evidence category."""
    print("\n" + "="*60)
    print("  Training Model A: Category Classifier")
    print("="*60)

    texts      = [r['text'] for r in rows]
    categories = [r['category'] for r in rows]

    X_train, X_test, y_train, y_test = train_test_split(
        texts, categories, test_size=0.2, random_state=42, stratify=categories
    )

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=8000,
            ngram_range=(1, 3),      # unigrams + bigrams + trigrams
            min_df=2,
            max_df=0.95,
            sublinear_tf=True,
        )),
        ('clf', LogisticRegression(
            max_iter=1000,
            C=5.0,
            solver='lbfgs',
            class_weight='balanced',
        )),
    ])

    # Train
    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    train_acc = pipeline.score(X_train, y_train)
    test_acc  = pipeline.score(X_test, y_test)

    print(f"\n  Train Accuracy: {train_acc:.4f}")
    print(f"  Test Accuracy:  {test_acc:.4f}")
    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, digits=3))

    # Cross-validation
    cv_scores = cross_val_score(pipeline, texts, categories, cv=5, scoring='accuracy')
    print(f"  5-Fold CV:  {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save
    joblib.dump(pipeline, MODEL_A_PATH)
    print(f"  Saved → {MODEL_A_PATH}")

    return pipeline


def train_compliance_model(rows):
    """Train Model B: OCR text + category → pass/fail/need_review."""
    print("\n" + "="*60)
    print("  Training Model B: Compliance Classifier")
    print("="*60)

    # Prepend the category so the model learns category-specific compliance patterns
    texts    = [f"[{r['category']}] {r['text']}" for r in rows]
    statuses = [r['status'] for r in rows]

    X_train, X_test, y_train, y_test = train_test_split(
        texts, statuses, test_size=0.2, random_state=42, stratify=statuses
    )

    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=10000,
            ngram_range=(1, 3),
            min_df=2,
            max_df=0.95,
            sublinear_tf=True,
        )),
        ('clf', LogisticRegression(
            max_iter=1000,
            C=10.0,
            solver='lbfgs',
            class_weight='balanced',
        )),
    ])

    # Train
    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    train_acc = pipeline.score(X_train, y_train)
    test_acc  = pipeline.score(X_test, y_test)

    print(f"\n  Train Accuracy: {train_acc:.4f}")
    print(f"  Test Accuracy:  {test_acc:.4f}")
    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, digits=3))

    # Cross-validation
    cv_scores = cross_val_score(pipeline, texts, statuses, cv=5, scoring='accuracy')
    print(f"  5-Fold CV:  {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Save
    joblib.dump(pipeline, MODEL_B_PATH)
    print(f"  Saved → {MODEL_B_PATH}")

    return pipeline


def test_models(model_a, model_b):
    """Run a few manual sanity checks."""
    print("\n" + "="*60)
    print("  Sanity Tests")
    print("="*60)

    tests = [
        # (description, ocr_text, expected_category, expected_status)
        (
            "AD screenshot → should detect 'access' category",
            "Server Manager Active Directory Users and Computers Domain users accounts enabled Group Policy",
            "access", None,
        ),
        (
            "Firewall enabled → should detect 'firewall' + 'pass'",
            "Windows Defender Firewall Domain Profile Firewall state On Inbound connections Block Outbound Allow",
            "firewall", "pass",
        ),
        (
            "Firewall disabled → should detect 'firewall' + 'fail'",
            "Windows Defender Firewall Domain Profile Firewall state Off Warning device not protected",
            "firewall", "fail",
        ),
        (
            "Random website → should detect 'irrelevant'",
            "Google Chrome New Tab Gmail YouTube Shopping Maps Weather News",
            "irrelevant", "fail",
        ),
        (
            "Antivirus enabled → 'antivirus' + 'pass'",
            "Windows Security Virus threat protection No current threats Real-time protection On definitions up to date",
            "antivirus", "pass",
        ),
        (
            "Antivirus threats → 'antivirus' + 'fail'",
            "Windows Security Threats found 3 threats detected action needed Real-time protection Off device at risk",
            "antivirus", "fail",
        ),
        (
            "BitLocker on → 'encryption' + 'pass'",
            "BitLocker Drive Encryption C: Fully encrypted Protection On AES-256 TPM enabled recovery key saved",
            "encryption", "pass",
        ),
        (
            "Event Viewer logs → 'logging' + 'pass'",
            "Event Viewer Security Log 15234 events Audit Success Failure logging enabled Event ID 4624 4625",
            "logging", "pass",
        ),
    ]

    all_passed = True
    for desc, ocr, expected_cat, expected_status in tests:
        pred_cat = model_a.predict([ocr])[0]
        cat_proba = max(model_a.predict_proba([ocr])[0])

        input_b = f"[{pred_cat}] {ocr}"
        pred_status = model_b.predict([input_b])[0]
        status_proba = max(model_b.predict_proba([input_b])[0])

        cat_match    = pred_cat == expected_cat
        status_match = expected_status is None or pred_status == expected_status
        ok           = cat_match and status_match

        symbol = "✓" if ok else "✗"
        if not ok:
            all_passed = False

        print(f"\n  {symbol}  {desc}")
        print(f"     Category:   {pred_cat:12s} (conf {cat_proba:.2f})  {'✓' if cat_match else '✗ expected ' + expected_cat}")
        if expected_status:
            print(f"     Compliance: {pred_status:12s} (conf {status_proba:.2f})  {'✓' if status_match else '✗ expected ' + expected_status}")

    print(f"\n  {'All tests passed!' if all_passed else 'Some tests failed — review above.'}")
    print("="*60 + "\n")


def main():
    rows     = load_data()
    model_a  = train_category_model(rows)
    model_b  = train_compliance_model(rows)
    test_models(model_a, model_b)
    print("Done! Both models saved.\n")


if __name__ == "__main__":
    main()
