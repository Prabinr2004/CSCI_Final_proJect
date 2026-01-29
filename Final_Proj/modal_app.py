"""
Modal.com deployment configuration for Sports Fan Arena
Runs both FastAPI backend and static frontend
"""

import modal
import os
import subprocess
import signal
from pathlib import Path

# Create a Modal app
app = modal.App(name="sports-fan-arena")

# Create a persistent volume for database
data_volume = modal.Volume.from_name("sports-fan-data", create_if_missing=True)

# Create a Docker image with all dependencies
image = (
    modal.Image.debian_slim()
    .pip_install_from_requirements("requirements.txt")
    .run_commands(
        "apt-get update",
        "apt-get install -y curl sqlite3",
    )
)


@app.function(
    image=image, 
    timeout=3600, 
    concurrency_limit=10,
    volumes={"/root/data": data_volume}
)
@modal.web_endpoint(method="GET")
def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "service": "sports-fan-arena"}


@app.function(image=image, timeout=3600, concurrency_limit=10, volumes={"/root/data": data_volume})
def run_servers():
    """
    Run both backend (FastAPI on 9000) and frontend (HTTP server on 8000)
    """
    import threading
    import time
    from http.server import HTTPServer, SimpleHTTPRequestHandler
    import sys
    
    # Add current directory to Python path
    sys.path.insert(0, "/root/app")
    
    # Change to the project root
    os.chdir("/root/app")
    
    # Ensure data directory exists
    os.makedirs("backend/data", exist_ok=True)
    os.makedirs("frontend", exist_ok=True)
    
    # Set environment variables
    os.environ["DATABASE_PATH"] = "./backend/data/fan_engagement.db"
    os.environ["OPENROUTER_API_KEY"] = os.getenv("OPENROUTER_API_KEY", "")
    
    print("✅ Starting Sports Fan Arena servers...")
    
    # Start backend server in a separate thread
    def run_backend():
        try:
            print("🚀 Starting FastAPI backend on port 9000...")
            import uvicorn
            from backend.app.main import app as fastapi_app
            
            uvicorn.run(
                fastapi_app,
                host="0.0.0.0",
                port=9000,
                log_level="info"
            )
        except Exception as e:
            print(f"❌ Backend error: {e}")
    
    # Start frontend server in a separate thread
    def run_frontend():
        try:
            print("🚀 Starting frontend HTTP server on port 8000...")
            os.chdir("/root/app/frontend")
            
            class CORSHTTPRequestHandler(SimpleHTTPRequestHandler):
                def end_headers(self):
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                    self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
                    super().end_headers()
                
                def do_OPTIONS(self):
                    self.send_response(200)
                    self.end_headers()
                
                def log_message(self, format, *args):
                    print(f"Frontend: {format % args}")
            
            server = HTTPServer(('0.0.0.0', 8000), CORSHTTPRequestHandler)
            print("✅ Frontend server listening on port 8000")
            server.serve_forever()
        except Exception as e:
            print(f"❌ Frontend error: {e}")
    
    # Create threads
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    frontend_thread = threading.Thread(target=run_frontend, daemon=True)
    
    # Start both servers
    backend_thread.start()
    frontend_thread.start()
    
    print("✅ Both servers started!")
    print("🌐 Frontend: http://localhost:8000")
    print("📡 Backend API: http://localhost:9000")
    
    # Keep the servers running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("⏹️ Shutting down servers...")


@app.function(image=image, timeout=3600)
def start_app():
    """
    Main entry point - mounts volume and runs servers
    """
    print("📦 Initializing Sports Fan Arena...")
    run_servers()


# Modal CLI entry point
@app.local_entrypoint()
def main():
    """
    Deploy and run the application
    Usage: modal run modal_app.py
    """
    print("🚀 Deploying Sports Fan Arena to Modal...")
    print("This will start both the FastAPI backend and static frontend servers.")
    
    # Run the app
    run_servers.remote()
