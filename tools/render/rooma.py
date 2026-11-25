from roomlib import *; from wall import *; import rt,sys,json
W,H=12.,5.
WSTY=dict(STY['forest'],density=1.5,str=3.2,ang=.55,mix=dict(heart=8,lime=2.2,fern=5,spider=3,lily=2.4,monstera=2.2,pep=2,syng=1.2,lirio=2))
def planted_wall(s,pl,w=W,h=H,seed=77,y0=.16,px=.115,py=.13):
    if not pl: return
    K,M=plants.kit(s); L,_,_=layout(w,h,WSTY,seed,px=px,py=py); L=drop(L,None,dict(monstera=.75,lily=.18))
    rec=plantwall(s,K,L,9,1,frame=xf(t=(-w/2,y0,.02)),scale=1.08); s.box((-w/2,y0,-.05),(w/2,y0+h-.04,.01),M['black']); s.rec=[(r[0],*r[2]) for r in rec]
def scene(kind,planted,name):
    s=Scene(name,tex=2048); m=std(s); {'in':indoor,'out':outdoor,'both':court}[kind](s,m); s.box((-6.1,0,-.06),(6.1,.12,.34),m['stonedark'],.01); planted_wall(s,planted); s.save(); return s
def lamp(s,m,t,e=1.1):
    cyl(s,m['bronze'],t,.17,.02); cyl(s,m['bronze'],t,.012,1.55); sh=s.mat('shade',(.85,.8,.7),.9,trans=(.6,.55,.42),emit=(e,.72*e,.4*e),egroup=1); P,F,UV=lathe([(.23,1.45),(.19,1.85)],64); s.add(s.mesh(P,F,sh,UV=UV),place(t))
def indoor(s,m):
    s.box((-7.6,-.2,-.4),(7.6,0,20),m['lime']); s.box((-7.6,-.2,-.4),(7.6,6,-.06),m['wash']); s.box((-7.6,5.4,-.4),(7.6,5.8,20),m['white']); s.box((-7.6,5.1,.75),(7.6,5.4,20),m['white'])
    for k in range(9): s.box((-7.4,4.94,2.2+k*1.9),(7.4,5.1,2.40+k*1.9),m['walnutb'])
    s.box((7.2,0,-.1),(7.6,5.4,20),m['wash']); s.box((-7.6,4.75,-.1),(-7.2,5.4,20),m['wash']); s.box((-7.6,0,-.1),(-7.2,5.4,1.2),m['wash'])
    for z in np.arange(1.2,18,2.1): s.box((-7.5,0,z),(-7.38,4.8,z+.07),m['bronze'])
    s.box((-7.5,2.9,1.2),(-7.38,2.97,18),m['bronze']); curtain(s,m['linen'],-7.0,1.25,2.6,4.75,folds=8); s.box((7.02,.0,.4),(7.2,5.1,3.2),m['walnutb'])
    s.box((-4.6,.0,1.75),(2.5,.022,6.4),m['rug'],.011); sofa(s,m['teddy'],(-3.55,.02,3.9),np.pi/2-.06,2.7,1.08,m['bronze'])
    cushion(s,m['linen'],(-3.75,.62,3.05),np.pi/2-.2,.5,-.35); cushion(s,m['clay'],(-3.72,.6,4.75),np.pi/2+.25,.46,-.4); gltf(s,'mid_century_lounge_chair',place((2.05,.02,2.95),-.75),height=1.02)
    cyl(s,m['lime'],(-1.35,.02,3.75),.62,.33,.02); cyl(s,m['bronze'],(-.45,.02,4.55),.36,.45,.01); gltf(s,'ceramic_vase_02',place((-1.5,.35,3.65),.4),height=.36); gltf(s,'wooden_bowl_01',place((-1.12,.35,3.98),1.),height=.085)
    for k,(dx,c) in enumerate(((0,m['linen']),(.012,m['clay']),(-.01,m['white']))): s.box((-.60+dx,.47+k*.028,4.42),(-.32+dx,.496+k*.028,4.62),c,.004)
    cyl(s,m['clay'],(5.35,0,1.75),.42,.72,.06); gltf(s,'island_tree_01',place((5.35,.62,1.75),.6),height=3.1,tint=(1.2,1.25,1.05),vary=.2)
    lamp(s,m,(-5.6,0,2.0)); s.box((3.9,0,5.9),(5.6,.42,6.8),m['teddy'],.16)
    s.quad((-7.35,.05,1.3),(0,4.65,0),(0,0,16.5),(7.6,8.0,8.6),0); s.quad((-7,5.05,20),(14,0,0),(0,-5,0),(.34,.35,.37),0); s.quad((-6.6,5.38,.12),(13.2,0,0),(0,0,.5),(5.6,4.7,3.5),1)
    s.sun=dict(dir=[-.80,.62,.50],size=.02,e=[9,7.6,5.6],group=0); s.sky=dict(up=[3,3.4,4],hor=[3,3.1,3.2],down=[.6,.55,.5],e=.6,group=0)
