from pathlib import Path
import re

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# iOS Safari reserves part of the physical A4 sheet for its own print footer
# (URL/date/page number). A 297 mm CSS page can therefore spill by a small
# amount and create an extra blank physical sheet. Keep desktop unchanged and
# shorten only the app's page box when printing from iPhone/iPad.
ios_css = '''

        /* iPhone/iPad print pagination correction only. */
        @media print {
            body.ios-print .page-container {
                height: 270mm !important;
                min-height: 270mm !important;
                max-height: 270mm !important;
            }
        }
'''

if 'body.ios-print .page-container' not in s:
    style_marker = '    </style>'
    if style_marker not in s:
        raise SystemExit('Style closing marker not found; refusing unsafe edit.')
    s = s.replace(style_marker, ios_css + '\n' + style_marker, 1)

# Add the iOS print class synchronously immediately before window.print().
# This preserves the user gesture and avoids the automatic-print blocking that
# appeared when printing was delayed with timers/animation frames.
if "document.body.classList.toggle('ios-print', isIOSPrint);" not in s:
    pattern = re.compile(r'(?m)^(\s*)window\.print\(\);\s*$')

    def repl(match):
        indent = match.group(1)
        return (
            f"{indent}const isIOSPrint = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||\n"
            f"{indent}    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);\n"
            f"{indent}document.body.classList.toggle('ios-print', isIOSPrint);\n"
            f"{indent}window.print();"
        )

    s, count = pattern.subn(repl, s)
    if count != 2:
        raise SystemExit(f'Expected 2 direct window.print calls, found {count}; refusing unsafe edit.')

INDEX.write_text(s, encoding='utf-8')

# Refresh the installed PWA cache so iPhones receive this mobile-only fix.
t = SW.read_text(encoding='utf-8')
t = t.replace('abu-sula-operational-plan-v14', 'abu-sula-operational-plan-v15')
SW.write_text(t, encoding='utf-8')

print('Applied iOS-only 270 mm print page box; desktop A4 layout unchanged.')
