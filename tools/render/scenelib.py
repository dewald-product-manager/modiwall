import numpy as np, json, os
ROOT=os.path.dirname(os.path.abspath(__file__))
class Scene:
    def __init__(s,name,tex=1024): s.name=name; s.V=[];s.T=[];s.meshes=[];s.nv=0;s.nt=0;s.mats=[];s.matid={};s.inst=[];s.lights=[];s.tex=[];s.texid={};s.R=tex;s.sun=None;s.sky=None;s.env=None
    def texture(s,key,arr=None):
        if key is None: return -1
        if key in s.texid: return s.texid[key]
        safe=key.replace('/','_').replace(':','_').replace('\\','_'); f=f'tex/{safe}.{s.R}.raw'
        if arr is not None or not os.path.exists(f'{ROOT}/{f}'):
            from PIL import Image
            im=Image.fromarray(arr) if arr is not None else Image.open(f'{ROOT}/{key}')
            os.makedirs(f'{ROOT}/tex',exist_ok=True); np.asarray(im.convert('RGBA').resize((s.R,s.R),Image.LANCZOS)).tofile(f'{ROOT}/{f}')
        s.texid[key]=len(s.tex); s.tex.append(f); return s.texid[key]
    def mat(s,name,base=(.8,.8,.8),rough=.5,metal=0,spec=.5,trans=(0,0,0),emit=(0,0,0),tBase=None,tNorm=None,tRough=None,scale=(1,1),nStr=1,vary=0,egroup=0,alpha=None,box=False,swap=False):
        if name in s.matid: return s.matid[name]
        fl=(1 if alpha is not None else 0)|(2 if box else 0)|(8 if swap else 0)
        if np.isscalar(scale): scale=(scale,scale)
        s.matid[name]=len(s.mats); s.mats.append(dict(base=list(map(float,base)),rough=rough,metal=metal,spec=spec,trans=list(map(float,trans)),emit=list(map(float,emit)),tBase=s.texture(tBase),tNorm=s.texture(tNorm),tRough=s.texture(tRough),flags=fl,scale=list(map(float,scale)),nStr=nStr,vary=vary,egroup=egroup,alpha=alpha or 0)); return s.matid[name]
    def mesh(s,P,F,mat,N=None,UV=None,t=None,leaf=None,tint=None):
        P=np.asarray(P,np.float32); F=np.asarray(F,np.int64).reshape(-1,3); n=len(P)
        if N is None: N=normals(P,F)
        V=np.zeros((n,12),np.float32); V[:,:3]=P; V[:,4:7]=N
        if t is not None: V[:,3]=t
        if leaf is not None: V[:,7]=leaf
        if UV is not None: V[:,8:10]=UV
        if tint is not None: V[:,10]=tint
        T=np.zeros((len(F),4),np.uint32); T[:,:3]=F+s.nv; T[:,3]=mat
        s.meshes.append(dict(t0=s.nt,nt=len(F))); s.V.append(V); s.T.append(T); s.nv+=n; s.nt+=len(F); return len(s.meshes)-1
    def add(s,mesh,M=None,seed=0.,id=0,mat=None):
        M=np.eye(4)[:3] if M is None else np.asarray(M)[:3]; s.inst.append(np.concatenate([M.reshape(-1),[mesh,seed,id,0 if mat is None else mat+1]]))
    def quad(s,p,u,v,e,group=0,focus=0,vis=0,boost=1): s.lights.append(dict(p=list(map(float,p)),u=list(map(float,u)),v=list(map(float,v)),e=list(map(float,e)),group=group,focus=focus,vis=vis,boost=boost))
    def spot(s,p,d,r,e,group=0,focus=30):
        d=np.array(d,float); d/=np.linalg.norm(d); a=np.cross(d,[0,0,1] if abs(d[2])<.9 else [1,0,0]); a/=np.linalg.norm(a); b=np.cross(d,a); u=a*2*r; v=b*2*r
        if np.dot(np.cross(u,v),d)<0: u,v=v,u
        p=np.array(p,float)-u/2-v/2; s.quad(p,u,v,e,group,-focus,0)
    def box(s,lo,hi,mat,bevel=0.):
        m=box_mesh(lo,hi,bevel); i=s.mesh(m[0],m[1],mat,UV=m[2],N=m[3]); s.add(i); return i
    def save(s):
        d=f'{ROOT}/{s.name}'; os.makedirs(d,exist_ok=True)
        np.concatenate(s.V).tofile(d+'/verts.bin'); np.concatenate(s.T).tofile(d+'/tris.bin'); np.array(s.inst,np.float32).tofile(d+'/inst.bin')
        json.dump(dict(meshes=s.meshes,materials=s.mats,lights=s.lights,textures=s.tex,texSize=s.R,sun=s.sun,sky=s.sky,env=s.env),open(d+'/scene.json','w'))
