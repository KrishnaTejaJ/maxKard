// Global state
let cards = [];
let editingCardId = null;
let currentRecommendation = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  await initializeTheme();
  await loadCards();
  await loadCurrentRecommendation();
  renderCards();
  renderHome();
  setupEventListeners();
});

// Theme Management
function initializeTheme() {
  const stored = localStorage.getItem('theme');
  const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(theme);
  
  // Listen to system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
  document.getElementById('darkModeToggle').checked = theme === 'dark';
}

// Data Loading
async function loadCards() {
  const result = await chrome.storage.local.get(['cards']);
  cards = result.cards || [];
}

async function loadCurrentRecommendation() {
  const result = await chrome.storage.local.get(['currentRecommendation']);
  currentRecommendation = result.currentRecommendation || null;
}

async function saveCards() {
  await chrome.storage.local.set({ cards });
}

// Render Functions
function renderHome() {
  const homeContent = document.getElementById('homeContent');
  
  if (!currentRecommendation) {
    homeContent.innerHTML = `
      <div class="no-recommendation">
        <div class="no-rec-icon">🛒</div>
        <div class="no-rec-title">No recommendation yet</div>
        <div class="no-rec-text">Visit a checkout page to see your best card recommendation!</div>
      </div>
    `;
    return;
  }
  
  const { merchant, category, bestCard, maxReward, hasAmount } = currentRecommendation;
  const networkClass = getNetworkClass(bestCard.network);
  
  // Format earnings display
  const earningsDisplay = hasAmount 
    ? `$${maxReward.toFixed(2)}` 
    : '<span style="color: var(--text-tertiary); font-style: italic; font-size: 14px;">Amount not available</span>';
  
  homeContent.innerHTML = `
    <div class="recommendation-card">
      <div class="rec-content">
        <div class="rec-label">Recommended for you</div>
        <div class="rec-merchant">${merchant.name}</div>
        <div class="rec-category">${formatCategory(category)}</div>
        
        <div class="best-card-container">
          <div class="card-image ${networkClass}"></div>
          <div class="best-card-info">
            <div class="best-card-name">${bestCard.name}</div>
            <div class="best-card-rate">${bestCard.rate}% cashback on ${category}</div>
            <div class="best-card-earnings">${earningsDisplay}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="info-banner">
      MaxKard automatically detects checkout pages and recommends your best card based on the merchant category.
    </div>
  `;
}

function renderCards() {
  const cardsList = document.getElementById('cardsList');
  const cardCount = document.getElementById('cardCount');
  
  cardCount.textContent = `${cards.length} card${cards.length !== 1 ? 's' : ''}`;
  
  if (cards.length === 0) {
    cardsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💳</div>
        <div class="empty-title">No cards yet</div>
        <div class="empty-text">Add your first credit card to start maximizing your rewards!</div>
      </div>
    `;
    return;
  }
  
  cardsList.innerHTML = cards.map(card => {
    const networkClass = getNetworkClass(card.network);
    return `
      <div class="card-item" data-card-id="${card.id}">
        <div class="card-item-header">
          <div class="card-item-image ${networkClass}"></div>
          <div class="card-item-info">
            <div class="card-item-name">
              ${card.name}
              ${card.lastFour ? `<span class="card-last-four">${card.lastFour}</span>` : ''}
            </div>
            <div class="card-item-type">${formatNetwork(card.network)}</div>
          </div>
        </div>
        <div class="card-rewards">
          ${formatRewards(card.rewards)}
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers for edit
  document.querySelectorAll('.card-item').forEach(item => {
    item.addEventListener('click', () => {
      const cardId = item.dataset.cardId;
      editCard(cardId);
    });
  });
}

// Helper Functions
function getNetworkClass(network) {
  const networkMap = {
    'visa': '',
    'mastercard': 'mastercard',
    'amex': 'amex',
    'discover': 'discover'
  };
  return networkMap[network] || '';
}

function formatNetwork(network) {
  const networkNames = {
    'visa': 'Visa',
    'mastercard': 'Mastercard',
    'amex': 'American Express',
    'discover': 'Discover'
  };
  return networkNames[network] || 'Visa';
}

function formatCategory(category) {
  const categoryNames = {
    'dining': 'Dining & Restaurants',
    'gas': 'Gas Stations',
    'groceries': 'Grocery Stores',
    'travel': 'Travel & Transportation',
    'online': 'Online Shopping',
    'default': 'General Purchases'
  };
  return categoryNames[category] || 'General Purchases';
}

function formatRewards(rewards) {
  const rewardItems = [];
  const icons = {
    dining: '🍽️',
    gas: '⛽',
    groceries: '🛒',
    travel: '✈️',
    online: '🌐',
    default: '💰'
  };
  
  const labels = {
    dining: 'Dining',
    gas: 'Gas',
    groceries: 'Groceries',
    travel: 'Travel',
    online: 'Online',
    default: 'Default'
  };
  
  for (const [category, rate] of Object.entries(rewards)) {
    if (rate && rate > 0) {
      rewardItems.push(`
        <div class="reward-badge">
          <span class="reward-icon">${icons[category]}</span>
          <span>${labels[category]}</span>
          <span class="reward-value">${rate}%</span>
        </div>
      `);
    }
  }
  
  return rewardItems.join('');
}

function generateId() {
  return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Event Listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName) {
          content.classList.add('active');
        }
      });
    });
  });
  
  // Theme toggles
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
  
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    setTheme(e.target.checked ? 'dark' : 'light');
  });
  
  // Settings toggles
  document.getElementById('alertsToggle').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ alertsEnabled: e.target.checked });
  });
  
  document.getElementById('autoDetectToggle').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ autoDetectEnabled: e.target.checked });
  });
  
  // Modal controls
  document.getElementById('addCardBtn').addEventListener('click', openAddModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cardModal').addEventListener('click', (e) => {
    if (e.target.id === 'cardModal') closeModal();
  });
  
  // Form submission
  document.getElementById('cardForm').addEventListener('submit', handleSubmit);
  document.getElementById('parseBtn').addEventListener('click', parseRewardsWithAI);
  
  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.cards) {
        cards = changes.cards.newValue || [];
        renderCards();
      }
      if (changes.currentRecommendation) {
        currentRecommendation = changes.currentRecommendation.newValue || null;
        renderHome();
      }
    }
  });
}

