/**
 * Types for Space Config Validation
 * This file contains type definitions used by the space config validator
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error';
  value?: any;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  severity: 'warning';
  value?: any;
}

export interface ValidationSuggestion {
  code: string;
  message: string;
  path: string;
  severity: 'suggestion';
  suggestedValue?: any;
}

export type ValidationIssue = ValidationError | ValidationWarning | ValidationSuggestion;

export interface SpaceConfigValidationContext {
  allowUnknownFidgetTypes?: boolean;
  strictMode?: boolean;
  skipLayoutValidation?: boolean;
  maxFidgets?: number;
  allowedFidgetTypes?: string[];
}

// Known fidget types from the codebase
export const KNOWN_FIDGET_TYPES = [
  'text',
  'gallery', 
  'iframe',
  'frame',
  'feed',
  'cast',
  'governance',
  'links',
  'SnapShot',
  'Swap',
  'Rss',
  'Video',
  'Market',
  'Portfolio',
  'Chat',
  'FramesV2',
  'example',
  'profile'
] as const;

export type KnownFidgetType = typeof KNOWN_FIDGET_TYPES[number];

// Layout fidget types
export const LAYOUT_FIDGET_TYPES = ['grid', 'tabFullScreen'] as const;
export type LayoutFidgetType = typeof LAYOUT_FIDGET_TYPES[number];

// Color validation patterns
export const COLOR_PATTERNS = {
  HEX: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  RGB: /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/,
  RGBA: /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/,
  HSL: /^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/,
  HSLA: /^hsla\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*(0|1|0?\.\d+)\s*\)$/,
  LINEAR_GRADIENT: /^linear-gradient\(/,
  VAR: /^var\(--[\w-]+\)$/
} as const;

// Font families that are known to be supported
export const SUPPORTED_FONTS = [
  'Inter',
  'Poppins',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Source Sans Pro',
  'Oswald',
  'Raleway',
  'PT Sans',
  'IBM Plex Sans',
  'Nunito',
  'Quicksand',
  'Work Sans',
  'Playfair Display',
  'Merriweather',
  'Roboto Mono',
  'Source Code Pro',
  'Fira Code',
  'Space Grotesk',
  'Ubuntu',
  'Noto Serif',
  'Noto Sans',
  'Roboto Condensed',
  'Roboto Slab',
  'Londrina Solid',
  'Goldman',
  'Trispace',
  'Exo',
  'IBM Plex Mono',
  'Anek Latin'
] as const;

export type SupportedFont = typeof SUPPORTED_FONTS[number];

// Grid constraints
export const GRID_CONSTRAINTS = {
  MIN_WIDTH: 1,
  MAX_WIDTH: 36,
  MIN_HEIGHT: 1,
  MAX_HEIGHT: 36,
  FEED_COLS: 6,
  NO_FEED_COLS: 12,
  PROFILE_MAX_ROWS: 8,
  NO_PROFILE_MAX_ROWS: 10
} as const;

// Fidget size constraints by type
export const FIDGET_SIZE_CONSTRAINTS: Record<string, {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}> = {
  text: { minWidth: 3, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  gallery: { minWidth: 1, maxWidth: 36, minHeight: 1, maxHeight: 36 },
  iframe: { minWidth: 3, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  frame: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  feed: { minWidth: 4, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  cast: { minWidth: 2, maxWidth: 36, minHeight: 1, maxHeight: 36 },
  governance: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  links: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  SnapShot: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  Swap: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  Rss: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  Video: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  Market: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  Portfolio: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  Chat: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 },
  FramesV2: { minWidth: 2, maxWidth: 36, minHeight: 2, maxHeight: 36 }
} as const;
