// Checkout Widget - Main content script for checkout pages

// Prevent double execution
if (window.maxKardLoaded) {
  // Already loaded, skipping
} else {
  window.maxKardLoaded = true;

// Import utilities
const domUtils = new DOMUtils();
const promptAnalyzer = new PromptAnalyzer();

let cards = [];
let recommendationShown = false;

// Initialize
(async function init() {
  await loadCards();
  
  if (cards.length === 0) return;
  
  if (domUtils.isCheckoutPage()) {
    setTimeout(async () => {
      await calculateAndSaveRecommendation();
    }, 3000);
  } else {
    await chrome.storage.local.remove(['currentRecommendation']);
  }
})();

// Load cards from storage
async function loadCards() {
  const result = await chrome.storage.local.get(['cards']);
  cards = result.cards || [];
}

// Enhanced price extraction with caching and AI
async function getCartTotal() {
  const domain = window.location.hostname;
  // console.log('🏪 Starting price extraction for', domain);
  
  // Step 1: Try cached selectors
  const cachedSelectors = await getCachedSelectors(domain);
  if (cachedSelectors) {
    // console.log('💾 Trying cached selectors...');
    const amount = domUtils.tryKnownSelectors(cachedSelectors);
    if (amount !== null) {
      // console.log('✅ Used cached selectors:', amount);
      return amount;
    }
  }
  
  // Step 2: Find price containers
  const containers = domUtils.findPriceContainers();
  if (containers.length === 0) {
    // console.log('❌ No price containers found');
    return null;
  }
  
  // Step 3: Analyze with PromptAPI
  const result = await promptAnalyzer.analyzePriceContainers(containers);
  
  if (result && result.amount !== null) {
    console.log('🎯 PromptAPI found price:', result.amount);
    await cacheSuccessfulSelectors(domain, result.selectors);
    return result.amount;
  }
  
  // console.log('❌ Could not extract price');
  return null;
}

// Cache management
async function cacheSuccessfulSelectors(domain, selectors) {
  const cacheKey = `price_selectors_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const cacheData = {
    domain,
    selectors,
    timestamp: Date.now(),
    version: 1
  };
  
  await chrome.storage.local.set({ [cacheKey]: cacheData });
  // console.log('💾 Cached selectors for', domain);
}

async function getCachedSelectors(domain) {
  const cacheKey = `price_selectors_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const result = await chrome.storage.local.get([cacheKey]);
  const cached = result[cacheKey];
  
  if (!cached) return null;
  
  // Check if cache is not too old (7 days)
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - cached.timestamp > maxAge) {
    await chrome.storage.local.remove([cacheKey]);
    return null;
  }
  
  return cached.selectors;
}