// Modal Functions
function openAddModal() {
  editingCardId = null;
  document.getElementById('modalTitle').textContent = 'Add New Card';
  document.getElementById('cardForm').reset();
  document.getElementById('cardModal').classList.add('active');
}

function editCard(cardId) {
  const card = cards.find(c => c.id === cardId);
  if (!card) return;
  
  editingCardId = cardId;
  document.getElementById('modalTitle').textContent = 'Edit Card';
  
  document.getElementById('cardName').value = card.name;
  document.getElementById('cardNetwork').value = card.network || 'visa';
  document.getElementById('lastFour').value = card.lastFour || '';
  document.getElementById('rewardDining').value = card.rewards.dining || '';
  document.getElementById('rewardGas').value = card.rewards.gas || '';
  document.getElementById('rewardGroceries').value = card.rewards.groceries || '';
  document.getElementById('rewardTravel').value = card.rewards.travel || '';
  document.getElementById('rewardOnline').value = card.rewards.online || '';
  document.getElementById('rewardDefault').value = card.rewards.default || '';
  
  document.getElementById('cardModal').classList.add('active');
}

function closeModal() {
  document.getElementById('cardModal').classList.remove('active');
  document.getElementById('cardForm').reset();
  editingCardId = null;
}

async function handleSubmit(e) {
  e.preventDefault();
  
  const cardData = {
    id: editingCardId || generateId(),
    name: document.getElementById('cardName').value.trim(),
    network: document.getElementById('cardNetwork').value,
    lastFour: document.getElementById('lastFour').value.trim(),
    rewards: {
      dining: parseFloat(document.getElementById('rewardDining').value) || 0,
      gas: parseFloat(document.getElementById('rewardGas').value) || 0,
      groceries: parseFloat(document.getElementById('rewardGroceries').value) || 0,
      travel: parseFloat(document.getElementById('rewardTravel').value) || 0,
      online: parseFloat(document.getElementById('rewardOnline').value) || 0,
      default: parseFloat(document.getElementById('rewardDefault').value) || 0
    }
  };
  
  if (editingCardId) {
    const index = cards.findIndex(c => c.id === editingCardId);
    cards[index] = cardData;
  } else {
    cards.push(cardData);
  }
  
  await saveCards();
  renderCards();
  closeModal();
  
  // Recalculate recommendation if we have one
  if (currentRecommendation) {
    await recalculateRecommendation();
  }
}

