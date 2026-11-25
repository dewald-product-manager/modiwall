import numpy as np, json, os
from scenelib import *
import plants
from scipy.ndimage import gaussian_filter
R=2048
def fb(n,seed,oct=6,base=3,ay=1.):
    return plants.fbm(n,seed,oct,base,ay)
def make_textures():
    from PIL import Image
    d=ROOT+'/ptex'; os.makedirs(d,exist_ok=True); save=lambda n,c: Image.fromarray((np.clip(c,0,1)*255).astype('u1')).save(f'{d}/{n}')
    if not os.path.exists(d+'/lime_d.png'):   # honed limestone, large slabs: 2.4 m square tile holding 2 x 3 slabs
        n=R; a=fb(n,1,7,4); b=fb(n,2,6,18); c=fb(n,3,4,180); v=np.abs(fb(n,4,6,3)); v=np.clip(1-v/.02,0,1)*np.clip(fb(n,5,3,4)+.1,0,1)
        base=np.array([.60,.555,.49])[None,None]; t=1+a*.07+b*.07+c*.06; col=base*t[...,None]; col=col*(1-v[...,None]*.16)
        fos=np.clip((fb(n,6,5,110)+fb(n,7,4,23)*.6-.34)*5,0,1); fos=gaussian_filter(fos,.8); col*=1-fos[...,None]*.06
        y,x=np.mgrid[0:n,0:n]/n; row=np.floor(y*2); gx=(x*2+row*.5)%1; gy=(y*2)%1; dd=np.minimum(np.minimum(gx,1-gx),np.minimum(gy,1-gy))*1200; j=np.clip(1-dd/1.6,0,1)
        idn=(np.floor(x*2+row*.5)*3+row*7)%5; col*=(1+(idn-2)*.018)[...,None]; col=col*(1-j[...,None]*.45)
        save('lime_d.png',col); h=-j*3+c*.25+b*.2-fos*.5; Image.fromarray(plants.tonormal(h,1.2)).save(d+'/lime_n.png'); rg=.46+a*.18+c*.12+fos*.2+j*.3; save('lime_r.png',np.repeat(rg[...,None],3,2))
    if not os.path.exists(d+'/wash_d.png'):   # limewash: clouded, brushed
        n=R; a=fb(n,11,6,3); st=gaussian_filter(np.random.default_rng(3).random((n,n)),(1.2,14)); st2=gaussian_filter(np.random.default_rng(4).random((n,n)),(14,1.2)); st=(st-st.mean())/st.std(); st2=(st2-st2.mean())/st2.std(); k=np.clip(fb(n,12,4,14)*2+.5,0,1); br=st*k+st2*(1-k); b=fb(n,13,6,8)
        t=1+a*.11+b*.09+br*.016; save('wash_d.png',np.array([.62,.585,.53])[None,None]*t[...,None]); Image.fromarray(plants.tonormal(b*.9+br*.07+fb(n,14,4,60)*.35,1.6)).save(d+'/wash_n.png')
    if not os.path.exists(d+'/marble_d.png'):
        n=R; from scipy.ndimage import map_coordinates
        y,x=np.mgrid[0:n,0:n]/n; wx=fb(n,21,5,2)*.22+fb(n,23,5,7)*.06; wy=fb(n,22,5,2)*.22+fb(n,24,5,7)*.06; X=x+wx;Y=y+wy; c,q=np.cos(.62),np.sin(.62); U=X*c+Y*q; V=-X*q+Y*c
        def field(seed,base,k): return map_coordinates(fb(n,seed,5,base),[(V*n*1.)%n,(U*n*k)%n],order=1,mode='wrap')
        col=np.ones((n,n,3))*np.array([.80,.79,.765]); cl=field(30,3,.4); col*=(1+cl*.13)[...,None]
        mk=lambda sd,g=1.: np.clip(field(sd,3,.5)*2.6+g,0,1)
        f=field(31,3,.35); fe=np.exp(-np.abs(f)/.07)*mk(32,.35)*(f>0)+np.exp(-np.abs(f)/.02)*mk(32,.35)*(f<=0); col=col*(1-fe[...,None]*.5)+np.array([.40,.40,.395])*fe[...,None]*.5
        f2=field(33,4,.3); fe2=np.exp(-np.abs(f2)/.05)*mk(34,.1); col=col*(1-fe2[...,None]*.34)+np.array([.52,.45,.35])*fe2[...,None]*.34
        for sd,b,k,th,st,cc in((31,3,.35,.006,.85,(.17,.165,.16)),(33,4,.3,.0055,.8,(.47,.34,.17)),(36,7,.4,.005,.5,(.33,.31,.29)),(37,12,.5,.005,.3,(.5,.4,.26)),(38,22,.6,.006,.2,(.45,.43,.41))):
            r=np.exp(-np.abs(field(sd,b,k))/th)*mk(sd+20,.45)*st; col=col*(1-r[...,None])+np.array(cc)*r[...,None]
        save('marble_d.png',col**.9)
    if not os.path.exists(d+'/alab_d.png'):
        n=1024; a=fb(n,41,6,3); b=fb(n,42,5,5); v=np.clip(1-np.abs(b)/.03,0,1)**1.5; col=np.array([1.,.90,.76])*(1+a*.35)[...,None]; col=col*(1-v[...,None]*.45)+np.array([.62,.40,.22])*v[...,None]*.45; save('alab_d.png',col)
    if not os.path.exists(d+'/water_n.png'):
        n=R; Image.fromarray(plants.tonormal(fb(n,71,4,9)*1.+fb(n,72,3,26)*.25,5)).save(d+'/water_n.png')
    if not os.path.exists(d+'/linen_d.png'):
        im=np.asarray(Image.open(ROOT+'/ph/rough_linen_d.jpg').convert('L'),float)/255; im=im/im.mean(); save('linen_d.png',np.clip(np.array([.60,.575,.53])[None,None]*im[...,None],0,1))
        im=np.asarray(Image.open(ROOT+'/ph/curly_teddy_natural_d.jpg').convert('L'),float)/255; im=im/im.mean(); save('teddy_d.png',np.clip(np.array([.80,.77,.72])[None,None]*(.35+.65*im)[...,None],0,1))
