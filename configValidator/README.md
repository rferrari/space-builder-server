# Space Config Validator

A robust validation system for Nounspace space configuration JSON objects. This validator provides comprehensive checking of space configs with detailed error reporting, warnings, and suggestions to help AI agents generate valid configurations and explain validation issues.

## Features

- ✅ **Complete Structure Validation**: Validates all required fields and their types
- 🎛️ **Fidget Type Checking**: Validates against known fidget types (text, feed, iframe, etc.)
- 📐 **Layout Validation**: Checks grid constraints, overlapping items, and layout consistency
- 🎨 **Theme Validation**: Validates colors, fonts, dimensions, and CSS properties
- ⚠️ **Detailed Reporting**: Provides errors, warnings, and suggestions with specific paths
- 🔧 **Utility Functions**: Helper functions for quick checks, sanitization, and config generation
- 📋 **Test Examples**: Comprehensive set of valid and invalid examples for testing

## Quick Start

```typescript
import { validateSpaceConfig, isValidSpaceConfig } from './configValidator';

// Quick validation
const isValid = isValidSpaceConfig(myConfig);

// Detailed validation
const result = validateSpaceConfig(myConfig);
if (result.isValid) {
  console.log('✅ Config is valid!');
} else {
  console.log('❌ Validation errors:', result.errors);
  console.log('⚠️ Warnings:', result.warnings);
  console.log('💡 Suggestions:', result.suggestions);
}
```

## API Reference

### Core Validation

#### `validateSpaceConfig(config, context?)`
Main validation function that returns a detailed ValidationResult.

```typescript
const result = validateSpaceConfig(config, {
  allowUnknownFidgetTypes: false,
  strictMode: true,
  maxFidgets: 50
});
```

#### `isValidSpaceConfig(config)`
Quick boolean check for basic validity.

```typescript
if (isValidSpaceConfig(config)) {
  // Config is valid
}
```

### Utility Functions

#### `getValidationSummary(result)`
Formats validation results as a human-readable string.

```typescript
const summary = getValidationSummary(result);
console.log(summary);
// Output:
// ❌ Space config has validation errors
// 🚨 Errors (2):
//   • theme.properties.font: Invalid font family
//   • layoutDetails: Missing required field: layoutConfig
```

#### `getSpaceConfigErrors(config)`
Returns only error messages as an array of strings.

```typescript
const errors = getSpaceConfigErrors(config);
// ['theme.properties.font: Invalid font family', ...]
```

#### `createMinimalSpaceConfig()`
Creates a minimal valid space config template.

```typescript
const template = createMinimalSpaceConfig();
// Returns a valid minimal config that can be extended
```

#### `addFidgetToConfig(config, fidgetType, fidgetId, x, y, w, h, settings)`
Safely adds a fidget to a space config with validation.

```typescript
const { config: updatedConfig, errors } = addFidgetToConfig(
  baseConfig,
  'text',
  'text:example-123',
  0, 0, 6, 3,
  { title: 'Hello', text: 'Welcome!' }
);
```

#### `sanitizeSpaceConfig(config)`
Removes invalid properties while preserving valid structure.

```typescript
const cleanConfig = sanitizeSpaceConfig(potentiallyInvalidConfig);
```

### Analysis Functions

#### `getFidgetTypes(config)`
Lists all fidget types used in a config.

```typescript
const types = getFidgetTypes(config);
// ['text', 'feed', 'iframe']
```

#### `getLayoutStats(config)`
Returns statistics about the layout.

```typescript
const stats = getLayoutStats(config);
// {
//   totalFidgets: 5,
//   usedGridCells: 23,
//   maxX: 8,
//   maxY: 6,
//   hasOverlaps: false
// }
```

## Validation Context Options

```typescript
interface SpaceConfigValidationContext {
  allowUnknownFidgetTypes?: boolean;  // Default: false
  strictMode?: boolean;               // Default: false
  skipLayoutValidation?: boolean;     // Default: false
  maxFidgets?: number;               // Default: unlimited
  allowedFidgetTypes?: string[];     // Default: all known types
}
```