// AI Parsing
async function parseRewardsWithAI() {
  const input = document.getElementById('aiParseInput').value.trim();
  if (!input) {
    alert('Please paste your card rewards terms first!');
    return;
  }
  
  const parseBtn = document.getElementById('parseBtn');
  parseBtn.textContent = 'Parsing...';
  parseBtn.disabled = true;
  
  try {
    let parsed = {};
    
    // Try AI first
    try {
      const availability = await window.ai?.languageModel?.capabilities();
      
      if (availability?.available === 'readily') {
        const session = await window.ai.languageModel.create({
          systemPrompt: 'Extract credit card rewards percentages. Reply ONLY in format: dining:X, gas:X, groceries:X, travel:X, online:X, default:X'
        });
        
        const response = await session.prompt(`Extract rewards from: ${input}`);
        parsed = parseRewardsText(response);
        session.destroy();
        
        if (Object.keys(parsed).length > 0) {
          fillFormWithParsedData(parsed);
          alert('✅ Rewards parsed successfully!');
          return;
        }
      }
    } catch (aiError) {
      console.log('AI not available, using fallback');
    }
    
    // Fallback to regex
    parsed = parseRewardsTextSimple(input);
    
    if (Object.keys(parsed).length > 0) {
      fillFormWithParsedData(parsed);
      alert('✅ Rewards parsed! Please review and adjust if needed.');
    } else {
      alert('⚠️ Could not parse rewards. Please enter manually.');
    }
    
  } catch (error) {
    console.error('Parse error:', error);
    alert('⚠️ Error parsing rewards. Please enter manually.');
  } finally {
    parseBtn.textContent = 'Parse with AI';
    parseBtn.disabled = false;
  }
}

function parseRewardsText(text) {
  const rewards = {};
  const patterns = {
    dining: /dining[:\s]+(\d+\.?\d*)/i,
    gas: /gas[:\s]+(\d+\.?\d*)/i,
    groceries: /groceries[:\s]+(\d+\.?\d*)/i,
    travel: /travel[:\s]+(\d+\.?\d*)/i,
    online: /online[:\s]+(\d+\.?\d*)/i,
    default: /default[:\s]+(\d+\.?\d*)/i
  };
  
  for (const [category, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern);
    if (match) {
      rewards[category] = parseFloat(match[1]);
    }
  }
  
  return rewards;
}

function parseRewardsTextSimple(text) {
  const rewards = {};
  const patterns = [
    { category: 'dining', regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:dining|restaurants?|food)/i },
    { category: 'gas', regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:gas|fuel)/i },
    { category: 'groceries', regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:groceries|grocery)/i },
    { category: 'travel', regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:travel|airfare|hotels?)/i },
    { category: 'online', regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:online|internet)/i },
    { category: 'default', regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:everything|all)/i }
  ];
  
  for (const { category, regex } of patterns) {
    const match = text.match(regex);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value >= 0) {
        rewards[category] = value;
      }
    }
  }
  
  return rewards;
}

function fillFormWithParsedData(parsed) {
  if (parsed.dining) document.getElementById('rewardDining').value = parsed.dining;
  if (parsed.gas) document.getElementById('rewardGas').value = parsed.gas;
  if (parsed.groceries) document.getElementById('rewardGroceries').value = parsed.groceries;
  if (parsed.travel) document.getElementById('rewardTravel').value = parsed.travel;
  if (parsed.online) document.getElementById('rewardOnline').value = parsed.online;
  if (parsed.default) document.getElementById('rewardDefault').value = parsed.default;
}

// Recalculate recommendation when cards change
async function recalculateRecommendation() {
  if (!currentRecommendation) return;
  
  const { merchant, category, amount, hasAmount } = currentRecommendation;
  
  let bestCard = null;
  let maxReward = 0;
  
  for (const card of cards) {
    const rate = card.rewards[category] || card.rewards.default || 0;
    
    if (hasAmount && amount !== null) {
      const reward = amount * (rate / 100);
      if (reward > maxReward) {
        maxReward = reward;
        bestCard = { ...card, rate };
      }
    } else {
      if (rate > maxReward) {
        maxReward = rate;
        bestCard = { ...card, rate };
      }
    }
  }
  
  if (bestCard) {
    await chrome.storage.local.set({
      currentRecommendation: {
        merchant,
        category,
        bestCard,
        maxReward,
        amount,
        hasAmount,
        timestamp: Date.now()
      }
    });
  }
}