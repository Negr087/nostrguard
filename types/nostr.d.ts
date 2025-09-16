declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>
      signEvent(event: any): Promise<any>
      getRelays?(): Promise<{ [url: string]: { read: boolean, write: boolean } }>
      nip04?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>
        decrypt(pubkey: string, ciphertext: string): Promise<string>
      }
      nip44?: {
        encrypt(pubkey: string, plaintext: string): Promise<string>
        decrypt(pubkey: string, ciphertext: string): Promise<string>
      }
    }
    NostrLogin?: {
      init: (config: any) => any  // Cambiar void por any (retorna instancia)
      launch: () => Promise<void>
      logout?: () => void         // Agregar método logout
    }
    // Agregar esta interfaz para el estado de nostr-login
    nostrLogin?: {
      pubkey: string
      profile?: {
        name?: string
        picture?: string
        about?: string
        display_name?: string
        nip05?: string
      }
      authMethod: string
    }
  }
}
export {}