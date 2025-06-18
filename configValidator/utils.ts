/**
 * Utility functions for Space Config Validation
 * Helper functions for common validation tasks
 */

import { validateSpaceConfig } from './validator';
import { ValidationResult, SpaceConfigValidationContext } from './types';

/**
 * Quick validation for basic space config structure
 */
export function isValidSpaceConfig(config: any): boolean {
  const result = validateSpaceConfig(config);
  return result.isValid;
}

/**
 * Get only validation errors (no warnings or suggestions)
 */
export function getSpaceConfigErrors(config: any, context?: SpaceConfigValidationContext): string[] {
  const result = validateSpaceConfig(config, context);
  return result.errors.map(error => `${error.path}: ${error.message}`);
}

/**
 * Get validation summary as formatted string
 */
export function getValidationSummary(result: ValidationResult): string {
  const lines: string[] = [];
  
  if (result.isValid) {
    lines.push('✅ Space config is valid!');
  } else {
    lines.push('❌ Space config has validation errors');
  }
  
  if (result.errors.length > 0) {
    lines.push(`\n🚨 Errors (${result.errors.length}):`);
    result.errors.forEach(error => {
      lines.push(`  • ${error.path}: ${error.message}`);
    });
  }
  
  if (result.warnings.length > 0) {
    lines.push(`\n⚠️  Warnings (${result.warnings.length}):`);
    result.warnings.forEach(warning => {
      lines.push(`  • ${warning.path}: ${warning.message}`);
    });
  }
  
  if (result.suggestions.length > 0) {
    lines.push(`\n💡 Suggestions (${result.suggestions.length}):`);
    result.suggestions.forEach(suggestion => {
      lines.push(`  • ${suggestion.path}: ${suggestion.message}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * Validate and format the result as JSON
 */
export function validateSpaceConfigJSON(config: any, context?: SpaceConfigValidationContext): string {
  const result = validateSpaceConfig(config, context);
  return JSON.stringify(result, null, 2);
}

/**
 * Create a minimal valid space config template
 */
export function createMinimalSpaceConfig(): any {
  return {
    fidgetInstanceDatums: {},
    layoutID: "default",
    layoutDetails: {
      layoutFidget: "grid",
      layoutConfig: {
        layout: []
      }
    },
    isEditable: true,
    fidgetTrayContents: [],
    theme: {
      id: "default",
      name: "Default Theme",
      properties: {
        font: "Inter",
        fontColor: "#000000",
        headingsFont: "Inter", 
        headingsFontColor: "#000000",
        background: "#ffffff",
        backgroundHTML: "",
        musicURL: "",
        fidgetBackground: "#ffffff",
        fidgetBorderWidth: "1px",
        fidgetBorderColor: "#eeeeee",
        fidgetShadow: "none",
        fidgetBorderRadius: "12px",
        gridSpacing: "16"
      }
    }
  };
}

/**
 * Add a fidget to a space config with validation
 */
export function addFidgetToConfig(
  config: any, 
  fidgetType: string, 
  fidgetId: string,
  x: number = 0,
  y: number = 0,
  w: number = 3,
  h: number = 2,
  settings: any = {}
): { config: any; errors: string[] } {
  
  const errors: string[] = [];
  
  // Clone the config
  const newConfig = JSON.parse(JSON.stringify(config));
  
  // Create fidget instance
  const fidgetInstanceData = {
    config: {
      editable: true,
      settings: settings,
      data: {}
    },
    fidgetType: fidgetType,
    id: fidgetId
  };
  
  // Create grid item
  const gridItem = {
    i: fidgetId,
    x: x,
    y: y,
    w: w,
    h: h,
    minW: w,
    maxW: 36,
    minH: h,
    maxH: 36,
    moved: false,
    static: false
  };
  
  // Add to config
  newConfig.fidgetInstanceDatums[fidgetId] = fidgetInstanceData;
  newConfig.layoutDetails.layoutConfig.layout.push(gridItem);
  
  // Validate the updated config
  const validationResult = validateSpaceConfig(newConfig);
  if (!validationResult.isValid) {
    errors.push(...validationResult.errors.map(e => e.message));
  }
  
  return { config: newConfig, errors };
}

/**
 * Validate fidget settings for a specific fidget type
 */
export function validateFidgetSettings(fidgetType: string, settings: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof settings !== 'object' || settings === null) {
    errors.push('Settings must be an object');
    return { isValid: false, errors };
  }
  
  // Common validations
  if ('showOnMobile' in settings && typeof settings.showOnMobile !== 'boolean') {
    errors.push('showOnMobile must be a boolean');
  }
  
  if ('customMobileDisplayName' in settings && typeof settings.customMobileDisplayName !== 'string') {
    errors.push('customMobileDisplayName must be a string');
  }
  
  // Color validations
  const colorFields = ['background', 'fontColor', 'headingsFontColor', 'fidgetBorderColor'];
  for (const field of colorFields) {
    if (field in settings && typeof settings[field] === 'string') {
      if (!isValidColor(settings[field])) {
        errors.push(`${field} has invalid color format`);
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Check if a color string is valid
 */
export function isValidColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  
  // Basic color validation patterns
  const patterns = [
    /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, // Hex
    /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/, // RGB
    /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/, // RGBA
    /^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$/, // HSL
    /^hsla\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*,\s*(0|1|0?\.\d+)\s*\)$/, // HSLA
    /^linear-gradient\(/, // Linear gradient
    /^var\(--[\w-]+\)$/ // CSS variable
  ];
  
  return patterns.some(pattern => pattern.test(color)) || 
         color === 'transparent' || 
         color === 'currentColor' ||
         /^[a-zA-Z]+$/.test(color); // Named colors
}

/**
 * Sanitize a space config by removing invalid properties
 */
export function sanitizeSpaceConfig(config: any): any {
  const result = validateSpaceConfig(config);
  
  if (result.isValid) {
    return config;
  }
  
  // Create a clean copy
  const sanitized = JSON.parse(JSON.stringify(config));
  
  // Remove items that cause errors
  for (const error of result.errors) {
    if (error.code === 'ORPHANED_LAYOUT_ITEM') {
      // Remove orphaned layout items
      if (sanitized.layoutDetails?.layoutConfig?.layout) {
        sanitized.layoutDetails.layoutConfig.layout = sanitized.layoutDetails.layoutConfig.layout.filter(
          (item: any) => item.i && sanitized.fidgetInstanceDatums[item.i]
        );
      }
    } else if (error.code === 'MISSING_FIDGET_REFERENCE') {
      // Remove layout items that reference missing fidgets
      if (sanitized.layoutDetails?.layoutConfig?.layout) {
        sanitized.layoutDetails.layoutConfig.layout = sanitized.layoutDetails.layoutConfig.layout.filter(
          (item: any) => item.i && sanitized.fidgetInstanceDatums[item.i]
        );
      }
    }
  }
  
  return sanitized;
}

/**
 * Get fidget types used in a space config
 */
export function getFidgetTypes(config: any): string[] {
  if (!config?.fidgetInstanceDatums) {
    return [];
  }
  
  const types = new Set<string>();
  for (const fidget of Object.values(config.fidgetInstanceDatums)) {
    if (typeof fidget === 'object' && fidget !== null && 'fidgetType' in fidget) {
      types.add((fidget as any).fidgetType);
    }
  }
  
  return Array.from(types);
}

/**
 * Get layout statistics
 */
export function getLayoutStats(config: any): {
  totalFidgets: number;
  layoutItems: number;
  trayItems: number;
  usedGridCells: number;
  maxX: number;
  maxY: number;
} {
  const stats = {
    totalFidgets: 0,
    layoutItems: 0,
    trayItems: 0,
    usedGridCells: 0,
    maxX: 0,
    maxY: 0
  };
  
  if (config?.fidgetInstanceDatums) {
    stats.totalFidgets = Object.keys(config.fidgetInstanceDatums).length;
  }
  
  if (config?.layoutDetails?.layoutConfig?.layout) {
    const layout = config.layoutDetails.layoutConfig.layout;
    stats.layoutItems = layout.length;
    
    for (const item of layout) {
      if (typeof item === 'object' && item !== null) {
        if (typeof item.w === 'number' && typeof item.h === 'number') {
          stats.usedGridCells += item.w * item.h;
        }
        if (typeof item.x === 'number' && typeof item.w === 'number') {
          stats.maxX = Math.max(stats.maxX, item.x + item.w);
        }
        if (typeof item.y === 'number' && typeof item.h === 'number') {
          stats.maxY = Math.max(stats.maxY, item.y + item.h);
        }
      }
    }
  }
  
  if (config?.fidgetTrayContents) {
    stats.trayItems = config.fidgetTrayContents.length;
  }
  
  return stats;
}

/**
 * Check if two grid items overlap
 */
export function doGridItemsOverlap(item1: any, item2: any): boolean {
  if (!item1 || !item2 || typeof item1 !== 'object' || typeof item2 !== 'object') {
    return false;
  }
  
  const hasRequiredFields = (item: any) => 
    'x' in item && 'y' in item && 'w' in item && 'h' in item &&
    typeof item.x === 'number' && typeof item.y === 'number' && 
    typeof item.w === 'number' && typeof item.h === 'number';
  
  if (!hasRequiredFields(item1) || !hasRequiredFields(item2)) {
    return false;
  }

  return !(
    item1.x + item1.w <= item2.x ||
    item2.x + item2.w <= item1.x ||
    item1.y + item1.h <= item2.y ||
    item2.y + item2.h <= item1.y
  );
}
