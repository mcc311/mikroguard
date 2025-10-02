/**
 * UI and application constants
 * Non-configuration values used throughout the application
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// UI Timeouts
export const UI_TIMEOUTS = {
  COPY_FEEDBACK_MS: 2000, // How long to show "Copied!" feedback
  TOAST_DURATION_MS: 3000, // Default toast notification duration
} as const;

// Date/Time Thresholds
export const TIME_THRESHOLDS = {
  EXPIRATION_WARNING_DAYS: 7, // Show warning when config expires within N days
  EXPIRATION_WARNING_MS: 7 * 24 * 60 * 60 * 1000, // Same as above in milliseconds
} as const;

// WireGuard Protocol Constants (DO NOT CHANGE - these are protocol requirements)
export const WIREGUARD_PROTOCOL = {
  PRIVATE_KEY_LENGTH: 44, // Base64 encoded key length
  PUBLIC_KEY_LENGTH: 44, // Base64 encoded key length
  KEY_BUFFER_LENGTH: 32, // Raw key byte length

  // Key clamping values (Curve25519 requirements)
  CLAMP_MASK_0: 248,
  CLAMP_MASK_31_AND: 127,
  CLAMP_MASK_31_OR: 64,
} as const;

// Network Constants
export const NETWORK = {
  BROADCAST_IP_OCTET: 255,
  NETWORK_IP_OCTET: 0,
  SERVER_IP_OCTET: 1, // Typically .1 is reserved for server
} as const;

// File Download Constants
export const FILE_DOWNLOAD = {
  CONFIG_MIME_TYPE: 'text/plain',
  CONFIG_FILE_EXTENSION: '.conf',
} as const;

// UI Text
export const UI_TEXT = {
  PLACEHOLDER_PRIVATE_KEY: 'YOUR_PRIVATE_KEY_HERE',
} as const;

// Export all constants as a single object for convenience
export const CONSTANTS = {
  HTTP_STATUS,
  UI_TIMEOUTS,
  TIME_THRESHOLDS,
  WIREGUARD_PROTOCOL,
  NETWORK,
  FILE_DOWNLOAD,
  UI_TEXT,
} as const;
