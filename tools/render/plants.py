import numpy as np, os
from scipy.ndimage import gaussian_filter, map_coordinates
from scenelib import *
R=1024
def fbm(n,seed,oct=5,base=4,aspect=1.):
    r=np.random.default_rng(seed); out=np.zeros((n,n)); amp=1.
    for o in range(oct):
        k=base*2**o
        if k>n: break
        ky=int(max(2,k*aspect)); g=np.pad(r.random((ky,k)),((1,3),(1,3)),mode='wrap'); yy=np.linspace(0,ky,n,endpoint=False); xx=np.linspace(0,k,n,endpoint=False); Y,X=np.meshgrid(yy,xx,indexing='ij')
        out+=amp*(map_coordinates(g,[Y+1,X+1],order=3,mode='wrap')-.5); amp*=.5
    return out
def worley(n,seed,cells,warp=None):
    from scipy.spatial import cKDTree
    r=np.random.default_rng(seed); g=(np.stack(np.meshgrid(np.arange(-1,cells+1),np.arange(-1,cells+1)),-1).reshape(-1,2)+r.random(((cells+2)**2,2)))/cells
    v,u=np.mgrid[0:n,0:n]/n
    if warp is not None: u=u+warp[0]; v=v+warp[1]
    d,_=cKDTree(g).query(np.stack([u.ravel(),v.ravel()],-1),k=2); return ((d[:,1]-d[:,0])*cells).reshape(n,n)
def tonormal(h,st):
    gy,gx=np.gradient(h); n=np.stack([-gx*st,-gy*st,np.ones_like(h)],-1); n/=np.linalg.norm(n,axis=-1,keepdims=True); return ((n*.5+.5)*255).astype('u1')
def enc(c): return (np.clip(c,0,1)**(1/2.2)*255).astype('u1')
def leaf_tex(kind,dark,mid,vein,nlat=9,slope=.55,curve=.3,tert=26,quilt=1.,seed=1,variegate=None,streak=False):
    # u across -1..1, v along 0(base)..1(tip). image row 0 = v 0
    v,u=np.mgrid[0:R,0:R]/(R-1.); u=u*2-1; au=np.abs(u)
    n1=fbm(R,seed,6,4); n2=fbm(R,seed+1,4,24); n3=fbm(R,seed+2,3,120)
    if streak:
        l=np.abs(np.sin(u*np.pi*13+n1*.6)); h=gaussian_filter(l,2)*.5+n3*.05; c=mid*(1+n1[...,None]*.25)*(.86+.2*l[...,None]); mr=np.exp(-(u/.05)**2); c=c*(1-mr[...,None]*.25); h-=mr*.8
        if variegate is not None:
            e=np.clip((au+n1*.10-.0-variegate['edge'])/.05,0,1) if variegate['mode']=='edge' else np.clip((variegate['edge']-au+n1*.12)/.05,0,1)
            fine=np.clip((np.sin(u*42+n1*5)-.55)*2.5,0,1)*.35*(1-e); c=c*(1-(e+fine)[...,None].clip(0,1))+np.array(variegate['c'])*(1+n1[...,None]*.12)*(e+fine)[...,None].clip(0,1)
        c*=1+n3[...,None]*.12; return c,h
    phase=(v-au*slope*(1-.35*v)-curve*au*au+n1*.012)*nlat
    lat=np.abs(phase-np.round(phase))/nlat; latw=.0042*(1.25-au*.75); L=np.exp(-(lat/latw)**2)*np.clip((au-.0)/.06,0,1)*np.clip((1.02-au)*6,0,1)
    mr=np.exp(-(u/(.028*(1.15-v*.75)))**2)
    W=worley(R,seed+5,tert,(n2*.02,n2*.02)); T=np.clip(1-W/.16,0,1)
    W2=worley(R,seed+6,tert*3,(n2*.01,n2*.01)); T2=np.clip(1-W2/.2,0,1)
    blade=.5-.5*np.cos(2*np.pi*phase)    # height between laterals
    h=blade*quilt*(.35+.65*au)*1.4-L*1.1-mr*2.2-T*.22*quilt-T2*.07+n2*.25+n3*.05
    deep=np.clip(.5+n1*1.1+(1-blade)*.18,0,1)
    c=dark*(1-deep[...,None])+mid*deep[...,None]
    c=c*(1+n2[...,None]*.16)*(1+n3[...,None]*.1)
    vm=np.clip(mr*.95+L*.55+T*.10+T2*.05,0,1)[...,None]; c=c*(1-vm)+vein*vm
    c=c*(1-.22*np.exp(-((1-au)/.02)**2)[...,None])
    spk=np.clip((fbm(R,seed+9,3,160)-.34)*5,0,1)*np.clip((fbm(R,seed+10,4,5)-.05)*4,0,1); c=c*(1-spk[...,None]*.16)
    if variegate is not None:
        f=fbm(R,seed+20,6,5,.6)+fbm(R,seed+21,4,40)*.35; e=np.clip((f-variegate['t'])/.035,0,1); e2=e[...,None]*.92; c=c*(1-e2)+np.array(variegate['c'])*(1+n1[...,None]*.2)*e2*(1-.25*vm)+c*e2*.0
    return c,h
