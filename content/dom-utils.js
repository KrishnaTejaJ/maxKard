// DOM Utilities - Handles DOM manipulation and element detection

class DOMUtils {
  constructor() {
    this.priceKeywords = [
      'total', 'amount', 'price', 'cost', 'sum', 'grand', 'final',
      'checkout', 'order', 'cart', 'payment', 'due', 'balance'
    ];
    
    this.currencyPatterns = [
      /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*\$/,
      /USD\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*USD/i
    ];
  }

  // Find potential price containers
  findPriceContainers() {
    console.log('🔍 Finding price containers...');
    
    const containers = [];
    const elements = document.querySelectorAll('div, span, p, section, article, td, th');
    
    for (const element of elements) {
      const text = element.textContent || '';
      
      // Skip overly large elements
      if (text.length > 100) continue;
      
      if (this.containsPriceIndicators(text)) {
        containers.push({
          element,
          text: text.trim(),
          selector: this.generateSelector(element),
          id: element.id,
          className: element.className,
          tagName: element.tagName.toLowerCase()
        });
      }
    }
    
    console.log(`📦 Found ${containers.length} potential price containers`);
    return containers;
  }

  // Check if text contains price indicators
  containsPriceIndicators(text) {
    const lowerText = text.toLowerCase();
    
    const hasKeyword = this.priceKeywords.some(keyword => 
      lowerText.includes(keyword)
    );
    
    const hasCurrency = this.currencyPatterns.some(pattern => 
      pattern.test(text)
    );
    
    return hasKeyword && hasCurrency;
  }

  // Generate stable CSS selector
  generateSelector(element) {
    const parts = [];
    let current = element;
    
    while (current && current !== document.body && parts.length < 5) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${CSS.escape(current.id)}`;
        parts.unshift(selector);
        break;
      }
      
      if (current.className) {
        const classes = current.className.split(' ')
          .filter(c => c && c.length > 0)
          .slice(0, 3)
          .map(c => CSS.escape(c));
        
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }
      
      // Add nth-child for uniqueness
      const siblings = Array.from(current.parentNode?.children || [])
        .filter(el => el.tagName === current.tagName);
      
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
      
      parts.unshift(selector);
      current = current.parentElement;
    }
    
    return parts.join(' > ');
  }

  // Try to extract price using cached selectors
  tryKnownSelectors(selectors) {
    for (const selectorInfo of selectors) {
      const element = this.findElementBySelector(selectorInfo);
      if (element) {
        const amount = this.extractPriceFromElement(element);
        if (amount !== null) {
          console.log(`✅ Found price using cached selector: $${amount}`);
          return amount;
        }
      }
    }
    return null;
  }

  // Find element by selector info
  findElementBySelector(selectorInfo) {
    // Try by ID first
    if (selectorInfo.id && selectorInfo.id !== 'none') {
      const element = document.getElementById(selectorInfo.id);
      if (element) return element;
    }
    
    // Try by CSS selector
    if (selectorInfo.selector) {
      try {
        return document.querySelector(selectorInfo.selector);
      } catch (e) {
        console.warn('Invalid cached selector:', selectorInfo.selector);
      }
    }
    
    return null;
  }

  // Extract price from element text
  extractPriceFromElement(element) {
    const text = element.textContent || '';
    
    for (const pattern of this.currencyPatterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (amount > 0 && amount < 100000) {
          return amount;
        }
      }
    }
    
    return null;
  }

  // Check if current page is checkout page
  isCheckoutPage() {
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();
    const title = document.title.toLowerCase();
    
    const checkoutKeywords = [
      'checkout', 'cart', 'basket', 'bag', 'payment',
      'order', 'purchase', 'buy', 'shopping-cart'
    ];
    
    return checkoutKeywords.some(keyword => 
      url.includes(keyword) || 
      pathname.includes(keyword) || 
      title.includes(keyword)
    );
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMUtils;
} else {
  window.DOMUtils = DOMUtils;
}