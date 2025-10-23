// service-worker.js - Background Service Worker

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First time installation - load with sample cards
    const sampleCards = [
      {
        id: 'card_sample_1',
        name: 'Chase Freedom Unlimited',
        lastFour: '1234',
        rewards: {
          dining: 3,
          gas: 0,
          groceries: 0,
          travel: 5,
          online: 0,
          default: 1.5
        }
      },
      {
        id: 'card_sample_2',
        name: 'Blue Cash Everyday',
        lastFour: '5678',
        rewards: {
          dining: 0,
          gas: 3,
          groceries: 3,
          travel: 0,
          online: 3,
          default: 1
        }
      },
      {
        id: 'card_sample_3',
        name: 'Citi Double Cash',
        lastFour: '9012',
        rewards: {
          dining: 2,
          gas: 2,
          groceries: 2,
          travel: 2,
          online: 2,
          default: 2
        }
      }
    ];
    
    chrome.storage.local.set({
      cards: sampleCards,
      settings: {
        enabled: true,
        autoDetect: true
      }
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    // Update badge on icon
    if (sender.tab && sender.tab.id) {
      chrome.action.setBadgeText({ text: '💳', tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId: sender.tab.id });
    }
    
    sendResponse({ success: true });
  }
  
  return true;
});