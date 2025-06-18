/**
 * Main entry point for Space Config Validator
 * Exports all the essential functions and types needed for validation
 */

// Core validation functionality
export { SpaceConfigValidator, validateSpaceConfig } from './validator';

// Utility functions
export {
  isValidSpaceConfig,
  getSpaceConfigErrors,
  getValidationSummary,
  createMinimalSpaceConfig,
  addFidgetToConfig,
  validateFidgetSettings,
  isValidColor,
  sanitizeSpaceConfig,
  getFidgetTypes,
  getLayoutStats
} from './utils';

// Types
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  SpaceConfigValidationContext,
  KnownFidgetType,
  LayoutFidgetType
} from './types';

// Examples for testing
export {
  minimalValidConfig,
  singleTextFidgetConfig,
  multipleFidgetsConfig,
  tabFullScreenConfig,
  configWithTray,
  invalidMissingFields,
  invalidFieldTypes,
  invalidOrphanedLayout,
  invalidOverlappingItems,
  invalidUnknownFidgetType,
  invalidOutOfBounds,
  exampleConfigs
} from './examples';

// Re-export constants that might be useful
export {
  KNOWN_FIDGET_TYPES,
  LAYOUT_FIDGET_TYPES,
  COLOR_PATTERNS,
  SUPPORTED_FONTS
} from './types';