// Merchant detection
async function detectMerchant() {
  const domain = window.location.hostname;
  const title = document.title;
  
  const knownMerchants = {
    'amazon.com': { name: 'Amazon', category: 'online' },
    'walmart.com': { name: 'Walmart', category: 'groceries' },
    'target.com': { name: 'Target', category: 'online' },
    'instacart.com': { name: 'Instacart', category: 'groceries' },
    'ubereats.com': { name: 'Uber Eats', category: 'dining' },
    'doordash.com': { name: 'DoorDash', category: 'dining' },
    'grubhub.com': { name: 'Grubhub', category: 'dining' },
    'costco.com': { name: 'Costco', category: 'groceries' },
    'safeway.com': { name: 'Safeway', category: 'groceries' },
    'kroger.com': { name: 'Kroger', category: 'groceries' },
    'bestbuy.com': { name: 'Best Buy', category: 'electronics' },
    'homedepot.com': { name: 'Home Depot', category: 'home' },
    'lowes.com': { name: 'Lowe\'s', category: 'home' },
    'macys.com': { name: 'Macy\'s', category: 'retail' },
    'nordstrom.com': { name: 'Nordstrom', category: 'retail' }
  };
  
  // Check known merchants
  for (const [merchantDomain, info] of Object.entries(knownMerchants)) {
    if (domain.includes(merchantDomain)) {
      return info;
    }
  }
  
  // Try to categorize based on domain keywords
  const domainLower = domain.toLowerCase();
  let category = 'online'; // default
  
  if (domainLower.includes('food') || domainLower.includes('restaurant') || 
      domainLower.includes('pizza') || domainLower.includes('delivery')) {
    category = 'dining';
  } else if (domainLower.includes('grocery') || domainLower.includes('market') || 
             domainLower.includes('fresh') || domainLower.includes('organic')) {
    category = 'groceries';
  } else if (domainLower.includes('gas') || domainLower.includes('fuel') || 
             domainLower.includes('station') || domainLower.includes('petrol')) {
    category = 'gas';
  } else if (domainLower.includes('travel') || domainLower.includes('hotel') || 
             domainLower.includes('flight') || domainLower.includes('booking')) {
    category = 'travel';
  }
  
  // Default fallback
  const merchantName = domain.replace('www.', '').split('.')[0];
  const formattedName = merchantName.charAt(0).toUpperCase() + merchantName.slice(1);
  
  return {
    name: formattedName,
    category: category
  };
}

// Calculate best card recommendation
function calculateBestCard(category, amount) {
  let bestCard = null;
  let maxReward = 0;
  
  for (const card of cards) {
    // Get the reward rate for this category, fallback to default if not found
    const rate = card.rewards[category] || card.rewards.default || 0;
    
    if (amount !== null) {
      // Calculate actual reward amount
      const reward = amount * (rate / 100);
      if (reward > maxReward) {
        maxReward = reward;
        bestCard = { ...card, rate, rewardAmount: reward };
      }
    } else {
      // If no amount, just compare rates
      if (rate > maxReward) {
        maxReward = rate;
        bestCard = { ...card, rate };
      }
    }
  }
  
  return { 
    bestCard, 
    maxReward: amount !== null ? maxReward : (maxReward / 100), // Return rate if no amount
    hasAmount: amount !== null 
  };
}

// Format reward display
function formatReward(reward, hasAmount) {
  if (hasAmount) {
    return `$${reward.toFixed(2)}`;
  } else {
    return `${reward.toFixed(1)}%`;
  }
}

// Main recommendation calculation
async function calculateAndSaveRecommendation() {
  if (recommendationShown) return;
  
  console.log('🔄 Calculating recommendation...');
  
  const merchant = await detectMerchant();
  const amount = await getCartTotal();
  const { bestCard, maxReward, hasAmount } = calculateBestCard(merchant.category, amount);
  
  if (!bestCard) {
    // console.log('❌ No suitable card found');
    return;
  }
  
  console.log(`💳 Best card: ${bestCard.name} (${bestCard.rate}% for ${merchant.category})`);
  if (amount) {
    console.log(`💰 Cart total: $${amount}, Potential reward: $${maxReward.toFixed(2)}`);
  }
  
  // Save recommendation to storage
  const recommendation = {
    merchant,
    category: merchant.category,
    bestCard,
    maxReward,
    amount,
    hasAmount,
    timestamp: Date.now(),
    formattedReward: formatReward(maxReward, hasAmount)
  };
  
  await chrome.storage.local.set({
    currentRecommendation: recommendation
  });
  
  recommendationShown = true;
  
  // Send notification to extension
  try {
    chrome.runtime.sendMessage({
      action: 'showNotification',
      data: {
        merchant: merchant.name,
        card: bestCard.name,
        reward: maxReward,
        hasAmount,
        formattedReward: recommendation.formattedReward
      }
    });
    // console.log('✅ Sent notification to extension');
  } catch (e) {
    // console.log('Could not send notification:', e.message);
  }
}

