from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uvicorn
import jwt
import datetime
import json

app = FastAPI(title="ClabUI CORS Relay")

# Enable CORS for the local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/relay")
async def relay_request(request: Request):
    """
    Relays a request to a target remote Containerlab API.
    Handles JWT generation if Authorization header starts with 'secret:'
    """
    try:
        payload = await request.json()
        target_url = payload.get("url")
        method = payload.get("method", "POST")
        data = payload.get("data")
        headers = payload.get("headers", {})

        # Extract the intended Linux user from our custom header
        clab_user = headers.get("X-Clab-User", "root")

        print(f"\n--- Relay Request ---")
        print(f"Target URL: {target_url}")
        print(f"User: {clab_user}")

        # Handle special 'secret:' prefix to generate JWT automatically
        auth_header = headers.get("Authorization", "")
        if auth_header.startswith("Bearer secret:"):
            secret = auth_header.replace("Bearer secret:", "").strip()
            print(f"Signing JWT for user '{clab_user}' with secret")
            
            # Generate JWT token
            token_payload = {
                "username": clab_user,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }
            token = jwt.encode(token_payload, secret, algorithm="HS256")
            
            # In some PyJWT versions encode returns bytes
            if isinstance(token, bytes):
                token = token.decode('utf-8')
                
            headers["Authorization"] = f"Bearer {token}"

        if not target_url:
            raise HTTPException(status_code=400, detail="Missing target url")

        # Remove the custom header before relaying to the real API
        if "X-Clab-User" in headers:
            del headers["X-Clab-User"]

        async with httpx.AsyncClient(timeout=300.0) as client:
            if method == "POST":
                response = await client.post(target_url, json=data, headers=headers)
            elif method == "DELETE":
                response = await client.delete(target_url, headers=headers)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")

            print(f"Remote Response Status: {response.status_code}")
            
            # Return the remote response
            return {
                "status": response.status_code,
                "data": response.json() if response.content else None,
                "text": response.text if not response.content else ""
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Relay Error: {str(e)}")
        return {"status": 500, "error": str(e)}

import os
import glob

# ... (imports)

@app.get("/templates")
async def list_templates():
    """
    Lists all available .clab.yaml or .clab.yml files in the templates directory.
    """
    templates_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
    if not os.path.exists(templates_dir):
        return []

    files = glob.glob(os.path.join(templates_dir, "*.clab.yaml")) + \
            glob.glob(os.path.join(templates_dir, "*.clab.yml")) + \
            glob.glob(os.path.join(templates_dir, "*.yaml")) + \
            glob.glob(os.path.join(templates_dir, "*.yml"))
    
    # Filter out duplicates just in case (e.g. if file matches *clab.yaml and *.yaml)
    unique_files = list(set([os.path.basename(f) for f in files]))
    return sorted(unique_files)

@app.get("/templates/{filename}")
async def get_template(filename: str):
    """
    Returns the content of a specific template file.
    """
    # Security check to prevent directory traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    templates_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
    file_path = os.path.join(templates_dir, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Template not found")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Check for documentation file (try .md, .clab.md)
    # Strategy: remove extension from known types and try adding .md / .clab.md
    # Or simply: if file is X.clab.yml, look for X.clab.md
    
    doc_content = ""
    
    # Try exact replace of extension
    base_name = os.path.splitext(filename)[0]
    possible_docs = [
        base_name + ".md",
        base_name + ".clab.md"
    ]
    
    # Also handle the .clab.yaml case where splitext might leave .clab
    if filename.endswith(".clab.yaml") or filename.endswith(".clab.yml"):
        simple_name = filename.replace(".clab.yaml", "").replace(".clab.yml", "")
        possible_docs.append(simple_name + ".clab.md")
        possible_docs.append(simple_name + ".md")

    # If the user saved as .clab.md specifically (like lab01-single-host.clab.md) matching lab01-single-host.clab.yml
    # Let's just check for variations
    
    for doc_name in possible_docs:
        doc_path = os.path.join(templates_dir, doc_name)
        if os.path.exists(doc_path):
             with open(doc_path, "r", encoding="utf-8") as f:
                doc_content = f.read()
             break

    return {"filename": filename, "content": content, "doc": doc_content}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
