// checkout-widget.js - Content Script for Checkout Pages

// Prevent double execution
if (window.maxKardLoaded) {
  // Already loaded, skipping
} else {
  window.maxKardLoaded = true;

let cards = [];
let recommendationShown = false;

// Initialize
(async function init() {
  // Load cards from storage
  await loadCards();
  
  if (cards.length === 0) {
    return;
  }
  
  // Detect if we're on a checkout page
  if (isCheckoutPage()) {
    // Wait a bit for page to fully load
    setTimeout(async () => {
      await calculateAndSaveRecommendation();
    }, 1500);
  } else {
    // Not a checkout page - clear any old recommendations
    await chrome.storage.local.remove(['currentRecommendation']);
  }
})();

// Load cards from storage
async function loadCards() {
  const result = await chrome.storage.local.get(['cards']);
  cards = result.cards || [];
}

// Detect if current page is a checkout/cart page
function isCheckoutPage() {
  const url = window.location.href.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  const title = document.title.toLowerCase();
  
  // Common checkout/cart indicators
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

// Detect merchant and category
async function detectMerchant() {
  const domain = window.location.hostname;
  const title = document.title;
  
  // Map of known merchants to categories
  const knownMerchants = {
    'amazon.com': { name: 'Amazon', category: 'online' },
    'walmart.com': { name: 'Walmart', category: 'groceries' },
    'target.com': { name: 'Target', category: 'online' },
    'bestbuy.com': { name: 'Best Buy', category: 'online' },
    'wholefoodsmarket.com': { name: 'Whole Foods', category: 'groceries' },
    'costco.com': { name: 'Costco', category: 'groceries' },
    'homedepot.com': { name: 'Home Depot', category: 'online' },
    'uber.com': { name: 'Uber', category: 'travel' },
    'ubereats.com': { name: 'Uber Eats', category: 'dining' },
    'doordash.com': { name: 'DoorDash', category: 'dining' },
    'instacart.com': { name: 'Instacart', category: 'groceries' }
  };
  
  // Check if it's a known merchant
  for (const [merchantDomain, info] of Object.entries(knownMerchants)) {
    if (domain.includes(merchantDomain)) {
      return info;
    }
  }
  
  // For unknown merchants, try to use AI to classify
  try {
    const availability = await LanguageModel.availability({ language: 'en' });
    
    if (availability === 'available' || availability === 'readily') {
      const session = await LanguageModel.create({
        systemPrompt: 'You are a merchant classifier. Classify merchants into categories.'
      });
      
      const prompt = `Classify this merchant into ONE category: dining, gas, groceries, travel, or online.
      
Merchant domain: ${domain}
Page title: ${title}

Respond with ONLY the category name (dining/gas/groceries/travel/online), nothing else.`;
      
      const category = await session.prompt(prompt);
      session.destroy(); // Clean up session
      
      const cleanCategory = category.trim().toLowerCase();
      
      // Extract merchant name from domain
      const merchantName = domain.replace('www.', '').split('.')[0];
      const formattedName = merchantName.charAt(0).toUpperCase() + merchantName.slice(1);
      
      return {
        name: formattedName,
        category: cleanCategory
      };
    }
  } catch (error) {
    // Fallback to pattern matching if AI fails
  }
  
  // Fallback: generic online shopping
  const merchantName = domain.replace('www.', '').split('.')[0];
  const formattedName = merchantName.charAt(0).toUpperCase() + merchantName.slice(1);
  
  return {
    name: formattedName,
    category: 'online'
  };
}

// Get cart total (enhanced version)
function getCartTotal() {
  // More comprehensive selectors
  const selectors = [
    // Instacart specific
    '[data-testid="order-total-price"]',
    '[data-testid="total-price"]',
    '[data-test="cart-summary-total"]',
    '[data-test="order-total"]',
    
    // Generic e-commerce selectors
    '.order-total', '.cart-total', '#cart-total',
    '.checkout-total', '.final-total', '.grand-total',
    '[class*="OrderTotal"]', '[class*="order-total"]',
    '[class*="cart-total"]', '[class*="CartTotal"]',
    '[class*="checkout-total"]', '[class*="CheckoutTotal"]',
    '[class*="grand-total"]', '[class*="GrandTotal"]',
    '[class*="final-total"]', '[class*="FinalTotal"]',
    '[class*="total-amount"]', '[class*="TotalAmount"]',
    '[class*="total-price"]', '[class*="TotalPrice"]',
    
    // ID-based selectors
    '[id*="total"]', '[id*="Total"]',
    '[id*="price"]', '[id*="Price"]',
    '[id*="amount"]', '[id*="Amount"]',
    
    // Aria labels and roles
    '[aria-label*="total"]', '[aria-label*="Total"]',
    '[role="total"]',
    
    // Common payment page selectors
    '.payment-total', '.summary-total',
    '.price-total', '.amount-total'
  ];
  
  const prices = [];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const text = el.textContent || el.innerText || '';
      
      // Enhanced regex patterns for different currency formats
      const patterns = [
        /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/,  // $123.45, $1,234.56
        /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*\$/,  // 123.45$, 1,234.56$
        /USD\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i, // USD 123.45
        /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*USD/i  // 123.45 USD
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(/,/g, ''));
          if (amount > 0 && amount < 100000) { // Sanity check
            prices.push({ amount, element: el, text: text.trim() });
          }
        }
      }
    }
  }
  
  // If multiple prices found, try to pick the most likely total
  if (prices.length > 0) {
    // Sort by amount (descending) and prefer elements with "total" in class/id
    prices.sort((a, b) => {
      const aIsTotal = /total|grand|final|checkout/i.test(a.element.className + a.element.id);
      const bIsTotal = /total|grand|final|checkout/i.test(b.element.className + b.element.id);
      
      if (aIsTotal && !bIsTotal) return -1;
      if (!aIsTotal && bIsTotal) return 1;
      
      return b.amount - a.amount; // Higher amount first
    });
    
    console.log('MaxKard: Found prices:', prices.map(p => ({ amount: p.amount, text: p.text })));
    return prices[0].amount;
  }
  
  return null;
}

