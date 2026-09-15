from pathlib import Path

INDEX = Path("operational-plan-pwa/index.html")
SW = Path("operational-plan-pwa/sw.js")

s = INDEX.read_text(encoding="utf-8")

# Keep Tailwind local so the installed PWA remains self-contained/offline.
s = s.replace(
    '<script src="https://cdn.tailwindcss.com/3.4.17"></script>',
    '<script src="./tailwind-play.js"></script>',
)

# The printer is now configured to A4 on the phone, so mobile 78% scaling is
# no longer appropriate. Remove the temporary mobile print profile entirely.
mobile_css = """

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
"""
s = s.replace(mobile_css, "")

mobile_helpers = """        function isMobilePrintDevice() {
            const ua = navigator.userAgent || '';
            const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            return isIOS || /Android|Mobile/i.test(ua);
        }

        function applyPrintDeviceProfile() {
            document.body.classList.toggle('mobile-print-fit', isMobilePrintDevice());
        }

"""
s = s.replace(mobile_helpers, "")
s = s.replace("            applyPrintDeviceProfile();\n\n", "")

# Replace the PDF/print path with a fully user-initiated print call.
# Safari/Chrome may block window.print() when it runs after await/timers because
# the original user activation has expired. All preparation therefore happens
# synchronously and window.print() is called immediately in the click handler.
export_start = s.find("        async function exportToPDF() {")
if export_start == -1:
    export_start = s.find("        function exportToPDF() {")
export_end_token = "\n        // تم إلغاء تصدير Word بناءً على طلب المستخدم."
export_end = s.find(export_end_token, export_start)
if export_start == -1 or export_end == -1:
    raise SystemExit("exportToPDF markers not found")

new_export = """        function exportToPDF() {
            const range = document.getElementById('print-page-range').value;
            const previousTitle = document.title;
            const previousClasses = document.body.className;

            document.body.classList.remove('print-only-p1', 'print-only-p2');
            if (range === 'p1') {
                document.body.classList.add('print-only-p1');
                document.title = 'النظام_التشغيلي_الفترة_الأولى_1448';
            } else if (range === 'p2') {
                document.body.classList.add('print-only-p2');
                document.title = 'النظام_التشغيلي_الفترة_الثانية_1448';
            } else {
                document.title = 'النظام_التشغيلي_الفترتان_1448';
            }

            const restore = () => {
                document.body.className = previousClasses;
                document.title = previousTitle;
                refreshInteractiveView();
            };

            window.addEventListener('afterprint', restore, { once: true });

            // IMPORTANT: keep this call synchronous and directly connected to
            // the user's click. Delaying it can trigger browser print blocking.
            window.print();

            // Fallback for browsers that do not fire afterprint after cancellation.
            setTimeout(() => {
                if (document.title !== previousTitle) restore();
            }, 120000);
        }
"""
s = s[:export_start] + new_export + s[export_end:]

# Replace executePrint with the same direct user-activation-safe strategy.
exec_start = s.find("        function executePrint(mode) {")
exec_end_token = "\n        // تمييز الأسبوع الحالي وتاريخ اليوم"
exec_end = s.find(exec_end_token, exec_start)
if exec_start == -1 or exec_end == -1:
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

            const restore = () => {
                document.body.className = previousClasses;
                refreshInteractiveView();
            };

            window.addEventListener('afterprint', restore, { once: true });

            // Must remain synchronous to preserve the browser's user activation.
            window.print();

            setTimeout(() => {
                if (document.body.classList.contains('print-only-p1') ||
                    document.body.classList.contains('print-only-p2') ||
                    document.body.classList.contains('mode-office')) {
                    restore();
                }
            }, 120000);
        }
"""
s = s[:exec_start] + new_execute + s[exec_end:]

INDEX.write_text(s, encoding="utf-8")

# Refresh the installed PWA cache so phones do not retain the previous 78% CSS.
t = SW.read_text(encoding="utf-8")
for old in ["abu-sula-operational-plan-v3", "abu-sula-operational-plan-v4"]:
    t = t.replace(old, "abu-sula-operational-plan-v5")
SW.write_text(t, encoding="utf-8")

print("Native A4 / direct user-initiated print patch applied successfully.")
