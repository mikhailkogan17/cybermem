
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "CyberMem",
  description: "Universal Long-Term Memory for AI Agents",
  lang: 'en-US',
  base: '/docs/',
  outDir: '../dashboard/public/docs',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Back to Dashboard', link: 'http://localhost:3000', target: '_self' },
    ],

    sidebar: [
      {
        text: 'Documentation',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Deployment', link: '/deployment' },
          { text: 'MCP Integration', link: '/mcp-integration' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/mikhailkogan17/cybermem' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Mikhail Kogan'
    },

    docFooter: {
      prev: 'Previous Page',
      next: 'Next Page'
    }
  },

  head: [
   ['link', { rel: 'icon', href: '/favicon.ico' }]
  ]
})
