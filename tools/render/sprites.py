from wall import *; import rt,json,sys
PX=600
def build():
    s=Scene('spr'); K,M=plants.kit(s); s.sun=dict(dir=[-.55,.78,.6],size=.07,e=[3.7,3.45,2.95],group=0); s.sky=dict(up=[1.25,1.4,1.6],hor=[.62,.68,.74],down=[.12,.13,.12],e=.85,group=1)
    jobs=[];meta=[];i=0
    for k in K:
        for v in range(len(K[k])):
            m=K[k][v][0]; c=np.array([i*4.,0,0]); s.add(m,xf(t=c),seed=.5,id=1)
            mm=s.meshes[m]; T=s.T[m]; P=np.concatenate(s.V)[:, :3] if i==0 else P; q=P[T[:,:3].astype(int).ravel()]; lo=q.min(0);hi=q.max(0); pad=6/PX
            x0,x1,y0,y1=lo[0]-pad,hi[0]+pad,lo[1]-pad,hi[1]+pad; w=int(np.ceil((x1-x0)*PX));h=int(np.ceil((y1-y0)*PX)); x1=x0+w/PX;y0=y1-h/PX
            cx,cy=(x0+x1)/2+c[0],(y0+y1)/2; jobs.append((f'spr_{i}',dict(eye=[float(cx),float(cy),6.],at=[float(cx),float(cy),0.],ortho=h/PX,w=w,h=h,spp=int(300*Q),aov=True))); meta.append(dict(kind=k,v=v,w=w,h=h,rx=float(-x0*PX),ry=float(y1*PX))); i+=1
    s.save(); json.dump(meta,open('out/spr.json','w')); rt.render('spr',jobs,False); return meta
Q=float(sys.argv[1]) if len(sys.argv)>1 else 1
if __name__=='__main__': m=build(); print(len(m),sum(x['w']*x['h'] for x in m)/1e6,'MP',max(x['w'] for x in m),max(x['h'] for x in m))
