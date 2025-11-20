from io import BytesIO
import pdfplumber

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_chunks = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            text_chunks.append(text)
    return "\n".join(text_chunks).strip()
