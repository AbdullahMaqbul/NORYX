import os
import torch
import warnings
import pandas as pd
import numpy as np
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

warnings.filterwarnings("ignore")

DATA_PATH = os.path.join(os.path.dirname(__file__), 'training_data_evidence.csv')
MODEL_ID = "distilbert-base-uncased"
EPOCHS = 2

CATEGORIES = ['access', 'antivirus', 'backup', 'encryption', 'firewall', 'irrelevant', 'logging', 'network', 'patch']
CAT2ID = {c: i for i, c in enumerate(CATEGORIES)}
ID2CAT = {i: c for c, i in CAT2ID.items()}

STATUSES = ['fail', 'need_review', 'pass']
STAT2ID = {s: i for i, s in enumerate(STATUSES)}
ID2STAT = {i: s for s, i in STAT2ID.items()}

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    preds = np.argmax(predictions, axis=1)
    acc = accuracy_score(labels, preds)
    return {"accuracy": acc}

def train_bert_category_model(df, tokenizer):
    print("\n" + "="*60)
    print("  🚀 Training Model A: BERT Category Classifier")
    print("="*60)
    out_dir = os.path.join(os.path.dirname(__file__), 'bert_category_model')
    
    df_cat = df.copy()
    df_cat['label'] = df_cat['category'].map(CAT2ID)
    train_df, eval_df = train_test_split(df_cat, test_size=0.15, random_state=42, stratify=df_cat['label'])
    
    train_ds = Dataset.from_pandas(train_df)
    eval_ds = Dataset.from_pandas(eval_df)
    
    def tokenize(batch): return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=128)
    
    train_ds = train_ds.map(tokenize, batched=True)
    eval_ds = eval_ds.map(tokenize, batched=True)
    
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID, num_labels=len(CATEGORIES), id2label=ID2CAT, label2id=CAT2ID)
    
    training_args = TrainingArguments(
        output_dir=out_dir,
        learning_rate=3e-5,
        per_device_train_batch_size=32,
        per_device_eval_batch_size=64,
        num_train_epochs=EPOCHS,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_steps=50,
        load_best_model_at_end=True,
        report_to="none"
    )
    
    trainer = Trainer(model=model, args=training_args, train_dataset=train_ds, eval_dataset=eval_ds, compute_metrics=compute_metrics)
    trainer.train()
    trainer.save_model(out_dir)
    tokenizer.save_pretrained(out_dir)
    print(f"\n✅ Model A Saved to: {out_dir}")

def train_bert_compliance_model(df, tokenizer):
    print("\n" + "="*60)
    print("  🚀 Training Model B: BERT Compliance Classifier")
    print("="*60)
    out_dir = os.path.join(os.path.dirname(__file__), 'bert_compliance_model')
    
    df_stat = df.copy()
    df_stat['text'] = "[" + df_stat['category'] + "] " + df_stat['text']
    df_stat['label'] = df_stat['status'].map(STAT2ID)
    
    train_df, eval_df = train_test_split(df_stat, test_size=0.15, random_state=42, stratify=df_stat['label'])
    train_ds = Dataset.from_pandas(train_df)
    eval_ds = Dataset.from_pandas(eval_df)
    
    def tokenize(batch): return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=128)
    
    train_ds = train_ds.map(tokenize, batched=True)
    eval_ds = eval_ds.map(tokenize, batched=True)
    
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID, num_labels=len(STATUSES), id2label=ID2STAT, label2id=STAT2ID)
    
    training_args = TrainingArguments(
        output_dir=out_dir,
        learning_rate=3e-5,
        per_device_train_batch_size=32,
        per_device_eval_batch_size=64,
        num_train_epochs=EPOCHS,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_steps=50,
        load_best_model_at_end=True,
        report_to="none"
    )
    
    trainer = Trainer(model=model, args=training_args, train_dataset=train_ds, eval_dataset=eval_ds, compute_metrics=compute_metrics)
    trainer.train()
    trainer.save_model(out_dir)
    tokenizer.save_pretrained(out_dir)
    print(f"\n✅ Model B Saved to: {out_dir}")

def main():
    if not os.path.exists(DATA_PATH): raise FileNotFoundError(f"Missing {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    train_bert_category_model(df, tokenizer)
    train_bert_compliance_model(df, tokenizer)
    print("\n🎉 All BERT models trained and saved successfully!")

if __name__ == "__main__":
    main()