def std(s):
    make_textures(); m={}
    m['lime']=s.mat('lime',(.92,.92,.92),1.,spec=.5,tBase='ptex/lime_d.png',tNorm='ptex/lime_n.png',tRough='ptex/lime_r.png',scale=1/2.4,box=True,nStr=.5); s.mats[m['lime']]['rough']=.62
    m['wash']=s.mat('wash',(1,1,1),.85,spec=.2,tBase='ptex/wash_d.png',tNorm='ptex/wash_n.png',scale=1/3.2,box=True,nStr=.8)
    m['washd']=s.mat('washd',(.42,.41,.39),.85,spec=.2,tBase='ptex/wash_d.png',tNorm='ptex/wash_n.png',scale=1/3.2,box=True,nStr=.8)
    m['white']=s.mat('white',(.78,.77,.75),.8,spec=.2)
    m['marble']=s.mat('marble',(1,1,1),.16,spec=.5,tBase='ptex/marble_d.png',scale=1.)
    m['walnut']=s.mat('walnut',(.62,.52,.44),.9,spec=.45,tBase='ph/smoked_walnut_veneer_d.jpg',tNorm='ph/smoked_walnut_veneer_n.jpg',tRough='ph/smoked_walnut_veneer_r.jpg',scale=1.,nStr=.6)
    m['walnutb']=s.mat('walnutb',(.60,.50,.42),.9,spec=.45,tBase='ph/smoked_walnut_veneer_d.jpg',tNorm='ph/smoked_walnut_veneer_n.jpg',tRough='ph/smoked_walnut_veneer_r.jpg',scale=.7,nStr=.6,box=True,swap=True)
    m['oak']=s.mat('oak',(.9,.85,.8),.9,spec=.45,tBase='ph/white_oak_veneer_d.jpg',tNorm='ph/white_oak_veneer_n.jpg',tRough='ph/white_oak_veneer_r.jpg',scale=.8,nStr=.5,box=True)
    m['teddy']=s.mat('teddy',(1,1,1),.95,spec=.15,tBase='ptex/teddy_d.png',tNorm='ph/curly_teddy_natural_n.jpg',scale=3.2,box=True,nStr=1.3)
    m['rug']=s.mat('rug',(.72,.69,.64),.98,spec=.1,tBase='ptex/teddy_d.png',tNorm='ph/curly_teddy_natural_n.jpg',scale=2.,box=True,nStr=1.5)
    m['linen']=s.mat('linen',(1,1,1),.95,spec=.15,trans=(.5,.5,.47),tBase='ptex/linen_d.png',tNorm='ph/rough_linen_n.jpg',scale=2.5,nStr=.7)
    m['brass']=s.mat('brass',(.78,.56,.28),.26,metal=1); m['bronze']=s.mat('bronze',(.085,.065,.05),.38,metal=1,spec=.5); m['black']=s.mat('blk',(.018,.018,.017),.45)
    m['clay']=s.mat('clay',(.30,.27,.235),.85,spec=.25,tBase='ptex/wash_d.png',scale=2,box=True)
    m['stonedark']=s.mat('stonedark',(.30,.28,.25),.9,spec=.4,tBase='ptex/lime_d.png',tNorm='ptex/lime_n.png',scale=1/2.4,box=True,nStr=.4)
    return m
