// popup.js - Card Manager Logic

let cards = [];
let editingCardId = null;
let currentRecommendation = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadCards();
  await loadCurrentRecommendation();
  renderCards();
  await renderHome();
  setupEventListeners();
  setupTabs();
  
  // Fade in home content after render
  setTimeout(() => {
    const homeContent = document.getElementById('homeContent');
    if (homeContent) {
      homeContent.style.opacity = '1';
    }
  }, 100);
});

// Load cards from storage
async function loadCards() {
  const result = await chrome.storage.local.get(['cards']);
  cards = result.cards || [];
}

// Load current recommendation from storage
async function loadCurrentRecommendation() {
  const result = await chrome.storage.local.get(['currentRecommendation']);
  currentRecommendation = result.currentRecommendation || null;
}

// Save cards to storage
async function saveCards() {
  await chrome.storage.local.set({ cards });
}

// Setup tabs
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active tab content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName) {
          content.classList.add('active');
        }
      });
    });
  });
}

// Render home tab
async function renderHome() {
  const homeContent = document.getElementById('homeContent');
  const refreshBtn = document.getElementById('refreshBtn');
  
  if (!currentRecommendation) {
    homeContent.innerHTML = `
      <div class="no-recommendation">
        <div class="no-recommendation-icon">🛒</div>
        <p><strong>No recommendation yet</strong></p>
        <p style="font-size: 12px; margin-top: 8px;">Visit a checkout page to see<br>your best card recommendation!</p>
      </div>
    `;
    refreshBtn.style.display = 'none';
    return;
  }
  
  const { merchant, category, bestCard, maxReward, hasAmount, amount } = currentRecommendation;
  
  // Format earnings display
  let earningsDisplay;
  if (hasAmount && amount !== null) {
    earningsDisplay = `$${maxReward.toFixed(2)}`;
  } else {
    earningsDisplay = '<span style="color: #666; font-style: italic; font-size: 12px;">Amount not found</span>';
  }
  
  homeContent.innerHTML = `
    <div class="recommendation-card">
      <div class="rec-header">
        <span>💡</span>
        <span>Best Card Recommendation</span>
      </div>
      <div class="rec-merchant">
        ${getCategoryEmoji(category)} <strong>${merchant.name}</strong> • ${category}
      </div>
      <div class="rec-best-card">
        <div class="rec-card-name">${bestCard.name}</div>
        <div style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">
          ${bestCard.rate}% cashback
        </div>
        <div class="rec-earnings">You'll earn: ${earningsDisplay}</div>
      </div>
    </div>
    <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 8px;">
      Recommendation updates on checkout pages
    </p>
  `;
  
  refreshBtn.style.display = 'block';
}

// Get emoji for category
function getCategoryEmoji(category) {
  const emojis = {
    dining: '🍽️',
    gas: '⛽',
    groceries: '🛒',
    travel: '✈️',
    online: '🌐'
  };
  return emojis[category] || '💰';
}

