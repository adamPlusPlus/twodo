#!/usr/bin/env python3
"""
WebSocket server for real-time synchronization and undo/redo support
"""
import asyncio
import websockets
import json
import os
from datetime import datetime
from collections import defaultdict
import threading

class SyncServer:
    def __init__(self, port=8001):
        self.port = port
        self.clients = {}  # {client_id: websocket}
        self.file_sessions = defaultdict(dict)  # {filename: {client_id: session_info}}
        self.change_history = defaultdict(list)  # {filename: [changes]}
        self.file_data = {}  # {filename: current_data}
        self.client_files = defaultdict(set)  # {client_id: {filenames}}
        self.operation_logs = defaultdict(list)  # {filename: [operations]}
        self.operation_sequences = defaultdict(int)  # {filename: last_sequence}
        
    async def register_client(self, websocket, path=None):
        """Register a new client connection"""
        client_id = f"client_{id(websocket)}"
        self.clients[client_id] = websocket
        # Try to get path from websocket object if not provided
        if path is None:
            path = getattr(websocket, 'path', None) or getattr(websocket, 'request_path', None)
        print(f"Client connected: {client_id} (path: {path})")
        
        try:
            await websocket.send(json.dumps({
                'type': 'connected',
                'clientId': client_id
            }))
            
            async for message in websocket:
                await self.handle_message(client_id, message)
        except websockets.exceptions.ConnectionClosed:
            print(f"Client {client_id} connection closed normally")
        except Exception as e:
            print(f"Error in client {client_id} connection: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await self.unregister_client(client_id)
    
    async def unregister_client(self, client_id):
        """Unregister a client and clean up their sessions"""
        if client_id in self.clients:
            del self.clients[client_id]
        
        # Remove client from all file sessions
        for filename in list(self.client_files[client_id]):
            if filename in self.file_sessions:
                if client_id in self.file_sessions[filename]:
                    del self.file_sessions[filename][client_id]
                if not self.file_sessions[filename]:
                    del self.file_sessions[filename]
        
        del self.client_files[client_id]
        print(f"Client disconnected: {client_id}")
    
    async def handle_message(self, client_id, message):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'join_file':
                await self.handle_join_file(client_id, data)
            elif msg_type == 'leave_file':
                await self.handle_leave_file(client_id, data)
            elif msg_type == 'full_sync':
                await self.handle_full_sync(client_id, data)
            elif msg_type == 'change':
                await self.handle_change(client_id, data)
            elif msg_type == 'undo':
                await self.handle_undo(client_id, data)
            elif msg_type == 'redo':
                await self.handle_redo(client_id, data)
            elif msg_type == 'get_history':
                await self.handle_get_history(client_id, data)
            elif msg_type == 'operation_sync':
                await self.handle_operation_sync(client_id, data)
            elif msg_type == 'request_operations':
                await self.handle_request_operations(client_id, data)
        except json.JSONDecodeError:
            print(f"Invalid JSON from {client_id}")
        except Exception as e:
            print(f"Error handling message from {client_id}: {e}")
    
    async def handle_join_file(self, client_id, data):
        """Handle client joining a file session"""
        filename = data.get('filename')
        if not filename:
            return
        
        # Add client to file session
        if filename not in self.file_sessions:
            self.file_sessions[filename] = {}
        
        self.file_sessions[filename][client_id] = {
            'joined': datetime.now().isoformat(),
            'cursor': data.get('cursor')
        }
        self.client_files[client_id].add(filename)
        
        # Load file data if not already loaded
        if filename not in self.file_data:
            await self.load_file_data(filename)
        
        # Get timestamp from file data or use current time
        file_data = self.file_data.get(filename, {})
        file_timestamp = file_data.get('_lastSyncTimestamp', datetime.now().timestamp() * 1000)
        
        # Send current file state to client
        await self.send_to_client(client_id, {
            'type': 'file_joined',
            'filename': filename,
            'data': file_data,
            'timestamp': file_timestamp,
            'history': self.change_history.get(filename, [])[-50:],  # Last 50 changes
            'lastOperationSequence': self.operation_sequences.get(filename, 0)  # Include last operation sequence
        })
        
        # If operation log exists, send recent operations for catch-up
        if filename in self.operation_logs and len(self.operation_logs[filename]) > 0:
            # Send last 100 operations (or all if less than 100)
            recent_operations = self.operation_logs[filename][-100:]
            if recent_operations:
                await self.send_to_client(client_id, {
                    'type': 'operations_response',
                    'filename': filename,
                    'operations': recent_operations,
                    'lastSequence': self.operation_sequences[filename]
                })
        
        # Notify other clients
        await self.broadcast_to_file(filename, client_id, {
            'type': 'client_joined',
            'clientId': client_id,
            'filename': filename
        })
    
    async def handle_leave_file(self, client_id, data):
        """Handle client leaving a file session"""
        filename = data.get('filename')
        if filename and filename in self.file_sessions:
            if client_id in self.file_sessions[filename]:
                del self.file_sessions[filename][client_id]
            if not self.file_sessions[filename]:
                del self.file_sessions[filename]
        
        if filename in self.client_files[client_id]:
            self.client_files[client_id].remove(filename)
        
        # Notify other clients
        await self.broadcast_to_file(filename, client_id, {
            'type': 'client_left',
            'clientId': client_id,
            'filename': filename
        })
    
    async def handle_full_sync(self, client_id, data):
        """Handle full data sync from a client"""
        filename = data.get('filename')
        sync_data = data.get('data')
        timestamp = data.get('timestamp', datetime.now().timestamp() * 1000)  # Use provided timestamp or current time
        
        if not filename or not sync_data:
            return
        
        # Check if this update is newer than what we have
        current_timestamp = self.file_data.get(filename, {}).get('_lastSyncTimestamp', 0)
        if timestamp < current_timestamp:
            print(f"Ignoring older sync for {filename} (received: {timestamp}, current: {current_timestamp})")
            return
        
        # Update file data with timestamp
        sync_data['_lastSyncTimestamp'] = timestamp
        self.file_data[filename] = sync_data
        
        # Broadcast to all other clients in this file session (exclude sender)
        await self.broadcast_to_file(filename, client_id, {
            'type': 'full_sync',
            'filename': filename,
            'data': sync_data,
            'timestamp': timestamp,
            'clientId': client_id  # Include client ID so receivers can ignore their own messages
        })
        
        # Save file to disk
        await self.save_file_data(filename)
    
    async def handle_change(self, client_id, data):
        """Handle a change from a client"""
        filename = data.get('filename')
        change = data.get('change')
        
        if not filename or not change:
            return
        
        # Add timestamp and client ID to change
        change['timestamp'] = datetime.now().isoformat()
        change['clientId'] = client_id
        change['changeId'] = f"{client_id}_{datetime.now().timestamp()}"
        
        # Apply change to file data
        await self.apply_change(filename, change)
        
        # Add to history
        if filename not in self.change_history:
            self.change_history[filename] = []
        self.change_history[filename].append(change)
        
        # Keep only last 1000 changes per file
        if len(self.change_history[filename]) > 1000:
            self.change_history[filename] = self.change_history[filename][-1000:]
        
        # Broadcast to all other clients in this file
        await self.broadcast_to_file(filename, client_id, {
            'type': 'change',
            'filename': filename,
            'change': change
        })
        
        # Save file to disk
        await self.save_file_data(filename)
    
    async def handle_undo(self, client_id, data):
        """Handle undo request"""
        filename = data.get('filename')
        if not filename or filename not in self.change_history:
            return
        
        history = self.change_history[filename]
        if not history:
            return
        
        # Find last change by this client
        for i in range(len(history) - 1, -1, -1):
            change = history[i]
            if change.get('clientId') == client_id and not change.get('undone'):
                # Mark as undone
                change['undone'] = True
                change['undoneAt'] = datetime.now().isoformat()
                
                # Revert the change
                await self.revert_change(filename, change)
                
                # Broadcast undo
                await self.broadcast_to_file(filename, None, {
                    'type': 'undo',
                    'filename': filename,
                    'changeId': change['changeId']
                })
                
                await self.save_file_data(filename)
                break
    
    async def handle_redo(self, client_id, data):
        """Handle redo request"""
        filename = data.get('filename')
        change_id = data.get('changeId')
        
        if not filename or filename not in self.change_history:
            return
        
        # Find the undone change
        for change in reversed(self.change_history[filename]):
            if change.get('changeId') == change_id and change.get('undone'):
                # Unmark as undone
                change.pop('undone', None)
                change.pop('undoneAt', None)
                
                # Re-apply the change
                await self.apply_change(filename, change)
                
                # Broadcast redo
                await self.broadcast_to_file(filename, None, {
                    'type': 'redo',
                    'filename': filename,
                    'changeId': change['changeId']
                })
                
                await self.save_file_data(filename)
                break
    
    async def handle_get_history(self, client_id, data):
        """Send change history to client"""
        filename = data.get('filename')
        if filename and filename in self.change_history:
            await self.send_to_client(client_id, {
                'type': 'history',
                'filename': filename,
                'history': self.change_history[filename]
            })
    
    async def apply_change(self, filename, change):
        """Apply a change to file data"""
        if filename not in self.file_data:
            await self.load_file_data(filename)
        
        change_type = change.get('type')
        path = change.get('path', [])
        value = change.get('value')
        old_value = change.get('oldValue')
        
        # Navigate to the target in the data structure
        target = self.file_data[filename]
        for key in path[:-1]:
            # Handle both dict and list navigation
            if isinstance(target, dict):
                if key not in target:
                    # Determine if next key is numeric (list) or string (dict)
                    next_key_idx = path.index(key) + 1
                    if next_key_idx < len(path):
                        next_key = path[next_key_idx]
                        target[key] = [] if isinstance(next_key, int) or (isinstance(next_key, str) and next_key.isdigit()) else {}
                    else:
                        target[key] = {}
                target = target[key]
            elif isinstance(target, list):
                # Convert key to integer for list access
                try:
                    idx = int(key) if isinstance(key, str) else key
                    if idx < 0 or idx >= len(target):
                        raise IndexError(f"Index {idx} out of range for list of length {len(target)}")
                    target = target[idx]
                except (ValueError, IndexError, TypeError) as e:
                    print(f"Error navigating path: key={key}, type={type(key)}, target_type={type(target)}, error={e}")
                    return
            else:
                print(f"Error: target is neither dict nor list: {type(target)}")
                return
        
        # Store old value if not already stored
        last_key = path[-1]
        if 'oldValue' not in change:
            if isinstance(target, dict):
                change['oldValue'] = target.get(last_key)
            elif isinstance(target, list):
                try:
                    idx = int(last_key) if isinstance(last_key, str) else last_key
                    if 0 <= idx < len(target):
                        change['oldValue'] = target[idx]
                    else:
                        change['oldValue'] = None
                except (ValueError, TypeError):
                    change['oldValue'] = None
            else:
                change['oldValue'] = None
        
        # Apply the change
        if change_type == 'set':
            if isinstance(target, dict):
                target[last_key] = value
            elif isinstance(target, list):
                try:
                    idx = int(last_key) if isinstance(last_key, str) else last_key
                    if 0 <= idx < len(target):
                        target[idx] = value
                    else:
                        target.append(value)
                except (ValueError, TypeError) as e:
                    print(f"Error applying set change: {e}")
        elif change_type == 'delete':
            if isinstance(target, dict):
                target.pop(last_key, None)
            elif isinstance(target, list):
                try:
                    idx = int(last_key) if isinstance(last_key, str) else last_key
                    if 0 <= idx < len(target):
                        target.pop(idx)
                except (ValueError, TypeError, IndexError) as e:
                    print(f"Error applying delete change: {e}")
        elif change_type == 'add':
            if isinstance(target, list):
                target.append(value)
            elif isinstance(target, dict):
                target[last_key] = value
        elif change_type == 'insert':
            if isinstance(target, list):
                try:
                    idx = int(last_key) if isinstance(last_key, str) else last_key
                    target.insert(idx, value)
                except (ValueError, TypeError) as e:
                    print(f"Error applying insert change: {e}")
    
    async def revert_change(self, filename, change):
        """Revert a change"""
        if filename not in self.file_data:
            return
        
        change_type = change.get('type')
        path = change.get('path', [])
        old_value = change.get('oldValue')
        
        # Navigate to the target
        target = self.file_data[filename]
        for key in path[:-1]:
            # Handle both dict and list navigation
            if isinstance(target, dict):
                if key not in target:
                    return
                target = target[key]
            elif isinstance(target, list):
                # Convert key to integer for list access
                try:
                    idx = int(key) if isinstance(key, str) else key
                    if idx < 0 or idx >= len(target):
                        return
                    target = target[idx]
                except (ValueError, IndexError, TypeError):
                    return
            else:
                return
        
        # Revert the change
        last_key = path[-1]
        if change_type in ['set', 'add']:
            if isinstance(target, dict):
                if old_value is None:
                    target.pop(last_key, None)
                else:
                    target[last_key] = old_value
            elif isinstance(target, list):
                if change_type == 'add':
                    if len(target) > 0:
                        target.pop()
                else:
                    try:
                        idx = int(last_key) if isinstance(last_key, str) else last_key
                        if 0 <= idx < len(target):
                            target[idx] = old_value
                    except (ValueError, TypeError, IndexError) as e:
                        print(f"Error reverting set/add change: {e}")
        elif change_type == 'delete':
            if isinstance(target, dict):
                if old_value is not None:
                    target[last_key] = old_value
            elif isinstance(target, list):
                try:
                    idx = int(last_key) if isinstance(last_key, str) else last_key
                    if old_value is not None:
                        target.insert(idx, old_value)
                except (ValueError, TypeError) as e:
                    print(f"Error reverting delete change: {e}")
                target.insert(path[-1], old_value)
        elif change_type == 'insert':
            if isinstance(target, list):
                target.pop(path[-1])
    
    async def load_file_data(self, filename):
        """Load file data from disk"""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        saved_files_dir = os.path.join(script_dir, 'saved_files')
        file_path = os.path.join(saved_files_dir, filename)
        
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    self.file_data[filename] = json.load(f)
            except Exception as e:
                print(f"Error loading file {filename}: {e}")
                self.file_data[filename] = {}
        else:
            self.file_data[filename] = {}
    
    async def save_file_data(self, filename):
        """Save file data to disk"""
        if filename not in self.file_data:
            return
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        saved_files_dir = os.path.join(script_dir, 'saved_files')
        os.makedirs(saved_files_dir, exist_ok=True)
        
        file_path = os.path.join(saved_files_dir, filename)
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(self.file_data[filename], f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving file {filename}: {e}")
    
    async def send_to_client(self, client_id, message):
        """Send message to a specific client"""
        if client_id in self.clients:
            try:
                await self.clients[client_id].send(json.dumps(message))
            except Exception as e:
                print(f"Error sending to {client_id}: {e}")
    
    async def broadcast_to_file(self, filename, exclude_client_id, message):
        """Broadcast message to all clients in a file session"""
        if filename not in self.file_sessions:
            return
        
        for client_id in self.file_sessions[filename]:
            if client_id != exclude_client_id:
                await self.send_to_client(client_id, message)

def run_websocket_server(port=8001):
    """Run the WebSocket server"""
    server = SyncServer(port)
    print(f"Starting WebSocket server on ws://localhost:{port}")
    
    async def handler(websocket):
        """Wrapper to call the server's register_client method"""
        # In websockets 15.0+, path is accessed via websocket.path
        path = getattr(websocket, 'path', None)
        await server.register_client(websocket, path)
    
    async def main():
        try:
            async with websockets.serve(handler, "0.0.0.0", port):
                print(f"WebSocket server listening on 0.0.0.0:{port}")
                print("Press Ctrl+C to stop")
                await asyncio.Future()  # Run forever
        except KeyboardInterrupt:
            print("\nWebSocket server stopped.")
        except Exception as e:
            print(f"\nWebSocket server error: {e}")
            import traceback
            traceback.print_exc()
    
    asyncio.run(main())

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    run_websocket_server(port)

