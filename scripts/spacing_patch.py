from pathlib import Path

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# The screenshot shows that the signature captions are still spilling to the
# next physical sheet. Raise the entire mid-year/footer block by ~6 additional
# printed lines (~18 mm) from its current position, without scaling A4 content.
s = s.replace('margin-top: -15mm !important;', 'margin-top: -33mm !important;', 1)

# Pull the signatures immediately under the vacation bar and make the three
# signature columns a single non-fragmenting print row.
s = s.replace(
    '''            #page-1-signatures {
                margin-top: 2mm !important;
                flex: 0 0 auto !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
''',
    '''            #page-1-signatures {
                margin-top: 0 !important;
                flex: 0 0 auto !important;
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                align-items: end !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }

            #page-1-signatures > div {
                width: auto !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
'''
)

# Reduce only the blank signing space; keep all text sizes unchanged.
s = s.replace(
    '''            #page-1-signatures .h-5 {
                height: 3mm !important;
            }
''',
    '''            #page-1-signatures .h-5 {
                height: 1mm !important;
            }
'''
)

# Apply the same anti-fragmentation behavior to page 2 signatures for
# consistency, without moving the main page-2 content.
s = s.replace(
    '''            #page-2-signatures {
                margin-top: 3mm !important;
                flex: 0 0 auto !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
''',
    '''            #page-2-signatures {
                margin-top: 1mm !important;
                flex: 0 0 auto !important;
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                align-items: end !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }

            #page-2-signatures > div {
                width: auto !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
'''
)
s = s.replace(
    '''            #page-2-signatures .h-5 {
                height: 3mm !important;
            }
''',
    '''            #page-2-signatures .h-5 {
                height: 1mm !important;
            }
'''
)

INDEX.write_text(s, encoding='utf-8')

# Refresh installed PWA cache so the iPhone picks up this print correction.
t = SW.read_text(encoding='utf-8')
for old in [
    'abu-sula-operational-plan-v5',
    'abu-sula-operational-plan-v6',
    'abu-sula-operational-plan-v7',
    'abu-sula-operational-plan-v8',
]:
    t = t.replace(old, 'abu-sula-operational-plan-v9')
SW.write_text(t, encoding='utf-8')

print('Raised footer by six more lines and made signature rows non-fragmenting.')
