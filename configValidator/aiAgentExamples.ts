/**
 * Example usage of the Space Config Validator for AI Agents
 * This demonstrates how an AI agent can use the validator to generate valid configs
 * and explain validation issues to users.
 */

import { 
  validateSpaceConfig, 
  getValidationSummary, 
  createMinimalSpaceConfig,
  addFidgetToConfig,
  isValidSpaceConfig
} from './index';

/**
 * Example: AI Agent validates and explains a user-provided config
 */
export function aiAgentValidateConfig(userConfig: any): string {
  const result = validateSpaceConfig(userConfig);
  
  if (result.isValid) {
    return "✅ Your space configuration is perfectly valid! It meets all requirements and is ready to use.";
  }
  
  let explanation = "I found some issues with your space configuration:\n\n";
  
  // Explain critical errors first
  if (result.errors.length > 0) {
    explanation += "🚨 **Critical Issues** (must be fixed):\n";
    result.errors.forEach((error, index) => {
      explanation += `${index + 1}. **${error.path}**: ${error.message}\n`;
      
      // Provide specific guidance for common errors
      if (error.code === 'MISSING_REQUIRED_FIELD') {
        explanation += `   💡 *Add this required field to your configuration.*\n`;
      } else if (error.code === 'INVALID_FIDGET_TYPE') {
        explanation += `   💡 *Use one of the supported fidget types: text, feed, iframe, gallery, etc.*\n`;
      } else if (error.code === 'OVERLAPPING_GRID_ITEMS') {
        explanation += `   💡 *Adjust the position (x, y) or size (w, h) to avoid overlapping.*\n`;
      }
    });
    explanation += "\n";
  }
  
  // Explain warnings
  if (result.warnings.length > 0) {
    explanation += "⚠️ **Warnings** (recommended to fix):\n";
    result.warnings.forEach((warning, index) => {
      explanation += `${index + 1}. **${warning.path}**: ${warning.message}\n`;
    });
    explanation += "\n";
  }
  
  // Provide suggestions
  if (result.suggestions.length > 0) {
    explanation += "💡 **Suggestions** for improvement:\n";
    result.suggestions.forEach((suggestion, index) => {
      explanation += `${index + 1}. **${suggestion.path}**: ${suggestion.message}\n`;
    });
  }
  
  return explanation;
}

/**
 * Example: AI Agent generates a valid space config step by step
 */
export function aiAgentGenerateSpace(requirements: {
  theme?: string;
  fidgets?: Array<{
    type: string;
    settings: any;
    position?: { x: number; y: number; w: number; h: number };
  }>;
}): { config: any; explanation: string } {
  
  let explanation = "I'm generating a space configuration for you:\n\n";
  
  // Start with a valid minimal config
  let config = createMinimalSpaceConfig();
  explanation += "1. ✅ Created a minimal valid space configuration\n";
  
  // Apply theme if specified
  if (requirements.theme) {
    if (requirements.theme.toLowerCase().includes('dark')) {
      config.theme.properties.background = '#1a1a1a';
      config.theme.properties.fontColor = '#ffffff';
      config.theme.properties.fidgetBackground = '#2d2d2d';
      explanation += "2. 🎨 Applied dark theme colors\n";
    } else if (requirements.theme.toLowerCase().includes('light')) {
      config.theme.properties.background = '#ffffff';
      config.theme.properties.fontColor = '#000000';
      config.theme.properties.fidgetBackground = '#ffffff';
      explanation += "2. 🎨 Applied light theme colors\n";
    }
  }
  
  // Add requested fidgets
  if (requirements.fidgets) {
    explanation += "3. 📦 Adding fidgets:\n";
    
    requirements.fidgets.forEach((fidgetReq, index) => {
      const fidgetId = `${fidgetReq.type}:generated-${index + 1}`;
      const pos = fidgetReq.position || { 
        x: (index % 3) * 4, 
        y: Math.floor(index / 3) * 3, 
        w: 4, 
        h: 3 
      };
      
      const { config: updatedConfig, errors } = addFidgetToConfig(
        config,
        fidgetReq.type,
        fidgetId,
        pos.x,
        pos.y,
        pos.w,
        pos.h,
        fidgetReq.settings
      );
      
      if (errors.length === 0) {
        config = updatedConfig;
        explanation += `   ✅ Added ${fidgetReq.type} fidget at position (${pos.x}, ${pos.y})\n`;
      } else {
        explanation += `   ❌ Failed to add ${fidgetReq.type} fidget: ${errors.join(', ')}\n`;
      }
    });
  }
  
  // Final validation
  const validation = validateSpaceConfig(config);
  if (validation.isValid) {
    explanation += "\n4. ✅ Final validation passed - your space is ready!\n";
  } else {
    explanation += "\n4. ⚠️ Final validation found some issues:\n";
    explanation += getValidationSummary(validation);
  }
  
  return { config, explanation };
}

