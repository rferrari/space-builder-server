/**
 * Example Space Configurations for Testing and Reference
 * These examples demonstrate valid and invalid space configurations
 */

/**
 * Minimal valid space configuration
 */
export const minimalValidConfig = {
  fidgetInstanceDatums: {},
  layoutID: "minimal",
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
      musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4",
      fidgetBackground: "#ffffff",
      fidgetBorderWidth: "1px",
      fidgetBorderColor: "#eeeeee",
      fidgetShadow: "none",
      fidgetBorderRadius: "12px",
      gridSpacing: "16"
    }
  }
};

/**
 * Valid space configuration with a single text fidget
 */
export const singleTextFidgetConfig = {
  fidgetInstanceDatums: {
    "text:example-123": {
      config: {
        editable: true,
        settings: {
          title: "Welcome",
          text: "Hello, Nounspace!",
          background: "#ffffff",
          fontColor: "#000000",
          showOnMobile: true
        },
        data: {}
      },
      fidgetType: "text",
      id: "text:example-123"
    }
  },
  layoutID: "single-text",
  layoutDetails: {
    layoutFidget: "grid",
    layoutConfig: {
      layout: [
        {
          i: "text:example-123",
          x: 0,
          y: 0,
          w: 6,
          h: 3,
          minW: 3,
          maxW: 36,
          minH: 2,
          maxH: 36,
          moved: false,
          static: false
        }
      ]
    }
  },
  isEditable: true,
  fidgetTrayContents: [],
  theme: {
    id: "colorful",
    name: "Colorful Theme",
    properties: {
      font: "Poppins",
      fontColor: "#333333",
      headingsFont: "Roboto",
      headingsFontColor: "#000000",
      background: "#f0f4f8",
      backgroundHTML: "",
      musicURL: "https://www.youtube.com/watch?v=dMXlZ4y7OK4",
      fidgetBackground: "#ffffff",
      fidgetBorderWidth: "2px",
      fidgetBorderColor: "#e2e8f0",
      fidgetShadow: "0 2px 4px rgba(0,0,0,0.1)",
      fidgetBorderRadius: "8px",
      gridSpacing: "12"
    }
  }
};

/**
 * Valid space configuration with multiple fidgets
 */
export const multipleFidgetsConfig = {
  fidgetInstanceDatums: {
    "text:welcome-456": {
      config: {
        editable: true,
        settings: {
          title: "Welcome",
          text: "Welcome to my space!",
          background: "#ffffff",
          fontColor: "#000000"
        },
        data: {}
      },
      fidgetType: "text",
      id: "text:welcome-456"
    },
    "feed:latest-789": {
      config: {
        editable: true,
        settings: {
          feedType: "filter",
          filterType: "trending",
          limit: 10
        },
        data: {}
      },
      fidgetType: "feed",
      id: "feed:latest-789"
    },
    "gallery:photos-101": {
      config: {
        editable: true,
        settings: {
          images: [],
          columns: 3,
          showCaptions: true
        },
        data: {}
      },
      fidgetType: "gallery",
      id: "gallery:photos-101"
    }
  },
  layoutID: "multi-fidget",
  layoutDetails: {
    layoutFidget: "grid",
    layoutConfig: {
      layout: [
        {
          i: "text:welcome-456",
          x: 0,
          y: 0,
          w: 12,
          h: 2,
          minW: 3,
          maxW: 36,
          minH: 2,
          maxH: 36
        },
        {
          i: "feed:latest-789", 
          x: 0,
          y: 2,
          w: 6,
          h: 8,
          minW: 4,
          maxW: 36,
          minH: 2,
          maxH: 36
        },
        {
          i: "gallery:photos-101",
          x: 6,
          y: 2,
          w: 6,
          h: 6,
          minW: 1,
          maxW: 36,
          minH: 1,
          maxH: 36
        }
      ]
    }
  },
  isEditable: true,
  fidgetTrayContents: [],
  theme: {
    id: "modern",
    name: "Modern Theme",
    properties: {
      font: "Inter",
      fontColor: "#1a202c",
      headingsFont: "Poppins",
      headingsFontColor: "#2d3748",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      backgroundHTML: "",
      musicURL: "",
      fidgetBackground: "rgba(255, 255, 255, 0.9)",
      fidgetBorderWidth: "1px",
      fidgetBorderColor: "rgba(255, 255, 255, 0.2)",
      fidgetShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      fidgetBorderRadius: "12px",
      gridSpacing: "16"
    }
  },
  timestamp: "2024-01-15T10:30:00Z",
  tabNames: ["Welcome", "Feed", "Gallery"]
};

