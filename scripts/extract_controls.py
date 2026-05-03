import pdfplumber
import json
import re

pdf_path = "NCAControls/NCA controls .pdf"
dataset = []

# Regex pattern for control IDs (e.g., 2-4-1, 1-1-1)
control_pattern = re.compile(r'^\d+-\d+-\d+$')

def extract_keywords(text):
    # Basic keyword extraction for criteria: remove stop words, keep long words
    stop_words = {"shall", "be", "of", "the", "and", "or", "to", "for", "with", "in", "on", "as", "a", "an", "is", "are"}
    words = re.findall(r'\b[a-zA-Z-]{4,}\b', text.lower())
    keywords = [w for w in words if w not in stop_words]
    # return comma separated, unique
    return ", ".join(list(dict.fromkeys(keywords))[:7]) # Limit to 7 keywords

try:
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Some rows might be None or length < 2
                    if not row or len(row) < 2:
                        continue
                        
                    col1 = str(row[0]).strip()
                    col2 = str(row[1]).strip()
                    
                    if control_pattern.match(col1):
                        # Attempt to extract sub-controls as full text
                        description = col2.replace('\n', ' ')
                        criteria = extract_keywords(description)
                        
                        dataset.append({
                            "name": col1,
                            "description": description,
                            "criteria": criteria
                        })
                        
    # Write to JSON
    with open("nca_controls_dataset.json", "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
        
    print(f"Successfully extracted {len(dataset)} controls and saved to nca_controls_dataset.json.")
except Exception as e:
    print(f"Error extracting controls: {e}")
