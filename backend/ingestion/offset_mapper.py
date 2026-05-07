import fitz

def map_offsets(pdf_path, sarvam_result):
    """
    Maps Sarvam's text blocks back to PyMuPDF character offsets for digital PDFs.
    For scanned PDFs, character offsets are left as None.
    """
    is_digital = sarvam_result.get("pdf_type") == "digital"
    
    if is_digital:
        doc = fitz.open(pdf_path)
    
    for page_data in sarvam_result.get("pages", []):
        page_num = page_data["page_num"]
        
        if is_digital and page_num <= len(doc):
            page = doc[page_num - 1]
            page_text = page.get_text("text")
            
        for block in page_data.get("blocks", []):
            text = block.get("text", "")
            block["page"] = page_num
            block["char_start"] = None
            block["char_end"] = None
            
            # Remove old bbox if it exists (as per roadmap, we use char offsets or page-level)
            if "bbox" in block:
                del block["bbox"]
                
            if is_digital and page_num <= len(doc):
                # Simple offset mapping using str.find() on PyMuPDF's full page text
                idx = page_text.find(text)
                if idx != -1:
                    block["char_start"] = idx
                    block["char_end"] = idx + len(text)

    if is_digital:
        doc.close()

    return sarvam_result
