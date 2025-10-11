# 💳 MaxKard - Smart Credit Card Assistant

MaxKard helps you maximize credit card rewards by automatically recommending the best card to use based on merchant category and your card's rewards structure.

**Built for the Google Chrome Built-in AI Challenge 2025** using Gemini Nano and Chrome's AI APIs.

---

## 🎯 Features

- **Smart Card Management**: Add credit cards with custom rewards structures
- **AI-Powered Parsing**: Optional AI parsing of card rewards terms (requires Chrome AI Early Preview Program)
- **Automatic Detection**: Detects checkout pages and calculates best card
- **Clean Interface**: Two-tab design - Home for recommendations, My Cards for management
- **Privacy-First**: All data stored locally on your device
- **Badge Notifications**: Extension icon shows 💳 when recommendation is available

---

## 🚀 Quick Start

### Prerequisites

- Chrome Canary or Chrome Dev (version 128+)
- (Optional) Chrome Built-in AI Early Preview Program access for AI parsing

### Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked"
5. Select the `maxkard-extension` folder
6. Extension is ready! Click the icon to get started

---

## 📁 Project Structure

```
maxkard-extension/
├── manifest.json              # Extension configuration
├── background/
│   └── service-worker.js     # Background service worker
├── content/
│   └── checkout-widget.js    # Checkout page detection
├── popup/
│   ├── popup.html            # Extension popup UI
│   └── popup.js              # Popup logic
├── styles/
│   └── widget.css            # (Empty - kept for compatibility)
├── icons/                    # Extension icons
└── README.md
```

---

## 🎮 How to Use

### 1. Add Your Cards

- Click MaxKard extension icon
- Go to "My Cards" tab
- Click "➕ Add New Card"
- Enter card details and rewards
- **Tip**: Sample cards are pre-loaded for testing!

### 2. Shop Online

- Visit any supported checkout page (Amazon, Walmart, Target, Instacart, etc.)
- MaxKard automatically detects the merchant
- Extension icon shows 💳 badge

### 3. See Recommendation

- Click MaxKard icon
- Home tab shows:
  - Best card to use
  - Merchant and category
  - Cashback amount you'll earn

### 4. Use Your Card!

- Use the recommended card at checkout
- Maximize your rewards! 💰

---

## 🌐 Supported Sites

- Amazon
- Walmart
- Target
- Best Buy
- Instacart
- Any Shopify store
- More sites added automatically via AI classification

---

## 🤖 AI Features

MaxKard can use Chrome's built-in AI APIs (requires Early Preview Program access):

- **Prompt API**: Classifies merchants into categories
- **Language Model API**: Parses credit card rewards from text

**Without AI access**: Extension works perfectly using pattern matching fallback.

---

## 🔧 Configuration

### Card Rewards Structure

Supported categories:
- **Dining**: Restaurants, takeout, delivery
- **Gas**: Gas stations, fuel
- **Groceries**: Supermarkets, grocery stores
- **Travel**: Flights, hotels, car rentals
- **Online**: E-commerce, online shopping
- **Default**: Everything else

### Storage

All data stored in `chrome.storage.local`:

```javascript
{
  cards: [
    {
      id: "card_123",
      name: "Chase Sapphire Preferred",
      lastFour: "1234",
      rewards: {
        dining: 3,
        travel: 2,
        groceries: 0,
        gas: 0,
        online: 0,
        default: 1
      }
    }
  ],
  currentRecommendation: {
    merchant: { name: "Instacart", category: "groceries" },
    bestCard: { ... },
    maxReward: 4.50,
    timestamp: 1234567890
  }
}
```

---

## 🐛 Troubleshooting

### No recommendation showing?
- Make sure you've added at least one card
- Check you're on a checkout/cart page
- Look for 💳 badge on extension icon

### AI parsing not working?
- Sign up for Chrome Built-in AI Early Preview Program
- Enable flags at `chrome://flags`
- Fallback regex parsing still works!

### Cards not saving?
- Check extension has storage permission
- Try reloading the extension
- Check console for errors (F12)

---

## 📊 Technical Details

### Performance
- Lightweight: < 200KB total
- No external API calls
- On-device AI processing (when available)
- Minimal page impact

### Privacy
- All data stored locally
- No telemetry or tracking
- No data sent to servers
- Open source and auditable

### Browser Compatibility
- Chrome 128+ (Canary/Dev)
- Desktop only (V1)

---

## 🏆 Google Chrome Built-in AI Challenge 2025

### Problem Solved
Americans leave **$15+ billion** in credit card rewards unclaimed annually. MaxKard eliminates "analysis paralysis" by automatically recommending the optimal card at checkout.

### Innovation
- First real-time credit card optimizer using on-device AI
- Privacy-preserving (no data leaves device)
- Works offline with Chrome's built-in AI
- Scalable to any merchant/card combination

### Prize Categories
- **Most Helpful - Chrome Extension** ($14,000)
- **Best Hybrid AI Application** ($9,000) - Future phases

---

## 📝 License

MIT License - Free to use, modify, and distribute!

---

## 🙏 Credits

Built for the Chrome Built-in AI Challenge 2025

**Tech Stack:**
- Chrome Extension Manifest V3
- Chrome Built-in AI APIs
- Vanilla JavaScript
- Local Storage

---

## 🚀 Roadmap (Future Versions)

### V2
- Transaction history learning
- Receipt image upload (multimodal)
- Analytics dashboard
- Spending insights

### V3
- Mobile PWA companion
- Location-based recommendations
- Community rewards database
- Hybrid cloud features

---

## 📧 Support

For issues or questions:
- Check the troubleshooting section
- Review console logs (F12)
- Submit feedback via hackathon form

---

**Happy card optimizing! 💳✨**