def A(*x): return np.array(x,float)
SPEC={
 'heart':dict(args=dict(dark=A(.030,.066,.020),mid=A(.055,.118,.028),vein=A(.085,.20,.045),nlat=8,slope=.75,curve=.15,quilt=.8,seed=3),rough=.27,trans=A(.75,1.0,.38)*.55,vary=.34),
 'lime':dict(args=dict(dark=A(.17,.26,.030),mid=A(.29,.39,.055),vein=A(.42,.55,.10),nlat=8,slope=.75,curve=.15,quilt=.7,seed=4),rough=.32,trans=A(1,1.0,.4)*.6,vary=.30),
 'pothos':dict(args=dict(dark=A(.022,.085,.018),mid=A(.05,.16,.028),vein=A(.10,.23,.05),nlat=8,slope=.7,curve=.15,quilt=.7,seed=5,variegate=dict(t=.16,c=(.42,.46,.12))),rough=.33,trans=A(.85,1,.4)*.5,vary=.3),
 'monstera':dict(args=dict(dark=A(.020,.050,.018),mid=A(.038,.088,.026),vein=A(.07,.17,.05),nlat=8,slope=.62,curve=.0,quilt=1.3,seed=6),rough=.24,ns=5,trans=A(.75,1,.4)*.4,vary=.18),
 'lily':dict(args=dict(dark=A(.020,.047,.015),mid=A(.037,.087,.023),vein=A(.055,.14,.035),nlat=17,slope=.42,curve=.1,quilt=1.5,seed=7,tert=44),rough=.22,ns=4,trans=A(.75,1,.4)*.4,vary=.22),
 'pep':dict(args=dict(dark=A(.02,.075,.02),mid=A(.05,.145,.028),vein=A(.09,.20,.05),nlat=5,slope=.9,curve=.3,quilt=.5,seed=8),rough=.27,trans=A(.75,1,.4)*.35,vary=.3),
 'fern':dict(args=dict(dark=A(.062,.13,.022),mid=A(.115,.205,.034),vein=A(.12,.27,.05),nlat=14,slope=.35,curve=.1,quilt=.9,seed=9),rough=.5,trans=A(.85,1,.35)*.6,vary=.34),
 'spider':dict(args=dict(dark=None,mid=A(.06,.15,.032),vein=None,streak=True,seed=10,variegate=dict(mode='mid',edge=.30,c=(.52,.56,.30))),rough=.36,trans=A(.85,1,.4)*.55,vary=.22),
 'lirio':dict(args=dict(dark=None,mid=A(.028,.10,.018),vein=None,streak=True,seed=11),rough=.36,trans=A(.8,1,.4)*.5,vary=.35),
 'fig':dict(args=dict(dark=A(.028,.10,.018),mid=A(.06,.17,.025),vein=A(.11,.22,.05),nlat=5,slope=.7,curve=.1,quilt=1.2,seed=12,tert=14),rough=.45,trans=A(.8,1,.4)*.5,vary=.45),
 'syng':dict(args=dict(dark=A(.06,.17,.04),mid=A(.16,.30,.10),vein=A(.36,.46,.25),nlat=7,slope=.6,curve=.1,quilt=.9,seed=13),rough=.4,trans=A(.85,1,.45)*.55,vary=.25),
 'purple':dict(args=dict(dark=A(.035,.018,.022),mid=A(.075,.028,.036),vein=A(.15,.05,.07),nlat=7,slope=.7,curve=.1,quilt=1.2,seed=14),rough=.38,trans=A(1,.4,.5)*.4,vary=.35),
}
def mats(s):
    out={}
    for k,p in SPEC.items():
        f=f'{ROOT}/tex/leaf_{k}.npz'; os.makedirs(ROOT+'/tex',exist_ok=True)
        if not os.path.exists(f): c,h=leaf_tex(k,**p['args']); np.savez(f,c=enc(c),n=tonormal(h,p.get('ns',3.2)))
        d=np.load(f); cc=d['c']
        if k=='monstera': cc=np.dstack([cc,(mon_alpha()*255).astype('u1')])
        s.texture('leafc_'+k,cc); s.texture('leafn_'+k,d['n'])
        out[k]=s.mat('leaf_'+k,(1,1,1),p['rough'],spec=.5,trans=p['trans'],tBase='leafc_'+k,tNorm='leafn_'+k,nStr=1.,vary=p['vary'],alpha=.5 if k=='monstera' else None)
    out['stem']=s.mat('stem',(.10,.17,.04),.5,spec=.4,trans=(.2,.25,.1)); out['soil']=s.mat('soil',(.016,.011,.008),.95,spec=.15); out['black']=s.mat('vessel',(.012,.013,.012),.42,spec=.4)
    return out
