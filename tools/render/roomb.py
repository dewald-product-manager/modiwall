from rooma import *
def pend(s,m,c,r,e,group,drop,flat=.62):
    al=s.mat(f'alab{group}',(.95,.88,.78),.5,spec=.4,emit=tuple(e*np.array([1.,.78,.5])),tBase='ptex/alab_d.png',egroup=group,scale=(2,1))
    t=np.linspace(0,np.pi,40); P,F,UV=lathe([(r*np.sin(a)+1e-5,-r*flat*np.cos(a)) for a in t],80); s.add(s.mesh(P,F,al,UV=UV),place(c))
    s.box((c[0]-.006,c[1]+r*flat,c[2]-.006),(c[0]+.006,drop,c[2]+.006),m['bronze']); cyl(s,m['brass'],(c[0],c[1]+r*flat-.015,c[2]),.05,.06,.008)
    q=.9*r; E=np.array([1.,.74,.44])*e*9.
    for n in range(3):
        for sg in(-1,1):
            u=np.zeros(3);v=np.zeros(3); u[(n+1)%3]=q; v[(n+2)%3]=q*(flat if (n+2)%3==1 else 1)
            if (n+1)%3==1: u*=flat
            p=np.array(c,float); p[n]+=sg*(r*(flat if n==1 else 1)+.012); p-=u/2+v/2
            if np.cross(u,v)[n]*sg<0: u,v=v,u
            s.quad(p,u,v,E,group,0,0)
def shell(s,m,x0,x1,h,zf=12):
    s.box((x0,-.2,-.5),(x1,0,zf),m['floor']); s.box((x0,h,-.5),(x1,h+.3,zf),m['ceil']); s.box((x0-.3,0,-.5),(x0,h,zf),m['washd']); s.box((x1,0,-.5),(x1+.3,h,zf),m['washd'])
def mat_scene(name):
    s=Scene(name,tex=2048); m=std(s); m['floor']=s.mat('floord',(.34,.32,.29),.55,spec=.5,tBase='ptex/lime_d.png',tNorm='ptex/lime_n.png',tRough='ptex/lime_r.png',scale=1/2.4,box=True,nStr=.3); s.mats[-1]['rough']=.42; m['ceil']=s.mat('ceild',(.25,.24,.23),.9)
    h=4.3; shell(s,m,-8.2,8.2,h); s.box((-8.2,0,-.5),(8.2,h,-.3),m['washd'])
    # bookmatched marble monolith
    x0,x1=-7.3,-3.15; mid=(x0+x1)/2; s.box((x0,0,-.3),(x1,h,.30),m['stonedark'])
    for k,(a,b,fl) in enumerate(((x0,mid-.0015,0),(mid+.0015,x1,1))):
        w=b-a; U=w/4.5; V=h/4.5; o=.03; q=.02; q2=q+U*fl; uv=[[q2,o],[q2+U,o],[q2+U,o+V],[q2,o+V]]; rect(s,m['marble'],(a,.0,.304),(w,0,0),(0,h,0),uv)
    s.box((mid-1.25,.42,.1),(mid+1.25,.86,.33),m['black']); s.box((x0,.0,.3),(x1,.34,.72),m['marble'],.004)
    # fluted walnut
    s.box((3.5,0,-.3),(8.2,h,.10),m['walnutb']); flutes(s,m['walnut'],3.52,8.2,.0,h,.10,.032,.5); s.box((3.42,0,-.3),(3.52,h,.2),m['bronze'])
    # the niche and its planting
    s.box((-3.15,3.86,-.3),(3.5,h,.12),m['washd']); s.box((-2.95,0,-.3),(3.42,.12,.3),m['stonedark'],.008)
    K,M=plants.kit(s); L,_,_=layout(6.1,3.72,dict(WSTY,density=2.,str=3.),52,px=.105,py=.12); L=drop(L,None,dict(monstera=.7,lily=.18)); s.rec=[(r[0],*r[2]) for r in plantwall(s,K,L,9,1,frame=xf(t=(-2.82,.14,-.16)),scale=1.05)]; s.box((-3.0,.1,-.3),(3.4,3.86,-.2),M['black'])
    # furniture
    s.box((-1.9,0,1.5),(3.1,.02,4.6),m['rug'],.01); cyl(s,m['lime'],(.55,.02,2.9),.6,.34,.02); gltf(s,'ceramic_vase_02',place((.4,.36,2.75),.4),height=.34); gltf(s,'wooden_bowl_01',place((.8,.36,3.05),1.),height=.08)
    gltf(s,'mid_century_lounge_chair',place((2.25,.02,2.5),-1.0),height=1.02); gltf(s,'modern_arm_chair_01',place((-1.1,.02,2.5),.9),height=.82)
    pend(s,m,(.75,2.42,2.6),.46,1.5,2,h)
    for x in(-6.6,-5.75,-4.7,-3.85): s.spot((x,h-.02,1.05),(0,-1,-.30),.05,(3600,3400,3100),0,12)
    s.quad((-7.2,h-.01,.45),(4.,0,0),(0,0,.12),(34,32,29),0)
    for x in np.arange(4.1,8.1,.8): s.spot((x,h-.02,.62),(0,-1,-.16),.05,(2000,1420,900),1,12)
    s.quad((3.6,h-.01,.35),(4.5,0,0),(0,0,.1),(16,11.4,7.4),1)
    s.quad((-2.8,h-.01,.45),(6.1,0,0),(0,0,.55),(24,21,16.5),3); s.quad((-3.2,h-.02,4.5),(6.6,0,0),(0,0,3.2),(1.7,1.65,1.5),3)
    s.save(); return s
