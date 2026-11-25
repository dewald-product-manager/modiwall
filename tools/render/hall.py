from rooma import *
GAP=3.6; HX=2.15; FL=-1.35; CE=1.75; P=2*GAP
def build(name='hall'):
    s=Scene(name,tex=2048); m=std(s); Y=lambda y:y-FL   # work in corridor coordinates directly
    wall=s.mat('hw',(.86,.84,.80),.85,spec=.2,tBase='ptex/wash_d.png',tNorm='ptex/wash_n.png',scale=1/3.6,box=True,nStr=.9)
    st=s.mat('hs',(.80,.78,.74),.8,spec=.4,tBase='ptex/lime_d.png',tNorm='ptex/lime_n.png',scale=1/2.4,box=True,nStr=.3)
    fl=s.mat('hf',(.80,.78,.74),.9,spec=.25,tBase='ptex/lime_d.png',tNorm='ptex/lime_n.png',scale=1/2.4,box=True,nStr=.3)
    N=2; z0,z1=-P*N-1.8,P*N+1.8
    s.box((-HX-1,FL-.3,z0),(HX+1,FL,z1),fl); s.box((-HX-1,CE+.16,z0),(HX+1,CE+.5,z1),m['white'])
    K,M=plants.kit(s); L,_,_=layout(2.96,2.86,dict(WSTY,density=3.2,str=2.2,mix=dict(heart=8,lime=2,fern=5,spider=3.4,lily=3,monstera=1.6,pep=2.4,syng=1.2)),91,px=.10,py=.11); L=drop(L,None,dict(monstera=.8,lily=.17))
    for k in range(-2*N,2*N+1):
        z=-k*GAP
        for side in(-1,1):
            x=side*HX; photo=(k%2==0)==(side<0); lo=lambda a,b:(min(a,b),max(a,b))
            X=lambda a,b: lo(side*a,side*b)
            if photo:
                a=X(HX,HX+.6); s.box((a[0],FL,z-1.64),(a[1],CE+.2,z+1.64),wall); a=X(HX-.0,HX+.02);
                s.box((a[0]-.0,FL,z-1.64),(a[1],FL+.0,z+1.64),m['black'])
                a=X(HX-.018,HX); s.box((a[0],FL+.0,z-1.64),(a[1],FL+.11,z+1.64),m['bronze'])
                for dz in((-.75,0,.75) if abs(k)<=2 else ()): s.spot((side*(HX-.62),CE+.1,z+dz),(side*.50,-1,0),.04,(1500,1230,880),0,6)
            else:
                a=X(HX+.16,HX+.7); s.box((a[0],FL,z-1.64),(a[1],CE+.2,z+1.64),M['black']); a=X(HX-.06,HX+.3); s.box((a[0],FL,z-1.64),(a[1],FL+.13,z+1.64),st,.006)
                F=np.zeros((3,4)); R_=np.array([[0,0,-side],[0,1,0],[side,0,0]],float)   # local x -> z, local z (out of wall) -> -side x
                F[:,:3]=np.stack([np.array([0,0,side*1.]),np.array([0,1,0.]),np.array([-side*1.,0,0])],1)
                F[:,3]=[side*(HX+.15),FL+.15,z-side*1.48]; plantwall(s,K,L,5,1,frame=F)
                a=X(HX-.42,HX-.18); s.quad((a[0],CE+.12,z-1.45),(a[1]-a[0],0,0),(0,0,2.9),(85,74,57),0)
        # portal between stops
        zp=z-GAP/2
        for side in(-1,1): a=(min(side*(HX-.17),side*(HX+.7)),max(side*(HX-.17),side*(HX+.7))); s.box((a[0],FL,zp-.16),(a[1],CE+.2,zp+.16),st,.006)
        s.box((-HX-.5,CE-.10,zp-.16),(HX+.5,CE+.3,zp+.16),st,.006)
        # the ceiling slot of each bay
        s.quad((-.10,CE+.15,z-1.35),(.20,0,0),(0,0,2.7),(26,24.5,22),0,0,1)
        s.box((-HX+.25,CE+.10,z-1.64),(-.16,CE+.2,z+1.64),m['white']); s.box((.16,CE+.10,z-1.64),(HX-.25,CE+.2,z+1.64),m['white'])
    s.save(); return s
V={'elev':dict(w=2016,h=868,eye=[0,(FL+CE)/2,-GAP/2],at=[-1,(FL+CE)/2,-GAP/2],ortho=CE-FL,c=(-GAP/2)),
   'floor':dict(w=2016,h=1204,eye=[0,.2,-GAP/2],at=[0,-1,-GAP/2],up=[1,0,0],ortho=2*HX),
   'ceil':dict(w=1512,h=903,eye=[0,.2,-GAP/2],at=[0,1.2,-GAP/2],up=[1,0,0],ortho=2*HX),
   'portal':dict(w=1204,h=868,eye=[0,(FL+CE)/2,-GAP/2+.5],at=[0,(FL+CE)/2,-9],ortho=CE-FL)}
if __name__=='__main__':
    k=float(sys.argv[1]); spp=int(sys.argv[2]); build()
    js=[]
    for n,v in V.items(): v={a:b for a,b in v.items() if a!='c'}; v['w']=int(v['w']*k)//2*2; v['h']=int(v['h']*k)//2*2; js.append((f'hall_{n}',dict(v,spp=spp,bounces=9,clamp=3,maxv=20,tile=256,aov=True)))
    rt.render('hall',js)
    for n in V: a,_,_=rt.load('hall_'+n); rt.save(f'out/hall_{n}.png',a.sum(2),.8)