# ------------------------------------------------ blade builders. local frame: base at 0, along +Y, face +Z
def blade(outl,L,W,nu=13,nv=9,bend=.6,fold=.18,wave=0,wf=3,twist=0,cup=0,ph=0,curl=0,tex=1.,lobes=0.,rise=0.):
    """outl(s)-> (x half width 0..1, y offset) margin per s; returns P,F,UV,t"""
    s=np.linspace(0,1,nu); e=np.linspace(-1,1,nv); x,y0=outl(s)
    S=np.repeat(s[:,None],nv,1); E=np.repeat(e[None],nu,0); AE=np.abs(E)
    ym=s[:,None]*(1-AE)+ (y0[:,None])*AE ; xm=x[:,None]*E
    # edge wave / cup / fold, in blade space
    z=AE*x[:,None]*W*np.tan(fold)+cup*(E*x[:,None])**2*W+wave*W*np.sin(wf*2*np.pi*S+ph+np.sign(E)*1.3)*AE**2*x[:,None]
    # spine arc
    yl=ym*L; ang=rise-bend*np.clip(ym,-.4,1)-curl*np.clip(ym-.6,0,1)**2*4
    ys=np.linspace(-.45,1,60); aa=rise-bend*ys-curl*np.clip(ys-.6,0,1)**2*4; cy=np.concatenate([[0],np.cumsum((np.cos(aa[:-1])+np.cos(aa[1:]))/2*np.diff(ys))]);cz=np.concatenate([[0],np.cumsum((np.sin(aa[:-1])+np.sin(aa[1:]))/2*np.diff(ys))])
    k0=np.interp(0,ys,cy);kz=np.interp(0,ys,cz); Y=(np.interp(ym,ys,cy)-k0)*L; Z=(np.interp(ym,ys,cz)-kz)*L
    tw=twist*np.clip(ym,0,1); X=xm*W; nx=np.cos(tw);nz=np.sin(tw)
    P=np.stack([X*nx-z*nz,Y-np.sin(ang)*(z*nx+X*nz),Z+np.cos(ang)*(z*nx+X*nz)],-1)
    UV=np.stack([.5+E*.5*tex,np.clip(S,0,1)],-1); return P.reshape(-1,3),grid_faces(nu,nv)[:,::-1],UV.reshape(-1,2),S.ravel()
def o_heart(s):
    t=s; x=np.interp(t,[0,.04,.10,.18,.28,.42,.58,.74,.88,.96,1],[0,.36,.66,.87,.98,1.,.86,.56,.24,.07,0]); y=np.interp(t,[0,.04,.10,.18,.28,.42,.58,.74,.88,.96,1],[.0,-.13,-.17,-.13,-.03,.16,.40,.62,.82,.93,1]); return x,y
def o_ell(p=1.,tip=.9):
    def f(s): return (np.sin(np.pi*np.clip(s,0,1)**tip)**p)*(1-.15*s),s+.04*np.sin(np.pi*s)
    return f