/**
 * Configuration with fidgets in tray
 */
export const configWithTray = {
  fidgetInstanceDatums: {
    "text:main-112": {
      config: {
        editable: true,
        settings: {
          title: "Main Content",
          text: "This is the main content area"
        },
        data: {}
      },
      fidgetType: "text",
      id: "text:main-112"
    },
    "links:social-113": {
      config: {
        editable: true,
        settings: {
          links: [
            { title: "Twitter", url: "https://twitter.com/example" },
            { title: "GitHub", url: "https://github.com/example" }
          ]
        },
        data: {}
      },
      fidgetType: "links",
      id: "links:social-113"
    }
  },
  layoutID: "with-tray",
  layoutDetails: {
    layoutFidget: "grid",
    layoutConfig: {
      layout: [
        {
          i: "text:main-112",
          x: 0,
          y: 0,
          w: 8,
          h: 4,
          minW: 3,
          maxW: 36,
          minH: 2,
          maxH: 36
        }
      ]
    }
  },
  isEditable: true,
  fidgetTrayContents: [
    {
      config: {
        editable: true,
        settings: {
          links: [
            { title: "Twitter", url: "https://twitter.com/example" },
            { title: "GitHub", url: "https://github.com/example" }
          ]
        },
        data: {}
      },
      fidgetType: "links",
      id: "links:social-113"
    }
  ],
  theme: {
    id: "simple",
    name: "Simple Theme", 
    properties: {
      font: "Inter",
      fontColor: "#000000",
      headingsFont: "Inter",
      headingsFontColor: "#000000",
      background: "#ffffff",
      backgroundHTML: "",
      musicURL: "",
      fidgetBackground: "#f8f9fa",
      fidgetBorderWidth: "1px",
      fidgetBorderColor: "#dee2e6",
      fidgetShadow: "none",
      fidgetBorderRadius: "4px",
      gridSpacing: "8"
    }
  }
};

/**
 * Configuration using TabFullScreen layout
 */
export const tabFullScreenConfig = {
  fidgetInstanceDatums: {
    "text:tab1-114": {
      config: {
        editable: true,
        settings: {
          title: "Tab 1",
          text: "Content for first tab",
          customMobileDisplayName: "Home"
        },
        data: {}
      },
      fidgetType: "text",
      id: "text:tab1-114"
    },
    "feed:tab2-115": {
      config: {
        editable: true,
        settings: {
          feedType: "filter",
          filterType: "latest",
          customMobileDisplayName: "Feed"
        },
        data: {}
      },
      fidgetType: "feed",
      id: "feed:tab2-115"
    }
  },
  layoutID: "tabbed",
  layoutDetails: {
    layoutFidget: "tabFullScreen",
    layoutConfig: {
      layout: ["text:tab1-114", "feed:tab2-115"]
    }
  },
  isEditable: false,
  fidgetTrayContents: [],
  theme: {
    id: "mobile",
    name: "Mobile Theme",
    properties: {
      font: "Roboto",
      fontColor: "#212529",
      headingsFont: "Roboto",
      headingsFontColor: "#495057",
      background: "#f8f9fa",
      backgroundHTML: "",
      musicURL: "",
      fidgetBackground: "#ffffff",
      fidgetBorderWidth: "0px",
      fidgetBorderColor: "transparent",
      fidgetShadow: "0 1px 3px rgba(0,0,0,0.12)",
      fidgetBorderRadius: "8px",
      gridSpacing: "12"
    }
  },
  tabNames: ["Home", "Feed"]
};

// INVALID CONFIGURATIONS FOR TESTING

/**
 * Invalid: Missing required fields
 */
export const invalidMissingFields = {
  // Missing fidgetInstanceDatums, layoutID, etc.
  isEditable: true
};

