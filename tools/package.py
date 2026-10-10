"""Reproducible extension ZIP (manifest at archive root) and full handoff ZIP."""
from pathlib import Path
import json, zipfile, hashlib
root=Path(__file__).resolve().parents[1]
dist=root/'dist';dist.mkdir(exist_ok=True)
manifest=json.loads((root/'extension/manifest.json').read_text())
assert manifest['manifest_version']==3 and 'host_permissions' not in manifest
assert all((root/'extension'/manifest['icons'][key]).exists() for key in manifest['icons'])
def write_zip(out,files,base):
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for file in sorted(files):
            info=zipfile.ZipInfo(file.relative_to(base).as_posix(),(2026,10,7,0,0,0));info.external_attr=0o644<<16;info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info,file.read_bytes())
version=manifest['version']
extension=dist/f'FarsiFlow-{version}-Chrome.zip'
write_zip(extension,[p for p in (root/'extension').rglob('*') if p.is_file()],root/'extension')
source=dist/f'FarsiFlow-{version}-Complete.zip'
write_zip(source,[p for p in root.rglob('*') if p.is_file() and not set(p.relative_to(root).parts)&{'dist','node_modules','.git','__pycache__'} and not p.name.startswith('.')],root)
with zipfile.ZipFile(extension) as archive:
    assert 'manifest.json' in archive.namelist();assert archive.testzip() is None
checks={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [extension,source]}
(dist/'SHA256SUMS.txt').write_text('\n'.join(f'{digest}  {name}' for name,digest in checks.items())+'\n')
for p in [extension,source]:print(p.name,p.stat().st_size,'bytes')
