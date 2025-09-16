import type React from "react"
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import Script from 'next/script'
import { NOSTR_CONFIG } from "@/lib/nostr"

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "NostrGuard",
  description: "Protect yourself from scammers on Nostr with curated block lists",
  generator: 'v0.app',
  icons: {
  icon: '/favicon.png',
  shortcut: '/favicon.png',
},
  other: {
    'nostr:nip-05': 'negr0@hodl.ar',
    'nostr:pubkey': 'npub1yrffsyxk5hujkpz6mcpwhwkujqmdwswvdp4sqs2ug26zxmly45hsfpn8p0',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black',
  },
  manifest: '/manifest.json',
}

// Script loading verification
if (typeof window !== 'undefined') {
  // Check script loading after a delay
  setTimeout(() => {
    console.log('🔍 Script Loading Verification:')
    console.log('   - window.nostr (native):', !!(window as any).nostr)
    console.log('   - window.NostrLogin (login):', !!window.NostrLogin)
    console.log('   - window.nostrLogin (data):', !!window.nostrLogin)

    // Check if scripts are in DOM
    const scripts = document.querySelectorAll('script[src*="unpkg"]')
    console.log('   - Scripts found in DOM:', scripts.length)
    scripts.forEach((script, i) => {
      const src = script.getAttribute('src')
      console.log(`     ${i + 1}. ${src}`)
      // Check if script is loaded by checking if it has content or if it's in head
      const isInHead = script.parentElement?.tagName === 'HEAD'
      console.log(`        In head: ${isInHead}`)
    })

    // Test network connectivity
    fetch('https://unpkg.com/nostr-login@1.7.11/dist/unpkg.js', { method: 'HEAD' })
      .then(response => console.log('   - unpkg connectivity:', response.ok ? '✅ OK' : '❌ Failed'))
      .catch(error => console.log('   - unpkg connectivity:', '❌ Error:', error.message))
  }, 2000)
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.className} dark`}>
  <head>
    <meta name="nostr:nip-05" content="negr0@hodl.ar" />
    <meta name="nostr:pubkey" content="npub1yrffsyxk5hujkpz6mcpwhwkujqmdwswvdp4sqs2ug26zxmly45hsfpn8p0" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black" />
    <style dangerouslySetInnerHTML={{
  __html: `
    /* Estilos críticos de nostr-login inline */
    [style*="position: fixed"][style*="inset: 0"][style*="z-index"] {
      background-color: rgba(0, 0, 0, 0.5) !important;
    }
    [style*="position: fixed"] > div[style*="background"],
    [style*="position: fixed"] [style*="background: white"],
    [style*="position: fixed"] [style*="background: rgb(255, 255, 255)"] {
      background: white !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 8px !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1) !important;
    }
    [style*="position: fixed"] * {
      opacity: 1 !important;
    }
  `
}} />
  </head>
  <body className="antialiased">
    {/* Load Nostr dependencies from unpkg for consistency */}
    <Script
      src={NOSTR_CONFIG.cdn.tools}
      strategy="beforeInteractive"
    />
    <Script
      src="https://unpkg.com/nostr-login@1.7.11/dist/unpkg.js"
      strategy="beforeInteractive"
    />
    <script
      dangerouslySetInnerHTML={{
        __html: `
          // Check immediately
          console.log('Initial check - window.NostrLogin:', !!(window as any).NostrLogin);

          // Check after 1 second
          setTimeout(() => {
            console.log('1s check - window.NostrLogin:', !!(window as any).NostrLogin);
            console.log('1s check - window.nostrLogin:', !!(window as any).nostrLogin);
            const nostrKeys = Object.keys(window).filter(k => k.toLowerCase().includes('nostr') || k.toLowerCase().includes('login'));
            console.log('All window keys with nostr/login:', nostrKeys);
            nostrKeys.forEach(key => {
              console.log(\`  \${key}:\`, (window as any)[key]);
            });
          }, 1000);

          // Check after 3 seconds
          setTimeout(() => {
            console.log('3s check - window.NostrLogin:', !!(window as any).NostrLogin);
            console.log('3s check - window.nostrLogin:', !!(window as any).nostrLogin);
          }, 3000);
        `
      }}
    />
    {children}
    <Toaster />
  </body>
</html>
  )
}