import http.server
import socketserver
import sys

PORT = 8080

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable Range requests & caching
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Concise logging
        sys.stdout.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stdout.flush()

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            # Normal browser behavior when aborting/seeking video requests
            pass

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    print(f"Starting server on http://localhost:{PORT}")
    sys.stdout.flush()
    with ThreadingServer(('', PORT), QuietHandler) as httpd:
        httpd.serve_forever()
