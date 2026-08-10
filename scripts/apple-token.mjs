#!/usr/bin/env node
// Generate an Apple Music developer token (ES256 JWT) from your MusicKit key.
// Run this locally — the .p8 private key never leaves your machine. Paste the
// printed token into .env.local as VITE_APPLE_DEV_TOKEN.
//
// Usage: node scripts/apple-token.mjs <AuthKey_XXXXXX.p8> <TEAM_ID> <KEY_ID> [validity-days]
import { readFileSync } from 'node:fs'
import { createPrivateKey, sign } from 'node:crypto'

const [, , keyPath, teamId, keyId, days = '180'] = process.argv
if (!keyPath || !teamId || !keyId) {
  console.error(
    'Usage: node scripts/apple-token.mjs <AuthKey.p8> <TEAM_ID> <KEY_ID> [validity-days, max 180]',
  )
  process.exit(1)
}

const b64url = (data) => Buffer.from(data).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const validity = Math.min(Number(days) || 180, 180)

const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
const payload = b64url(JSON.stringify({ iss: teamId, iat: now, exp: now + validity * 86400 }))
const signingInput = `${header}.${payload}`

const key = createPrivateKey(readFileSync(keyPath))
const signature = sign('sha256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' })

console.log(`${signingInput}.${b64url(signature)}`)
console.error(`\nToken valid ${validity} days. Add to .env.local:\nVITE_APPLE_DEV_TOKEN=<token above>`)
