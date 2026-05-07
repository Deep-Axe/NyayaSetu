import time
import os
import fitz
import zipfile
import json
from sarvamai import SarvamAI
from backend.config import SARVAM_API_KEY

client = SarvamAI(api_subscription_key=SARVAM_API_KEY)

def extract_with_sarvam_di(pdf_path):
    """
    Submits a PDF to Sarvam Document Intelligence and returns the structured result using the Python SDK.
    Implements 10-page chunking to respect Sarvam's page limits.
    """
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    chunk_size = 10
    all_text = ""
    all_pages = []

    try:
        for start_page in range(0, total_pages, chunk_size):
            end_page = min(start_page + chunk_size, total_pages) - 1
            
            chunk_doc = fitz.open()
            chunk_doc.insert_pdf(doc, from_page=start_page, to_page=end_page)
            chunk_filename = f"temp_chunk_{start_page}_{end_page}.pdf"
            chunk_doc.save(chunk_filename)
            chunk_doc.close()
            
            job = client.document_intelligence.create_job(language="en-IN", output_format="md")
            job.upload_file(chunk_filename)
            job.start()
            
            # Real polling
            job.wait_until_complete()
            
            zip_filename = f"output_{start_page}_{end_page}.zip"
            job.download_output(zip_filename)
            
            # Read from zip
            with zipfile.ZipFile(zip_filename, 'r') as z:
                # Find the md and json files
                md_file = next((f for f in z.namelist() if f.endswith('.md')), None)
                json_file = next((f for f in z.namelist() if f.endswith('.json')), None)
                
                if md_file:
                    with z.open(md_file) as f:
                        all_text += f.read().decode('utf-8') + "\n"
                
                if json_file:
                    with z.open(json_file) as f:
                        page_data = json.loads(f.read().decode('utf-8'))
                        # Adjust page numbers to be absolute instead of relative to chunk
                        if "pages" in page_data:
                            for i, p in enumerate(page_data["pages"]):
                                p["page_num"] = start_page + i + 1
                                all_pages.append(p)

            # Cleanup
            if os.path.exists(chunk_filename):
                os.remove(chunk_filename)
            if os.path.exists(zip_filename):
                os.remove(zip_filename)

        doc.close()
        
    except Exception as e:
        print(f"Error with Sarvam DI: {e}")

    # Determine pdf_type using PyMuPDF
    pdf_type = "scanned"
    doc2 = fitz.open(pdf_path)
    if doc2.page_count > 0 and len(doc2[0].get_text("text").strip()) > 50:
        pdf_type = "digital"

    # Fall back to PyMuPDF text extraction if Sarvam DI returned nothing
    if not all_text.strip():
        print("Sarvam DI returned no text; falling back to PyMuPDF extraction")
        all_text = "\n".join(page.get_text("text") for page in doc2)

    doc2.close()

    return {
        "text": all_text,
        "pages": all_pages,
        "kannada_found": False,
        "pdf_type": pdf_type,
    }
