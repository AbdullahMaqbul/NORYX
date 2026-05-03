"""
Threat Model Training — v2 (BERT Semantic Embeddings)
======================================================
Upgrades from TF-IDF bag-of-words to DistilBERT mean-pooled embeddings.
Reuses the existing bert_category_model as the backbone encoder —
no new model download required.

Model architecture:
  - DistilBERT backbone (768-dim hidden states)
  - Mean pooling over token embeddings (better than CLS for similarity)
  - Cosine similarity at inference time

Scoring at inference (4 factors):
  semantic_sim × 0.50   — BERT cosine similarity
  category_bonus × 0.20 — +1.0 if control category exactly matches threat category
  cvss_norm × 0.20      — threat severity / 10
  prevalence × 0.10     — real-world frequency score

Saves:
  threat_model_v2.pkl   — embeddings, metadata, scoring weights

Also ingests the NCA controls dataset (108 controls) to generate
additional control→threat training pairs that improve coverage.

Usage:
    python train_threat_model.py
"""

import os
import sys
import json
import pickle
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

from threat_intelligence import THREAT_DB

_DIR      = os.path.dirname(os.path.abspath(__file__))
_OUT_PATH = os.path.join(_DIR, "threat_model_v2.pkl")

# Reuse the existing fine-tuned DistilBERT as backbone
_BERT_PATH = os.path.join(_DIR, "bert_category_model")

# NCA controls dataset for richer coverage evaluation
_NCA_PATH = os.path.join(_DIR, "..", "scripts", "nca_controls_dataset.json")

SCORING_WEIGHTS = {
    "semantic":   0.50,
    "category":   0.20,
    "cvss":       0.20,
    "prevalence": 0.10,
}


# ── Embedding utilities ────────────────────────────────────────────────────────

def mean_pool(token_embeds: torch.Tensor, attention_mask: torch.Tensor) -> np.ndarray:
    """Mean-pool token embeddings weighted by the attention mask."""
    mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeds.size()).float()
    summed   = torch.sum(token_embeds * mask_expanded, dim=1)
    counts   = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)
    pooled   = summed / counts
    # L2-normalise so cosine = dot product
    normed   = torch.nn.functional.normalize(pooled, p=2, dim=1)
    return normed.detach().cpu().numpy()


def encode_texts(texts: list[str], tokenizer, model, batch_size: int = 16) -> np.ndarray:
    """Encode a list of strings into L2-normalised 768-dim BERT embeddings."""
    all_embeddings = []
    model.eval()
    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
        encoded = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=256,
            return_tensors="pt",
        )
        with torch.no_grad():
            outputs = model(**encoded)
        emb = mean_pool(outputs.last_hidden_state, encoded["attention_mask"])
        all_embeddings.append(emb)
    return np.vstack(all_embeddings)


# ── Threat document builder ────────────────────────────────────────────────────

def build_threat_document(t: dict) -> str:
    """
    Construct a rich, weight-boosted text document for each threat.
    Critical fields (name, keywords, tactic) are repeated to give
    the TF-IDF-style "boost" effect inside the BERT embedding.
    """
    parts = [
        t["name"],                              # x1
        t["name"],                              # x2 — boost name
        t["tactic"],
        t["description"],
        t["keywords"],                          # x1
        t["keywords"],                          # x2 — boost keywords
        " ".join(t["categories"]) * 3,          # x3 — category is critical
        t["mitigation"],
        " ".join(t.get("apt_groups", [])),
        " ".join(t.get("cve_examples", [])),
    ]
    return " ".join(filter(None, parts))


# ── NCA controls loader ────────────────────────────────────────────────────────

def load_nca_controls() -> list[dict]:
    """Load the 108 NCA ECC controls from the scripts dataset."""
    if not os.path.exists(_NCA_PATH):
        print("  ⚠  NCA controls dataset not found — skipping enrichment.")
        return []
    with open(_NCA_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"  Loaded {len(data)} NCA controls from dataset.")
    return data


# ── Main training ──────────────────────────────────────────────────────────────

def train():
    print("=" * 60)
    print("Threat Model v2 — BERT Semantic Embedding Training")
    print("=" * 60)

    # 1. Load backbone
    print(f"\n[1/5] Loading DistilBERT backbone from {_BERT_PATH} …")
    tokenizer = AutoTokenizer.from_pretrained(_BERT_PATH)
    model     = AutoModel.from_pretrained(_BERT_PATH, ignore_mismatched_sizes=True)
    model.eval()
    print(f"      Hidden dim: {model.config.hidden_size}  |  Model: {model.config.model_type}")

    # 2. Build threat documents
    print(f"\n[2/5] Building threat documents for {len(THREAT_DB)} threats …")
    threat_docs = [build_threat_document(t) for t in THREAT_DB]

    # 3. Encode threats
    print(f"\n[3/5] Encoding threats with BERT (batch_size=16) …")
    threat_embeddings = encode_texts(threat_docs, tokenizer, model, batch_size=16)
    print(f"      Embedding matrix: {threat_embeddings.shape}")

    # 4. NCA control enrichment (validation only — used for offline analysis)
    nca_controls = load_nca_controls()
    nca_embeddings = None
    if nca_controls:
        print(f"\n[4/5] Encoding {len(nca_controls)} NCA controls for enrichment …")
        nca_docs = [
            f"{c.get('name','')} {c.get('description','')} {c.get('criteria','')}"
            for c in nca_controls
        ]
        nca_embeddings = encode_texts(nca_docs, tokenizer, model, batch_size=16)

        # Compute NCA→threat similarity matrix for analysis
        sim_matrix = sk_cosine(nca_embeddings, threat_embeddings)
        top_counts  = (sim_matrix.max(axis=1) > 0.3).sum()
        print(f"      {top_counts}/{len(nca_controls)} NCA controls have at least one high-similarity threat (>0.3).")
    else:
        print(f"\n[4/5] Skipping NCA enrichment (file not found).")

    # 5. Save
    print(f"\n[5/5] Saving model → {_OUT_PATH} …")
    payload = {
        "version":          "2.0-bert",
        "model_path":       _BERT_PATH,
        "threat_embeddings": threat_embeddings.astype(np.float32),
        "threats":           THREAT_DB,
        "scoring_weights":   SCORING_WEIGHTS,
        "nca_controls":      nca_controls,
        "nca_embeddings":    nca_embeddings.astype(np.float32) if nca_embeddings is not None else None,
    }
    with open(_OUT_PATH, "wb") as f:
        pickle.dump(payload, f)

    size_mb = os.path.getsize(_OUT_PATH) / (1024 * 1024)
    print(f"\n{'='*60}")
    print(f"  Threats indexed : {len(THREAT_DB)}")
    print(f"  Embedding dim   : {threat_embeddings.shape[1]}")
    print(f"  Scoring weights : {SCORING_WEIGHTS}")
    print(f"  NCA controls    : {len(nca_controls)}")
    print(f"  Model file      : {size_mb:.1f} MB")
    print(f"  Saved → {_OUT_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    train()