def lounger(s,m,t,yaw):
    M=place(t,yaw)
    def b(lo,hi,mt,bev=.02,Rr=None,o=(0,0,0)):
        P,F,UV,N=box_mesh(lo,hi,bev); RR=np.eye(3) if Rr is None else Rr; s.add(s.mesh(P,F,mt,UV=UV,N=N),np.concatenate([M[:,:3]@RR,(M[:,:3]@np.array(o,float)+M[:,3])[:,None]],1))
    b((-.36,.16,-1.),(.36,.22,1.),m['oak']); b((-.34,.22,-.35),(.34,.32,.98),m['teddy'],.05); b((-.34,0,-.75),(.34,.10,0),m['teddy'],.05,rotx(.62),(0,.24,-.33))
    for x in(-.3,.3):
        for z in(-.85,.85): b((x-.03,0,z-.03),(x+.03,.17,z+.03),m['oak'],.004)
OL=(1.15,1.2,1.)
def outdoor(s,m):
    s.box((-30,-.2,-.4),(30,0,5.2),m['lime']); s.box((-30,-.2,10.6),(30,0,30),m['lime']); s.box((-30,-.2,5.2),(-2.6,0,10.6),m['lime']); s.box((7.4,-.2,5.2),(30,0,10.6),m['lime']); s.box((-30,-2,5.2),(30,-1.2,10.6),m['stonedark'])
    w=s.mat('water',(.016,.07,.075),.03,spec=.6,tNorm='ptex/water_n.png',scale=1/3.,box=True,nStr=.10); s.box((-2.6,-.4,5.2),(7.4,-.06,10.6),w)
    s.box((-7.8,-.2,-.4),(30,6.1,-.06),m['wash']); s.box((-7.8,5.45,-.4),(30,5.95,2.3),m['white']); s.box((-7.8,5.41,-.3),(30,5.45,2.28),m['walnutb'])
    s.box((7.0,0,-.1),(7.5,5.45,2.3),m['wash']); s.box((-8.0,0,-.4),(-7.6,6.1,.0),m['wash']); s.box((-40,0,-9),(40,2.2,-8.6),m['wash'])
    for x,z,hh,y in((-10.4,-3.4,6.,.3),(-13,1.2,5.2,2.),(-9.2,3.1,3.6,1.2)): gltf(s,'island_tree_01',place((x,0,z),y),height=hh,tint=OL,vary=.2)
    cyl(s,m['clay'],(5.6,0,1.35),.46,.78,.06); gltf(s,'island_tree_01',place((5.6,.66,1.35),2.1),height=2.9,tint=OL,vary=.2)
    lounger(s,m,(-3.2,0,4.0),.0); lounger(s,m,(-1.5,0,4.0),.0); cyl(s,m['stonedark'],(-2.35,0,3.4),.21,.42,.02); gltf(s,'ceramic_vase_04',place((-2.35,.42,3.4),.4),height=.22)
    gltf(s,'modern_arm_chair_01',place((2.6,0,2.2),-.6),height=.82); gltf(s,'modern_arm_chair_01',place((4.15,0,2.5),-1.),height=.82); cyl(s,m['lime'],(3.25,0,3.0),.42,.36,.02)
    s.sun=dict(dir=[-.72,.42,.55],size=.018,e=[10.5,7.6,4.6],group=0); s.sky=dict(up=[.55,.95,1.7],hor=[1.75,1.5,1.25],down=[.4,.34,.28],e=.95,group=0); s.quad((-6.6,5.40,.12),(13.2,0,0),(0,0,.35),(2.6,2.0,1.35),1)
