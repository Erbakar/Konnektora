"""Build country/state/city suggestions from GeoNames (CC BY 4.0)."""
import io,json,urllib.request,zipfile
from pathlib import Path
base='https://download.geonames.org/export/dump/'
def fetch(name):
 return urllib.request.urlopen(base+name,timeout=60).read()
admins={}
for line in fetch('admin1CodesASCII.txt').decode().splitlines():
 cols=line.split('\t');country,code=cols[0].split('.',1)
 admins.setdefault(country,{})[code]={'name':cols[1],'cities':[]}
with zipfile.ZipFile(io.BytesIO(fetch('cities15000.zip'))) as z:
 for line in z.read('cities15000.txt').decode().splitlines():
  c=line.split('\t');country,region=c[8],c[10]
  if country in admins and region in admins[country]:admins[country][region]['cities'].append(c[1])
out=Path('apps/web/public/data/regions')
for country,rows in admins.items():
 values=[{'code':code,'name':row['name'],'cities':sorted(set(row['cities']))} for code,row in rows.items()]
 (out/(country+'.json')).write_text(json.dumps(sorted(values,key=lambda x:x['name']),ensure_ascii=False,separators=(',',':')))
print('Countries:',len(admins))
