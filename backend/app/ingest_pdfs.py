import os
import sys

# Add the parent directory (backend root) to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from app.services.supabase_client import supabase_admin
from app.config import settings


# 1. Setup paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDFS_DIR = os.path.join(BASE_DIR, "knowledge_base", "pdfs")

# Ensure the pdfs folder exists
os.makedirs(PDFS_DIR, exist_ok=True)

# 2. Chunking configuration
CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

def get_text_chunks(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
    """Splits a string of text into chunks of chunk_size with overlap."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += (chunk_size - overlap)
    return chunks

def main():
    print("[Ingestion] Checking for PDF documents to ingest...")
    
    # Get all PDF files
    pdf_files = [f for f in os.listdir(PDFS_DIR) if f.endswith(".pdf")]
    
    if not pdf_files:
        print(f"[Ingestion] No PDFs found. Please drop your PCOS PDFs in: {PDFS_DIR}")
        return

    # Load local embedding model
    print("[Ingestion] Loading sentence-transformer model (all-mpnet-base-v2)...")
    model = SentenceTransformer("all-mpnet-base-v2")
    
    for pdf_file in pdf_files:
        pdf_path = os.path.join(PDFS_DIR, pdf_file)
        print(f"\n[Ingestion] Processing '{pdf_file}'...")
        
        try:
            reader = PdfReader(pdf_path)
            full_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    full_text.append(text)
            
            raw_text = "\n".join(full_text)
            if not raw_text.strip():
                print(f"[WARNING] No text could be extracted from {pdf_file}. Skipping.")
                continue
                
            chunks = get_text_chunks(raw_text)
            print(f"[Ingestion] Split '{pdf_file}' into {len(chunks)} chunks.")
            
            # Generate embeddings
            print("[Ingestion] Generating vector embeddings...")
            embeddings = model.encode(chunks, show_progress_bar=True)
            
            # Save to Supabase
            rows = []
            for chunk, emb in zip(chunks, embeddings):
                rows.append({
                    "content": chunk.strip(),
                    "embedding": emb.tolist(),
                    "source": pdf_file
                })
            
            print(f"[Ingestion] Upserting to Supabase table 'documents'...")
            # Delete old chunks for this file to avoid duplicates
            supabase_admin.table("documents").delete().eq("source", pdf_file).execute()
            
            # Insert new chunks
            res = supabase_admin.table("documents").insert(rows).execute()
            print(f"[OK] Successfully ingested '{pdf_file}'! Chunks saved: {len(res.data)}")
            
        except Exception as e:
            print(f"[ERROR] Failed to process {pdf_file}: {e}")

if __name__ == "__main__":
    main()
