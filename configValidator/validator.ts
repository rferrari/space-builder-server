/**
 * Core Space Config Validator
 * Validates complete space configurations for Nounspace
 */

import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  SpaceConfigValidationContext,
  KNOWN_FIDGET_TYPES,
  LAYOUT_FIDGET_TYPES,
  COLOR_PATTERNS,
  SUPPORTED_FONTS,
  GRID_CONSTRAINTS,
  FIDGET_SIZE_CONSTRAINTS
} from './types';

export interface SpaceConfig {
  fidgetInstanceDatums: {
    [key: string]: FidgetInstanceData;
  };
  layoutID: string;
  layoutDetails: LayoutFidgetDetails;
  isEditable: boolean;
  fidgetTrayContents: FidgetInstanceData[];
  theme: UserTheme;
  timestamp?: string;
  tabNames?: string[];
  fid?: number;
}

export interface FidgetInstanceData {
  config: FidgetConfig;
  fidgetType: string;
  id: string;
}

export interface FidgetConfig {
  editable: boolean;
  settings: Record<string, any>;
  data: Record<string, any>;
}

export interface LayoutFidgetDetails {
  layoutFidget: string;
  layoutConfig: {
    layout: PlacedGridItem[];
    layoutFidget?: string;
  };
}

export interface PlacedGridItem {
  i: string; // fidget id
  x: number;
  y: number;
  w: number; // width in grid units
  h: number; // height in grid units
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  moved?: boolean;
  static?: boolean;
  resizeHandles?: string[];
  isBounded?: boolean;
}

export interface UserTheme {
  id: string;
  name: string;
  properties: {
    font: string;
    fontColor: string;
    headingsFont: string;
    headingsFontColor: string;
    background: string;
    backgroundHTML: string;
    musicURL: string;
    fidgetBackground: string;
    fidgetBorderWidth: string;
    fidgetBorderColor: string;
    fidgetShadow: string;
    fidgetBorderRadius: string;
    gridSpacing: string;
  };
}

