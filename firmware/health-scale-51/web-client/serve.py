"""Serve this browser-only app on localhost, with no device access or uploads."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=8765)
args = parser.parse_args()
root = Path(__file__).resolve().parent / 'dist'

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Permissions-Policy', 'serial=(self)')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

print(f'小咪蓝牙串口实验台：http://localhost:{args.port}', flush=True)
with ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(root))) as server:
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