// AI-powered price extraction (fallback)
async function extractPriceWithAI() {
  try {
    // Get relevant text content from the page
    const checkoutContent = getCheckoutPageContent();
    
    if (checkoutContent.length > 3000) { // Limit context
      return null; // Too much content, fallback to DOM
    }
    
    // Check if AI is available
    if (!window.ai) {
      console.log('MaxKard: AI not available');
      return null;
    }
    
    const availability = await LanguageModel.availability({ language: 'en' });
    if (availability !== 'readily') {
      console.log('MaxKard: AI not ready, status:', availability);
      return null;
    }
    
    const session = await LanguageModel.create({
      systemPrompt: 'Extract the total purchase amount from checkout page content. Respond with only the numeric amount (no currency symbols) or "null" if not found.'
    });
    
    const prompt = `Find the total purchase amount from this checkout page content:

${checkoutContent}

Return only the numeric amount (e.g., "123.45") or "null" if no total found.`;
    
    const result = await session.prompt(prompt);
    session.destroy(); // Clean up session
    
    const amount = parseFloat(result.trim());
    
    return isNaN(amount) ? null : amount;
  } catch (error) {
    console.error('MaxKard AI extraction failed:', error);
    return null;
  }
}

// Get relevant page content for AI processing
function getCheckoutPageContent() {
  // Get text from likely checkout-related elements
  const contentSelectors = [
    '.checkout', '.cart', '.summary', '.order',
    '[class*="checkout"]', '[class*="cart"]', '[class*="summary"]',
    '[class*="total"]', '[class*="price"]', '[class*="amount"]'
  ];
  
  let content = '';
  for (const selector of contentSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      content += el.textContent + '\n';
    }
  }
  
  return content.substring(0, 3000); // Limit to avoid large context
}

// Enhanced cart total detection
async function getCartTotalEnhanced() {
  // Try DOM extraction first
  let amount = getCartTotal();
  
  if (amount === null) {
    console.log('MaxKard: DOM extraction failed, trying AI...');
    // Fallback to AI if DOM fails
    amount = await extractPriceWithAI();
  }
  
  if (amount !== null) {
    console.log('MaxKard: Found cart total:', amount);
  } else {
    console.log('MaxKard: Could not extract cart total');
  }
  
  return amount;
}

// Calculate best card for this purchase
function calculateBestCard(category, amount) {
  let bestCard = null;
  let maxReward = 0;
  
  // Don't use default amount - keep it null if not found
  const calculationAmount = amount;
  
  for (const card of cards) {
    // Get reward rate for this category
    const rate = card.rewards[category] || card.rewards.default || 0;
    
    // Only calculate if we have an amount
    if (calculationAmount !== null) {
      const reward = calculationAmount * (rate / 100);
      
      if (reward > maxReward) {
        maxReward = reward;
        bestCard = { ...card, rate };
      }
    } else {
      // If no amount, just find the best rate
      if (rate > maxReward) {
        maxReward = rate;
        bestCard = { ...card, rate };
      }
    }
  }
  
  return { bestCard, maxReward, hasAmount: calculationAmount !== null };
}

// Calculate and save recommendation
async function calculateAndSaveRecommendation() {
  if (recommendationShown) return;
  
  const merchant = await detectMerchant();
  const amount = await getCartTotalEnhanced(); // Use enhanced version
  const { bestCard, maxReward, hasAmount } = calculateBestCard(merchant.category, amount);
  
  if (!bestCard) {
    return;
  }
  
  // Save recommendation to storage so popup can display it
  await chrome.storage.local.set({
    currentRecommendation: {
      merchant,
      category: merchant.category,
      bestCard,
      maxReward,
      amount: amount, // Can be null if not found
      hasAmount: hasAmount, // Flag to indicate if we found the amount
      timestamp: Date.now()
    }
  });
  
  recommendationShown = true;
  
  // Send notification to background script
  try {
    chrome.runtime.sendMessage({
      action: 'showNotification',
      data: {
        merchant: merchant.name,
        card: bestCard.name,
        reward: maxReward,
        hasAmount: hasAmount
      }
    });
  } catch (e) {
    // Could not send notification
  }
}

// Listen for storage changes (if user adds cards while on page)
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.cards) {
    cards = changes.cards.newValue || [];
    if (!recommendationShown && cards.length > 0 && isCheckoutPage()) {
      await calculateAndSaveRecommendation();
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'recalculate') {
    // Reset and recalculate
    recommendationShown = false;
    if (isCheckoutPage()) {
      calculateAndSaveRecommendation().then(() => {
        sendResponse({ success: true });
      });
    } else {
      sendResponse({ success: false, error: 'Not on checkout page' });
    }
    return true; // Keep channel open for async response
  }
});

} // End of if (!window.maxKardLoaded)