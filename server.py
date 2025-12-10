#!/usr/bin/env python3
"""
Custom HTTP server for twodo app that supports:
- Serving static files
- POST endpoint to save default.json
"""
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, unquote
import sys

PORT = 8000
if len(sys.argv) > 1:
    PORT = int(sys.argv[1])

class TwodoHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.request_path = None
        super().__init__(*args, **kwargs)
    
    def log_message(self, format, *args):
        """Override to log all requests for debugging"""
        print(f"{self.address_string()} - {format % args}")
    
    def do_POST(self):
        """Handle POST requests"""
        print("=" * 50)
        print("POST METHOD CALLED!")
        print(f"Path: {self.path}")
        print(f"Command: {self.command}")
        print("=" * 50)
        
        # Parse path to handle query parameters
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        print(f"POST request received: path={path}, full_path={self.path}, method={self.command}")
        print(f"Headers: {dict(self.headers)}")
        
        if path == '/files/save' or path == '/files/save-as':
            try:
                script_dir = os.path.dirname(os.path.abspath(__file__))
                saved_files_dir = os.path.join(script_dir, 'saved_files')
                os.makedirs(saved_files_dir, exist_ok=True)
                
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    raise ValueError("No content length specified")
                
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                filename = data.get('filename', '')
                file_data = data.get('data', {})
                
                if not filename:
                    raise ValueError("Filename is required")
                
                # Sanitize filename
                filename = os.path.basename(filename)
                filename = ''.join(c for c in filename if c.isalnum() or c in '.-_')
                if not filename.endswith('.json'):
                    filename += '.json'
                
                file_path = os.path.join(saved_files_dir, filename)
                
                # Save file
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(file_data, f, indent=2, ensure_ascii=False)
                
                print(f"File saved successfully: {filename}")
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': f'File saved as {filename}', 'filename': filename}).encode('utf-8'))
                
            except Exception as e:
                import traceback
                print(f"Error saving file: {e}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        elif path == '/save-audio':
            try:
                # Get the directory where this script is located
                script_dir = os.path.dirname(os.path.abspath(__file__))
                audio_dir = os.path.join(script_dir, 'recordings')
                
                # Create recordings directory if it doesn't exist
                os.makedirs(audio_dir, exist_ok=True)
                
                # Read the request body
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    raise ValueError("No content length specified")
                
                # Parse multipart/form-data
                content_type = self.headers.get('Content-Type', '')
                if 'multipart/form-data' not in content_type:
                    raise ValueError("Expected multipart/form-data")
                
                # Extract boundary
                boundary_str = None
                for part in content_type.split(';'):
                    part = part.strip()
                    if part.startswith('boundary='):
                        boundary_str = part[len('boundary='):].strip('"')
                        break
                
                if not boundary_str:
                    raise ValueError("No boundary found in Content-Type")
                
                boundary = ('--' + boundary_str).encode()
                
                # Read the entire body
                post_data = self.rfile.read(content_length)
                
                # Parse multipart data
                parts = post_data.split(boundary)
                
                filename = None
                audio_data = None
                
                for part in parts:
                    if b'Content-Disposition' in part:
                        # Extract filename
                        if b'filename=' in part:
                            # Find filename in the part
                            filename_match_start = part.find(b'filename="')
                            if filename_match_start != -1:
                                filename_start = filename_match_start + len(b'filename="')
                                filename_end = part.find(b'"', filename_start)
                                if filename_end != -1:
                                    filename = part[filename_start:filename_end].decode('utf-8', errors='ignore')
                        
                        # Extract audio data (after the headers, before the next boundary)
                        header_end = part.find(b'\r\n\r\n')
                        if header_end != -1:
                            audio_data = part[header_end + 4:]
                            # Remove trailing CRLF and boundary markers
                            while audio_data.endswith(b'\r\n') or audio_data.endswith(b'--'):
                                if audio_data.endswith(b'\r\n--'):
                                    audio_data = audio_data[:-4]
                                elif audio_data.endswith(b'--'):
                                    audio_data = audio_data[:-2]
                                elif audio_data.endswith(b'\r\n'):
                                    audio_data = audio_data[:-2]
                                else:
                                    break
                
                if not filename:
                    # Generate filename if not provided
                    import datetime
                    timestamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
                    filename = f'recording-{timestamp}.webm'
                
                if not audio_data or len(audio_data) == 0:
                    raise ValueError("Failed to extract audio data from multipart form")
                
                # Sanitize filename
                filename = os.path.basename(filename)  # Prevent directory traversal
                # Remove any dangerous characters
                filename = ''.join(c for c in filename if c.isalnum() or c in '.-_')
                if not filename.endswith('.webm'):
                    filename += '.webm'
                
                # Save audio file
                audio_path = os.path.join(audio_dir, filename)
                with open(audio_path, 'wb') as f:
                    f.write(audio_data)
                
                print(f"Audio saved successfully: {filename} ({len(audio_data)} bytes)")
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': f'Audio saved as {filename}', 'filename': filename}).encode('utf-8'))
                
            except Exception as e:
                # Log error for debugging
                import traceback
                print(f"Error saving audio: {e}")
                traceback.print_exc()
                # Send error response
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        elif path == '/save-default.json':
            try:
                # Get the directory where this script is located
                script_dir = os.path.dirname(os.path.abspath(__file__))
                default_json_path = os.path.join(script_dir, 'default.json')
                
                # Read the request body
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    raise ValueError("No content length specified")
                post_data = self.rfile.read(content_length)
                
                # Parse JSON
                data = json.loads(post_data.decode('utf-8'))
                
                # Write to default.json
                with open(default_json_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': 'default.json saved successfully'}).encode('utf-8'))
                
            except Exception as e:
                # Log error for debugging
                import traceback
                print(f"Error saving default.json: {e}")
                traceback.print_exc()
                # Send error response
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        elif path == '/files/buffer/save':
            try:
                script_dir = os.path.dirname(os.path.abspath(__file__))
                saved_files_dir = os.path.join(script_dir, 'saved_files')
                buffers_dir = os.path.join(saved_files_dir, 'buffers')
                os.makedirs(buffers_dir, exist_ok=True)
                
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    raise ValueError("No content length specified")
                
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                filename = data.get('filename', '')
                buffer_data = data.get('buffer', {})
                
                if not filename:
                    raise ValueError("Filename is required")
                
                # Sanitize filename
                filename = os.path.basename(filename)
                filename = ''.join(c for c in filename if c.isalnum() or c in '.-_')
                if not filename.endswith('.json'):
                    filename += '.json'
                
                file_path = os.path.join(buffers_dir, filename)
                
                # Save buffer file
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(buffer_data, f, indent=2, ensure_ascii=False)
                
                print(f"Buffer file saved successfully: {filename}")
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'filename': filename}).encode('utf-8'))
                
            except Exception as e:
                import traceback
                print(f"Error saving buffer file: {e}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        else:
            # Log 404 for debugging
            print(f"POST request to unknown path: {path}")
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': f'Path not found: {path}'}).encode('utf-8'))
    
    def do_GET(self):
        """Handle GET requests (serve static files)"""
        # Handle favicon.ico requests to avoid 404 errors
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/favicon.ico':
            # Return 204 No Content to suppress the error
            self.send_response(204)
            self.end_headers()
            return
        
        # Handle file management endpoints
        if path == '/files':
            try:
                script_dir = os.path.dirname(os.path.abspath(__file__))
                saved_files_dir = os.path.join(script_dir, 'saved_files')
                os.makedirs(saved_files_dir, exist_ok=True)
                
                # List all JSON files
                files = []
                if os.path.exists(saved_files_dir):
                    for filename in os.listdir(saved_files_dir):
                        if filename.endswith('.json'):
                            file_path = os.path.join(saved_files_dir, filename)
                            stat = os.stat(file_path)
                            files.append({
                                'filename': filename,
                                'size': stat.st_size,
                                'modified': stat.st_mtime
                            })
                
                # Sort by modified time (newest first)
                files.sort(key=lambda x: x['modified'], reverse=True)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'files': files}).encode('utf-8'))
                return
                
            except Exception as e:
                import traceback
                print(f"Error listing files: {e}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
                return
        
        elif path.startswith('/files/buffer/'):
            try:
                # Extract filename from path
                filename = path[14:]  # Remove '/files/buffer/' (14 characters)
                filename = unquote(filename)  # Decode URL-encoded filename
                filename = os.path.basename(filename)  # Prevent directory traversal
                filename = ''.join(c for c in filename if c.isalnum() or c in '.-_')
                
                if not filename.endswith('.json'):
                    filename += '.json'
                
                script_dir = os.path.dirname(os.path.abspath(__file__))
                saved_files_dir = os.path.join(script_dir, 'saved_files')
                buffers_dir = os.path.join(saved_files_dir, 'buffers')
                file_path = os.path.join(buffers_dir, filename)
                
                if not os.path.exists(file_path):
                    # Buffer doesn't exist yet (first time opening file) - create it with empty buffer
                    # This prevents console errors and ensures the file exists for future loads
                    empty_buffer = {
                        'undoStack': [],
                        'redoStack': [],
                        'snapshots': [],
                        'lastChangeIndex': 0
                    }
                    
                    # Create the buffers directory if it doesn't exist
                    os.makedirs(buffers_dir, exist_ok=True)
                    
                    # Write the empty buffer file
                    try:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            json.dump(empty_buffer, f, indent=2)
                        print(f"Created new buffer file: {filename}")
                    except Exception as e:
                        print(f"Error creating buffer file {filename}: {e}")
                        # Still return the empty buffer even if file creation fails
                    
                    # Return the empty buffer
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'success': True,
                        'buffer': empty_buffer
                    }).encode('utf-8'))
                    return
                
                # Read and return buffer file
                with open(file_path, 'r', encoding='utf-8') as f:
                    buffer_data = json.load(f)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'buffer': buffer_data}).encode('utf-8'))
                return
                
            except Exception as e:
                import traceback
                print(f"Error loading buffer file: {e}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
                return
        elif path.startswith('/files/'):
            try:
                # Extract filename from path
                filename = path[7:]  # Remove '/files/'
                filename = os.path.basename(filename)  # Prevent directory traversal
                filename = ''.join(c for c in filename if c.isalnum() or c in '.-_')
                
                if not filename.endswith('.json'):
                    filename += '.json'
                
                script_dir = os.path.dirname(os.path.abspath(__file__))
                saved_files_dir = os.path.join(script_dir, 'saved_files')
                file_path = os.path.join(saved_files_dir, filename)
                
                if not os.path.exists(file_path):
                    self.send_response(404)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': 'File not found'}).encode('utf-8'))
                    return
                
                # Read and return file
                with open(file_path, 'r', encoding='utf-8') as f:
                    file_data = json.load(f)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'data': file_data, 'filename': filename}).encode('utf-8'))
                return
                
            except Exception as e:
                import traceback
                print(f"Error loading file: {e}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
                return
        
        # Store the original path
        self.request_path = self.path
        
        # Add cache-busting query parameter handling for default.json
        if self.path.startswith('/default.json'):
            # Remove query parameters for file lookup
            parsed_path = urlparse(self.path)
            self.path = parsed_path.path
            
        return super().do_GET()
    
    def end_headers(self):
        """Add CORS headers and cache control to all responses"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Content-Length')
        
        # Add no-cache headers for HTML, CSS, and JS files to prevent caching
        path = self.request_path or self.path
        if path.endswith(('.html', '.css', '.js', '.json')) or path == '/' or path == '/index.html' or path == '':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight"""
        print(f"OPTIONS request received: path={self.path}")
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Content-Length')
        self.send_header('Access-Control-Max-Age', '86400')
        self.end_headers()
    
    def do_PUT(self):
        """Handle PUT requests for file rename"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path.startswith('/files/') and path.endswith('/rename'):
            try:
                # Extract filename from path
                filename = path[7:-7]  # Remove '/files/' and '/rename'
                filename = os.path.basename(filename)
                filename = ''.join(c for c in filename if c.isalnum() or c in '.-_')
                if not filename.endswith('.json'):
                    filename += '.json'
                
                script_dir = os.path.dirname(os.path.abspath(__file__))
                saved_files_dir = os.path.join(script_dir, 'saved_files')
                old_file_path = os.path.join(saved_files_dir, filename)
                
                if not os.path.exists(old_file_path):
                    self.send_response(404)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': 'File not found'}).encode('utf-8'))
                    return
                
                # Read new filename from body
                content_length = int(self.headers.get('Content-Length', 0))
                if content_length == 0:
                    raise ValueError("No content length specified")
                
                put_data = self.rfile.read(content_length)
                data = json.loads(put_data.decode('utf-8'))
                new_filename = data.get('filename', '')
                
                if not new_filename:
                    raise ValueError("New filename is required")
                
                # Sanitize new filename
                new_filename = os.path.basename(new_filename)
                new_filename = ''.join(c for c in new_filename if c.isalnum() or c in '.-_')
                if not new_filename.endswith('.json'):
                    new_filename += '.json'
                
                new_file_path = os.path.join(saved_files_dir, new_filename)
                
                # Check if new filename already exists
                if os.path.exists(new_file_path) and new_filename != filename:
                    self.send_response(409)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': 'File already exists'}).encode('utf-8'))
                    return
                
                # Rename file
                os.rename(old_file_path, new_file_path)
                
                print(f"File renamed: {filename} -> {new_filename}")
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': f'File renamed to {new_filename}', 'filename': new_filename}).encode('utf-8'))
                return
                
            except Exception as e:
                import traceback
                print(f"Error renaming file: {e}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
                return
        else:
            self.send_response(405)
            self.send_header('Allow', 'GET, POST, PUT, DELETE, OPTIONS')
            self.end_headers()
    
    def do_DELETE(self):
        """Handle DELETE requests for file deletion"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path.startswith('/files/'):
            try:
                # Extract filename from path
                filename = path[7:]  # Remove '/files/'
                filename = os.path.basename(filename)
                filename = ''.join(c for c in filename if c.isalnum() or c in '.-_')
                if not filename.endswith('.json'):
                    filename += '.json'
                
                script_dir = os.path.dirname(os.path.abspath(__file__))
                saved_files_dir = os.path.join(script_dir, 'saved_files')
                file_path = os.path.join(saved_files_dir, filename)
                
                if not os.path.exists(file_path):
                    self.send_response(404)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': 'File not found'}).encode('utf-8'))
                    return
                
                # Delete file
                os.remove(file_path)
                
                print(f"File deleted: {filename}")
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'message': f'File {filename} deleted'}).encode('utf-8'))
                return
                
            except Exception as e:
                import traceback
                print(f"Error deleting file: {e}")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
                return
        else:
            self.send_response(405)
            self.send_header('Allow', 'GET, POST, PUT, DELETE, OPTIONS')
            self.end_headers()

