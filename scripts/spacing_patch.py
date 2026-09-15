from pathlib import Path

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# Normalize the closing brace left from an earlier print patch.
s = s.replace(
    "            .official-calendar-qr img {\n                object-fit: contain !important;\n            }        }\n",
    "            .official-calendar-qr img {\n                object-fit: contain !important;\n            }\n        }\n",
)

# Add stable hooks for the mid-year vacation bar and page-1 signatures.
if 'id="midyear-vacation-bar"' not in s:
    s = s.replace(
        '<!-- شريط إجازة منتصف العام الدراسي -->\n            <div class="border border-slate-400 rounded-md bg-slate-50 p-1.5 text-center text-[10.5px] shadow-sm">',
        '<!-- شريط إجازة منتصف العام الدراسي -->\n            <div id="midyear-vacation-bar" class="border border-slate-400 rounded-md bg-slate-50 p-1.5 text-center text-[10.5px] shadow-sm">',
        1,
    )

if 'id="page-1-signatures"' not in s:
    s = s.replace(
        '<!-- قسم التوقيعات (صفحة 1) -->\n            <div class="pt-1.5 border-t-2 border-slate-800 flex justify-between items-end text-center text-[11.5px] px-2">',
        '<!-- قسم التوقيعات (صفحة 1) -->\n            <div id="page-1-signatures" class="pt-1.5 border-t-2 border-slate-800 flex justify-between items-end text-center text-[11.5px] px-2">',
        1,
    )

# In print mode, stop distributing the unused height between the table and
# the mid-year vacation bar. Keep a controlled gap of about 2–3 text lines,
# while leaving the signature block anchored at the bottom of page 1.
print_rules = """

            /* تقليل الفراغ بين نهاية الجدول وشريط إجازة منتصف العام. */
            #page-1 {
                justify-content: flex-start !important;
            }

            #midyear-vacation-bar {
                margin-top: 8mm !important;
                flex: 0 0 auto !important;
            }

            #page-1-signatures {
                margin-top: auto !important;
                flex: 0 0 auto !important;
            }
"""

if '#midyear-vacation-bar {' not in s:
    marker = """            .official-calendar-qr img {
                object-fit: contain !important;
            }
        }
"""
    replacement = """            .official-calendar-qr img {
                object-fit: contain !important;
            }""" + print_rules + """        }
"""
    if marker not in s:
        raise SystemExit('print CSS insertion marker not found')
    s = s.replace(marker, replacement, 1)

INDEX.write_text(s, encoding='utf-8')

# Refresh the installed PWA so the new print spacing is picked up immediately.
t = SW.read_text(encoding='utf-8')
t = t.replace("abu-sula-operational-plan-v5", "abu-sula-operational-plan-v6")
SW.write_text(t, encoding='utf-8')

print('Reduced table-to-midyear-vacation print gap to approximately 2–3 lines.')