_gl={}
def gltf(s,name,M=None,height=None,matmul=None,rough=None,alpha=True,tint=None,only=None,vary=0):
    """load a Poly Haven glTF; returns list of mesh ids (one per primitive) sharing local space"""
    key=(id(s),name,only)
    if key not in _gl:
        d=f'{ROOT}/ph/{name}'; g=json.load(open(f'{d}/{name}.gltf')); B=[open(f'{d}/{b["uri"]}','rb').read() for b in g['buffers']]
        def acc(i):
            a=g['accessors'][i]; v=g['bufferViews'][a['bufferView']]; dt={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']]; nc={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
            o=v.get('byteOffset',0)+a.get('byteOffset',0); st=v.get('byteStride',0);
            if st and st!=np.dtype(dt).itemsize*nc:
                raw=np.frombuffer(B[v['buffer']],'u1',count=st*a['count'],offset=o).reshape(a['count'],st)[:,:np.dtype(dt).itemsize*nc]; return np.frombuffer(raw.tobytes(),dt).reshape(-1,nc)
            return np.frombuffer(B[v['buffer']],dt,count=a['count']*nc,offset=o).reshape(-1,nc)
        mm=[]
        for m in g.get('materials',[]):
            p=m.get('pbrMetallicRoughness',{}); t=lambda x: None if x is None else f"ph/{name}/"+g['images'][g['textures'][x['index']]['source']]['uri']
            al=m.get('alphaMode') in('MASK','BLEND')
            mm.append(s.mat(f'{name}_{m["name"]}',(tint or (1,1,1)),1. ,metal=0 if p.get('metallicFactor',1)<.5 or 'metallicRoughnessTexture' in p and not p.get('_m') else 0,spec=.5,tBase=t(p.get('baseColorTexture')),tNorm=t(m.get('normalTexture')),tRough=t(p.get('metallicRoughnessTexture')),alpha=.4 if al else None,trans=(.45,.5,.25) if al else (0,0,0),vary=vary)); s.mats[mm[-1]]['rough']=.5
        out=[]
        def walk(i,T):
            nd=g['nodes'][i]; L=np.eye(4)
            if 'matrix' in nd: L=np.array(nd['matrix']).reshape(4,4).T
            else:
                q=nd.get('rotation',[0,0,0,1]); x,y,z,w=q; Rm=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]); L[:3,:3]=Rm*np.array(nd.get('scale',[1,1,1])); L[:3,3]=nd.get('translation',[0,0,0])
            T=T@L
            if 'mesh' in nd and (only is None or only in nd.get('name','')):
                for pr in g['meshes'][nd['mesh']]['primitives']:
                    P=acc(pr['attributes']['POSITION']).astype(float)@T[:3,:3].T+T[:3,3]; N=acc(pr['attributes']['NORMAL']).astype(float)@np.linalg.inv(T[:3,:3]); N/=np.linalg.norm(N,axis=1,keepdims=True)+1e-9; UV=acc(pr['attributes']['TEXCOORD_0']).astype(float) if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(P),2)); F=acc(pr['indices']).reshape(-1,3).astype(int)
                    out.append((P,F,N,UV,mm[pr['material']]))
            for c in nd.get('children',[]): walk(c,T)
        for r in g['scenes'][g.get('scene',0)]['nodes']: walk(r,np.eye(4))
        allP=np.concatenate([o[0] for o in out]); lo=allP.min(0);hi=allP.max(0); c=np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2])
        _gl[key]=([s.mesh(P-c,F,m,N=N,UV=UV) for P,F,N,UV,m in out],hi-lo)
    ids,size=_gl[key]; k=1. if height is None else height/size[1]
    if M is not None:
        M=np.array(M,float).copy(); M[:,:3]*=k
        for i in ids: s.add(i,M,seed=float(M[0,3]),mat=matmul)
    return ids,size*k
def place(t,yaw=0): return xf(roty(yaw),t)
def sofa(s,mat,t,yaw=0,w=2.6,d=1.02,legs=None,curve=0):
    M=place(t,yaw)
    def b(lo,hi,bev):
        P,F,UV,N=box_mesh(lo,hi,bev); i=s.mesh(P,F,mat,UV=UV,N=N); s.add(i,M)
    h=.40; b((-w/2,.10,-d/2),(w/2,.30,d/2),.07)
    n=2 if w<2.4 else 3; cw=(w-.5)/n
    for k in range(n): x=-w/2+.25+k*cw; b((x+.004,.27,-d/2+.26),(x+cw-.004,.47,d/2+.02),.085)
    b((-w/2,.10,-d/2-.02),(w/2,.72,-d/2+.27),.125)
    for sg in(-1,1): b((min(sg*w/2,sg*(w/2-.27)),.10,-d/2),(max(sg*w/2,sg*(w/2-.27)),.60,d/2),.125)
    for k in range(n): x=-w/2+.25+k*cw; P,F,UV,N=box_mesh((-cw/2+.03,-.02,-.10),(cw/2-.03,.46,.09),.095); s.add(s.mesh(P,F,mat,UV=UV,N=N),np.concatenate([(M[:,:3]@rotx(-.2)),(M[:,:3]@np.array([x+cw/2,.44,-d/2+.32])+M[:,3])[:,None]],1))
    for sx in(-1,1):
        for sz in(-1,1): P,F,UV,N=box_mesh((sx*(w/2-.2)-.03,0,sz*(d/2-.14)-.03),(sx*(w/2-.2)+.03,.11,sz*(d/2-.14)+.03)); s.add(s.mesh(P,F,legs,UV=UV,N=N),M)
