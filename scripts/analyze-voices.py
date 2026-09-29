import wave,json
from pathlib import Path
import numpy as np
root=Path('artifacts/voices-v6');results=[]
for file in sorted(root.glob('*.wav')):
 if '-release' in file.name or file.stem=='chord':continue
 with wave.open(str(file)) as f: x=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32768; sr=f.getframerate()
 spectrum=np.abs(np.fft.rfft(x));freq=np.fft.rfftfreq(len(x),1/sr);energy=np.cumsum(x*x)
 item=dict(voice=file.stem,peak=round(float(abs(x).max()),3),centroidHz=round(float((freq*spectrum).sum()/spectrum.sum())),energy90ms=round(int(np.searchsorted(energy,.9*energy[-1]))/sr*1000,1),zeroCrossing=round(float(np.count_nonzero(np.diff(np.signbit(x))))/len(x),4));results.append(item)
print(json.dumps(results,indent=2));(root/'analysis.json').write_text(json.dumps(results,indent=2))
assert len(results)==12
assert max(r['centroidHz'] for r in results)-min(r['centroidHz'] for r in results)>2500
assert max(r['energy90ms'] for r in results)-min(r['energy90ms'] for r in results)>70
