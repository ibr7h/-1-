from pathlib import Path

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# Safe print-only compaction: do not move or resize the schedule table and do
# not use absolute positioning. Keep the current vacation-bar placement, but
# reduce only the vertical footprint of the bar/signature area so the full
# signature block can remain on the first A4 sheet.
marker = '''            #page-1-signatures .h-5 {
                height: 1mm !important;
            }
'''
replacement = '''            #page-1-signatures .h-5 {
                height: 0 !important;
                min-height: 0 !important;
                margin: 0 !important;
            }

            #midyear-vacation-bar {
                padding-top: 0.6mm !important;
                padding-bottom: 0.6mm !important;
                line-height: 1.05 !important;
                min-height: 0 !important;
            }

            #page-1-signatures {
                padding-top: 0.6mm !important;
                padding-bottom: 0 !important;
                line-height: 1.02 !important;
                min-height: 0 !important;
                height: auto !important;
                align-items: start !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }

            #page-1-signatures > div {
                min-height: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                margin: 0 !important;
            }

            #page-1-signatures p {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
                line-height: 1.02 !important;
            }

            #page-1-signatures > div > p:first-child {
                font-size: 9.5px !important;
            }

            #page-1-signatures > div > p:nth-child(2) {
                font-size: 10.5px !important;
                margin-top: 0.3mm !important;
            }

            #page-1-signatures > div > p:last-child {
                font-size: 8px !important;
                margin-top: 0.4mm !important;
            }
'''

if marker in s:
    s = s.replace(marker, replacement, 1)
elif '#page-1-signatures > div > p:last-child' not in s:
    raise SystemExit('Expected page-1 signature print marker not found; refusing unsafe edit.')

INDEX.write_text(s, encoding='utf-8')

# Refresh the installed PWA cache for this compact print-layout revision.
t = SW.read_text(encoding='utf-8')
t = t.replace('abu-sula-operational-plan-v13', 'abu-sula-operational-plan-v14')
SW.write_text(t, encoding='utf-8')

print('Compacted only the first-page vacation/signature area; schedule table unchanged.')