def cushion(s,mat,t,yaw=0,size=.48,tilt=-.3):
    n=22; u=np.linspace(-1,1,n); X,Y=np.meshgrid(u,u); e=(1-X**4)*(1-Y**4); Zp=.085*np.clip(e,0,1)**.45; pin=1-.06*(1-np.abs(X)**2)*np.abs(Y)**6-.0; pin2=1-.06*(1-np.abs(Y)**2)*np.abs(X)**6
    P=[];F=[]
    for sg in(1,-1): P.append(np.stack([X*pin*size/2,Y*pin2*size/2,sg*Zp],-1).reshape(-1,3)); f=grid_faces(n,n); F.append((f if sg>0 else f[:,::-1])+(0 if sg>0 else n*n))
    P=np.concatenate(P); i=s.mesh(P,np.concatenate(F),mat); s.add(i,xf(roty(yaw)@rotx(tilt),t))
def cyl(s,mat,t,r,h,bev=.01,n=72):
    k=6; a=np.linspace(0,np.pi/2,k); prof=[(1e-4,0)]+[(r-bev+bev*np.sin(q),bev-bev*np.cos(q)) for q in a]+[(r-bev+bev*np.cos(q),h-bev+bev*np.sin(q)) for q in a]+[(1e-4,h)]; P,F,UV=lathe(prof,n); i=s.mesh(P,F,mat,UV=UV*[6,1]); s.add(i,place(t)); return i
def flutes(s,mat,x0,x1,y0,y1,z,r=.03,uvs=1.):
    n=int((x1-x0)/(2*r)); r=(x1-x0)/n/2; th=np.linspace(0,np.pi,9); P=np.stack([np.repeat(-r*np.cos(th)[None],2,0),np.repeat(np.array([[y0],[y1]]),9,1),np.repeat(r*.9*np.sin(th)[None],2,0)],-1).reshape(-1,3); L=np.cumsum(np.r_[0,np.full(8,np.pi*r/8)]); F=grid_faces(2,9); rr=np.random.default_rng(7)
    for v in range(8):
        UV=np.stack([np.tile(np.array([[y0],[y1]]),(1,9)).reshape(-1)*uvs+rr.random(),(np.tile(L,(2,1)).reshape(-1))*uvs*1.5+rr.random()],1); i=s.mesh(P,F,mat,UV=UV)
        for k in range(v,n,8): s.add(i,xf(t=(x0+r+2*r*k,0,z)),seed=k*.17)
def curtain(s,mat,x,z0,z1,h,axis='x',folds=9,amp=.07,y0=.01):
    n=folds*14; u=np.linspace(0,1,n); w=np.sin(u*folds*2*np.pi)*amp*(.75+.25*np.sin(u*17)); P=[]
    ys=np.linspace(y0,h,10)
    for y in ys: k=.82+.18*(y/h); P.append(np.stack([x+w*(1.25-.35*y/h),np.full(n,y),z0+(z1-z0)*u+np.sin(u*folds*4*np.pi)*amp*.25],1))
    P=np.concatenate(P); F=grid_faces(10,n); UV=np.stack([np.tile(u*(z1-z0)*1.5,10),np.repeat(ys,n)],1); s.add(s.mesh(P,F,mat,UV=UV))
def sphere(s,mat,c,r,n=40):
    t=np.linspace(0,np.pi,n); P,F,UV=lathe([(r*np.sin(a)+1e-5,-r*np.cos(a)) for a in t],64); i=s.mesh(P,F,mat,UV=UV); s.add(i,place(c)); return i
def rect(s,mat,p,u,v,uv=None,flip=False):
    p,u,v=map(lambda q:np.array(q,float),(p,u,v)); P=np.array([p,p+u,p+u+v,p+v]); F=np.array([[0,1,2],[0,2,3]]); UV=np.array([[0,0],[1,0],[1,1],[0,1]],float) if uv is None else np.array(uv,float); s.add(s.mesh(P,F[:,::-1] if flip else F,mat,UV=UV))
