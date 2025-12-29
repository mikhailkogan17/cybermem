import crypto from 'crypto'

export interface ClientMetadata {
  id: string
  name: string
  color: string
  logo?: string
  lastSeen: number
}

const CLIENT_PATTERNS: Record<string, { name: string, color: string }> = {
  // Major AI Lab Clients
  'claude-desktop': { name: 'Claude Desktop', color: '#B96747' }, // Darker Terra Cotta
  'claude-code': { name: 'Claude Code', color: '#D97757' }, // Standard Terra Cotta
  'claude': { name: 'Claude', color: '#D97757' },
  'anthropic': { name: 'Claude', color: '#D97757' },
  'gpt': { name: 'ChatGPT', color: '#10A37F' },
  'openai': { name: 'OpenAI', color: '#10A37F' },
  'gemini': { name: 'Google Gemini', color: '#4285F4' },
  'google': { name: 'Google', color: '#4285F4' },
  'perplexity': { name: 'Perplexity', color: '#22B3C5' },

  // Editors & IDEs
  'cursor': { name: 'Cursor', color: '#111111' }, // Dark
  'windsurf': { name: 'Windsurf', color: '#00FFFF' }, // Cyan
  'copilot': { name: 'GitHub Copilot', color: '#E6EDF3' },
  'vscode': { name: 'VS Code', color: '#007ACC' },
  'jetbrains': { name: 'JetBrains', color: '#000000' },
  'intellij': { name: 'JetBrains', color: '#000000' },
  'pycharm': { name: 'JetBrains', color: '#000000' },
  'webstorm': { name: 'JetBrains', color: '#000000' },
  'antigravity': { name: 'Antigravity', color: '#EC4899' },

  // Specialized Coding AIs
  'codex': { name: 'Codex', color: '#5C2D91' },
  'julia': { name: 'Julia (Gemini)', color: '#8E44AD' },
  'warp': { name: 'Warp', color: '#03A9F4' },
  'codeium': { name: 'Codeium', color: '#16A085' },
  'tabnine': { name: 'Tabnine', color: '#2C3E50' },
  'supermaven': { name: 'Supermaven', color: '#F39C12' },
  'continue': { name: 'Continue', color: '#C0392B' },
  'aider': { name: 'Aider', color: '#27AE60' },
  'openinterpreter': { name: 'Open Interpreter', color: '#D35400' },
  'crewai': { name: 'CrewAI', color: '#E74C3C' },

  // Generic
  'test': { name: 'Test Client', color: '#94A3B8' },
}

// In-memory cache for discovered clients
const MEMORY_CACHE: Record<string, ClientMetadata> = {}

function generateFallbackColor(str: string): string {
  const hash = crypto.createHash('md5').update(str).digest('hex')
  const num = parseInt(hash.slice(0, 4), 16)

  // 50% chance of Emerald, 50% chance of Gray/Slate
  if (num % 2 === 0) {
    // Emerald shades (Hue ~150-160)
    // Tailwind Emerald-500 is #10B981
    const shades = ['#10B981', '#34D399', '#059669', '#047857', '#6EE7B7']
    return shades[num % shades.length]
  } else {
    // Gray/Slate shades
    // Tailwind Slate-500 is #64748B
    const shades = ['#64748B', '#94A3B8', '#475569', '#334155', '#CBD5E1']
    return shades[num % shades.length]
  }
}

export function getClientMetadata(id: string): ClientMetadata {
  // Normalize ID
  const safeId = id || 'unknown'
  const lowerId = safeId.toLowerCase().trim()

  // 1. Check Memory Cache first
  if (MEMORY_CACHE[lowerId]) {
    return MEMORY_CACHE[lowerId]
  }

  // 2. Manual Map Matching (Substring)
  const match = Object.keys(CLIENT_PATTERNS).find(pattern => lowerId.includes(pattern))

  if (match) {
      const known = CLIENT_PATTERNS[match]
      const meta: ClientMetadata = {
          id: safeId,
          name: known.name,
          color: known.color,
          lastSeen: Date.now()
      }
      MEMORY_CACHE[lowerId] = meta
      return meta
  }

  // 3. Fallback / Discovery
  const newClient: ClientMetadata = {
    id: safeId,
    name: safeId, // Default to ID
    color: generateFallbackColor(safeId),
    lastSeen: Date.now()
  }

  MEMORY_CACHE[lowerId] = newClient
  return newClient
}

export function getAllClients(): Record<string, ClientMetadata> {
  // Return what we have in memory
  return { ...MEMORY_CACHE }
}
