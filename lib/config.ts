export const NOSTR_CONFIG = {
  mobileWallets: {
    android: {
      amber: 'amber://login',
      amethyst: 'amethyst://login',
      default: 'nostr+login://nostrguard.com'
    },
    ios: {
      damus: 'damus://login',
      amber: 'amber://login',
      default: 'nostr+login://nostrguard.com'
    },
    fallback: 'https://nsec.app/nostr-login'
  },
  relays: [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.nostr.band",
    "wss://nostr.mom"
  ]
}