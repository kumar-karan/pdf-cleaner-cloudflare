import io
import pypdf
from js import Response, Headers

async def on_fetch(request, env):
    # Enable CORS headers for cross-origin frontend requests
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-File-Name",
        "Access-Control-Max-Age": "86400",
    }
    
    # Handle preflight options request
    if request.method == "OPTIONS":
        return Response.new("", headers=Headers.new(cors_headers.items()))
        
    if request.method == "POST":
        try:
            # Read raw binary upload from body
            array_buffer = await request.arrayBuffer()
            file_bytes = bytes(array_buffer.to_py())
            
            if not file_bytes:
                return Response.new("Empty file uploaded.", status=400, headers=Headers.new(cors_headers.items()))
                
            pdf_stream = io.BytesIO(file_bytes)
            reader = pypdf.PdfReader(pdf_stream)
            writer = pypdf.PdfWriter()
            
            # Clean each page of handwritten drawing layers
            path_operators = {
                b'm', b'l', b'c', b'v', b'y', b're', b'h',
                b'S', b's', b'f', b'F', b'f*', b'B', b'B*', b'b', b'b*', b'n'
            }
            
            for page in reader.pages:
                contents = page.get_contents()
                if contents:
                    new_operations = []
                    for args, op in contents.operations:
                        if op in path_operators:
                            continue
                        new_operations.append((args, op))
                    contents.operations = new_operations
                writer.add_page(page)
                
            # Output clean PDF to memory
            output_stream = io.BytesIO()
            writer.write(output_stream)
            output_bytes = output_stream.getvalue()
            
            original_size = len(file_bytes)
            cleaned_size = len(output_bytes)
            reduction = ((original_size - cleaned_size) / original_size) * 100 if original_size > 0 else 0
            
            # Get uploaded filename or default
            filename = request.headers.get("X-File-Name") or "cleaned.pdf"
            if not filename.lower().endswith(".pdf"):
                filename += ".pdf"
            else:
                filename = filename[:-4] + "_cleaned.pdf"
                
            # Build success response
            headers = dict(cors_headers)
            headers.update({
                "Content-Type": "application/pdf",
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Original-Size": str(original_size),
                "X-Cleaned-Size": str(cleaned_size),
                "X-Reduction-Percent": f"{reduction:.1f}",
                "Access-Control-Expose-Headers": "X-Original-Size, X-Cleaned-Size, X-Reduction-Percent, Content-Disposition"
            })
            
            return Response.new(output_bytes, headers=Headers.new(headers.items()))
            
        except Exception as e:
            err_headers = dict(cors_headers)
            return Response.new(f"Failed to process PDF: {str(e)}", status=500, headers=Headers.new(err_headers.items()))
            
    # Method Not Allowed
    return Response.new("Method not allowed", status=405, headers=Headers.new(cors_headers.items()))
