"""Render ten original instrumental studies. Run with: uv run --with numpy python scripts/compose-music.py
No sampled recordings or third-party melodies are used. MP3 assets are served locally.
"""
from pathlib import Path
import json, subprocess, wave
import numpy as np
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/music'
OUT.mkdir(exist_ok=True)
SR = 32000
# Distinct voicings, melodies, pacing and instrumentation; 16-bar miniatures.
TRACKS = [
 ('after-rain','雨后窗边','AFTER THE RAIN','钢琴 · 雨声',68, [[48,55,59,62],[45,52,55,60],[53,57,60,64],[43,50,55,59]], [12,7,4,2,7,11,9,4], 'piano'),
 ('blue-hour','蓝色时刻','BLUE HOUR','电钢 · 慢拍',76, [[50,57,60,64],[55,59,62,66],[48,55,59,64],[45,52,55,59]], [7,12,9,4,2,7,4,11], 'lofi'),
 ('moon-tide','月面潮汐','MOON TIDE','氛围 · 长音',58, [[45,52,59,64],[41,48,55,60],[48,55,62,67],[43,50,57,62]], [19,12,16,7,14,11,7,12], 'ambient'),
 ('paper-lantern','纸灯','PAPER LANTERN','拨弦 · 暖光',74, [[50,57,61,64],[47,54,57,61],[43,50,54,57],[45,52,57,61]], [12,4,7,9,4,12,7,2], 'plucks'),
 ('moss-garden','苔藓花园','MOSS GARDEN','木琴 · 呼吸',64, [[48,55,60,64],[53,60,64,67],[45,52,59,64],[55,62,65,69]], [7,9,12,4,2,4,7,12], 'mallet'),
 ('night-train','夜行列车','NIGHT TRAIN','电钢 · 低频',82, [[47,54,57,62],[43,50,54,59],[50,57,61,66],[45,52,56,61]], [11,7,4,12,2,9,7,4], 'lofi'),
 ('distant-shore','远岸','DISTANT SHORE','氛围 · 海浪',60, [[53,60,64,67],[48,55,59,62],[50,57,60,65],[46,53,57,60]], [12,7,16,11,9,4,7,14], 'ambient'),
 ('soft-orbit','柔软轨道','SOFT ORBIT','钟琴 · 浮光',72, [[52,59,62,66],[48,55,59,64],[55,62,66,69],[50,57,62,66]], [7,12,4,11,9,7,2,4], 'mallet'),
 ('last-page','最后一页','THE LAST PAGE','钢琴 · 留白',66, [[45,52,55,59],[50,57,60,64],[43,50,55,59],[48,55,59,64]], [4,7,11,12,7,2,4,9], 'piano'),
 ('slow-satellite','慢速卫星','SLOW SATELLITE','合成器 · 漫游',78, [[48,55,58,62],[53,60,64,67],[46,53,57,60],[55,62,65,69]], [12,7,2,9,4,11,7,14], 'plucks'),
]
def voice(note, length, kind, velocity=1):
    t=np.arange(int(SR*length),dtype=np.float64)/SR
    f=440*2**((note-69)/12)
    if kind=='pad':
        env=np.minimum(t/1.2,1)*np.minimum((length-t)/1.8,1)
        v=(np.sin(2*np.pi*f*t)+.3*np.sin(2*np.pi*f*1.003*t)+.18*np.sin(2*np.pi*f*2*t))*.15*env
    else:
        decay={'piano':1.7,'lofi':1.45,'plucks':.7,'mallet':1.05,'ambient':2.6}[kind]
        v=np.zeros_like(t)
        for harmonic,level in [(1,1),(2,.3),(3,.11),(4,.06)]:
            detune=1+(.0002*harmonic**2 if kind=='piano' else 0)
            v+=level*np.sin(2*np.pi*f*harmonic*detune*t)*np.exp(-t*(harmonic*.3+.7)/decay)
        if kind in ('mallet','ambient'):
            v+=.13*np.sin(2*np.pi*f*2.756*t)*np.exp(-t/.35)
        if kind=='lofi':
            v=np.tanh(v*.9)*(.97+.03*np.sin(2*np.pi*2.2*t))
        env=np.minimum(t/.008,1)*np.minimum((length-t)/.1,1)
        v*=env*.21
    return v.astype(np.float32)*velocity