def o_pin(s): return np.minimum(1,np.clip(s,0,1)*5+.62)*(1-np.clip((s-.35)/.65,0,1)**2.2),s
def o_strap(s): return np.minimum(1,np.clip(s,0,1)*9+.35)*(1-np.clip((s-.45)/.55,0,1)**1.7),s
def o_round(s): return np.sqrt(np.clip(1-(2*s-1)**2,0,1))*.98,s
def o_arrow(s):
    return np.interp(s,[0,.05,.12,.2,.3,.5,.75,1],[0,.55,.85,.72,.62,.58,.36,0]),np.interp(s,[0,.05,.12,.2,.3,.5,.75,1],[0,-.24,-.28,-.06,.14,.42,.73,1])
def o_mon(s):
    k=[0,.04,.10,.2,.35,.55,.72,.86,.95,1]; return np.interp(s,k,[0,.42,.76,.95,1.,.94,.76,.46,.18,0]),np.interp(s,k,[0,-.15,-.2,-.12,.1,.38,.6,.79,.92,1])
def mon_alpha():
    v,u=np.mgrid[0:R,0:R]/(R-1.); u=u*2-1; au=np.abs(u); a=np.ones((R,R)); r=np.random.default_rng(5); nlat=8; ph=(v-au*.62*(1-.35*v))*nlat
    for side in(-1,1):
        m=u*side>0
        for k in range(0,6):
            c=k+.5+r.uniform(-.12,.12)-.55; start=r.uniform(.34,.56)+(.16 if k>4 else 0); w=np.interp(au,[start,start+.12,.8,1.],[0,.13,.17,.24])*r.uniform(.75,1.1)
            a[m&(np.abs(ph-c-.05*np.sin(au*9))<w)&(au>start)]=0
            if 0<k<5: a[m&(((ph-c)/.16)**2+((au-.2)/.055)**2<1)]=0
    return gaussian_filter(a,1.2)
def tube(pts,r0,r1,n=5):
    pts=np.array(pts); m=len(pts); T=np.gradient(pts,axis=0); T/=np.linalg.norm(T,axis=1,keepdims=True)+1e-9; up=np.array([.31,.2,.93]); P=[]
    for i in range(m):
        a=np.cross(T[i],up); a/=np.linalg.norm(a)+1e-9; b=np.cross(T[i],a); r=r0+(r1-r0)*i/(m-1); th=np.linspace(0,2*np.pi,n+1)
        P.append(pts[i]+r*(np.cos(th)[:,None]*a+np.sin(th)[:,None]*b))
    return np.concatenate(P),grid_faces(m,n+1)
class Build:
    def __init__(b): b.P=[];b.F=[];b.UV=[];b.t=[];b.leaf=[];b.mat=[];b.n=0;b.nl=0;b.root=[];b.tint=[]
    def part(b,P,F,UV,t,leaf,mat,tint=0.):
        b.P.append(P);b.F.append(F+b.n);b.UV.append(UV);b.t.append(t);b.leaf.append(np.full(len(P),leaf,float));b.mat.append(np.full(len(F),mat));b.tint.append(np.full(len(P),tint)); b.n+=len(P)
    def leafid(b,root): b.root.append(np.asarray(root,float)); b.nl+=1; return b.nl-1
def frame(dirv,face):
    y=dirv/np.linalg.norm(dirv); z=face-y*np.dot(face,y); z/=np.linalg.norm(z)+1e-9; return np.stack([np.cross(y,z),y,z],1)
