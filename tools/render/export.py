import numpy as np, rt, sys, os, json
from PIL import Image
from scipy.ndimage import uniform_filter, gaussian_filter
OUT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))+'/src/static/img/room'; os.makedirs(OUT,exist_ok=True)
DATA=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))+'/src/js/roomdata.js'
lum=lambda x:(x*np.array([.2126,.7152,.0722],np.float32)).sum(-1)
def denoise(c,A,levels=4,kl=3.2,keep=0.):
    """joint bilateral a-trous over light divided by surface colour, guided by normal, depth and colour"""
    N=A[...,0,:3].astype(np.float32); t=A[...,0,3].astype(np.float32); alb=np.clip(A[...,1,:3],.015,1).astype(np.float32); sky=t>1e5; alb[sky]=1; N[sky]=0; al=lum(alb); mat=A[...,2,3]
    x=(c/alb).astype(np.float32); orig=x.copy(); l=lum(x); m=uniform_filter(l,5); v=np.maximum(uniform_filter(l*l,5)-m*m,0); v=gaussian_filter(v,2)
    for lv in range(levels):
        st=1<<lv; s=np.zeros_like(x); w=np.zeros_like(l); sv=np.zeros_like(l); l=lum(x); sig=kl*np.sqrt(gaussian_filter(v,1))+1e-4
        for dy in(-1,0,1):
            for dx in(-1,0,1):
                k=(.5 if dy==0 else .25)*(.5 if dx==0 else .25); sh=(dy*st,dx*st); r=lambda a: np.roll(a,sh,(0,1))
                n2=(r(N)*N).sum(-1).clip(0,1); ww=k*n2**32*np.exp(-np.abs(r(t)-t)/(.02*t*st*.35+1e-3))*np.exp(-np.abs(r(al)-al)/.12)*(r(mat)==mat)*np.exp(-np.abs(r(l)-l)/sig)
                if dx==0 and dy==0: ww=np.full_like(l,k)
                s+=r(x)*ww[...,None]; w+=ww; sv+=r(v)*ww*ww
        x=s/w[...,None]; v=sv/np.maximum(w*w,1e-9)
    return (x*(1-keep)+orig*keep)*alb
def avif(a,f,q=58): Image.fromarray((np.clip(a,0,1)*255+.5).astype('u1')).save(f'{OUT}/{f}.avif',quality=q,speed=4)
def small(a,w): return np.asarray(Image.fromarray((np.clip(a,0,1)*255+.5).astype('u1')).resize((w,round(a.shape[0]*w/a.shape[1])),Image.LANCZOS),float)/255
def data(k,v):
    D={}
    if os.path.exists(DATA): D=json.loads(open(DATA).read().split('=',1)[1].rsplit(';',1)[0])
    D[k]=v; open(DATA,'w',newline='\n').write('/* how bright each rendered light layer is at full value; written by the render export */\nexport const ROOM = '+json.dumps(D)+';\n')
def glare(x):
    # what a real lens does round a bright lamp: a little light spread wide
    w=x.shape[1]; b=np.minimum(x,8.); o=x.copy()
    for sg,k in((.0022,.05),(.009,.030),(.035,.014)):
        o+=k*np.stack([gaussian_filter(b[...,c],w*sg,truncate=3) for c in range(3)],-1)
    return o
def groups(name,src,ng,lens=False):
    a,al,c=rt.load(src); A=rt.aov(src); sc=[]
    for g in range(ng):
        x=denoise(a[...,g,:],A,keep=.12); x=glare(x) if lens else x; s=float(max(np.percentile(x.max(-1),99.96),.03)); s=min(s,7. if lens and g==2 else 3. if lens else 6.); sc.append(round(s,4)); e=(np.clip(x/s,0,1))**(1/2.4); avif(e,f'{name}-{g}',56); avif(small(e,1600),f'{name}-{g}-s',54)
        rt.save(f'out/ex_{name}_{g}.png',x,.9)
    t=np.clip(A[...,0,3],0,40); near,far=np.percentile(t,1),np.percentile(t,99); d=1-np.clip((1/near-1/np.clip(t,near,far))/(1/near-1/far),0,1); avif(np.repeat(small(np.repeat(d[...,None],3,2),960)[...,:1],3,2),f'{name}-d',60)
    data(name,sc); print(name,sc,{f:os.path.getsize(f'{OUT}/{f}')//1024 for f in os.listdir(OUT) if f.startswith(name)})
def rooms(k,exp=.78):
    for p in(0,1):
        a,al,c=rt.load(f'ra_{k}{p}'); A=rt.aov(f'ra_{k}{p}'); x=denoise(a[...,0,:]+a[...,1,:],A,keep=.1); img=rt.srgb(rt.film(x,exp,1.0)); avif(img,f'{k}-{p}',60); avif(small(img,1320),f'{k}-{p}-s',56); Image.fromarray((img*255).astype('u1')).save(f'out/ex_{k}{p}.png')
    rec={int(r[0]):r[1:] for r in json.load(open('out/ra_rec.json'))}; ids=A[...,2,0].round().astype(int); L=np.zeros((max(rec)+1,2));
    for i,p in rec.items(): L[i]=p[:2]
    h,w=ids.shape; M=np.zeros((h,w,3)); pl=(ids>0)&(A[...,0,3]<1e5)&(ids<=max(rec)); M[pl,0]=L[ids[pl],0]/12; M[pl,1]=L[ids[pl],1]/5; M[pl,2]=.08+.9*np.round(A[...,2,2][pl].clip(0,1)*6)/6
    P=A[...,3,:3]; bk=(~pl)&(P[...,2]<.06)&(np.abs(P[...,0])<6)&(P[...,1]>.14)&(P[...,1]<5.14)&(A[...,1,:3].max(-1)<.03)&(A[...,0,3]<1e5); M[bk,0]=(P[...,0][bk]+6)/12; M[bk,1]=(P[...,1][bk]-.16)/5; M[bk,2]=.04
    Image.fromarray((M[::2,::2].clip(0,1)*255+.5).astype('u1')).save(f'{OUT}/{k}-map.webp',lossless=True,method=6); print(k,{f:os.path.getsize(f'{OUT}/{f}')//1024 for f in os.listdir(OUT) if f.startswith(k+'-')})
def hall():
    sc={}
    for n,q in(('elev',62),('floor',58),('ceil',52)):
        a,al,c=rt.load('hall_'+n); A=rt.aov('hall_'+n); x=denoise(a.sum(2),A,keep=.1,levels=5); s=min(float(np.percentile(x.max(-1),99.7)),2.4); sc[n]=round(s,4); e=(np.clip(x/s,0,1))**(1/2.4); avif(e,'hall-'+n,q); rt.save(f'out/ex_hall_{n}.png',x,.8)
        if n=='elev': X=A[...,3,0]; d=np.clip((X+2.15+.15)/.5,0,1); Image.fromarray((gaussian_filter(d,2.2)*255+.5).astype('u1')).resize((1512,651),Image.LANCZOS).convert('RGB').save(f'{OUT}/hall-depth.avif',quality=84,speed=4)
    data('hall',sc); print(sc,{f:os.path.getsize(f'{OUT}/{f}')//1024 for f in os.listdir(OUT) if f.startswith('hall')})
if __name__=='__main__':
    for j in sys.argv[1].split(','): {'mat':lambda:groups('mat','rb_mat',4,True),'night':lambda:groups('night','rb_night',4),'hall':hall,'in':lambda:rooms('in'),'out':lambda:rooms('out'),'both':lambda:rooms('both')}[j]()
