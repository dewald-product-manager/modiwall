import http.server, threading, os, json, numpy as np, urllib.parse
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    protocol_version='HTTP/1.1'
    def __init__(s,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(s,*a): pass
    def end_headers(s): s.send_header('Cache-Control','no-store'); super().end_headers()
    def do_POST(s):
        u=urllib.parse.urlparse(s.path); part=int(urllib.parse.parse_qs(u.query).get('part',['0'])[0]); n=int(s.headers['Content-Length'])
        f=os.path.join(ROOT,'out',os.path.basename(u.path)); os.makedirs(os.path.dirname(f),exist_ok=True)
        with open(f,'wb' if part==0 else 'ab') as o:
            while n>0:
                b=s.rfile.read(min(n,1<<20)); o.write(b); n-=len(b)
        s.send_response(200); s.send_header('Content-Length','0'); s.end_headers()
def render(scene,jobs,verbose=True):
    srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),H); port=srv.server_address[1]; threading.Thread(target=srv.serve_forever,daemon=True).start()
    with sync_playwright() as p:
        b=p.chromium.launch(channel="chrome",args=["--enable-unsafe-webgpu","--enable-gpu","--ignore-gpu-blocklist","--force_high_performance_gpu"]); pg=b.new_page(); pg.set_default_timeout(0)
        pg.on('console',lambda m:print('  [c]',m.text[:600])); pg.on('pageerror',lambda e:print('  [e]',e))
        pg.goto(f'http://127.0.0.1:{port}/pt.html'); pg.wait_for_function('window.ready'); r=pg.evaluate('d=>load(d)',scene)
        if verbose: print(scene,r)
        for name,cam in jobs:
            q=pg.evaluate('([c,o])=>render(c,o)',[cam,name]); json.dump({**cam,**q},open(f'{ROOT}/out/{name}.json','w'))
            if verbose: print(' ',name,q,flush=True)
        b.close()
    srv.shutdown()
def load(name):
    c=json.load(open(f'{ROOT}/out/{name}.json')); a=np.fromfile(f'{ROOT}/out/{name}.rgb',np.float32).reshape(c['h'],c['w'],4,4)
    return a[...,:3]/c['spp'], a[...,0,3]/c['spp'], c
def aov(name):
    c=json.load(open(f'{ROOT}/out/{name}.json')); return np.fromfile(f'{ROOT}/out/{name}.aov',np.float32).reshape(c['h'],c['w'],4,4)
def film(x,exp=1.,sat=.97):
    x=np.maximum(x*exp*np.array([1.05,1.,.93]),0); a=x*(x*2.51+.03)/(x*(x*2.43+.59)+.14); x=x; l=(a*[.2126,.7152,.0722]).sum(-1,keepdims=True); return np.clip(l+(a-l)*sat,0,1)
def srgb(x): x=np.clip(x,0,1); return np.where(x<=.0031308,x*12.92,1.055*np.power(np.maximum(x,1e-9),1/2.4)-.055)
def save(path,lin,exp=1.):
    from PIL import Image; Image.fromarray((srgb(film(lin,exp))*255+.5).astype('u1')).save(path)

WARM=np.array([1.05,1.,.92])
