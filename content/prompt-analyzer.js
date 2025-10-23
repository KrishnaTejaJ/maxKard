// Prompt Analyzer - Handles Google PromptAPI (Gemini Nano) powered price extraction

class PromptAnalyzer {
  constructor() {
    this.preprocessor = new PromptPreprocessor();
    this.confidenceThreshold = 0.7;
  }

  // Main analysis function with windowing support
  async analyzePriceContainers(containers) {
    console.log('🤖 Starting PromptAPI analysis...');
    
    try {
        
      // Preprocess containers
      const { simplified, originalMap } = this.preprocessor.preprocessContainers(containers);
      
      // 📥 DOWNLOAD SIMPLIFIED AND ORIGINAL MAP AS JSON FILES
      // this.downloadJSON(simplified, 'simplified-containers.json');
      // this.downloadJSON(Array.from(originalMap.entries()), 'original-map.json');
      // this.downloadJSON(containers, 'raw-containers.json');

      if (simplified.length === 0) {
        // console.log('No containers after preprocessing');
        return null;
      }

      // Try to analyze all at once if it fits
      if (this.preprocessor.fitsInLimit(simplified)) {
        // console.log('📦 Analyzing all containers in single request');
        return await this.analyzeSingleWindow(simplified, originalMap);
      }

      // Use windowing approach
      // console.log('🪟 Using windowing approach for large dataset');
      return await this.analyzeWithWindows(simplified, originalMap);

    } catch (error) {
      console.error('PromptAPI analysis failed:', error);
      return null;
    }
  }

  // Analyze single window of containers
  async analyzeSingleWindow(containers, originalMap) {
    const session = await this.createPromptSession();
    // console.log('PromptAPI created session:', session);
    
    try {
      const prompt = this.createAnalysisPrompt(containers);
      // console.log('Prompt:', prompt);
      const result = await session.prompt(prompt);
      // console.log('PromptAPI result:', result);
      
      return this.parseAnalysisResult(result, originalMap);
    } finally {
      if (session && session.destroy) {
        session.destroy();
      }
    }
  }

  // Analyze using multiple windows
  async analyzeWithWindows(containers, originalMap) {
    const windows = this.preprocessor.createWindows(containers);
    
    for (let i = 0; i < windows.length; i++) {
      // console.log(`🔍 Analyzing window ${i + 1}/${windows.length}`);
      
      const result = await this.analyzeSingleWindow(windows[i], originalMap);
      
      // If we found a high-confidence result, return it
      if (result && result.confidence >= this.confidenceThreshold) {
        // console.log(`✅ Found high-confidence result in window ${i + 1}`);
        return result;
      }
    }

    // console.log('🔍 No high-confidence result found in any window');
    return null;
  }

async createPromptSession() {
  const systemPrompt = `You are an expert at extracting final cart totals from e-commerce checkout pages.

    KEY RULES:
    - Always return JSON in exact format: {"index": number, "text": string, "amount": number, "confidence": number, "explanation": string}
    - Extract ONLY the final total amount, ignore subtotals, taxes, shipping
    - Convert currency strings to numbers (e.g., "$15.07" becomes 15.07)
    - If uncertain, set low confidence score
    - If no clear total found, return amount: null

    PRIORITY ORDER for finding totals:
    1. "Grand Total", "Order Total", "Final Total"
    2. "Total", "Amount Due", "You Pay"
    3. Last/largest price in a container with multiple prices

    Always respond with valid JSON only.`;

  return await LanguageModel.create({
    systemPrompt: systemPrompt,
    temperature: 0.1,
    topK: 1,
    language: 'en',
  });
}


  // 📥 ADD THIS NEW METHOD TO THE CLASS
  // Download data as JSON file
  downloadJSON(data, filename) {
    // try {
    //   const jsonString = JSON.stringify(data, null, 2);
    //   const blob = new Blob([jsonString], { type: 'application/json' });
    //   const url = URL.createObjectURL(blob);
    //   
    //   const a = document.createElement('a');
    //   a.href = url;
    //   a.download = filename;
    //   a.style.display = 'none';
    //   
    //   document.body.appendChild(a);
    //   a.click();
    //   document.body.removeChild(a);
    //   
    //   URL.revokeObjectURL(url);
    //   console.log(`📥 Downloaded: ${filename}`);
    // } catch (error) {
    //   console.error(`Failed to download ${filename}:`, error);
    // }
  }

  createAnalysisPrompt(containers) {
    return `You are a price extraction expert. Your task is to analyze these containers and find the FINAL CART TOTAL or ORDER TOTAL.

          CONTAINERS TO ANALYZE:
          ${JSON.stringify(containers, null, 2)}

          INSTRUCTIONS:
          1. Look for keywords like: "total", "grand total", "order total", "final", "amount due", "checkout total"
          2. Extract the FINAL numeric amount (not subtotals, taxes, or individual items)
          3. If multiple prices exist in one container, choose the FINAL/TOTAL amount
          4. Parse currency amounts like $15.07, $23.56, etc.

          REQUIRED OUTPUT FORMAT (JSON only):
          {
            "index": <index_of_container_with_final_total>,
            "text": <full_text_of_that_container>,
            "amount": <numeric_value_only_no_currency_symbol>,
            "confidence": <0_to_1_score>,
            "explanation": "<brief_reason>"
          }

          Return JSON only - no other text:`;
  }

  // Parse PromptAPI response
  parseAnalysisResult(result, originalMap) {
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const response = JSON.parse(jsonMatch[0]);
      
      // Updated validation for new format
      if (response.amount === undefined || response.index === undefined) {
        return null;
      }

      const originalData = originalMap.get(response.index);
      if (!originalData) return null;

      return {
        amount: parseFloat(response.amount),
        confidence: response.confidence || 0.5,
        explanation: response.explanation || 'PromptAPI analysis',
        selectors: [{
          selector: originalData.selector,
          id: originalData.id,
          className: originalData.className,
          tagName: originalData.tagName
        }]
      };
    } catch (error) {
      console.error('Failed to parse PromptAPI result:', error);
      return null;
    }
  }

  // Check if PromptAPI (Gemini Nano) is available
  async isPromptAPIAvailable() {
    if (!LanguageModel.availability()) {
      // console.log('PromptAPI not available');
      return false;
    }
    
    try {
      const availability = await LanguageModel.availability({ language: 'en' });
      // console.log('PromptAPI availability:', availability);
      return availability === 'available';
    } catch (error) {
      // console.log('PromptAPI availability check failed:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PromptAnalyzer;
} else {
  window.PromptAnalyzer = PromptAnalyzer;
}