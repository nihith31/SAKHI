import io
from pathlib import Path

# Optional imports with graceful fallback
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    from pypdf import PdfReader
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False


class OCRService:
    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extract text from a PDF file using pypdf."""
        if not PYPDF_AVAILABLE:
            return "[PDF parsing unavailable: pypdf not installed]"
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            all_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    all_text.append(text.strip())
            result = "\n".join(all_text)
            return result if result.strip() else "[No readable text found in PDF]"
        except Exception as e:
            return f"[PDF extraction error: {str(e)}]"

    def extract_text_from_image(self, file_bytes: bytes) -> str:
        """Extract text from an image file using pytesseract OCR."""
        if not TESSERACT_AVAILABLE:
            return (
                "[Image OCR unavailable: pytesseract/Tesseract not installed. "
                "Please install Tesseract from: https://github.com/tesseract-ocr/tesseract]"
            )
        try:
            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image)
            return text.strip() if text.strip() else "[No readable text found in image]"
        except Exception as e:
            return f"[Image OCR error: {str(e)}]"

    def extract_text(self, file_bytes: bytes, filename: str) -> str:
        """Auto-detect file type and extract text."""
        filename_lower = filename.lower()
        if filename_lower.endswith(".pdf"):
            return self.extract_text_from_pdf(file_bytes)
        elif filename_lower.endswith((".jpg", ".jpeg", ".png", ".bmp", ".tiff")):
            return self.extract_text_from_image(file_bytes)
        else:
            return f"[Unsupported file format: {Path(filename).suffix}. Please upload a PDF or image file (JPG/PNG).]"


ocr_service = OCRService()
