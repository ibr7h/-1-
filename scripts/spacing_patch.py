from pathlib import Path

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# Anchor the first-page vacation bar and signature block at fixed A4 print
# positions instead of repeatedly increasing negative margins. This keeps the
# footer close to the schedule table and prevents the signature details from
# fragmenting onto the next physical sheet.
s = s.replace(
    '''            #page-1 {
                justify-content: flex-start !important;
            }
''',
    '''            #page-1 {
                justify-content: flex-start !important;
                position: relative !important;
            }
''',
    1,
)

s = s.replace(
    '''            #midyear-vacation-bar {
                margin-top: -72mm !important;
                flex: 0 0 auto !important;
            }
''',
    '''            #midyear-vacation-bar {
                position: absolute !important;
                top: 216mm !important;
                right: 4mm !important;
                left: 4mm !important;
                margin: 0 !important;
                flex: 0 0 auto !important;
                z-index: 2 !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
''',
    1,
)

s = s.replace(
    '''            #page-1-signatures {
                margin-top: 0 !important;
                flex: 0 0 auto !important;
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                align-items: end !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }
''',
    '''            #page-1-signatures {
                position: absolute !important;
                top: 225mm !important;
                right: 4mm !important;
                left: 4mm !important;
                margin: 0 !important;
                flex: 0 0 auto !important;
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                align-items: end !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                z-index: 2 !important;
            }
''',
    1,
)

INDEX.write_text(s, encoding='utf-8')

# Refresh the installed PWA cache for the anchored print layout.
t = SW.read_text(encoding='utf-8')
t = t.replace('abu-sula-operational-plan-v11', 'abu-sula-operational-plan-v12')
SW.write_text(t, encoding='utf-8')

print('Anchored first-page vacation bar and signatures directly below the schedule table.')
