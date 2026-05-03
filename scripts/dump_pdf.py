import pdfplumber
import json

pdf_path = "NCAControls/NCA controls .pdf"

try:
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        
        # Check pages 15 to 25
        for i in range(15, min(25, len(pdf.pages))):
            page = pdf.pages[i]
            tables = page.extract_tables()
            if tables:
                print(f"--- PAGE {i + 1} has {len(tables)} tables ---")
                print(json.dumps(tables[0], indent=2, ensure_ascii=False)[:1000]) # First table snippet
            else:
                text = page.extract_text()
                if text:
                    print(f"--- PAGE {i + 1} (No tables) ---")
                    print(text[:200])
except Exception as e:
    print(f"Error reading PDF: {e}")