## Validation Result Structure

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];      // Critical issues that prevent usage
  warnings: ValidationWarning[]; // Non-critical issues that should be addressed
  suggestions: ValidationSuggestion[]; // Recommendations for improvement
}
```

Each error/warning/suggestion includes:
- `code`: Error code for programmatic handling
- `message`: Human-readable description
- `path`: JSON path to the problematic field
- `severity`: 'error', 'warning', or 'suggestion'
- `value` or `suggestedValue`: Current/suggested values

## Example Usage for AI Agents

### Validating Generated Configs

```typescript
import { validateSpaceConfig, getValidationSummary } from './configValidator';

function validateAndExplainConfig(generatedConfig: any): string {
  const result = validateSpaceConfig(generatedConfig);
  
  if (result.isValid) {
    return "The generated space configuration is valid and ready to use!";
  }
  
  let explanation = "The generated configuration has the following issues:\n\n";
  
  // Explain errors
  if (result.errors.length > 0) {
    explanation += "**Critical Errors** (must be fixed):\n";
    result.errors.forEach(error => {
      explanation += `- ${error.path}: ${error.message}\n`;
    });
    explanation += "\n";
  }
  
  // Explain warnings
  if (result.warnings.length > 0) {
    explanation += "**Warnings** (should be addressed):\n";
    result.warnings.forEach(warning => {
      explanation += `- ${warning.path}: ${warning.message}\n`;
    });
    explanation += "\n";
  }
  
  // Provide suggestions
  if (result.suggestions.length > 0) {
    explanation += "**Suggestions** for improvement:\n";
    result.suggestions.forEach(suggestion => {
      explanation += `- ${suggestion.path}: ${suggestion.message}\n`;
    });
  }
  
  return explanation;
}
```

### Generating Valid Configs

```typescript
import { createMinimalSpaceConfig, addFidgetToConfig, validateSpaceConfig } from './configValidator';

function generateSpaceWithTextFidget(title: string, content: string) {
  // Start with a valid base
  let config = createMinimalSpaceConfig();
  
  // Add a text fidget
  const { config: updatedConfig, errors } = addFidgetToConfig(
    config,
    'text',
    'text:main-content',
    0, 0, 8, 4,
    {
      title,
      text: content,
      fontColor: '#000000',
      background: '#ffffff'
    }
  );
  
  if (errors.length > 0) {
    throw new Error(`Failed to add fidget: ${errors.join(', ')}`);
  }
  
  // Validate the final result
  const validation = validateSpaceConfig(updatedConfig);
  if (!validation.isValid) {
    throw new Error(`Generated invalid config: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  return updatedConfig;
}
```

## Supported Fidget Types

The validator recognizes these fidget types:
- `text` - Text content fidgets
- `feed` - Farcaster feed displays
- `cast` - Individual Farcaster casts
- `frame` - Farcaster frames
- `iframe` - Embedded web content
- `gallery` - Image galleries
- `links` - Link collections
- `governance` - DAO governance displays
- `SnapShot` - Snapshot governance
- `Swap` - Token swap interfaces
- `Video` - Video players
- `Market` - Market data displays
- `Portfolio` - Portfolio trackers
- `Chat` - Chat interfaces
- `FramesV2` - Next-gen frames
- `Rss` - RSS feed readers

## Layout Types

- `grid` - Grid-based layout with drag-and-drop positioning
- `tabFullScreen` - Full-screen tabbed interface

## File Structure

```
spaceConfigValidator/
├── index.ts          # Main entry point with all exports
├── validator.ts      # Core validation logic
├── types.ts         # Type definitions and constants
├── utils.ts         # Utility functions
├── examples.ts      # Test examples and reference configs
└── README.md        # This documentation
```

## Testing

The validator includes comprehensive test examples:

```typescript
import { 
  minimalValidConfig, 
  invalidMissingFields, 
  validateSpaceConfig 
} from './configValidator';

// Test valid config
const validResult = validateSpaceConfig(minimalValidConfig);
console.log('Valid config test:', validResult.isValid); // true

// Test invalid config
const invalidResult = validateSpaceConfig(invalidMissingFields);
console.log('Invalid config test:', invalidResult.isValid); // false
console.log('Errors:', invalidResult.errors);
```

## Migration and Portability

This validator is designed to be easily portable to other repositories:

1. Copy the entire `spaceConfigValidator` folder
2. Update import paths if needed
3. Customize `KNOWN_FIDGET_TYPES` for your specific fidget types
4. Adjust validation rules in `validator.ts` for your requirements

The validator has minimal dependencies and uses only standard JavaScript/TypeScript features.
