import sys
import json
import argparse
import fitz  # PyMuPDF
# import spacy
# import pdfplumber

# Note: In a full production environment, we'd load a spacy model like en_core_web_sm
# nlp = spacy.load("en_core_web_sm")

def extract_text_pymupdf(file_path):
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
    return text

def parse_resume(file_path):
    # Phase 1: Extract Text
    raw_text = extract_text_pymupdf(file_path)
    
    # Phase 2: Section Detection (Heuristics)
    # A real implementation would use regex + spaCy for Named Entity Recognition
    
    # Placeholder for the structured output based on the user's prompt requirements
    structured_data = {
        "personal_information": {
            "name": None,
            "email": None,
            "phone": None,
            "linkedin": None,
            "github": None,
            "portfolio": None
        },
        "education": [],
        "experience": [],
        "skills": [],
        "projects": [],
        "certifications": [],
        "publications": [],
        "awards": [],
        "languages": [],
        "raw_text": raw_text
    }
    
    # Simple fallback regex/heuristics to populate data for demo purposes:
    import re
    # Extract Email
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', raw_text)
    if email_match:
        structured_data["personal_information"]["email"] = email_match.group(0)
        
    # Extract Phone (basic)
    phone_match = re.search(r'[\+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}', raw_text)
    if phone_match:
        structured_data["personal_information"]["phone"] = phone_match.group(0)

    # In production, spaCy NER would extract the PERSON entity for name, ORG for company, etc.
    # For now, we return the structure to the Node.js backend.
    
    return structured_data

def main():
    parser = argparse.ArgumentParser(description="Parse Resume PDF to JSON")
    parser.add_argument("file_path", help="Path to the PDF file")
    args = parser.parse_args()
    
    result = parse_resume(args.file_path)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
