/**
 * Owner / Admin Management Engine for iLoveQyu
 * Created specifically for: Sufyan Tsaury
 */

export interface OwnerSettings {
  isOwnerActive: boolean;
  qrisImageUrl: string;
  danaNumber: string;
  waNumber: string;
  libreOfficeApiUrl: string;
}

const OWNER_ACTIVE_KEY = 'iloveqyu_owner_active_v1';
const OWNER_SETTINGS_KEY = 'iloveqyu_owner_settings_v1';

// Default Master PIN for Sufyan Tsaury (bisa diganti kapan saja)
export const DEFAULT_MASTER_PIN = '753'; // Sesuai sufyantsaury753

export const DEFAULT_SETTINGS: OwnerSettings = {
  isOwnerActive: false,
  qrisImageUrl: '',
  danaNumber: '',
  waNumber: '',
  libreOfficeApiUrl: 'https://demo.gotenberg.dev',
};

/**
 * Check if the current browser session is logged in as Owner
 */
export function isOwnerLoggedIn(): boolean {
  return localStorage.getItem(OWNER_ACTIVE_KEY) === 'true';
}

/**
 * Login with Owner PIN
 */
export function verifyOwnerPIN(pin: string): boolean {
  const cleanPin = pin.trim();
  if (cleanPin === DEFAULT_MASTER_PIN || cleanPin === 'sufyan123' || cleanPin === 'SUFYANVIP') {
    localStorage.setItem(OWNER_ACTIVE_KEY, 'true');
    return true;
  }
  return false;
}

/**
 * Logout / deactivate Owner Mode
 */
export function logoutOwner(): void {
  localStorage.removeItem(OWNER_ACTIVE_KEY);
}

/**
 * Toggle temporary simulation mode (to test regular user experience)
 */
export function setSimulationMode(simulateRegularUser: boolean): void {
  if (simulateRegularUser) {
    sessionStorage.setItem('iloveqyu_simulate_user', 'true');
  } else {
    sessionStorage.removeItem('iloveqyu_simulate_user');
  }
}

export function isSimulatingRegularUser(): boolean {
  return sessionStorage.getItem('iloveqyu_simulate_user') === 'true';
}

/**
 * Get and update custom Owner settings (QRIS image, DANA number, WhatsApp)
 */
export function getOwnerSettings(): OwnerSettings {
  try {
    const raw = localStorage.getItem(OWNER_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

export function saveOwnerSettings(settings: Partial<OwnerSettings>): void {
  const current = getOwnerSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(OWNER_SETTINGS_KEY, JSON.stringify(updated));
}
