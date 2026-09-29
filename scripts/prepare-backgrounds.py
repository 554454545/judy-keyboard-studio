"""Prepare licensed Mixkit footage as silent, crossfaded local loops. No runtime network dependencies."""
import json, subprocess, concurrent.futures, sys
from pathlib import Path
sources=json.loads(Path('public/backgrounds/sources.json').read_text())
def run(args):return subprocess.check_output(args).decode()
def build(item):
 assert item['free'] and item['video']
 key=item['id'];raw=Path('artifacts/background-research')/(key+'.mp4');dest=Path('public/backgrounds')/(key+'.mp4')
 if not raw.exists():subprocess.run(['curl','-fsSL','--max-time','90','-A','Mozilla/5.0','-o',str(raw),item['video']],check=True)
 info=json.loads(run(['ffprobe','-v','quiet','-show_format','-show_streams','-of','json',str(raw)]));duration=min(float(info['format']['duration']),16)
 end=duration-1
 filter=f"[0:v]fps=24,scale='min(1280,iw)':-2,format=yuv420p,split=3[a][b][c];[a]trim=start=1:end={end},setpts=PTS-STARTPTS[main];[b]trim=start={end}:end={duration},setpts=PTS-STARTPTS[tail];[c]trim=start=0:end=1,setpts=PTS-STARTPTS[head];[tail][head]blend=all_expr='A*(1-T)+B*T'[seam];[main][seam]concat=n=2:v=1:a=0[out]"
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-filter_complex',filter,'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','25','-threads','2','-movflags','+faststart',str(dest)],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-ss','1','-i',str(dest),'-frames:v','1','-q:v','3',str(dest.with_suffix('.jpg'))],check=True)
 item.update(duration=round(duration-1,2),bytes=dest.stat().st_size)
 print(key,item['duration'],item['bytes'],flush=True);return item
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:updated=list(ex.map(build,[s for s in sources if len(sys.argv)==1 or s["id"] in sys.argv[1:]]))
result=[next((u for u in updated if u["id"]==s["id"]),s) for s in sources]
Path('public/backgrounds/sources.json').write_text(json.dumps(result,indent=2,ensure_ascii=False))
Path('public/backgrounds/CREDITS.txt').write_text('JUDY scenery backgrounds\nSource: Mixkit; each selected item explicitly carries the Stock Video Free License.\nLicense: https://mixkit.co/license/#videoFree\nVerified: 2026-09-29. All footage is used within the keyboard experience; no standalone stock download UI.\nEdits: silent H.264, maximum 720p, 24 fps, trimmed and crossfaded into loops. See sources.json for authors, source pages and exact files.\n')