def night_scene(name):
    s=Scene(name,tex=2048); m=std(s); m['floor']=s.mat('floord',(.42,.39,.35),.55,spec=.5,tBase='ptex/lime_d.png',tNorm='ptex/lime_n.png',tRough='ptex/lime_r.png',scale=1/2.4,box=True,nStr=.3); s.mats[-1]['rough']=.5; m['ceil']=s.mat('ceild',(.32,.31,.29),.9)
    h=4.0; shell(s,m,-7.6,7.4,h); s.box((-7.6,0,-.5),(7.4,h,-.06),m['wash']); s.box((.5,0,-.06),(7.0,.1,.32),m['stonedark'],.008)
    K,M=plants.kit(s); L,_,_=layout(6.3,3.7,dict(WSTY,density=2.,str=3.),64,px=.105,py=.12); L=drop(L,None,dict(monstera=.7,lily=.18)); plantwall(s,K,L,9,1,frame=xf(t=(.6,.14,.02)),scale=1.05); s.box((.6,.1,-.06),(6.9,3.84,.01),M['black'])
    s.box((.2,3.86,-.06),(7.4,h,.10),m['ceil'])
    s.box((-.6,0,1.4),(5.6,.02,5.0),m['rug'],.01); gltf(s,'mid_century_lounge_chair',place((2.0,.02,2.1),.55),height=1.02); sofa(s,m['teddy'],(5.1,.02,3.1),-np.pi/2+.1,2.5,1.05,m['bronze']); cushion(s,m['clay'],(5.25,.6,2.35),-np.pi/2+.2,.46,-.35)
    cyl(s,m['lime'],(3.35,.02,3.2),.58,.33,.02); gltf(s,'ceramic_vase_04',place((3.2,.35,3.1),.4),height=.28); gltf(s,'wooden_bowl_01',place((3.6,.35,3.3),1.),height=.08)
    cyl(s,m['bronze'],(1.1,.02,3.0),.24,.46,.008); gltf(s,'ceramic_vase_01',place((1.1,.48,3.0),.4),height=.22)
    s.box((-5.4,.42,-.06),(-1.6,.5,.40),m['walnutb'],.006); gltf(s,'marble_bust_01',place((-4.6,.5,.18),.2),height=.5)
    cyl(s,m['bronze'],(-.35,0,1.2),.15,.02); cyl(s,m['bronze'],(-.35,0,1.2),.011,1.5); sh=s.mat('shade',(.85,.8,.7),.9,trans=(.6,.55,.42),emit=(2.2,1.55,.85),egroup=3); P,F,UV=lathe([(.20,1.42),(.165,1.76)],64); s.add(s.mesh(P,F,sh,UV=UV),place((-.35,0,1.2)))
    s.quad((-.47,1.70,1.08),(.24,0,0),(0,0,.24),(26,18,10),3); s.quad((-.47,1.46,1.32),(.24,0,0),(0,0,-.24),(26,18,10),3)
    for x,y,z,r in((3.0,2.55,2.5,.15),(3.55,2.10,2.9,.18),(4.1,2.75,2.6,.13)): pend(s,m,(x,y,z),r,2.6,1,h,1.)
    s.quad((.7,h-.01,.5),(6.2,0,0),(0,0,.35),(26,21,14.5),2)
    for x in(1.4,2.9,4.4,5.9): s.spot((x,h-.02,1.35),(0,-1,-.62),.05,(620,500,340),2,9)
    s.quad((-7.5,.3,1.5),(0,3.4,0),(0,0,7.5),(.62,.9,1.5),0); s.quad((-7.4,h-.1,11.9),(14.8,0,0),(0,-3.8,0),(.022,.032,.05),0)
    s.save(); return s
CAM=dict(bounces=8,clamp=3,maxv=40,tile=256)
VIEWS={'mat':(mat_scene,dict(eye=[0.15,1.5,11.4],at=[0.15,1.5,0],fov=36,shiftY=.10)),'night':(night_scene,dict(eye=[.2,1.45,10.6],at=[.2,1.45,0],fov=34,shiftY=.10))}
def go(n,w,h,spp):
    sc,c=VIEWS[n]; s=sc('rb_'+n)
    if hasattr(s,'rec'): json.dump(s.rec,open(f'out/rb_{n}_rec.json','w'),default=float)
    rt.render('rb_'+n,[('rb_'+n,dict(CAM,**c,w=w,h=h,spp=spp,aov=True))])
if __name__=='__main__':
    w=int(sys.argv[1]);h=w*9//16; spp=int(sys.argv[2])
    for n in sys.argv[3].split(','):
        go(n,w,h,spp); a,_,_=rt.load('rb_'+n)
        for g in range(4): rt.save(f'out/rb_{n}_{g}.png',a[...,g,:],.9)
        rt.save(f'out/rb_{n}.png',a.sum(2),.9)
