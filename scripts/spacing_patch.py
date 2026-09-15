from pathlib import Path

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# The latest iPhone print preview still shows a large blank gap after the
# schedule table and pushes the signature details onto another physical sheet.
# Raise the mid-year vacation/footer block another 22 mm (~7 text lines).
s = s.replace('margin-top: -33mm !important;', 'margin-top: -55mm !important;', 1)

INDEX.write_text(s, encoding='utf-8')

# Refresh the installed PWA cache for this print-layout revision.
t = SW.read_text(encoding='utf-8')
t = t.replace('abu-sula-operational-plan-v9', 'abu-sula-operational-plan-v10')
SW.write_text(t, encoding='utf-8')

print('Raised first-page vacation/signature footer by another 22 mm.')
