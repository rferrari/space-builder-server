/**
 * Test script to demonstrate the Space Config Validator functionality
 * This shows how the AI agent can use the validator to check configs and explain issues
 */

import { validateSpaceConfig } from './validator';
import { getValidationSummary, isValidSpaceConfig } from './utils';
import { minimalValidConfig, singleTextFidgetConfig } from './examples';

// Test 1: Valid minimal configuration
console.log('=== Test 1: Valid Minimal Configuration ===');
const result1 = validateSpaceConfig(minimalValidConfig);
console.log('Is valid:', result1.isValid);
console.log('Summary:', getValidationSummary(result1));

// Test 2: Valid configuration with fidgets
console.log('\n=== Test 2: Valid Configuration with Text Fidget ===');
const result2 = validateSpaceConfig(singleTextFidgetConfig);
console.log('Is valid:', result2.isValid);
console.log('Summary:', getValidationSummary(result2));

// Test 3: Invalid configuration with missing fields
console.log('\n=== Test 3: Invalid Configuration - Missing Fields ===');
const invalidConfig = {
  fidgetInstanceDatums: {},
  // Missing required fields like layoutDetails, theme, etc.
};
const result3 = validateSpaceConfig(invalidConfig);
console.log('Is valid:', result3.isValid);
console.log('Summary:', getValidationSummary(result3));

// Test 4: Configuration with unknown fidget type
console.log('\n=== Test 4: Configuration with Unknown Fidget Type ===');
const unknownFidgetConfig = {
  ...minimalValidConfig,
  fidgetInstanceDatums: {
    "unknown:test": {
      config: { editable: true, settings: {}, data: {} },
      fidgetType: "unknownFidgetType",
      id: "unknown:test"
    }
  },
  layoutDetails: {
    layoutFidget: "grid",
    layoutConfig: {
      layout: [{
        i: "unknown:test",
        x: 0, y: 0, w: 3, h: 2
      }]
    }
  }
};
const result4 = validateSpaceConfig(unknownFidgetConfig);
console.log('Is valid:', result4.isValid);
console.log('Summary:', getValidationSummary(result4));

// Test 5: Using quick validation
console.log('\n=== Test 5: Quick Validation ===');
console.log('Minimal config is valid:', isValidSpaceConfig(minimalValidConfig));
console.log('Invalid config is valid:', isValidSpaceConfig(invalidConfig));

export { validateSpaceConfig, getValidationSummary, isValidSpaceConfig };
