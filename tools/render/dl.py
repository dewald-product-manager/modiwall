import json,subprocess,os,sys
def cj(u): return json.loads(subprocess.run(['curl','-s','-m','40','--retry','4','-A','asset-browser',u],capture_output=True).stdout)
def get(u,f):
    if os.path.exists(f) and os.path.getsize(f)>0: return
    os.makedirs(os.path.dirname(f),exist_ok=True); subprocess.run(['curl','-s','-m','240','--retry','4','-A','asset-browser','-o',f,u])
for t in 'curly_teddy_natural white_oak_veneer smoked_walnut_veneer natural_walnut_veneer rough_linen herringbone_parquet grey_plaster_03 fabric_leather_01'.split():
    try:
        j=cj('https://api.polyhaven.com/files/'+t)
        for k,n in (('Diffuse','d'),('nor_gl','n'),('Rough','r')):
            if k in j: get(j[k]['2k']['jpg']['url'],f'ph/{t}_{n}.jpg')
    except Exception as e: print(t,e)
for m in 'ceramic_vase_01 ceramic_vase_02 ceramic_vase_04 mid_century_lounge_chair modern_arm_chair_01 wooden_bowl_01 marble_bust_01 pachira_aquatica_01 island_tree_01 coffee_table_round_01'.split():
    try:
        j=cj('https://api.polyhaven.com/files/'+m)['gltf']['1k' if m!='mid_century_lounge_chair' else '2k']['gltf']; get(j['url'],f'ph/{m}/{m}.gltf')
        for p,x in j['include'].items(): get(x['url'],f'ph/{m}/{p}')
    except Exception as e: print(m,e)
