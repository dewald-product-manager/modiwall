from wall import *; import rt,sys
def build(name,style,W,H,seed):
    s=Scene('pl_'+name); K,M=plants.kit(s); L,_,_=layout(W,H,STY[style],seed); L=drop(L,None,dict(monstera=.62 if style!='jungle' else .42,lily=.17)); rec=plantwall(s,K,L,seed+1,1,wrap=(W,H)); backing(s,M,(-2,-2),(W+2,H+2))
    s.sun=dict(dir=[-.55,.78,.6],size=.07,e=[3.7,3.45,2.95],group=0); s.sky=dict(up=[1.25,1.4,1.6],hor=[.62,.68,.74],down=[.12,.13,.12],e=.85,group=1); s.save()
    np.save(f'out/pl_{name}_roots.npy',np.array([[r[0],*r[2]] for r in rec])); import json; json.dump([[r[1],r[8],*map(float,r[2]),float(r[3]),float(r[6]),float(r[7])] for r in rec],open(f'out/pl_{name}_plants.json','w')); return s
def jobs(name,W,H,pw,spp,small):
    cam=dict(eye=[W/2,H/2,6],at=[W/2,H/2,0],ortho=H); ph=round(pw*H/W); j=[(f'pl_{name}',dict(cam,w=pw,h=ph,spp=spp,aov=True))]
    if small: j+=[(f'pl_{name}_s',dict(cam,w=small,h=round(small*H/W),spp=0,aov=True))]
    return j
if __name__=='__main__':
    q=float(sys.argv[2]) if len(sys.argv)>2 else 1
    P={'forest':(3.6,2.4,2304,41,1536),'fern':(2.4,1.6,1536,18,1152),'jungle':(2.4,1.6,1536,3,1152)}
    for n in sys.argv[1].split(','):
        W,H,pw,sd,sm=P[n]; build(n,n,W,H,sd); rt.render('pl_'+n,jobs(n,W,H,pw,int(420*q),sm))
        a,al,c=rt.load('pl_'+n); rt.save(f'out/pl_{n}.png',a.sum(2),.95)
