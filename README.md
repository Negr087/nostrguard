# NostrGuard 🛡️

<img width="1590" height="922" alt="Screenshot_19" src="https://github.com/user-attachments/assets/327560ac-4cc2-4dd7-96b8-398d7c3998ad" />

Protect your Nostr experience from scammers

NostrGuard is a browser extension designed to enhance your security and privacy while using Nostr social networks. It provides curated lists of suspicious accounts, mass blocking capabilities, and complete privacy protection to keep your feed clean and secure.
## ✨ Features
### 🎯 Curated Packs
Access community-maintained lists of suspicious accounts and known scammers. Stay protected with regularly updated blocklists from trusted sources.
### ⚡ Mass Blocking
Block dozens of accounts simultaneously with a single click. No more manually blocking scammers one by one - save time and protect yourself efficiently.
### 🔒 Total Privacy
Your private key never leaves your extension. Full control over your data with complete privacy protection.
## 🚀 Getting Started
### Installation

1 Chrome/Edge/Brave:

- Download the latest release from Releases
- Unzip the file
- Open Chrome and go to chrome://extensions/
- Enable "Developer mode"
- Click "Load unpacked" and select the unzipped folder


2 Firefox:

- Download the .xpi file from Releases
- Open Firefox and go to about:addons
- Click the gear icon and select "Install Add-on From File"
- Select the downloaded .xpi file



### Setup

1- Click the NostrGuard icon in your browser toolbar
2- Click the "Nostr login button" in the top right to connect
3- The login bubble will appear automatically
4- Start protecting your Nostr experience!

## 📱 How It Works
NostrGuard integrates seamlessly with your Nostr client to provide:

- Real-time protection: Automatically identifies and flags suspicious accounts
- Community-driven security: Leverages collective intelligence to maintain updated threat lists
- Privacy-first approach: All operations happen locally on your device
- Cross-platform compatibility: Works with all major Nostr clients

## 🛠️ Development
Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Setup Development Environment
Clone the repository
git clone https://github.com/Negr087/nostrguard.git
cd nostrguard

Install dependencies
npm install

Start development server
npm run dev

Build for production
npm run build

## Project Structure
nostrguard/
├── src/
│   ├── background/      Background scripts
│   ├── content/         Content scripts
│   ├── popup/           Extension popup UI
│   ├── options/         Settings page
│   └── utils/           Utility functions
├── assets/              Images and icons
├── manifest.json        Extension manifest
└── README.md