export class SpaceConfigValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];
  private suggestions: ValidationSuggestion[] = [];

  constructor(private context: SpaceConfigValidationContext = {}) {}

  /**
   * Main validation method for space configurations
   */
  validate(config: any): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];

    // Basic structure validation
    this.validateBasicStructure(config);
    
    if (this.errors.length === 0) {
      // More detailed validation only if basic structure is valid
      this.validateFidgetInstanceDatums(config.fidgetInstanceDatums);
      this.validateLayoutDetails(config.layoutDetails, config.fidgetInstanceDatums);
      this.validateFidgetTrayContents(config.fidgetTrayContents);
      this.validateTheme(config.theme);
      this.validateOptionalFields(config);
      
      // Cross-validation
      this.validateLayoutFidgetConsistency(config.layoutDetails, config.fidgetInstanceDatums);
      this.validateGridConstraints(config.layoutDetails, config.fidgetInstanceDatums);
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      suggestions: this.suggestions
    };
  }

  private validateBasicStructure(config: any): void {
    if (typeof config !== 'object' || config === null) {
      this.addError('INVALID_CONFIG_TYPE', 'Config must be an object', '');
      return;
    }

    // Required fields
    const requiredFields = [
      'fidgetInstanceDatums',
      'layoutID', 
      'layoutDetails',
      'isEditable',
      'fidgetTrayContents',
      'theme'
    ];

    for (const field of requiredFields) {
      if (!(field in config)) {
        this.addError('MISSING_REQUIRED_FIELD', `Missing required field: ${field}`, field);
      }
    }

    // Type validation for basic fields
    if ('isEditable' in config && typeof config.isEditable !== 'boolean') {
      this.addError('INVALID_FIELD_TYPE', 'isEditable must be a boolean', 'isEditable');
    }

    if ('layoutID' in config && typeof config.layoutID !== 'string') {
      this.addError('INVALID_FIELD_TYPE', 'layoutID must be a string', 'layoutID');
    }

    if ('fidgetInstanceDatums' in config && (typeof config.fidgetInstanceDatums !== 'object' || config.fidgetInstanceDatums === null)) {
      this.addError('INVALID_FIELD_TYPE', 'fidgetInstanceDatums must be an object', 'fidgetInstanceDatums');
    }

    if ('fidgetTrayContents' in config && !Array.isArray(config.fidgetTrayContents)) {
      this.addError('INVALID_FIELD_TYPE', 'fidgetTrayContents must be an array', 'fidgetTrayContents');
    }
  }

  private validateFidgetInstanceDatums(datums: any): void {
    if (typeof datums !== 'object' || datums === null) {
      return; // Already validated in basic structure
    }

    const fidgetIds = Object.keys(datums);
    
    if (fidgetIds.length === 0) {
      this.addWarning('EMPTY_FIDGET_DATUMS', 'No fidgets defined in fidgetInstanceDatums', 'fidgetInstanceDatums');
    }

    // Check for maximum fidgets if specified
    if (this.context.maxFidgets && fidgetIds.length > this.context.maxFidgets) {
      this.addError('TOO_MANY_FIDGETS', `Too many fidgets: ${fidgetIds.length} (max: ${this.context.maxFidgets})`, 'fidgetInstanceDatums');
    }

    for (const [id, fidget] of Object.entries(datums)) {
      this.validateFidgetInstanceData(fidget, `fidgetInstanceDatums.${id}`);
      this.validateFidgetId(id, fidget as any, `fidgetInstanceDatums.${id}`);
    }
  }

  private validateFidgetInstanceData(fidget: any, path: string): void {
    if (typeof fidget !== 'object' || fidget === null) {
      this.addError('INVALID_FIDGET_TYPE', 'Fidget must be an object', path);
      return;
    }

    // Required fields
    const requiredFields = ['config', 'fidgetType', 'id'];
    for (const field of requiredFields) {
      if (!(field in fidget)) {
        this.addError('MISSING_FIDGET_FIELD', `Missing required field: ${field}`, `${path}.${field}`);
      }
    }

    // Validate fidgetType
    if ('fidgetType' in fidget) {
      this.validateFidgetType(fidget.fidgetType, `${path}.fidgetType`);
    }

    // Validate config
    if ('config' in fidget) {
      this.validateFidgetConfig(fidget.config, `${path}.config`);
    }

    // Validate id
    if ('id' in fidget && typeof fidget.id !== 'string') {
      this.addError('INVALID_ID_TYPE', 'Fidget id must be a string', `${path}.id`);
    }
  }

  private validateFidgetType(fidgetType: any, path: string): void {
    if (typeof fidgetType !== 'string') {
      this.addError('INVALID_FIDGET_TYPE_TYPE', 'fidgetType must be a string', path);
      return;
    }

    if (!this.context.allowUnknownFidgetTypes && !KNOWN_FIDGET_TYPES.includes(fidgetType as any)) {
      this.addWarning('UNKNOWN_FIDGET_TYPE', `Unknown fidget type: ${fidgetType}`, path);
      this.addSuggestion('SUGGEST_KNOWN_FIDGET_TYPE', `Consider using one of: ${KNOWN_FIDGET_TYPES.join(', ')}`, path);
    }

    // Check if fidgetType is allowed
    if (this.context.allowedFidgetTypes && !this.context.allowedFidgetTypes.includes(fidgetType)) {
      this.addError('FORBIDDEN_FIDGET_TYPE', `Fidget type '${fidgetType}' is not allowed`, path);
    }
  }

  private validateFidgetConfig(config: any, path: string): void {
    if (typeof config !== 'object' || config === null) {
      this.addError('INVALID_CONFIG_TYPE', 'Fidget config must be an object', path);
      return;
    }

    // Required fields
    const requiredFields = ['editable', 'settings', 'data'];
    for (const field of requiredFields) {
      if (!(field in config)) {
        this.addError('MISSING_CONFIG_FIELD', `Missing required field: ${field}`, `${path}.${field}`);
      }
    }

    // Validate types
    if ('editable' in config && typeof config.editable !== 'boolean') {
      this.addError('INVALID_EDITABLE_TYPE', 'editable must be a boolean', `${path}.editable`);
    }

    if ('settings' in config && (typeof config.settings !== 'object' || config.settings === null)) {
      this.addError('INVALID_SETTINGS_TYPE', 'settings must be an object', `${path}.settings`);
    } else if ('settings' in config) {
      this.validateFidgetSettings(config.settings, `${path}.settings`);
    }

    if ('data' in config && (typeof config.data !== 'object' || config.data === null)) {
      this.addError('INVALID_DATA_TYPE', 'data must be an object', `${path}.data`);
    }
  }

  private validateFidgetSettings(settings: any, path: string): void {
    // Common settings validation
    if ('showOnMobile' in settings && typeof settings.showOnMobile !== 'boolean') {
      this.addWarning('INVALID_SHOW_ON_MOBILE', 'showOnMobile should be a boolean', `${path}.showOnMobile`);
    }

    if ('customMobileDisplayName' in settings && typeof settings.customMobileDisplayName !== 'string') {
      this.addWarning('INVALID_CUSTOM_MOBILE_DISPLAY_NAME', 'customMobileDisplayName should be a string', `${path}.customMobileDisplayName`);
    }

    // Color validation
    const colorFields = ['background', 'fontColor', 'headingsFontColor', 'fidgetBorderColor', 'itemBackground'];
    for (const field of colorFields) {
      if (field in settings) {
        this.validateColor(settings[field], `${path}.${field}`);
      }
    }

    // Font validation
    const fontFields = ['fontFamily', 'headingsFontFamily'];
    for (const field of fontFields) {
      if (field in settings) {
        this.validateFont(settings[field], `${path}.${field}`);
      }
    }

    // Dimension validation
    const dimensionFields = ['fidgetBorderWidth', 'itemBorderWidth'];
    for (const field of dimensionFields) {
      if (field in settings) {
        this.validateDimension(settings[field], `${path}.${field}`);
      }
    }
  }

  private validateFidgetId(id: string, fidget: any, path: string): void {
    // Check if id matches the expected pattern (usually fidgetType:uuid)
    if (fidget.fidgetType && !id.startsWith(fidget.fidgetType + ':')) {
      this.addWarning('ID_TYPE_MISMATCH', `Fidget id '${id}' doesn't match fidgetType '${fidget.fidgetType}'`, path);
    }

    // Check for duplicate IDs (this is handled at the object level but good to note)
    if ('id' in fidget && fidget.id !== id) {
      this.addError('ID_MISMATCH', `Fidget id property '${fidget.id}' doesn't match key '${id}'`, path);
    }
  }

  private validateLayoutDetails(layoutDetails: any, fidgetInstanceDatums: any): void {
    if (typeof layoutDetails !== 'object' || layoutDetails === null) {
      this.addError('INVALID_LAYOUT_DETAILS_TYPE', 'layoutDetails must be an object', 'layoutDetails');
      return;
    }

    // Required fields
    const requiredFields = ['layoutFidget', 'layoutConfig'];
    for (const field of requiredFields) {
      if (!(field in layoutDetails)) {
        this.addError('MISSING_LAYOUT_FIELD', `Missing required field: ${field}`, `layoutDetails.${field}`);
      }
    }

    // Validate layoutFidget
    if ('layoutFidget' in layoutDetails) {
      this.validateLayoutFidget(layoutDetails.layoutFidget, 'layoutDetails.layoutFidget');
    }

    // Validate layoutConfig
    if ('layoutConfig' in layoutDetails) {
      this.validateLayoutConfig(layoutDetails.layoutConfig, fidgetInstanceDatums, 'layoutDetails.layoutConfig');
    }
  }

  private validateLayoutFidget(layoutFidget: any, path: string): void {
    if (typeof layoutFidget !== 'string') {
      this.addError('INVALID_LAYOUT_FIDGET_TYPE', 'layoutFidget must be a string', path);
      return;
    }

    if (!LAYOUT_FIDGET_TYPES.includes(layoutFidget as any)) {
      this.addError('UNKNOWN_LAYOUT_FIDGET', `Unknown layout fidget: ${layoutFidget}`, path);
      this.addSuggestion('SUGGEST_LAYOUT_FIDGET', `Use one of: ${LAYOUT_FIDGET_TYPES.join(', ')}`, path);
    }
  }

  private validateLayoutConfig(layoutConfig: any, fidgetInstanceDatums: any, path: string): void {
    if (typeof layoutConfig !== 'object' || layoutConfig === null) {
      this.addError('INVALID_LAYOUT_CONFIG_TYPE', 'layoutConfig must be an object', path);
      return;
    }

    if ('layout' in layoutConfig) {
      this.validateLayout(layoutConfig.layout, fidgetInstanceDatums, `${path}.layout`);
    } else {
      this.addError('MISSING_LAYOUT_ARRAY', 'layoutConfig must have a layout array', `${path}.layout`);
    }
  }

  private validateLayout(layout: any, fidgetInstanceDatums: any, path: string): void {
    if (!Array.isArray(layout)) {
      this.addError('INVALID_LAYOUT_TYPE', 'layout must be an array', path);
      return;
    }

    if (this.context.skipLayoutValidation) {
      return;
    }

    for (let i = 0; i < layout.length; i++) {
      this.validateGridItem(layout[i], fidgetInstanceDatums, `${path}[${i}]`);
    }

    // Check for overlaps
    this.validateNoOverlaps(layout, path);
  }

  private validateGridItem(item: any, fidgetInstanceDatums: any, path: string): void {
    if (typeof item !== 'object' || item === null) {
      this.addError('INVALID_GRID_ITEM_TYPE', 'Grid item must be an object', path);
      return;
    }

    // Required fields
    const requiredFields = ['i', 'x', 'y', 'w', 'h'];
    for (const field of requiredFields) {
      if (!(field in item)) {
        this.addError('MISSING_GRID_ITEM_FIELD', `Missing required field: ${field}`, `${path}.${field}`);
      }
    }

    // Validate types and ranges
    const numericFields = ['x', 'y', 'w', 'h', 'minW', 'maxW', 'minH', 'maxH'];
    for (const field of numericFields) {
      if (field in item) {
        if (typeof item[field] !== 'number' || !Number.isInteger(item[field]) || item[field] < 0) {
          this.addError('INVALID_NUMERIC_FIELD', `${field} must be a non-negative integer`, `${path}.${field}`);
        }
      }
    }

    // Validate dimensions against constraints
    if ('w' in item && 'h' in item) {
      if (item.w < GRID_CONSTRAINTS.MIN_WIDTH || item.w > GRID_CONSTRAINTS.MAX_WIDTH) {
        this.addError('INVALID_WIDTH', `Width must be between ${GRID_CONSTRAINTS.MIN_WIDTH} and ${GRID_CONSTRAINTS.MAX_WIDTH}`, `${path}.w`);
      }
      if (item.h < GRID_CONSTRAINTS.MIN_HEIGHT || item.h > GRID_CONSTRAINTS.MAX_HEIGHT) {
        this.addError('INVALID_HEIGHT', `Height must be between ${GRID_CONSTRAINTS.MIN_HEIGHT} and ${GRID_CONSTRAINTS.MAX_HEIGHT}`, `${path}.h`);
      }
    }

    // Validate fidget reference
    if ('i' in item) {
      if (typeof item.i !== 'string') {
        this.addError('INVALID_FIDGET_ID_TYPE', 'Grid item fidget id must be a string', `${path}.i`);
      } else if (fidgetInstanceDatums && !(item.i in fidgetInstanceDatums)) {
        this.addError('MISSING_FIDGET_REFERENCE', `Grid item references non-existent fidget: ${item.i}`, `${path}.i`);
      } else if (fidgetInstanceDatums && fidgetInstanceDatums[item.i]) {
        // Validate size constraints for specific fidget types
        const fidget = fidgetInstanceDatums[item.i];
        this.validateFidgetSizeConstraints(item, fidget, path);
      }
    }

    // Validate min/max constraints
    if ('minW' in item && 'w' in item && item.w < item.minW) {
      this.addError('WIDTH_BELOW_MINIMUM', `Width ${item.w} is below minimum ${item.minW}`, `${path}.w`);
    }
    if ('maxW' in item && 'w' in item && item.w > item.maxW) {
      this.addError('WIDTH_ABOVE_MAXIMUM', `Width ${item.w} is above maximum ${item.maxW}`, `${path}.w`);
    }
    if ('minH' in item && 'h' in item && item.h < item.minH) {
      this.addError('HEIGHT_BELOW_MINIMUM', `Height ${item.h} is below minimum ${item.minH}`, `${path}.h`);
    }
    if ('maxH' in item && 'h' in item && item.h > item.maxH) {
      this.addError('HEIGHT_ABOVE_MAXIMUM', `Height ${item.h} is above maximum ${item.maxH}`, `${path}.h`);
    }
  }

  private validateFidgetSizeConstraints(gridItem: any, fidget: any, path: string): void {
    const constraints = FIDGET_SIZE_CONSTRAINTS[fidget.fidgetType];
    if (!constraints) return;

    if (gridItem.w < constraints.minWidth) {
      this.addError('FIDGET_WIDTH_TOO_SMALL', 
        `${fidget.fidgetType} fidget width ${gridItem.w} is below minimum ${constraints.minWidth}`, 
        `${path}.w`);
    }
    if (gridItem.w > constraints.maxWidth) {
      this.addError('FIDGET_WIDTH_TOO_LARGE', 
        `${fidget.fidgetType} fidget width ${gridItem.w} is above maximum ${constraints.maxWidth}`, 
        `${path}.w`);
    }
    if (gridItem.h < constraints.minHeight) {
      this.addError('FIDGET_HEIGHT_TOO_SMALL', 
        `${fidget.fidgetType} fidget height ${gridItem.h} is below minimum ${constraints.minHeight}`, 
        `${path}.h`);
    }
    if (gridItem.h > constraints.maxHeight) {
      this.addError('FIDGET_HEIGHT_TOO_LARGE', 
        `${fidget.fidgetType} fidget height ${gridItem.h} is above maximum ${constraints.maxHeight}`, 
        `${path}.h`);
    }
  }

  private validateNoOverlaps(layout: any[], path: string): void {
    for (let i = 0; i < layout.length; i++) {
      for (let j = i + 1; j < layout.length; j++) {
        const item1 = layout[i];
        const item2 = layout[j];
        
        if (this.doItemsOverlap(item1, item2)) {
          this.addError('LAYOUT_OVERLAP', 
            `Grid items overlap: ${item1.i} and ${item2.i}`, 
            `${path}[${i}]`);
        }
      }
    }
  }

  private doItemsOverlap(item1: any, item2: any): boolean {
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

  private validateFidgetTrayContents(trayContents: any): void {
    if (!Array.isArray(trayContents)) {
      return; // Already validated in basic structure
    }

    for (let i = 0; i < trayContents.length; i++) {
      this.validateFidgetInstanceData(trayContents[i], `fidgetTrayContents[${i}]`);
    }
  }

  private validateTheme(theme: any): void {
    if (typeof theme !== 'object' || theme === null) {
      this.addError('INVALID_THEME_TYPE', 'theme must be an object', 'theme');
      return;
    }

    // Required fields
    const requiredFields = ['id', 'name', 'properties'];
    for (const field of requiredFields) {
      if (!(field in theme)) {
        this.addError('MISSING_THEME_FIELD', `Missing required field: ${field}`, `theme.${field}`);
      }
    }

    // Validate types
    if ('id' in theme && typeof theme.id !== 'string') {
      this.addError('INVALID_THEME_ID_TYPE', 'theme.id must be a string', 'theme.id');
    }
    if ('name' in theme && typeof theme.name !== 'string') {
      this.addError('INVALID_THEME_NAME_TYPE', 'theme.name must be a string', 'theme.name');
    }

    // Validate properties
    if ('properties' in theme) {
      this.validateThemeProperties(theme.properties, 'theme.properties');
    }
  }

  private validateThemeProperties(properties: any, path: string): void {
    if (typeof properties !== 'object' || properties === null) {
      this.addError('INVALID_THEME_PROPERTIES_TYPE', 'theme properties must be an object', path);
      return;
    }

    // Required theme properties
    const requiredProps = [
      'font', 'fontColor', 'headingsFont', 'headingsFontColor',
      'background', 'backgroundHTML', 'musicURL', 'fidgetBackground',
      'fidgetBorderWidth', 'fidgetBorderColor', 'fidgetShadow',
      'fidgetBorderRadius', 'gridSpacing'
    ];

    for (const prop of requiredProps) {
      if (!(prop in properties)) {
        this.addError('MISSING_THEME_PROPERTY', `Missing required theme property: ${prop}`, `${path}.${prop}`);
      }
    }

    // Validate color properties
    const colorProps = ['fontColor', 'headingsFontColor', 'background', 'fidgetBackground', 'fidgetBorderColor'];
    for (const prop of colorProps) {
      if (prop in properties) {
        this.validateColor(properties[prop], `${path}.${prop}`);
      }
    }

    // Validate font properties
    const fontProps = ['font', 'headingsFont'];
    for (const prop of fontProps) {
      if (prop in properties) {
        this.validateFont(properties[prop], `${path}.${prop}`);
      }
    }

    // Validate URL
    if ('musicURL' in properties) {
      this.validateURL(properties.musicURL, `${path}.musicURL`);
    }

    // Validate dimensions
    const dimensionProps = ['fidgetBorderWidth', 'fidgetBorderRadius', 'gridSpacing'];
    for (const prop of dimensionProps) {
      if (prop in properties) {
        this.validateDimension(properties[prop], `${path}.${prop}`);
      }
    }

    // Validate HTML
    if ('backgroundHTML' in properties && typeof properties.backgroundHTML !== 'string') {
      this.addWarning('INVALID_BACKGROUND_HTML', 'backgroundHTML should be a string', `${path}.backgroundHTML`);
    }
  }

  private validateOptionalFields(config: any): void {
    if ('timestamp' in config && typeof config.timestamp !== 'string') {
      this.addWarning('INVALID_TIMESTAMP_TYPE', 'timestamp should be a string', 'timestamp');
    }

    if ('tabNames' in config) {
      if (!Array.isArray(config.tabNames)) {
        this.addWarning('INVALID_TAB_NAMES_TYPE', 'tabNames should be an array', 'tabNames');
      } else {
        for (let i = 0; i < config.tabNames.length; i++) {
          if (typeof config.tabNames[i] !== 'string') {
            this.addWarning('INVALID_TAB_NAME_TYPE', `tabNames[${i}] should be a string`, `tabNames[${i}]`);
          }
        }
      }
    }

    if ('fid' in config && (typeof config.fid !== 'number' || !Number.isInteger(config.fid))) {
      this.addWarning('INVALID_FID_TYPE', 'fid should be an integer', 'fid');
    }
  }

  private validateLayoutFidgetConsistency(layoutDetails: any, fidgetInstanceDatums: any): void {
    if (!layoutDetails?.layoutConfig?.layout || !fidgetInstanceDatums) {
      return;
    }

    const layoutItems = layoutDetails.layoutConfig.layout.filter((item: any) => item && typeof item.i === 'string');
    const layoutFidgetIds: string[] = layoutItems.map((item: any) => item.i as string);
    const fidgetDataIds = Object.keys(fidgetInstanceDatums);

    // Check for fidgets in layout but not in datums
    for (const layoutId of layoutFidgetIds) {
      if (!fidgetDataIds.includes(layoutId)) {
        this.addError('ORPHANED_LAYOUT_ITEM', `Layout references non-existent fidget: ${layoutId}`, 'layoutDetails.layoutConfig.layout');
      }
    }

    // Check for fidgets in datums but not in layout (warning, not error)
    for (const dataId of fidgetDataIds) {
      if (!layoutFidgetIds.includes(dataId)) {
        this.addWarning('UNUSED_FIDGET', `Fidget exists but not placed in layout: ${dataId}`, 'fidgetInstanceDatums');
      }
    }
  }

  private validateGridConstraints(layoutDetails: any, fidgetInstanceDatums: any): void {
    if (!layoutDetails?.layoutConfig?.layout) {
      return;
    }

    const layout = layoutDetails.layoutConfig.layout;
    
    // Determine if we have feed and profile (simplified heuristic)
    const hasFeed = Object.values(fidgetInstanceDatums || {}).some((fidget: any) => 
      fidget.fidgetType === 'feed'
    );
    const hasProfile = false; // This would need to be passed in context if needed

    const maxCols = hasFeed ? GRID_CONSTRAINTS.FEED_COLS : GRID_CONSTRAINTS.NO_FEED_COLS;
    const maxRows = hasProfile ? GRID_CONSTRAINTS.PROFILE_MAX_ROWS : GRID_CONSTRAINTS.NO_PROFILE_MAX_ROWS;

    for (const item of layout) {
      if (typeof item !== 'object' || item === null) continue;
      
      if ('x' in item && 'w' in item && typeof item.x === 'number' && typeof item.w === 'number') {
        if (item.x + item.w > maxCols) {
          this.addError('ITEM_EXCEEDS_GRID_WIDTH', 
            `Item ${item.i} extends beyond grid width (${item.x + item.w} > ${maxCols})`, 
            'layoutDetails.layoutConfig.layout');
        }
      }

      if ('y' in item && 'h' in item && typeof item.y === 'number' && typeof item.h === 'number') {
        if (item.y + item.h > maxRows) {
          this.addError('ITEM_EXCEEDS_GRID_HEIGHT', 
            `Item ${item.i} extends beyond grid height (${item.y + item.h} > ${maxRows})`, 
            'layoutDetails.layoutConfig.layout');
        }
      }
    }
  }

  private validateColor(color: any, path: string): void {
    if (typeof color !== 'string') {
      this.addWarning('INVALID_COLOR_TYPE', 'Color should be a string', path);
      return;
    }

    // Check against known color patterns
    const isValid = Object.values(COLOR_PATTERNS).some(pattern => pattern.test(color)) ||
                   color === 'transparent' || color === 'currentColor' ||
                   /^[a-zA-Z]+$/.test(color); // Named colors

    if (!isValid) {
      this.addWarning('INVALID_COLOR_FORMAT', `Invalid color format: ${color}`, path);
      this.addSuggestion('SUGGEST_COLOR_FORMAT', 'Use hex (#000000), rgb(), rgba(), hsl(), hsla(), named colors, or CSS variables', path);
    }
  }

  private validateFont(font: any, path: string): void {
    if (typeof font !== 'string') {
      this.addWarning('INVALID_FONT_TYPE', 'Font should be a string', path);
      return;
    }

    // Check if it's a known supported font
    if (!SUPPORTED_FONTS.includes(font as any) && !font.includes('var(--')) {
      this.addSuggestion('UNKNOWN_FONT', `Font '${font}' may not be available. Consider using: ${SUPPORTED_FONTS.slice(0, 5).join(', ')}...`, path);
    }
  }

  private validateDimension(dimension: any, path: string): void {
    if (typeof dimension !== 'string') {
      this.addWarning('INVALID_DIMENSION_TYPE', 'Dimension should be a string', path);
      return;
    }

    // Check for valid dimension format (number + unit or just number)
    if (!/^(\d+(\.\d+)?(px|em|rem|%|vh|vw)?|var\(--[\w-]+\)|none)$/.test(dimension)) {
      this.addWarning('INVALID_DIMENSION_FORMAT', `Invalid dimension format: ${dimension}`, path);
      this.addSuggestion('SUGGEST_DIMENSION_FORMAT', 'Use format like "12px", "1em", "100%", or CSS variables', path);
    }
  }

  private validateURL(url: any, path: string): void {
    if (typeof url !== 'string') {
      this.addWarning('INVALID_URL_TYPE', 'URL should be a string', path);
      return;
    }

    try {
      new URL(url);
    } catch {
      this.addWarning('INVALID_URL_FORMAT', `Invalid URL format: ${url}`, path);
    }
  }

  private addError(code: string, message: string, path: string, value?: any): void {
    this.errors.push({ code, message, path, severity: 'error', value });
  }

  private addWarning(code: string, message: string, path: string, value?: any): void {
    this.warnings.push({ code, message, path, severity: 'warning', value });
  }

  private addSuggestion(code: string, message: string, path: string, suggestedValue?: any): void {
    this.suggestions.push({ code, message, path, severity: 'suggestion', suggestedValue });
  }
}

/**
 * Convenience function to validate a space config
 */
export function validateSpaceConfig(config: any, context?: SpaceConfigValidationContext): ValidationResult {
  const validator = new SpaceConfigValidator(context);
  return validator.validate(config);
}

export * from './types';