/**
 * Invalid: Wrong field types
 */
export const invalidFieldTypes = {
  fidgetInstanceDatums: "not an object", // Should be object
  layoutID: 123, // Should be string
  layoutDetails: null, // Should be object
  isEditable: "yes", // Should be boolean
  fidgetTrayContents: "empty", // Should be array
  theme: "default" // Should be object
};

/**
 * Invalid: Orphaned layout items
 */
export const invalidOrphanedLayout = {
  fidgetInstanceDatums: {
    "text:existing-123": {
      config: { editable: true, settings: {}, data: {} },
      fidgetType: "text",
      id: "text:existing-123"
    }
  },
  layoutID: "orphaned",
  layoutDetails: {
    layoutFidget: "grid",
    layoutConfig: {
      layout: [
        {
          i: "text:existing-123",
          x: 0, y: 0, w: 3, h: 2
        },
        {
          i: "text:missing-456", // This fidget doesn't exist
          x: 3, y: 0, w: 3, h: 2
        }
      ]
    }
  },
  isEditable: true,
  fidgetTrayContents: [],
  theme: {
    id: "test",
    name: "Test",
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

/**
 * Invalid: Overlapping grid items
 */
export const invalidOverlappingItems = {
  fidgetInstanceDatums: {
    "text:first-123": {
      config: { editable: true, settings: {}, data: {} },
      fidgetType: "text",
      id: "text:first-123"
    },
    "text:second-456": {
      config: { editable: true, settings: {}, data: {} },
      fidgetType: "text", 
      id: "text:second-456"
    }
  },
  layoutID: "overlapping",
  layoutDetails: {
    layoutFidget: "grid",
    layoutConfig: {
      layout: [
        {
          i: "text:first-123",
          x: 0, y: 0, w: 4, h: 3
        },
        {
          i: "text:second-456", 
          x: 2, y: 1, w: 4, h: 3 // Overlaps with first
        }
      ]
    }
  },
  isEditable: true,
  fidgetTrayContents: [],
  theme: {
    id: "test",
    name: "Test", 
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

/**
 * Invalid: Unknown fidget type
 */
export const invalidUnknownFidgetType = {
  fidgetInstanceDatums: {
    "unknown:test-789": {
      config: { editable: true, settings: {}, data: {} },
      fidgetType: "unknownFidgetType", // Not a known fidget type
      id: "unknown:test-789"
    }
  },
  layoutID: "unknown-fidget",
  layoutDetails: {
    layoutFidget: "grid",
    layoutConfig: {
      layout: [
        {
          i: "unknown:test-789",
          x: 0, y: 0, w: 3, h: 2
        }
      ]
    }
  },
  isEditable: true,
  fidgetTrayContents: [],
  theme: {
    id: "test",
    name: "Test",
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

/**
 * Invalid: Grid items outside bounds
 */
export const invalidOutOfBounds = {
  fidgetInstanceDatums: {
    "text:oob-123": {
      config: { editable: true, settings: {}, data: {} },
      fidgetType: "text",
      id: "text:oob-123"
    }
  },
  layoutID: "out-of-bounds",
  layoutDetails: {
    layoutFidget: "grid",
    layoutConfig: {
      layout: [
        {
          i: "text:oob-123",
          x: 10, y: 8, w: 5, h: 5 // Extends beyond typical grid bounds
        }
      ]
    }
  },
  isEditable: true,
  fidgetTrayContents: [],
  theme: {
    id: "test",
    name: "Test",
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

/**
 * All example configurations
 */
export const exampleConfigs = {
  valid: {
    minimal: minimalValidConfig,
    singleText: singleTextFidgetConfig,
    multipleFidgets: multipleFidgetsConfig,
    withTray: configWithTray,
    tabFullScreen: tabFullScreenConfig
  },
  invalid: {
    missingFields: invalidMissingFields,
    fieldTypes: invalidFieldTypes,
    orphanedLayout: invalidOrphanedLayout,
    overlappingItems: invalidOverlappingItems,
    unknownFidgetType: invalidUnknownFidgetType,
    outOfBounds: invalidOutOfBounds
  }
};
