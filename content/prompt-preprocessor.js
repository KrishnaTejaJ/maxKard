// Prompt Preprocessor - Handles data preprocessing for Google PromptAPI (Gemini Nano)

class PromptPreprocessor {
  constructor(maxChars = 2000) {
    this.maxChars = maxChars;
  }

  // Main preprocessing function
  preprocessContainers(containers) {
    console.log(`🔄 Preprocessing ${containers.length} containers for PromptAPI...`);
    
    // Create simplified containers with truncated text
    const simplified = containers.map((container, index) => ({
      index: index,
      text: container.text
    }));

    // Remove duplicates based on text content
    const deduped = this.removeDuplicateText(simplified);
    
    // Sort by text length (shortest first)
    const sorted = this.sortByTextLength(deduped);
    
    console.log(`📊 Preprocessed: ${containers.length} → ${sorted.length} unique containers`);
    
    return {
      simplified: sorted,
      originalMap: this.createOriginalMap(containers, sorted)
    };
  }

  // Create windows of data that fit within character limit
  createWindows(simplifiedContainers) {
    const windows = [];
    let currentWindow = [];
    let currentSize = 0;
    
    for (const container of simplifiedContainers) {
      const itemSize = JSON.stringify(container).length;
      
      // If adding this item would exceed limit, start new window
      if (currentSize + itemSize > this.maxChars && currentWindow.length > 0) {
        windows.push([...currentWindow]);
        currentWindow = [];
        currentSize = 0;
      }
      
      currentWindow.push(container);
      currentSize += itemSize;
    }
    
    // Add the last window if it has items
    if (currentWindow.length > 0) {
      windows.push(currentWindow);
    }
    
    console.log(`🪟 Created ${windows.length} windows for PromptAPI processing`);
    return windows;
  }

  // Remove containers with duplicate text
  removeDuplicateText(containers) {
    const seen = new Set();
    return containers.filter(container => {
      const normalizedText = container.text.toLowerCase().trim();
      if (seen.has(normalizedText)) {
        return false;
      }
      seen.add(normalizedText);
      return true;
    });
  }

  // Sort containers by text length (shortest first)
  sortByTextLength(containers) {
    return containers.sort((a, b) => a.text.length - b.text.length);
  }

  // Create mapping from simplified to original containers
  createOriginalMap(originalContainers, simplifiedContainers) {
    const map = new Map();
    
    for (const simplified of simplifiedContainers) {
      const original = originalContainers[simplified.index];
      if (original) {
        map.set(simplified.index, {
          selector: original.selector,
          id: original.index,
          className: original.className,
          tagName: original.tagName,
          fullText: original.text
        });
      }
    }
    
    return map;
  }

  // Check if data fits within character limit
  fitsInLimit(data) {
    return JSON.stringify(data).length <= this.maxChars;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptPreprocessor;
} else {
  window.PromptPreprocessor = PromptPreprocessor;
}