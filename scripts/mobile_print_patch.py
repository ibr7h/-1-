from pathlib import Path

INDEX = Path("operational-plan-pwa/index.html")
SW = Path("operational-plan-pwa/sw.js")

s = INDEX.read_text(encoding="utf-8")

# Keep Tailwind local so the installed PWA remains self-contained/offline.
s = s.replace(
    '<script src="https://cdn.tailwindcss.com/3.4.17"></script>',
    '<script src="./tailwind-play.js"></script>',
)

# Mobile-only print scaling. Desktop remains at 100%.
if "body.mobile-print-fit .page-container" not in s:
    marker = """            .official-calendar-qr img {
                object-fit: contain !important;
            }
        }
"""
    replacement = """            .official-calendar-qr img {
                object-fit: contain !important;
            }

            /* Mobile print: desktop stays 100%; phones/tablets use 78%. */
            body.mobile-print-fit,
            body.mobile-print-fit #multi-page-container {
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
            }

            body.mobile-print-fit .page-container {
                zoom: 0.78 !important;
                transform: none !important;
                transform-origin: top center !important;
                margin-left: auto !important;
                margin-right: auto !important;
            }
        }
"""
    if marker not in s:
        raise SystemExit("CSS insertion marker not found")
    s = s.replace(marker, replacement, 1)

# Detect phone/tablet printing without affecting desktop printing.
if "function isMobilePrintDevice()" not in s:
    marker = """        // ============================================
        // تصدير PDF آمن: كل صفحة A4 تُجهّز منفصلة ثم تُجمع
        // ============================================
"""
    helper = """        function isMobilePrintDevice() {
            const ua = navigator.userAgent || '';
            const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            return isIOS || /Android|Mobile/i.test(ua);
        }

        function applyPrintDeviceProfile() {
            document.body.classList.toggle('mobile-print-fit', isMobilePrintDevice());
        }

        // ============================================
        // تصدير PDF آمن: كل صفحة A4 تُجهّز منفصلة ثم تُجمع
        // ============================================
"""
    if marker not in s:
        raise SystemExit("JS helper insertion marker not found")
    s = s.replace(marker, helper, 1)

# Apply the mobile profile to the Save PDF path as well.
export_marker = """            } else {
                document.title = 'النظام_التشغيلي_الفترتان_1448';
            }

            // انتظر خط Cairo والصور قبل أن يفتح محرك PDF الأصلي للمتصفح.
"""
export_replacement = """            } else {
                document.title = 'النظام_التشغيلي_الفترتان_1448';
            }

            applyPrintDeviceProfile();

            // انتظر خط Cairo والصور قبل أن يفتح محرك PDF الأصلي للمتصفح.
"""
if "applyPrintDeviceProfile();\n\n            // انتظر خط Cairo" not in s:
    if export_marker not in s:
        raise SystemExit("exportToPDF insertion marker not found")
    s = s.replace(export_marker, export_replacement, 1)

# Keep the print class active until the native print UI is actually closed.
start = s.find("        function executePrint(mode) {")
end = s.find("\n        // تمييز الأسبوع الحالي وتاريخ اليوم", start)
if start == -1 or end == -1:
    raise SystemExit("executePrint markers not found")

new_execute = """        function executePrint(mode) {
            const printRange = document.getElementById('print-page-range').value;
            const previousClasses = document.body.className;

            document.body.classList.remove('print-only-p1', 'print-only-p2');
            if (printRange === 'p1') {
                document.body.classList.add('print-only-p1');
            } else if (printRange === 'p2') {
                document.body.classList.add('print-only-p2');
            }

            if (mode === 'office') {
                document.body.classList.remove('mode-interactive');
                document.body.classList.add('mode-office');
            } else {
                document.body.classList.remove('mode-office');
                document.body.classList.add('mode-interactive');
                refreshInteractiveView();
            }

            applyPrintDeviceProfile();

            const restore = () => {
                document.body.className = previousClasses;
                refreshInteractiveView();
            };

            window.addEventListener('afterprint', restore, { once: true });
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setTimeout(() => window.print(), 80));
            });

            // Fallback for browsers that do not fire afterprint when print is cancelled.
            setTimeout(() => {
                if (document.body.classList.contains('mobile-print-fit') ||
                    document.body.classList.contains('print-only-p1') ||
                    document.body.classList.contains('print-only-p2')) {
                    restore();
                }
            }, 120000);
        }
"""
s = s[:start] + new_execute + s[end:]

INDEX.write_text(s, encoding="utf-8")

# Refresh the installed PWA cache after the print fix.
t = SW.read_text(encoding="utf-8")
t = t.replace("abu-sula-operational-plan-v3", "abu-sula-operational-plan-v4")
SW.write_text(t, encoding="utf-8")

print("Mobile A4 print patch applied successfully.")
