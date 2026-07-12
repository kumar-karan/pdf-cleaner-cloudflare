import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import Mount
import pypdf

app = FastAPI(title="PDF Annotation Remover API")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (essential for Cloudflare Pages/Workers integration)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def clean_page_content(page) -> bool:
    """
    Strips all path drawing operations from a page's content stream,
    effectively removing handwritten notes and drawings while keeping text/images.
    """
    try:
        contents = page.get_contents()
        if not contents:
            return False
            
        # PDF path-drawing and painting operators
        path_operators = {
            b'm', b'l', b'c', b'v', b'y', b're', b'h',
            b'S', b's', b'f', b'F', b'f*', b'B', b'B*', b'b', b'b*', b'n'
        }
        
        new_operations = []
        for args, op in contents.operations:
            if op in path_operators:
                continue
            new_operations.append((args, op))
            
        contents.operations = new_operations
        return True
    except Exception as e:
        print(f"Error cleaning page: {e}")
        return False

@app.post("/api/clean-pdf")
async def clean_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        # Read uploaded bytes into memory
        file_bytes = await file.read()
        pdf_stream = io.BytesIO(file_bytes)
        
        # Load PDF
        reader = pypdf.PdfReader(pdf_stream)
        writer = pypdf.PdfWriter()
        
        # Clean each page
        for page in reader.pages:
            clean_page_content(page)
            writer.add_page(page)
            
        # Write output PDF in-memory
        output_stream = io.BytesIO()
        writer.write(output_stream)
        output_bytes = output_stream.getvalue()
        
        original_size = len(file_bytes)
        cleaned_size = len(output_bytes)
        reduction = ((original_size - cleaned_size) / original_size) * 100 if original_size > 0 else 0
        
        # Create cleaned filename
        base_name = file.filename
        if base_name.lower().endswith(".pdf"):
            base_name = base_name[:-4]
        cleaned_filename = f"{base_name}_cleaned.pdf"
        
        headers = {
            "Content-Disposition": f'attachment; filename="{cleaned_filename}"',
            "X-Original-Size": str(original_size),
            "X-Cleaned-Size": str(cleaned_size),
            "X-Reduction-Percent": f"{reduction:.1f}",
            "Access-Control-Expose-Headers": "X-Original-Size, X-Cleaned-Size, X-Reduction-Percent, Content-Disposition"
        }
        
        return Response(
            content=output_bytes,
            media_type="application/pdf",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

# Fallback for local serving of frontend static files
# When deployed to Cloudflare, Pages will serve the static files, and Worker handles the API.
# But locally, the FastAPI app can serve the frontend at root.
try:
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory="static", html=True), name="static")
except Exception:
    pass
