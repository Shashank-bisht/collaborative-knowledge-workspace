from pathlib import Path
from docx import Document

src = Path(r'c:\Users\shash\Downloads\Finished - SECURE v2.docx')
print('exists=', src.exists())
if not src.exists():
    raise SystemExit('Reference file not found')

doc = Document(str(src))
for i, p in enumerate(doc.paragraphs[:200], start=1):
    text = p.text.strip()
    if text:
        print(f'{i}: {text}')