def bez(a,b,c,n=8): t=np.linspace(0,1,n)[:,None]; return (1-t)**2*a+2*t*(1-t)*b+t*t*c
def plant(kind,rng,M):
    b=Build(); U=rng.uniform; lm=M[kind]; st=M['stem']
    def heartlike(n,size,reach,outl=o_heart,spread=1.,ar=.62,flat=.3,hang=1.,nu=15,nv=9):
        for i in range(n):
            k=(i+.5)/n; a=U(-1,1)*1.25*spread; el=U(-.5,1.1); L=size*U(.62,1.12)*(1-.25*(k>.85)); rch=reach*U(.45,1.1)
            d=np.array([np.sin(a)*1.0,np.sin(el)*.75-.1*hang,.35+U(0,.75)]); d/=np.linalg.norm(d); p0=np.array([U(-.02,.02),U(-.02,.02),0]); tip=p0+d*rch; tip[1]-=.35*hang*rch*U(.3,1.)
            pid=b.leafid(p0); pts=bez(p0,p0+d*rch*.6+np.array([0,.25*rch,0]),tip); P,F=tube(pts,.0022,.0014); b.part(P,F,np.zeros((len(P),2)),np.linspace(0,.35,len(pts)).repeat(6),pid,st)
            face=np.array([np.sin(a)*.75+U(-.35,.35),U(.0,.75),U(.65,1.1)]); dirv=np.array([np.sin(a)*.8+U(-.35,.35),-U(.35,1.1)*hang,U(-.05,.5)]);
            P,F,UV,t=blade(outl,L,L*ar,nu,nv,bend=U(.2,.85),fold=U(.06,.32),wave=U(.0,.09),wf=U(1,2.5),twist=U(-.35,.35),ph=U(0,6),curl=U(0,.35))
            Rm=frame(dirv,face); P=P@Rm.T+tip; b.part(P,F,UV,.35+.65*t,pid,lm,U(-.16,.16)+(.35 if k>.88 and kind in('heart','lime','pothos') else 0))
    if kind in('heart','lime','pothos'): heartlike(int(U(16,22)),.098 if kind!='pothos' else .115,.15)
    elif kind=='syng': heartlike(int(U(12,16)),.13,.19,o_arrow,1.,.55,hang=.8)
    elif kind=='purple': heartlike(int(U(18,24)),.075,.13,o_ell(.8),1.,.36)
    elif kind=='pep': heartlike(int(U(22,30)),.062,.11,o_round,1.,.44,hang=.55,nu=11,nv=7)
    elif kind=='fig':
        for i in range(int(U(80,110))):
            a=U(0,6.28); r=.11*np.sqrt(U(0,1)); p0=np.array([0,0,0.]); tip=np.array([np.cos(a)*r*1.1,np.sin(a)*r-.05*U(0,1.6),U(.03,.12)]); pid=b.leafid(p0*0+tip*.3); L=U(.02,.036)
            P,F,UV,t=blade(o_heart,L,L*.58,8,5,bend=U(.1,.6),fold=U(.1,.35),wave=.05,twist=U(-.4,.4),ph=U(0,6)); Rm=frame(np.array([U(-1,1),-U(.2,1.),U(-.2,.6)]),np.array([U(-.6,.6),U(-.1,.8),1.])); b.part(P@Rm.T+tip,F,UV,t,pid,lm,U(-.25,.3))
    elif kind=='lily':
        for i in range(int(U(13,18))):
            a=U(-1,1)*1.3; L=U(.17,.27); d=np.array([np.sin(a)*.85,U(.1,1.),U(.45,1.)]); d/=np.linalg.norm(d); rch=U(.05,.13); p0=np.array([U(-.02,.02),U(-.02,.02),0]); tip=p0+d*rch; pid=b.leafid(p0); pts=bez(p0,p0+d*rch*.5,tip); P,F=tube(pts,.003,.002); b.part(P,F,np.zeros((len(P),2)),np.linspace(0,.2,len(pts)).repeat(6),pid,st)
            P,F,UV,t=blade(o_ell(.9,.85),L,L*.20,18,9,bend=U(1.1,2.2),fold=U(.15,.4),wave=U(.05,.16),wf=U(2,4),twist=U(-.5,.5),ph=U(0,6),curl=U(0,.3),rise=.0)
            Rm=frame(d+np.array([0,.25,0]),np.array([-d[0]*.3,1.,.75])); b.part(P@Rm.T+tip,F,UV,.2+.8*t,pid,lm,U(-.15,.2))
    elif kind in('spider','lirio'):
        n=int(U(30,40)) if kind=='spider' else int(U(46,60))
        for i in range(n):
            a=U(-1,1)*1.5; L=(U(.2,.40) if kind=='spider' else U(.18,.36)); W=L*(.030 if kind=='spider' else .017)*U(.8,1.2); d=np.array([np.sin(a)*.8,U(.25,1.1),U(.35,.95)]); p0=np.array([U(-.015,.015),U(-.015,.015),0]); pid=b.leafid(p0)
            P,F,UV,t=blade(o_strap,L,W,18,4,bend=U(1.5,2.9),fold=U(.35,.6),twist=U(-.8,.8),rise=.0); Rm=frame(d,np.array([-d[0]*.4,.8,.55])); b.part(P@Rm.T+p0,F,UV,t,pid,lm,U(-.15,.15))
    elif kind=='fern':
        for i in range(int(U(13,17))):
            a=U(-1,1)*1.35; L=U(.20,.38); d=np.array([np.sin(a)*.8,U(.15,1.),U(.45,1.)]); d/=np.linalg.norm(d); p0=np.array([U(-.015,.015),U(-.015,.015),0]); pid=b.leafid(p0); bend=U(1.0,1.9); Rm=frame(d,np.array([-d[0]*.4,1.,.65])); n=int(L/.0088); tw=U(-.5,.5)
            s=np.linspace(0,1,40); ang=-bend*s; cy=np.concatenate([[0],np.cumsum(np.cos(ang[:-1])/39)])*L; cz=np.concatenate([[0],np.cumsum(np.sin(ang[:-1])/39)])*L
            pts=np.stack([np.zeros(12),np.interp(np.linspace(0,1,12),s,cy),np.interp(np.linspace(0,1,12),s,cz)],1); P,F=tube(pts,.0022,.0008,4); b.part(P@Rm.T+p0,F,np.zeros((len(P),2)),np.linspace(0,1,12).repeat(5),pid,st)
            for j in range(3,n):
                k=j/n; ll=.050*np.sin(np.pi*min(1,.12+k*.9)**.8)**.8*(L/.3)**.5*U(.88,1.1)+.004; th=-bend*k; c=np.array([0,np.interp(k,s,cy),np.interp(k,s,cz)]); T=np.array([0,np.cos(th),np.sin(th)]);Nn=np.array([0,-np.sin(th),np.cos(th)])
                for sg in(-1,1):
                    dirp=np.array([sg,0,0])*np.cos(.28)+T*np.sin(.28)+Nn*U(-.28,.05); nn=Nn*np.cos(tw*k)+np.array([1,0,0])*np.sin(tw*k)*.6
                    P,F,UV,t=blade(o_pin,ll,.0068*(L/.3)**.4,6,4,bend=U(.2,.7),fold=U(.05,.3),twist=U(-.2,.2)); b.part((P@frame(dirp,nn+np.array([U(-.12,.12),U(-.12,.12),0])).T+c)@Rm.T+p0,F,UV,.1+.9*k+0*t,pid,lm,U(-.12,.12)+(k>.86)*.3)
    elif kind=='monstera':
        for i in range(int(U(4,6))):
            a=U(-1,1)*1.2; L=U(.26,.40); rch=U(.24,.46); d=np.array([np.sin(a)*.9,U(-.2,.9),U(.6,1.)]); d/=np.linalg.norm(d); p0=np.array([U(-.02,.02),U(-.02,.02),0]); tip=p0+d*rch; tip[1]-=.1*rch; pid=b.leafid(p0); pts=bez(p0,p0+d*rch*.55+np.array([0,.2*rch,0]),tip,12); P,F=tube(pts,.0055,.0038,7); b.part(P,F,np.zeros((len(P),2)),np.linspace(0,.4,12).repeat(8),pid,st)
            P,F,UV,t=blade(o_mon,L,L*.52,30,17,bend=U(.35,.8),fold=U(.02,.2),wave=.03,wf=5,twist=U(-.25,.25),cup=-.12,curl=U(0,.25)); Rm=frame(np.array([d[0]*.8+U(-.3,.3),-U(.45,1.),U(.1,.5)]),np.array([d[0]*.4,U(.35,.9),U(.75,1.)])); b.part(P@Rm.T+tip,F,UV,.4+.6*t,pid,lm,U(-.1,.15))
    return b
VN={'heart':5,'lime':3,'pothos':3,'monstera':3,'lily':3,'pep':3,'fern':3,'spider':3,'lirio':2,'fig':3,'syng':3,'purple':3}
def kit(s,kinds=None,seed=11):
    M=mats(s); K={}
    for k in (kinds or VN):
        K[k]=[]
        for j in range(VN[k]):
            b=plant(k,np.random.default_rng(seed*100+hash_(k)+j),M); P=np.concatenate(b.P);F=np.concatenate(b.F); m=np.concatenate(b.mat)
            i=s.mesh(P,F,0,UV=np.concatenate(b.UV),t=np.concatenate(b.t),leaf=np.concatenate(b.leaf),tint=np.concatenate(b.tint)); s.T[-1][:,3]=m.astype(np.uint32)
            K[k].append((i,np.array(b.root),len(F)))
    return K,M
def hash_(k): return sum(ord(c)*(i+3) for i,c in enumerate(k))%997