// Cleanup old recommendations
async function cleanupOldRecommendations() {
  const result = await chrome.storage.local.get(['currentRecommendation']);
  const recommendation = result.currentRecommendation;
  
  if (recommendation) {
    // Remove if older than 1 hour
    const maxAge = 60 * 60 * 1000;
    if (Date.now() - recommendation.timestamp > maxAge) {
      await chrome.storage.local.remove(['currentRecommendation']);
      // console.log('🧹 Cleaned up old recommendation');
    }
  }
}

// Manual price extraction fallback
function extractPriceManually() {
  const priceSelectors = [
    '[class*="total"]',
    '[class*="price"]',
    '[class*="amount"]',
    '[class*="cost"]',
    '[id*="total"]',
    '[id*="price"]',
    '[id*="amount"]',
    '.grand-total',
    '.order-total',
    '.cart-total',
    '.checkout-total',
    '.final-price'
  ];
  
  for (const selector of priceSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const amount = domUtils.extractPriceFromElement(element);
      if (amount !== null && amount > 0) {
        // console.log(`💡 Manual extraction found: $${amount} using ${selector}`);
        return amount;
      }
    }
  }
  
  return null;
}

// Event listeners
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.cards) {
    cards = changes.cards.newValue || [];
    // console.log(`🔄 Cards updated: ${cards.length} cards loaded`);
    
    if (!recommendationShown && cards.length > 0 && domUtils.isCheckoutPage()) {
      setTimeout(async () => {
        await calculateAndSaveRecommendation();
      }, 1000);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'recalculate') {
    console.log('🔄 Recalculation requested from popup');
    
    // Reset recommendation status
    recommendationShown = false;
    
    if (domUtils.isCheckoutPage()) {
      // Clear any existing recommendation first
      chrome.storage.local.remove(['currentRecommendation']).then(() => {
        // Recalculate after a brief delay
        return calculateAndSaveRecommendation();
      }).then(() => {
        console.log('✅ Recalculation completed successfully');
        sendResponse({ success: true });
      }).catch((error) => {
        console.error('❌ Recalculation failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    } else {
      sendResponse({ 
        success: false, 
        error: 'Not on a checkout page. Please navigate to a checkout page and try again.' 
      });
    }
    return true; // Keep message channel open for async response
  }

  if (request.action === 'analyzeCurrentPage') {
    console.log('🔍 Page analysis requested from popup');
    
    if (domUtils.isCheckoutPage()) {
      recommendationShown = false;
      calculateAndSaveRecommendation().then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
    } else {
      sendResponse({ 
        success: false, 
        error: 'Current page is not detected as a checkout page' 
      });
    }
    return true;
  }
  
  if (request.action === 'getPageInfo') {
    sendResponse({
      isCheckoutPage: domUtils.isCheckoutPage(),
      domain: window.location.hostname,
      url: window.location.href,
      title: document.title
    });
  }
  
  if (request.action === 'testPriceExtraction') {
    getCartTotal().then((amount) => {
      sendResponse({ 
        success: true, 
        amount: amount,
        containers: domUtils.findPriceContainers().length
      });
    }).catch((error) => {
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    });
    return true;
  }
});

// Page change detection
let currentUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== currentUrl) {
    currentUrl = window.location.href;
    // console.log('🔄 Page changed, resetting recommendation status');
    recommendationShown = false;
    
    if (domUtils.isCheckoutPage()) {
      setTimeout(async () => {
        await calculateAndSaveRecommendation();
      }, 2000);
    } else {
      // Clean up recommendation if not on checkout page
      chrome.storage.local.remove(['currentRecommendation']);
    }
  }
}, 1000);

// Cleanup on page load
cleanupOldRecommendations();

// Debug info - Keep these critical startup logs
console.log('💳 MaxKard checkout widget loaded');
// console.log(`📍 Domain: ${window.location.hostname}`);
// console.log(`🛒 Is checkout page: ${domUtils.isCheckoutPage()}`);

} // End of if (!window.maxKardLoaded)