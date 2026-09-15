from pathlib import Path
import re

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# Tighten the already-added page-1 print spacing.
s = s.replace('margin-top: 8mm !important;', 'margin-top: 3mm !important;')
s = s.replace(
    '''            #page-1-signatures {
                margin-top: auto !important;
                flex: 0 0 auto !important;
            }
''',
    '''            #page-1-signatures {
                margin-top: 3mm !important;
                flex: 0 0 auto !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }

            #page-1-signatures .h-5 {
                height: 3mm !important;
            }
'''
)

# Add a stable hook to the second-page signature block as well. The two
# signature blocks share the same distinctive structure/text.
if 'id="page-2-signatures"' not in s:
    signature_open = '<div class="pt-1.5 border-t-2 border-slate-800 flex justify-between items-end text-center text-[11.5px] px-2">'
    pos = s.find(signature_open)
    if pos != -1:
        s = s[:pos] + s[pos:].replace(
            signature_open,
            '<div id="page-2-signatures" class="pt-1.5 border-t-2 border-slate-800 flex justify-between items-end text-center text-[11.5px] px-2">',
            1,
        )

# Ensure page 2 signature block also stays compact and on the same A4 page.
if '#page-2-signatures {' not in s:
    marker = '''            #page-1-signatures .h-5 {
                height: 3mm !important;
            }
'''
    extra = '''            #page-1-signatures .h-5 {
                height: 3mm !important;
            }

            #page-2-signatures {
                margin-top: 3mm !important;
                flex: 0 0 auto !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
            }

            #page-2-signatures .h-5 {
                height: 3mm !important;
            }
'''
    if marker in s:
        s = s.replace(marker, extra, 1)

INDEX.write_text(s, encoding='utf-8')

# Refresh the installed PWA cache.
t = SW.read_text(encoding='utf-8')
for old in [
    'abu-sula-operational-plan-v5',
    'abu-sula-operational-plan-v6',
]:
    t = t.replace(old, 'abu-sula-operational-plan-v7')
SW.write_text(t, encoding='utf-8')

print('Raised signature/footer blocks and reduced post-table spacing for A4 print.')
