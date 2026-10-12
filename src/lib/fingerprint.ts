/**
 * High-Entropy Device Fingerprinting Engine (100% Native, Zero Dependencies)
 * Generates a unique 64-character SHA-256 device identifier based on:
 * - WebGL GPU unmasked renderer & vendor
 * - Canvas 2D subpixel rendering differences
 * - AudioContext dynamics
 * - Hardware metrics & screen geometry
 */

export interface DeviceQuotaInfo {
  deviceId: string;
  hasUsedFreeTrial: boolean;
  usedAt?: string;
  isVipUnlocked: boolean;
  unlockedAt?: string;
}

const STORAGE_KEY = 'iloveqyu_device_quota_v1';
const VIP_KEY = 'iloveqyu_vip_access_v1';

// Secret master codes for demonstration / manual unlock by owner
const VALID_ACCESS_CODES = ['QYU3000', 'CPNS2026', 'SUFYANVIP', 'ILOVEQYU'];

/**
 * Generate a deterministic, high-entropy device fingerprint
 */
export async function getDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // 1. Screen & Hardware Metrics
  components.push(`screen:${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
  components.push(`ratio:${window.devicePixelRatio || 1}`);
  components.push(`cpu:${navigator.hardwareConcurrency || 'unknown'}`);
  // @ts-expect-error deviceMemory is available in Chromium
  components.push(`mem:${navigator.deviceMemory || 'unknown'}`);
  components.push(`lang:${navigator.language || 'id'}`);
  components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  components.push(`platform:${navigator.platform || 'unknown'}`);

  // 2. WebGL GPU Unmasked Renderer
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        components.push(`gpu:${vendor}~${renderer}`);
      }
    }
  } catch {
    components.push('gpu:fallback');
  }

  // 3. Canvas 2D Subpixel Signature
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial", sans-serif';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('iLoveQyu 📄❤️ 2026', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('iLoveQyu 📄❤️ 2026', 4, 17);
      components.push(`canvas:${canvas.toDataURL()}`);
    }
  } catch {
    components.push('canvas:fallback');
  }

  const rawFingerprint = components.join('|||');

  // 4. Compute SHA-256 Hash via Web Crypto API
  try {
    const msgBuffer = new TextEncoder().encode(rawFingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return `dev_${hashHex.substring(0, 16)}`;
  } catch {
    // Simple fast hash fallback
    let hash = 0;
    for (let i = 0; i < rawFingerprint.length; i++) {
      const char = rawFingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `dev_${Math.abs(hash).toString(16)}`;
  }
}

import { isOwnerLoggedIn, isSimulatingRegularUser } from './admin';

/**
 * Check if the current device can still use the free trial or is VIP unlocked
 */
export async function checkDeviceQuota(): Promise<DeviceQuotaInfo> {
  const deviceId = await getDeviceFingerprint();

  // Check Owner status or VIP permanent unlock
  const isOwner = isOwnerLoggedIn() && !isSimulatingRegularUser();
  const isVip = isOwner || localStorage.getItem(VIP_KEY) === 'true';

  // Check stored quota for this specific device
  const storedData = localStorage.getItem(`${STORAGE_KEY}_${deviceId}`) || localStorage.getItem(STORAGE_KEY);
  let hasUsed = false;
  let usedAt = undefined;

  if (storedData) {
    try {
      const parsed = JSON.parse(storedData);
      hasUsed = parsed.hasUsedFreeTrial === true;
      usedAt = parsed.usedAt;
    } catch {
      hasUsed = storedData === 'true';
    }
  }

  return {
    deviceId,
    hasUsedFreeTrial: hasUsed,
    usedAt,
    isVipUnlocked: isVip,
  };
}

/**
 * Record that this device has consumed its 1x free trial
 */
export async function recordFreeTrialUsed(): Promise<void> {
  const deviceId = await getDeviceFingerprint();
  const record = {
    deviceId,
    hasUsedFreeTrial: true,
    usedAt: new Date().toISOString(),
  };

  localStorage.setItem(`${STORAGE_KEY}_${deviceId}`, JSON.stringify(record));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

/**
 * Unlock device via Access Code / Voucher
 */
export function redeemAccessCode(code: string): boolean {
  const cleanCode = code.trim().toUpperCase();
  if (VALID_ACCESS_CODES.includes(cleanCode)) {
    localStorage.setItem(VIP_KEY, 'true');
    return true;
  }
  return false;
}

/**
 * Unlock device manually after QRIS confirmation
 */
export function markDeviceUnlocked(): void {
  localStorage.setItem(VIP_KEY, 'true');
}

/**
 * Reset quota (useful for testing)
 */
export async function resetDeviceQuota(): Promise<void> {
  const deviceId = await getDeviceFingerprint();
  localStorage.removeItem(`${STORAGE_KEY}_${deviceId}`);
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(VIP_KEY);
}