/**
 * Example: AI Agent fixes common configuration issues
 */
export function aiAgentFixConfig(brokenConfig: any): { 
  fixedConfig: any; 
  wasFixed: boolean; 
  explanation: string 
} {
  const initialValidation = validateSpaceConfig(brokenConfig);
  
  if (initialValidation.isValid) {
    return {
      fixedConfig: brokenConfig,
      wasFixed: false,
      explanation: "The configuration was already valid - no fixes needed!"
    };
  }
  
  let explanation = "I'm analyzing and fixing the configuration issues:\n\n";
  let fixedConfig = JSON.parse(JSON.stringify(brokenConfig)); // Deep clone
  let fixesApplied = 0;
  
  // Fix missing required fields
  if (!fixedConfig.fidgetInstanceDatums) {
    fixedConfig.fidgetInstanceDatums = {};
    explanation += "✅ Added missing fidgetInstanceDatums field\n";
    fixesApplied++;
  }
  
  if (!fixedConfig.layoutDetails) {
    fixedConfig.layoutDetails = {
      layoutFidget: "grid",
      layoutConfig: { layout: [] }
    };
    explanation += "✅ Added missing layoutDetails with grid layout\n";
    fixesApplied++;
  }
  
  if (typeof fixedConfig.isEditable !== 'boolean') {
    fixedConfig.isEditable = true;
    explanation += "✅ Set isEditable to true\n";
    fixesApplied++;
  }
  
  if (!Array.isArray(fixedConfig.fidgetTrayContents)) {
    fixedConfig.fidgetTrayContents = [];
    explanation += "✅ Added empty fidgetTrayContents array\n";
    fixesApplied++;
  }
  
  if (!fixedConfig.theme) {
    const minimal = createMinimalSpaceConfig();
    fixedConfig.theme = minimal.theme;
    explanation += "✅ Added complete theme configuration\n";
    fixesApplied++;
  }
  
  // Test the fixes
  const finalValidation = validateSpaceConfig(fixedConfig);
  const wasFixed = finalValidation.isValid;
  
  if (wasFixed) {
    explanation += `\n🎉 Successfully applied ${fixesApplied} fixes! The configuration is now valid.`;
  } else {
    explanation += `\n⚠️ Applied ${fixesApplied} fixes, but some issues remain:\n`;
    explanation += getValidationSummary(finalValidation);
  }
  
  return {
    fixedConfig,
    wasFixed,
    explanation
  };
}

/**
 * Example: Quick validation check for AI agent decision making
 */
export function aiAgentQuickCheck(config: any): {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  recommendation: string;
} {
  const isValid = isValidSpaceConfig(config);
  
  if (isValid) {
    return {
      isValid: true,
      confidence: 'high',
      recommendation: "This configuration is valid and ready to use immediately."
    };
  }
  
  // Get detailed validation for analysis
  const result = validateSpaceConfig(config);
  const errorCount = result.errors.length;
  const warningCount = result.warnings.length;
  
  if (errorCount === 0 && warningCount > 0) {
    return {
      isValid: false,
      confidence: 'medium',
      recommendation: "Configuration has minor warnings but no critical errors. Can be used with caution."
    };
  } else if (errorCount <= 2) {
    return {
      isValid: false,
      confidence: 'medium',
      recommendation: "Configuration has a few fixable errors. Should be corrected before use."
    };
  } else {
    return {
      isValid: false,
      confidence: 'low',
      recommendation: "Configuration has significant issues. Recommend starting with a minimal template."
    };
  }
}

// Example usage demonstrations
if (require.main === module) {
  console.log('=== AI Agent Space Config Validator Examples ===\n');
  
  // Example 1: Generate a space with text fidget
  console.log('1. Generating a space with a text fidget:');
  const generated = aiAgentGenerateSpace({
    theme: 'light',
    fidgets: [
      {
        type: 'text',
        settings: {
          title: 'Welcome!',
          text: 'This is a generated space configuration.',
          fontColor: '#333333'
        }
      }
    ]
  });
  console.log(generated.explanation);
  console.log('Generated config is valid:', isValidSpaceConfig(generated.config));
  
  // Example 2: Validate and explain an invalid config
  console.log('\n2. Validating an invalid configuration:');
  const invalidConfig = { fidgetInstanceDatums: {} }; // Missing required fields
  const validation = aiAgentValidateConfig(invalidConfig);
  console.log(validation);
  
  // Example 3: Fix a broken config
  console.log('\n3. Fixing a broken configuration:');
  const fixing = aiAgentFixConfig(invalidConfig);
  console.log(fixing.explanation);
}
