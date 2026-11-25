"""super-resolution in Chrome's WebGPU: Sr().up(array, model) -> 4x array"""
import http.server, threading, os, io, numpy as np, functools
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
    def do_PUT(s):
        n=int(s.headers['Content-Length']); open(os.path.join(ROOT,'out',os.path.basename(s.path)),'wb').write(s.rfile.read(n)); s.send_response(200); s.end_headers()
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.wasm':'application/wasm'}
class Sr:
    def __init__(s):
        s.srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),H); threading.Thread(target=s.srv.serve_forever,daemon=True).start(); s.p=sync_playwright().start()
        s.b=s.p.chromium.launch(channel='chrome',headless=True,args=['--enable-unsafe-webgpu','--enable-gpu','--ignore-gpu-blocklist','--force_high_performance_gpu']); s.g=s.b.new_page(); s.g.set_default_timeout(0)
        s.g.on('console',lambda m:print('  js',m.text[:200]) if m.type=='error' else None); s.g.goto(f'http://127.0.0.1:{s.srv.server_port}/sr.html'); s.g.wait_for_function('window.ready')
    def up(s,a,model='x4',key='t'):
        Image.fromarray(a).save(f'{ROOT}/in/{key}.png',compress_level=1); w,h,n,ms=s.g.evaluate("([m,i,o])=>run(m,i,o)",[model,f'/in/{key}.png?{np.random.rand()}',key]); r=np.fromfile(f'{ROOT}/out/{key}',np.uint8).reshape(h,w,3); s.last=(n,ms); return r
    def close(s): s.b.close(); s.p.stop(); s.srv.shutdown()
