"""Refresh the self-hosted Chinese font subset when interface copy changes."""
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlencode
import re

root = Path(__file__).resolve().parent.parent
text = ''.join(p.read_text() for p in list((root / 'src').glob('*.ts')) + list((root / 'src').glob('*.json')))
characters = ''.join(sorted({c for c in text if ord(c) >= 0x3000}))
url = 'https://fonts.googleapis.com/css2?' + urlencode({
    'family': 'Noto Sans SC:wght@400;500;600;700;800;900',
    'display': 'swap', 'text': characters,
})
css = urlopen(Request(url, headers={'User-Agent':'Mozilla/5.0'}), timeout=30).read().decode()
urls = re.findall(r'src:\s*url\(([^)]+)\)', css)
assert len(urls) == 6, 'Expected six font weights'
for index, font_url in enumerate(urls):
    data = urlopen(font_url, timeout=30).read()
    (root / f'public/fonts/noto-sans-sc-{index}.ttf').write_bytes(data)
print(f'Updated six font weights covering {len(characters)} characters.')
