"""Servidor local para THE HOUSE PERFUMERÍA.

Sirve la carpeta del proyecto en http://localhost:8080 y abre el navegador.
Uso:  python serve.py     (o doble clic en start.cmd)
"""

import http.server
import os
import socketserver
import threading
import webbrowser

PORT = 8080
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):
        pass


def main():
    try:
        with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
            url = f"http://localhost:{PORT}"
            threading.Timer(0.9, lambda: webbrowser.open(url)).start()
            print(f"THE HOUSE PERFUMERÍA -> {url}")
            print("Ctrl+C para detener el servidor.")
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nServidor detenido.")
    except OSError:
        print(f"El puerto {PORT} está ocupado. Cierra el otro servidor o cambia PORT en serve.py.")


if __name__ == "__main__":
    main()