// Render cards list
function renderCards() {
  const cardsList = document.getElementById('cardsList');
  
  if (cards.length === 0) {
    cardsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎴</div>
        <p>No cards added yet.<br>Add your first card to get started!</p>
      </div>
    `;
    return;
  }

  cardsList.innerHTML = cards.map(card => `
    <div class="card-item" data-card-id="${card.id}">
      <div class="card-header">
        <div class="card-name">
          <span class="card-icon">💳</span>
          <span>${card.name}</span>
          ${card.lastFour ? `<span style="opacity: 0.5; font-size: 12px;">••${card.lastFour}</span>` : ''}
        </div>
        <div class="card-actions">
          <button class="btn-icon edit-card-btn" data-id="${card.id}">Edit</button>
          <button class="btn-icon delete-card-btn" data-id="${card.id}">Delete</button>
        </div>
      </div>
      <div class="card-rewards">
        ${formatRewards(card.rewards)}
      </div>
    </div>
  `).join('');
  
  // Add event listeners to edit/delete buttons
  document.querySelectorAll('.edit-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      editCard(btn.dataset.id);
    });
  });
  
  document.querySelectorAll('.delete-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCard(btn.dataset.id);
    });
  });
}

// Format rewards for display
function formatRewards(rewards) {
  const rewardItems = [];
  
  if (rewards.dining) rewardItems.push(`<div class="reward-item"><span class="reward-label">🍽️ Dining:</span><span class="reward-value">${rewards.dining}%</span></div>`);
  if (rewards.gas) rewardItems.push(`<div class="reward-item"><span class="reward-label">⛽ Gas:</span><span class="reward-value">${rewards.gas}%</span></div>`);
  if (rewards.groceries) rewardItems.push(`<div class="reward-item"><span class="reward-label">🛒 Groceries:</span><span class="reward-value">${rewards.groceries}%</span></div>`);
  if (rewards.travel) rewardItems.push(`<div class="reward-item"><span class="reward-label">✈️ Travel:</span><span class="reward-value">${rewards.travel}%</span></div>`);
  if (rewards.online) rewardItems.push(`<div class="reward-item"><span class="reward-label">🌐 Online:</span><span class="reward-value">${rewards.online}%</span></div>`);
  if (rewards.default) rewardItems.push(`<div class="reward-item"><span class="reward-label">💰 Default:</span><span class="reward-value">${rewards.default}%</span></div>`);
  
  return rewardItems.join('');
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('addCardBtn').addEventListener('click', openAddModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cardForm').addEventListener('submit', handleSubmit);
  document.getElementById('parseBtn').addEventListener('click', parseRewardsWithAI);
  document.getElementById('refreshBtn').addEventListener('click', refreshRecommendation);
  
  // Close modal on outside click
  document.getElementById('cardModal').addEventListener('click', (e) => {
    if (e.target.id === 'cardModal') closeModal();
  });
  
  // Listen for recommendation updates
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

// Refresh recommendation manually
async function refreshRecommendation() {
  const refreshBtn = document.getElementById('refreshBtn');
  
  refreshBtn.disabled = true;
  refreshBtn.style.animation = 'spin 1s linear infinite';
  
  try {
    // Query active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      alert('Could not access current tab');
      refreshBtn.style.animation = '';
      refreshBtn.disabled = false;
      return;
    }
    
    // Try to send message to content script
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'recalculate' });
      
      // Wait a bit for recalculation
      setTimeout(async () => {
        await loadCurrentRecommendation();
        await renderHome();
        
        refreshBtn.style.animation = '';
        refreshBtn.disabled = false;
      }, 800);
    } catch (messageError) {
      // Content script not loaded on this page - recalculate locally
      await recalculateRecommendation();
      
      refreshBtn.style.animation = '';
      refreshBtn.disabled = false;
    }
    
  } catch (error) {
    refreshBtn.style.animation = '';
    refreshBtn.disabled = false;
  }
}

// Recalculate recommendation locally (when cards change)
async function recalculateRecommendation() {
  if (!currentRecommendation) return;
  
  const { merchant, category, amount, hasAmount } = currentRecommendation;
  
  // Recalculate with current cards
  let bestCard = null;
  let maxReward = 0;
  
  // Don't use fallback amount - respect the original hasAmount flag
  const calculationAmount = hasAmount ? amount : null;
  
  for (const card of cards) {
    const rate = card.rewards[category] || card.rewards.default || 0;
    
    // Only calculate monetary reward if we have an amount
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
  
  if (bestCard) {
    // Update recommendation in storage
    await chrome.storage.local.set({
      currentRecommendation: {
        merchant,
        category,
        bestCard,
        maxReward,
        amount,
        hasAmount, // Preserve the original hasAmount flag
        timestamp: Date.now()
      }
    });
    
    currentRecommendation = await (await chrome.storage.local.get(['currentRecommendation'])).currentRecommendation;
    await renderHome();
  }
}

// Open add modal
function openAddModal() {
  editingCardId = null;
  document.getElementById('modalTitle').textContent = 'Add New Card';
  document.getElementById('cardForm').reset();
  document.getElementById('cardModal').classList.add('active');
}

// Edit card
function editCard(cardId) {
  const card = cards.find(c => c.id === cardId);
  if (!card) return;
  
  editingCardId = cardId;
  document.getElementById('modalTitle').textContent = 'Edit Card';
  
  document.getElementById('cardName').value = card.name;
  document.getElementById('lastFour').value = card.lastFour || '';
  document.getElementById('rewardDining').value = card.rewards.dining || '';
  document.getElementById('rewardGas').value = card.rewards.gas || '';
  document.getElementById('rewardGroceries').value = card.rewards.groceries || '';
  document.getElementById('rewardTravel').value = card.rewards.travel || '';
  document.getElementById('rewardOnline').value = card.rewards.online || '';
  document.getElementById('rewardDefault').value = card.rewards.default || '';
  
  document.getElementById('cardModal').classList.add('active');
}

// Delete card
async function deleteCard(cardId) {
  if (!confirm('Are you sure you want to delete this card?')) return;
  
  cards = cards.filter(c => c.id !== cardId);
  await saveCards();
  renderCards();
}

// Close modal
function closeModal() {
  document.getElementById('cardModal').classList.remove('active');
  document.getElementById('cardForm').reset();
  editingCardId = null;
}

// Handle form submit
async function handleSubmit(e) {
  e.preventDefault();
  
  const cardData = {
    id: editingCardId || generateId(),
    name: document.getElementById('cardName').value.trim(),
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
    // Update existing card
    const index = cards.findIndex(c => c.id === editingCardId);
    cards[index] = cardData;
  } else {
    // Add new card
    cards.push(cardData);
  }
  
  await saveCards();
  renderCards();
  closeModal();
  
  // Auto-refresh recommendation if we have one
  if (currentRecommendation) {
    await recalculateRecommendation();
  }
}

// Parse rewards with AI
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
    let aiAvailable = false;
    
    try {
      const availability = await LanguageModel.availability({ language: 'en' });
      
      if (availability === 'available' || availability === 'readily') {
        aiAvailable = true;
        
        const session = await LanguageModel.create({
          systemPrompt: 'You are a credit card rewards parser. Extract percentages and format them exactly as requested.'
        });
        
        const prompt = `Extract credit card rewards percentages. Reply ONLY in format: dining:X, gas:X, groceries:X, travel:X, online:X, default:X

Text: ${input}`;
        
        const response = await session.prompt(prompt);
        parsed = parseRewardsText(response);
        
        if (Object.keys(parsed).length > 0) {
          fillFormWithParsedData(parsed);
          alert('✅ Rewards parsed with AI! Please review and adjust if needed.');
          return;
        }
      }
    } catch (aiError) {
      // AI not available, fallback to regex
    }
    
    // Fallback: regex parsing
    const fallback = parseRewardsTextSimple(input);
    
    if (Object.keys(fallback).length > 0) {
      fillFormWithParsedData(fallback);
      let message = '✅ Rewards parsed! Please review and adjust if needed.';
      if (!aiAvailable) {
        message += '\n\nℹ️ AI not available. Using pattern matching.';
      }
      alert(message);
    } else {
      alert('⚠️ Could not parse rewards. Please enter manually.');
    }
    
  } catch (error) {
    alert('⚠️ Error parsing rewards. Please enter manually.');
  } finally {
    parseBtn.textContent = 'Parse with AI';
    parseBtn.disabled = false;
  }
}

// Helper function to fill form
function fillFormWithParsedData(parsed) {
  if (parsed.dining) document.getElementById('rewardDining').value = parsed.dining;
  if (parsed.gas) document.getElementById('rewardGas').value = parsed.gas;
  if (parsed.groceries) document.getElementById('rewardGroceries').value = parsed.groceries;
  if (parsed.travel) document.getElementById('rewardTravel').value = parsed.travel;
  if (parsed.online) document.getElementById('rewardOnline').value = parsed.online;
  if (parsed.default) document.getElementById('rewardDefault').value = parsed.default;
}

// Parse rewards text from AI response
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

// Simple fallback parsing without AI
function parseRewardsTextSimple(text) {
  const rewards = {};
  
  const patterns = [
    { 
      category: 'dining', 
      regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:dining|restaurants?|food|takeout|delivery)/i 
    },
    { 
      category: 'gas', 
      regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:gas|fuel|gas stations?)/i 
    },
    { 
      category: 'groceries', 
      regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:groceries|grocery|supermarkets?)/i 
    },
    { 
      category: 'travel', 
      regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:travel|airfare|hotels?|car rentals?|cruises?|flights?)/i 
    },
    { 
      category: 'online', 
      regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:online|internet|e-commerce)/i 
    },
    { 
      category: 'default', 
      regex: /(\d+\.?\d*)\s*%?\s*(?:back\s*)?(?:on|at|for)?\s*(?:everything else|all other|all purchases|everywhere|all)/i 
    }
  ];
  
  for (const { category, regex } of patterns) {
    const match = text.match(regex);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value >= 0) {
        if (!rewards[category] || value > rewards[category]) {
          rewards[category] = value;
        }
      }
    }
  }
  
  return rewards;
}

// Generate unique ID
function generateId() {
  return 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}