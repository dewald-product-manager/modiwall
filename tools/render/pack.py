import numpy as np, rt, sys, os, json
from PIL import Image
from scipy.ndimage import distance_transform_edt
OUT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))+'/src/wall'
os.makedirs(OUT,exist_ok=True)
def key(a): return (a[...,2,0].round().astype(np.int64)*512+a[...,2,1].round().astype(np.int64))*(a[...,0,3]<1e5)*(a[...,2,0]>.5)
def merge(K,minA,cap):
    u,c=np.unique(K,return_counts=True); big={}
    for k,n in zip(u.tolist(),c.tolist()):
        if k>0: big.setdefault(k//512,[]).append((n,k))
    re={0:0}
    for p,l in big.items():
        l.sort(reverse=True); keep=[k for n,k in l if n>=minA][:cap] or [l[0][1]]
        for n,k in l: re[k]=k if k in keep else keep[0]
    ak=np.array(sorted(re)); av=np.array([re[k] for k in ak]); return lambda Q: np.where(np.isin(Q,ak),av[np.searchsorted(ak,Q).clip(0,len(ak)-1)],0), np.array(sorted(set(re.values())-{0}))
def bounds(L,n,rx,ry,w=None,h=None):
    bb=np.zeros((n+1,4)); bb[:,:2]=1e9; bb[:,2:]=-1e9; yy,xx=np.nonzero(L); l=L[yy,xx]; dx=xx-rx[l]; dy=yy-ry[l]
    if w: dx=(dx+w/2)%w-w/2; dy=(dy+h/2)%h-h/2
    np.minimum.at(bb[:,0],l,dx);np.minimum.at(bb[:,1],l,dy);np.maximum.at(bb[:,2],l,dx+1);np.maximum.at(bb[:,3],l,dy+1); return bb
def ids(r,f): Image.fromarray(np.stack([r&255,r>>8,np.zeros_like(r)],-1).astype('u1')).save(f,lossless=True,quality=100,method=6)
lum=lambda x:(x*[.2126,.7152,.0722]).sum(-1)
def pack(name,W,H,exp=1.06):
    a=rt.aov('pl_'+name); K=key(a); h,w=K.shape; px=w/W; m,g=merge(K,130*(w/2304)**2,40); n=len(g); M=m(K)
    lab=lambda M: np.where(M>0,np.searchsorted(g,M)+1,0); L=lab(M); R={int(r[0]):r[1:] for r in np.load(f'out/pl_{name}_roots.npy')}
    z=np.bincount(L.ravel(),weights=a[...,3,2].ravel(),minlength=n+1)/np.maximum(np.bincount(L.ravel(),minlength=n+1),1)
    rx=np.array([0]+[R[k//512][0]*px for k in g]); ry=np.array([0]+[(H-R[k//512][1])*px for k in g]); bb=bounds(L,n,rx,ry,w,h)
    order=np.argsort(z[1:],kind='stable')+1; rank=np.zeros(n+1,int); rank[order]=np.arange(1,n+1)
    T=np.zeros((n,8),np.int16); T[:,0]=rx[order];T[:,1]=ry[order];T[:,2:4]=np.floor(bb[order,:2])-1;T[:,4:6]=np.ceil(bb[order,2:])+1;T[:,6]=np.round(z[order]*1000)
    P=json.load(open(f'out/pl_{name}_plants.json')); si={(q['kind'],q['v']):i for i,q in enumerate(json.load(open('out/spr.json')))}
    Q=np.array([[x*px,(H-y)*px,si[(k,v)],ro*10000,sc*1000*fl,zz*1000] for k,v,x,y,zz,sc,ro,fl in P]); Q=Q[np.argsort(Q[:,5]-Q[:,1]*.0,kind='stable')].round().astype(np.int16)
    open(f'{OUT}/{name}.bin','wb').write(np.array([n,len(Q)],'<i2').tobytes()+T.astype('<i2').tobytes()+Q.astype('<i2').tobytes())
    ids(rank[L],f'{OUT}/{name}-id.webp'); ids(rank[lab(m(key(rt.aov(f'pl_{name}_s'))))],f'{OUT}/{name}-id-s.webp')
    im,_,_=rt.load('pl_'+name); t=im.sum(2); Image.fromarray((rt.srgb(rt.film(t,exp))*255+.5).astype('u1')).save(f'{OUT}/{name}.png')
    N=a[...,0,:3]; aux=np.stack([lum(im[...,0,:])/np.maximum(lum(t),1e-5),N[...,0]*.5+.5,N[...,1]*.5+.5],-1).clip(0,1); Image.fromarray((aux*255).astype('u1')).resize((w//2,h//2),Image.BOX).save(f'{OUT}/{name}-aux.png')
    print(name,n,len(Q),{f:os.path.getsize(f'{OUT}/{f}')//1024 for f in os.listdir(OUT) if f.startswith(name)})
def sprites(exp=1.0):
    S=json.load(open('out/spr.json')); order=sorted(range(len(S)),key=lambda i:-S[i]['h']); AW=1536; x=y=rowh=0; pos={}
    for i in order:
        w,h=S[i]['w'],S[i]['h']
        if x+w>AW: x=0;y+=rowh;rowh=0
        pos[i]=(x,y); x+=w; rowh=max(rowh,h)
    AH=int(np.ceil((y+rowh)/64)*64); C=np.zeros((AH,AW,3)); I=np.zeros((AH,AW),int); X=np.zeros((AH,AW,3)); X[...,1:]=.5; rows=[];off=[];base=0
    for i,q in enumerate(S):
        a=rt.aov(f'spr_{i}'); im,al,_=rt.load(f'spr_{i}'); K=key(a); m,g=merge(K,60,26); n=len(g); M=m(K); L=np.where(M>0,np.searchsorted(g,M)+1,0)
        z=np.bincount(L.ravel(),weights=a[...,3,2].ravel(),minlength=n+1)/np.maximum(np.bincount(L.ravel(),minlength=n+1),1); rx=np.full(n+1,q['rx']);ry=np.full(n+1,q['ry']); bb=bounds(L,n,rx,ry); o=np.argsort(z[1:])+1; rank=np.zeros(n+1,int); rank[o]=np.arange(1,n+1)
        t=im.sum(2)/np.maximum(al[...,None],.05); c=rt.srgb(rt.film(t,exp)); inside=al>.9; idx=distance_transform_edt(~inside,return_distances=False,return_indices=True); c=c[idx[0],idx[1]]
        px,py=pos[i]; h,w=K.shape; C[py:py+h,px:px+w]=c; r=rank[L]; I[py:py+h,px:px+w]=np.where(r>0,r+base,0); N=a[...,0,:3]; X[py:py+h,px:px+w]=np.stack([lum(im[...,0,:])/np.maximum(lum(im.sum(2)),1e-5),N[...,0]*.5+.5,N[...,1]*.5+.5],-1).clip(0,1)
        off.append((base,n,round(px+q['rx']),round(py+q['ry'])))
        for k in o: rows.append([*np.floor(bb[k,:2])-1,*np.ceil(bb[k,2:])+1,round(z[k]*1000),0]); 
        base+=n
    Image.fromarray((C*255+.5).astype('u1')).save(f'{OUT}/plants.png'); ids(I,f'{OUT}/plants-id.webp'); Image.fromarray((X*255).astype('u1')).resize((AW//2,AH//2),Image.BOX).save(f'{OUT}/plants-aux.png')
    open(f'{OUT}/plants.bin','wb').write(np.array([len(S),base,AW,AH],'<i2').tobytes()+np.array(off,'<i2').tobytes()+np.array(rows,'<i2').tobytes()); print('sprites',AW,AH,base,os.path.getsize(f'{OUT}/plants-id.webp')//1024)
if __name__=='__main__':
    P={'forest':(3.6,2.4),'fern':(2.4,1.6),'jungle':(2.4,1.6)}
    for n in sys.argv[1].split(','): sprites() if n=='plants' else pack(n,*P[n])