def normals(P,F):
    a,b,c=P[F[:,0]],P[F[:,1]],P[F[:,2]]; n=np.cross(b-a,c-a); N=np.zeros_like(P)
    for k in range(3): np.add.at(N,F[:,k],n)
    return N/np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-12)
def grid_faces(nu,nv):
    i=np.arange(nu-1)[:,None]*nv+np.arange(nv-1)[None]; i=i.ravel(); return np.concatenate([np.stack([i,i+1,i+nv],1),np.stack([i+1,i+nv+1,i+nv],1)])
def box_mesh(lo,hi,b=0.):
    lo=np.array(lo,float);hi=np.array(hi,float); P=[];F=[];N=[];UV=[];off=0
    if b>0:
        c=(lo+hi)/2; h=(hi-lo)/2; b=min(b,h.min()*.98); inner=h-b; k=4; ang=np.tan(np.linspace(-np.pi/4,0,k+1))
        for ax in range(3):
            for sg in(-1,1):
                a1,a2=(ax+1)%3,(ax+2)%3
                co=lambda inn: np.concatenate([np.stack([-np.ones(k+1)*inn,ang],1),np.stack([np.ones(k+1)*inn,-ang[::-1]],1)])
                A=co(inner[a1]);B=co(inner[a2]); n=len(A); cen=np.zeros((n,n,3));dr=np.zeros((n,n,3))
                cen[...,a1]=A[:,0][:,None];cen[...,a2]=B[:,0][None];cen[...,ax]=sg*inner[ax]; dr[...,a1]=A[:,1][:,None];dr[...,a2]=B[:,1][None];dr[...,ax]=sg
                dr/=np.linalg.norm(dr,axis=-1,keepdims=True); pts=(cen+dr*b+c).reshape(-1,3); f=grid_faces(n,n)
                nn=np.cross(pts[f[:,1]]-pts[f[:,0]],pts[f[:,2]]-pts[f[:,0]]).sum(0)
                if nn[ax]*sg<0: f=f[:,::-1]
                F.append(f+off); off+=len(pts); P.append(pts); N.append(dr.reshape(-1,3)); UV.append(pts[:,[a1,a2]])
        return np.concatenate(P),np.concatenate(F),np.concatenate(UV),np.concatenate(N)
    for ax in range(3):
        for sg in(-1,1):
            a1,a2=(ax+1)%3,(ax+2)%3; q=np.zeros((4,3)); q[:,ax]=hi[ax] if sg>0 else lo[ax]; q[:,a1]=[lo[a1],hi[a1],hi[a1],lo[a1]]; q[:,a2]=[lo[a2],lo[a2],hi[a2],hi[a2]]
            f=np.array([[0,1,2],[0,2,3]])
            if sg<0: f=f[:,::-1]
            n=np.zeros((4,3)); n[:,ax]=sg; F.append(f+off); off+=4; P.append(q);N.append(n);UV.append(q[:,[a1,a2]])
    return np.concatenate(P),np.concatenate(F),np.concatenate(UV),np.concatenate(N)
def lathe(prof,n=64):
    prof=np.array(prof,float); a=np.linspace(0,2*np.pi,n+1); P=np.stack([prof[:,0][:,None]*np.cos(a),np.repeat(prof[:,1][:,None],n+1,1),prof[:,0][:,None]*np.sin(a)],-1).reshape(-1,3)
    F=grid_faces(len(prof),n+1); UV=np.stack(np.meshgrid(np.linspace(0,1,n+1),np.linspace(0,1,len(prof))),-1).reshape(-1,2); return P,F[:,::-1],UV
def rotx(a): c,s=np.cos(a),np.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def roty(a): c,s=np.cos(a),np.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def rotz(a): c,s=np.cos(a),np.sin(a); return np.array([[c,-s,0],[s,c,0],[0,0,1]])
def xf(R=np.eye(3),t=(0,0,0),s=1.): M=np.zeros((3,4)); M[:,:3]=R*s; M[:,3]=t; return M
