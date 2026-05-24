// 🏛️ BHARAT-OS: PERFORMANCE MODE — LOW-END DEVICE DETECTION
// ================================================================
// Detects low-end Android devices (Redmi A-series, Android Go, etc.)
// and provides runtime signals for performance optimization.
//
// Signals evaluated:
//   - navigator.deviceMemory (low RAM)
//   - navigator.hardwareConcurrency (weak CPU)
//   - prefers-reduced-motion (OS-level)
//   - mobile WebView / low-end Android heuristics
//   - viewport size (tiny screens)
// ================================================================

let _isLowEnd: boolean | null = null;
let _reduceEffects: boolean | null = null;
let _disableBlur: boolean | null = null;

function detectLowEnd(): boolean {
    if (typeof window === "undefined") return false;

    const deviceMemory = (navigator as any).deviceMemory as number | undefined;
    const cpuCores = navigator.hardwareConcurrency;
    const ua = navigator.userAgent.toLowerCase();

    // 1. 2GB RAM or less
    if (deviceMemory !== undefined && deviceMemory <= 2) return true;

    // 2. Low RAM + few cores
    if (deviceMemory !== undefined && deviceMemory <= 4 && cpuCores !== undefined && cpuCores <= 4) return true;

    // 3. Reduced motion OS setting
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;

    // 4. Low-end Android heuristic
    const lowEndPatterns = /redmi|xiaomi|realme|infinix|tecno|itel|galaxy a|galaxy m|galaxy j/;
    if (ua.includes("android") && lowEndPatterns.test(ua) && cpuCores !== undefined && cpuCores <= 4) return true;

    // 5. WebView
    const isWebView = (ua.includes("wv") || ua.includes("webview")) && !ua.includes("chrome");
    if (isWebView) return true;

    // 6. Tiny viewport + low DPR
    if (window.innerWidth <= 360 && window.devicePixelRatio < 2) return true;

    return false;
}

export function isLowEndDevice(): boolean {
    if (_isLowEnd === null) _isLowEnd = detectLowEnd();
    return _isLowEnd;
}

export function shouldReduceEffects(): boolean {
    if (_reduceEffects === null) _reduceEffects = isLowEndDevice();
    return _reduceEffects;
}

export function shouldDisableBlur(): boolean {
    if (_disableBlur === null) _disableBlur = isLowEndDevice();
    return _disableBlur;
}

/** Apply performance mode CSS classes to document root */
export function applyPerformanceMode(): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (isLowEndDevice()) {
        root.classList.add("low-perf-mode");
        if (shouldDisableBlur()) root.classList.add("no-blur");
        if (shouldReduceEffects()) root.classList.add("reduce-effects");
    }
    root.dataset.perfMode = isLowEndDevice() ? "low" : "standard";
}

/** Initialize reactive listener for reduced-motion changes */
export function initPerformanceModeListener(): void {
    if (typeof window === "undefined") return;
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
        _isLowEnd = null;
        _reduceEffects = null;
        _disableBlur = null;
        applyPerformanceMode();
    });
}
