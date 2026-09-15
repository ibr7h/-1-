from pathlib import Path

INDEX = Path('operational-plan-pwa/index.html')
SW = Path('operational-plan-pwa/sw.js')

s = INDEX.read_text(encoding='utf-8')

# Move the mid-year vacation/signature footer very close to the end of the
# schedule table in iPhone A4 print preview. From the current -55 mm position,
# raise another 17 mm so only a small visual gap remains.
s = s.replace('margin-top: -55mm !important;', 'margin-top: -72mm !important;', 1)

INDEX.write_text(s, encoding='utf-8')

# Refresh the installed PWA cache for this final near-table placement.
t = SW.read_text(encoding='utf-8')
t = t.replace('abu-sula-operational-plan-v10', 'abu-sula-operational-plan-v11')
SW.write_text(t, encoding='utf-8')

print('Moved first-page vacation/signature footer close to the schedule table.')