def main():
    """Start the server"""
    # Change to the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    with socketserver.TCPServer(("0.0.0.0", PORT), TwodoHandler) as httpd:
        print(f"Starting server on http://localhost:{PORT}")
        print(f"Using TwodoHandler - POST endpoint: /save-default.json")
        
        # Get local IP for LAN access
        import socket
        local_ips = []
        tailscale_ip = None
        
        try:
            # Try to get a better IP (not localhost) by connecting to external address
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            if local_ip and local_ip != '127.0.0.1':
                local_ips.append(local_ip)
        except Exception:
            pass
        
        # Fallback: try hostname
        try:
            hostname = socket.gethostname()
            host_ip = socket.gethostbyname(hostname)
            if host_ip and host_ip != '127.0.0.1' and host_ip not in local_ips:
                local_ips.append(host_ip)
        except Exception:
            pass
        
        # Check for Tailscale IP (typically 100.x.x.x)
        try:
            import subprocess
            result = subprocess.run(['tailscale', 'ip'], capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                tailscale_ip = result.stdout.strip().split('\n')[0]
                if tailscale_ip and tailscale_ip.startswith('100.'):
                    print(f"Accessible via Tailscale at http://{tailscale_ip}:{PORT}")
        except Exception:
            pass
        
        # Print LAN IPs
        for ip in local_ips:
            print(f"Accessible on LAN at http://{ip}:{PORT}")
        
        if not tailscale_ip and not local_ips:
            print("Note: To access from remote devices, use Tailscale VPN or set up port forwarding")
        
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
        except Exception as e:
            print(f"\nServer error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # Ensure server is properly shut down
            httpd.shutdown()
            httpd.server_close()

if __name__ == "__main__":
    main()

