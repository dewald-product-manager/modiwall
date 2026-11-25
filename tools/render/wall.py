from scenelib import *; import plants
from scipy.spatial import cKDTree
def layout(w,h,style,seed,px=.10,py=.115,periodic=True):
    """plants on a vessel grid, species in organic drifts; periodic in both directions"""
    r=np.random.default_rng(seed); nx=int(round(w/px)); ny=int(round(h/py)); px=w/nx; py=h/ny
    X,Y=np.meshgrid((np.arange(nx)+.5)*px,(np.arange(ny)+.5)*py); X=X.ravel();Y=Y.ravel()
    # warped voronoi drifts stretched along a diagonal
    n=int(w*h*style['density']); c=np.stack([r.random(n)*w,r.random(n)*h],1); sp=[]
    ks=list(style['mix']); ws=np.array([style['mix'][k] for k in ks],float); ws/=ws.sum()
    bag=list(r.choice(len(ks),n,p=ws)); sp=np.array(bag)
    off=np.array([[i*w,j*h] for i in(-1,0,1) for j in(-1,0,1)]); C=np.concatenate([c+o for o in off]); SP=np.tile(sp,9)
    ang=style.get('ang',.6); Rm=np.array([[np.cos(ang),np.sin(ang)],[-np.sin(ang),np.cos(ang)]]); st=np.array([1/style.get('str',2.2),1.])
    wx=.09*np.sin(2*np.pi*(Y/h*2+.3))+.05*np.sin(2*np.pi*(X/w*3+Y/h)); wy=.09*np.sin(2*np.pi*(X/w*2))+.05*np.sin(2*np.pi*(Y/h*3-X/w))
    Q=np.stack([X+wx,Y+wy],1); d,i=cKDTree((C@Rm.T)*st).query((Q@Rm.T)*st); kind=SP[i]
    jit=r.random(len(X)); alt=r.choice(len(ks),len(X),p=ws); kind=np.where(jit<style.get('mixin',.06),alt,kind)
    return [(ks[k],x+r.uniform(-.2,.2)*px+(.5*px if (row%2) else 0)*0,y+r.uniform(-.2,.2)*py) for k,x,y,row in zip(kind,X,Y,np.repeat(np.arange(ny),nx))],w,h
def drop(L,r,keep):  # thin out big plants so they read as individuals
    out=[]; big=[]
    for k,x,y in L:
        if k in keep:
            if any((x-a)**2+(y-b)**2<keep[k]**2 for a,b in big): k='heart'
            else: big.append((x,y))
        out.append((k,x,y))
    return out
def plantwall(s,K,L,seed=1,ids=0,origin=(0,0,0),wrap=None,scale=1.,mask=None,frame=None):
    r=np.random.default_rng(seed); n=ids; rec=[]
    for k,x,y in L:
        v=K[k][int(r.integers(len(K[k])))]; sc=r.uniform(.82,1.2)*scale*(1.15 if k in('heart','lime','pothos','pep','purple') else 1.); ro=r.uniform(-.28,.28); Rm=rotz(ro)
        fl=-1. if r.random()<.5 else 1.; Rm=Rm@np.diag([fl,1,1.])
        sd=r.random(); pos=np.array([x,y,r.uniform(.0,.05)+.045*(np.sin(2*np.pi*(x/(wrap[0] if wrap else 3.6)*2+y/(wrap[1] if wrap else 2.4)))+np.sin(2*np.pi*(y/(wrap[1] if wrap else 2.4)*2-x/(wrap[0] if wrap else 3.6))))+.05]); rec.append((n,k,pos,sc,Rm,v,ro,fl,[q[0] for q in K[k]].index(v[0])))
        offs=[(0,0)] if wrap is None else [(i*wrap[0],j*wrap[1]) for i in(-1,0,1) for j in(-1,0,1)]
        for ox,oy in offs:
            p=pos+[ox,oy,0]
            if wrap is not None and not(-.75<p[0]<wrap[0]+.75 and -.75<p[1]<wrap[1]+.75): continue
            if frame is not None: P=frame[:,:3]@p+frame[:,3]; RR=frame[:,:3]@Rm
            else: P=p+origin; RR=Rm
            s.add(v[0],xf(RR,P,sc),seed=sd,id=n)
        n+=1
    return rec
STY={
 'forest':dict(mix=dict(heart=8,lime=2.6,fern=5,spider=3,lily=2.2,monstera=1.5,pep=2,syng=1.4,lirio=1.6),density=2.7,ang=.62,str=2.9,mixin=.06),
 'fern':dict(mix=dict(fern=9,heart=4,lirio=3.5,spider=3,syng=2,lily=2,fig=1.5),density=1.7,ang=-.6,str=2.4,mixin=.08),
 'jungle':dict(mix=dict(monstera=3,lily=4,heart=6,pothos=4,purple=2.2,lime=2.5,pep=2.5,spider=1.5),density=1.5,ang=.5,str=1.9,mixin=.07)}
def backing(s,M,lo,hi,z=-.03): s.box((lo[0],lo[1],z-.03),(hi[0],hi[1],z),M['black'])
