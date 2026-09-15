from pathlib import Path

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# Restore the desktop print signature area to its pre-compaction layout.
# Keep the iPhone/iPad pagination fix, but scope the compact signature styling
# to iOS only and add enough vertical separation to prevent the final lines
# from visually overlapping.
compact_block = '''            #page-1-signatures .h-5 {
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

replacement = '''            #page-1-signatures .h-5 {
                height: 1mm !important;
            }

            /* iPhone/iPad only: preserve the two-page layout while giving
               the final signature lines enough breathing room. */
            body.ios-print #midyear-vacation-bar {
                padding-top: 0.8mm !important;
                padding-bottom: 0.8mm !important;
                line-height: 1.10 !important;
                min-height: 0 !important;
            }

            body.ios-print #page-1-signatures {
                padding-top: 1mm !important;
                padding-bottom: 0 !important;
                line-height: 1.16 !important;
                min-height: 0 !important;
                height: auto !important;
                align-items: start !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }

            body.ios-print #page-1-signatures > div {
                min-height: 0 !important;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                margin: 0 !important;
            }

            body.ios-print #page-1-signatures .h-5 {
                height: 1.3mm !important;
                min-height: 1.3mm !important;
                margin: 0 !important;
            }

            body.ios-print #page-1-signatures p {
                margin-bottom: 0 !important;
                line-height: 1.16 !important;
            }

            body.ios-print #page-1-signatures > div > p:first-child {
                font-size: 9.5px !important;
                margin-top: 0 !important;
            }

            body.ios-print #page-1-signatures > div > p:nth-child(2) {
                font-size: 10.5px !important;
                margin-top: 0.7mm !important;
            }

            body.ios-print #page-1-signatures > div > p:last-child {
                font-size: 8.5px !important;
                margin-top: 0.9mm !important;
            }
'''

if compact_block not in s:
    raise SystemExit('Expected compact signature block not found; refusing unsafe edit.')

s = s.replace(compact_block, replacement, 1)
INDEX.write_text(s, encoding='utf-8')

# Refresh the installed PWA cache so iPhones receive this revision.
t = SW.read_text(encoding='utf-8')
t = t.replace('abu-sula-operational-plan-v15', 'abu-sula-operational-plan-v16')
SW.write_text(t, encoding='utf-8')

print('Restored desktop signature layout and increased iOS signature line spacing.')
