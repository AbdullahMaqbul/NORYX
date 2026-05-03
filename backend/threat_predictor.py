"""
Threat Predictor — v2 (BERT + Multi-Factor Scoring)
====================================================
Loads the BERT-embedded threat model and provides predict_threats().

Scoring formula (4 factors):
    final = (semantic_sim × 0.50)
          + (category_bonus  × 0.20)
          + (cvss_norm        × 0.20)
          + (prevalence       × 0.10)

  semantic_sim   BERT cosine similarity between control and threat text
  category_bonus 1.0 if control category is in threat.categories, else 0.0
  cvss_norm      threat.severity_score / 10
  prevalence     threat.prevalence (real-world frequency, 0–1)

Returns a list of threat dicts sorted by final_score descending (most dangerous first).
Falls back to v1 TF-IDF model if the BERT model is not found.
"""

import os
import pickle
import numpy as np
import torch
from sklearn.metrics.pairwise import cosine_similarity as sk_cosine

_DIR       = os.path.dirname(os.path.abspath(__file__))
_V2_PATH   = os.path.join(_DIR, "threat_model_v2.pkl")
_V1_PATH   = os.path.join(_DIR, "threat_model.pkl")

_MODEL_CACHE = None   # loaded model payload
_BERT_CACHE  = None   # (tokenizer, bert_model) tuple


def _load_bert(model_path: str):
    """Lazy-load the DistilBERT backbone (cached after first call)."""
    global _BERT_CACHE
    if _BERT_CACHE is not None:
        return _BERT_CACHE
    from transformers import AutoTokenizer, AutoModel
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model     = AutoModel.from_pretrained(model_path, ignore_mismatched_sizes=True)
    model.eval()
    _BERT_CACHE = (tokenizer, model)
    return _BERT_CACHE


def _mean_pool(token_embeds: torch.Tensor, attention_mask: torch.Tensor) -> np.ndarray:
    mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeds.size()).float()
    summed  = torch.sum(token_embeds * mask_expanded, dim=1)
    counts  = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)
    pooled  = summed / counts
    normed  = torch.nn.functional.normalize(pooled, p=2, dim=1)
    return normed.detach().cpu().numpy()


def _encode_query(text: str, tokenizer, model) -> np.ndarray:
    """Encode a single query string to a 768-dim L2-normalised embedding."""
    encoded = tokenizer(
        [text],
        padding=True,
        truncation=True,
        max_length=256,
        return_tensors="pt",
    )
    with torch.no_grad():
        outputs = model(**encoded)
    return _mean_pool(outputs.last_hidden_state, encoded["attention_mask"])


def _load_model():
    """Load the best available model (v2 BERT preferred, v1 TF-IDF fallback)."""
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    if not os.path.exists(_V2_PATH):
        print("[threat_predictor] v2 model not found — training now …")
        from train_threat_model import train
        train()

    with open(_V2_PATH, "rb") as f:
        _MODEL_CACHE = pickle.load(f)

    print(f"[threat_predictor] Loaded v{_MODEL_CACHE.get('version','?')} model "
          f"({len(_MODEL_CACHE['threats'])} threats, "
          f"dim={_MODEL_CACHE['threat_embeddings'].shape[1]})")
    return _MODEL_CACHE


# ── Public API ────────────────────────────────────────────────────────────────

def predict_threats(
    control_name:        str,
    control_description: str = "",
    control_category:    str = "",
    top_n:               int = 5,
    min_score:           float = 0.01,
) -> list[dict]:
    """
    Given a control's text, return top_n threats ranked by combined danger score.

    Each result contains all THREAT_DB fields plus:
        semantic_sim    float  BERT cosine similarity
        category_bonus  float  1.0 if category matched, else 0.0
        final_score     float  weighted composite (0–1 scale)
        combined_score  float  alias for final_score (API compat with v1)
    """
    payload  = _load_model()
    threats  = payload["threats"]
    t_embeds = payload["threat_embeddings"]   # (N, 768) float32
    weights  = payload["scoring_weights"]
    version  = payload.get("version", "1")

    # ── Build query text ──────────────────────────────────────────────────────
    query = " ".join(filter(None, [
        control_name,
        control_category,
        control_description,
    ]))

    # ── Semantic similarity ───────────────────────────────────────────────────
    if "bert" in str(version):
        tokenizer, bert_model = _load_bert(payload["model_path"])
        q_embed = _encode_query(query, tokenizer, bert_model)     # (1, 768)
        sims    = sk_cosine(q_embed, t_embeds).flatten()          # (N,)
    else:
        # v1 TF-IDF fallback
        vectorizer = payload["vectorizer"]
        t_vecs     = payload["threat_vectors"]
        q_vec      = vectorizer.transform([query])
        sims       = sk_cosine(q_vec, t_vecs).flatten()

    # ── Score each threat ─────────────────────────────────────────────────────
    ctrl_cats = {c.strip().lower() for c in control_category.split()} if control_category else set()

    results = []
    for i, threat in enumerate(threats):
        sem_sim   = float(sims[i])
        cat_bonus = 1.0 if any(c in ctrl_cats for c in threat.get("categories", [])) else 0.0
        cvss_norm = threat["severity_score"] / 10.0
        prevalence= float(threat.get("prevalence", 0.5))

        final = (
            sem_sim    * weights["semantic"]  +
            cat_bonus  * weights["category"]  +
            cvss_norm  * weights["cvss"]      +
            prevalence * weights["prevalence"]
        )

        if final < min_score:
            continue

        results.append({
            **threat,
            "semantic_sim":   round(sem_sim,   4),
            "category_bonus": round(cat_bonus, 1),
            "final_score":    round(final,     4),
            "combined_score": round(final,     4),   # backward compat
        })

    # Sort by final_score desc, then severity as tiebreaker
    results.sort(key=lambda x: (x["final_score"], x["severity_score"]), reverse=True)
    return results[:top_n]