reports=[]; manifest=[]
for index,(slug,name,english,mood,bpm,chords,melody,kind) in enumerate(TRACKS):
    rng=np.random.default_rng(2810+index)
    beat=60/bpm; duration=64*beat+5; size=int(duration*SR)
    mix=np.zeros((size,2),np.float32)
    def add(note,at,length,voice_kind,vol=1,pan=0):
        a=max(0,int(at*SR))
        if a>=size:return
        v=voice(note,min(length,(size-a)/SR),voice_kind,vol)
        mix[a:a+len(v),0]+=v*np.sqrt((1-pan)/2)
        mix[a:a+len(v),1]+=v*np.sqrt((1+pan)/2)
    for bar in range(16):
        chord=chords[(bar//2+index%2)%4]; at=bar*4*beat
        intensity=.68 if bar<2 or bar>13 else 1
        for j,note in enumerate(chord):
            add(note+12,at,beat*5.5,'pad',.23*intensity,(-.65+j*.42))
            add(note,at+j*.045,4.5,kind,.36*intensity,(-.3+j*.2))
        add(chord[0]-12,at,beat*3,'lofi',.3*intensity,-.1)
        rhythm=[.5,1.5,2.75] if kind=='piano' else [0,.75,1.5,2.5,3.25] if kind in ('mallet','plucks') else [1,3] if kind=='ambient' else [.5,1.5,2,3.5]
        for j,pos in enumerate(rhythm):
            if bar>13 and j>1:continue
            degree=melody[(bar+j)%len(melody)]
            # Notes are explicitly chosen from each current extended harmony.
            note=chord[(degree+j)%4]+12+(12 if degree>12 else 0)
            add(note,at+pos*beat+rng.uniform(-.008,.008),3.8,kind,(.45 if kind=='ambient' else .6)*intensity,rng.uniform(-.5,.5))
        if kind=='lofi':
            for pos in (0,2):
                t=np.arange(int(.3*SR))/SR; kick=np.sin(2*np.pi*(44*t+22*.04*(1-np.exp(-t/.04))))*np.exp(-t*18)*.055
                a=int((at+pos*beat)*SR); mix[a:a+len(kick)]+=kick[:,None]
            for pos in (1,3):
                n=rng.normal(size=int(.16*SR)).astype(np.float32); n[1:]-=n[:-1]*.7
                n*=np.exp(-np.arange(len(n))/SR*55)*.016
                a=int((at+pos*beat)*SR);mix[a:a+len(n)]+=n[:,None]
    # Quiet band-limited weather texture and stereo room reflections.
    if index in (0,6):
        noise=rng.normal(0,.002,size=size).astype(np.float32)
        smoothed=np.convolve(noise,np.ones(16)/16,mode='same')
        swell=.5+.5*np.sin(np.arange(size)/SR*.18)**2
        mix+= (smoothed*swell)[:,None]
    dry=mix.copy()
    for delay,gain in [(.113,.18),(.227,.14),(.371,.1),(.557,.08),(.823,.05)]:
        offset=int(delay*SR);mix[offset:]+=dry[:-offset,::-1]*gain
    fade=int(2*SR);mix[:fade]*=np.linspace(0,1,fade)[:,None];mix[-fade:]*=np.linspace(1,0,fade)[:,None]
    peak=float(np.abs(mix).max()); mix*=.64/max(peak,.001)
    rms=float(np.sqrt(np.mean(mix**2)))
    wav=OUT/f'{slug}.wav'
    with wave.open(str(wav),'wb') as file:
        file.setnchannels(2);file.setsampwidth(2);file.setframerate(SR);file.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k','-metadata',f'title={name}','-metadata','artist=JUDY / Night Studies',str(OUT/f'{slug}.mp3')],check=True)
    wav.unlink()
    manifest.append(dict(id=slug,name=name,english=english,mood=mood,bpm=bpm,duration=round(duration),src=f'/music/{slug}.mp3'))
    reports.append(dict(id=slug,seconds=duration,peak=float(np.abs(mix).max()),rms=rms))
    print(f'{name}: {duration:.1f}s, peak={reports[-1]["peak"]:.2f}',flush=True)
(ROOT/'src/music-library.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(ROOT/'artifacts/music-analysis.json').write_text(json.dumps(reports,indent=2)+'\n')
(OUT/'CREDITS.txt').write_text('JUDY / NIGHT STUDIES\nTen original procedural instrumental compositions created for this project.\nComposed and synthesized by scripts/compose-music.py. No third-party audio samples or borrowed melodies.\nMusic is separate from keyboard sound effects.\n')