def court(s,m):
    s.box((-7.6,-.2,-.4),(7.6,0,20),m['lime']); s.box((-7.6,-.2,-.4),(7.6,5.8,-.06),m['wash']); s.box((7.2,0,-.1),(7.6,5.4,20),m['wash']); s.box((-7.6,0,-.1),(-7.2,5.4,3.),m['wash'])
    s.box((-7.6,5.12,-.4),(7.6,5.42,2.9),m['white']); s.box((-7.5,5.08,.02),(7.5,5.12,2.88),m['walnutb'])
    for x in np.arange(-7.5,7.6,.30): s.box((x,5.12,2.9),(x+.09,5.36,20),m['walnutb'])
    for z in(4.2,8.4,12.6,16.8): s.box((-7.6,4.86,z),(7.6,5.12,z+.2),m['bronze']); s.box((-7.5,0,z),(-7.3,4.9,z+.2),m['bronze'])
    s.box((-4.4,.0,2.0),(2.7,.02,6.2),m['rug'],.01); s.box((-1.75,.70,3.2),(1.55,.76,4.35),m['walnutb'],.012)
    for x in(-1.25,.95): cyl(s,m['lime'],(x+.05,.02,3.78),.26,.69,.02)
    for x,z,y in((-1.15,2.85,0.),(-.1,2.85,0.),(.95,2.85,0.),(-1.15,4.75,np.pi),(-.1,4.75,np.pi),(.95,4.75,np.pi)): gltf(s,'modern_arm_chair_01',place((x,.02,z),y),height=.80)
    gltf(s,'ceramic_vase_01',place((-.35,.76,3.7),.4),height=.34); gltf(s,'wooden_bowl_01',place((.3,.76,3.85),1.),height=.09)
    cyl(s,m['clay'],(5.2,0,1.9),.52,.85,.06); gltf(s,'island_tree_01',place((5.2,.75,1.9),.6),height=3.2,tint=OL,vary=.2); cyl(s,m['clay'],(6.2,0,3.1),.3,.5,.05); cyl(s,m['stonedark'],(-6.2,0,1.6),.34,.95,.05)
    sofa(s,m['teddy'],(-5.2,.0,5.6),np.pi/2,2.4,1.0,m['bronze'])
    pm=s.mat('paper',(.9,.86,.78),.9,trans=(.5,.48,.4),emit=(.9,.68,.4),egroup=1)
    for x in(-1.6,0.,1.6): sphere(s,pm,(x*.62-.1,2.55,3.78),.17); s.box((x*.62-.104,2.7,3.776),(x*.62-.096,5.2,3.784),m['bronze'])
    s.sun=dict(dir=[-.42,.80,.42],size=.028,e=[11,9.6,7.6],group=0); s.sky=dict(up=[1.6,2.1,2.8],hor=[2.2,2.2,2.2],down=[.5,.45,.4],e=.75,group=0); s.quad((-6.6,5.1,.1),(13.2,0,0),(0,0,.3),(1.6,1.3,.95),1)
D=16.; F=14.4
def cam(px,spp,**k):
    ey=1.5; cy=2.6; return dict(dict(w=px,h=px,spp=spp,eye=[0,ey,D],at=[0,ey,0],fov=float(np.degrees(2*np.arctan(F/2/D))),shiftY=(cy-ey)/(F/2),bounces=7,clamp=3,maxv=20,tile=256,bg=1),**k)
if __name__=='__main__':
    px=int(sys.argv[1]); spp=int(sys.argv[2])
    for k in sys.argv[3].split(','):
        for pl in (0,1):
            n=f'ra_{k}{pl}'; s=scene(k,pl,n)
            if pl: json.dump(s.rec,open('out/ra_rec.json','w'),default=float)
            rt.render(n,[(n,cam(px,spp,aov=True))]); a,al,_=rt.load(n); rt.save(f'out/{n}.png',a[...,0,:]+a[...,1,:],.72)
