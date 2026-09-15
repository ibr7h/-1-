from pathlib import Path

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# Raise the entire mid-year vacation/footer section by approximately six
# printed text lines (~18 mm) without changing A4 size or font scale.
# Current margin is 3 mm; setting it to -15 mm moves the block up 18 mm.
s = s.replace(
    '''            #midyear-vacation-bar {
                margin-top: 3mm !important;
                flex: 0 0 auto !important;
            }
''',
    '''            #midyear-vacation-bar {
                margin-top: -15mm !important;
                flex: 0 0 auto !important;
            }
'''
)

# Keep signatures close to the vacation bar and prevent pagination splits.
s = s.replace(
    '''            #page-1-signatures {
                margin-top: 3mm !important;
                flex: 0 0 auto !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
''',
    '''            #page-1-signatures {
                margin-top: 2mm !important;
                flex: 0 0 auto !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
'''
)

INDEX.write_text(s, encoding='utf-8')

# Refresh installed PWA cache so iPhone receives this print-layout revision.
t = SW.read_text(encoding='utf-8')
for old in [
    'abu-sula-operational-plan-v5',
    'abu-sula-operational-plan-v6',
    'abu-sula-operational-plan-v7',
]:
    t = t.replace(old, 'abu-sula-operational-plan-v8')
SW.write_text(t, encoding='utf-8')

print('Raised mid-year vacation section and following signatures by about six lines.')
