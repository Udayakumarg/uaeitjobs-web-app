/**
 * Gmail IMAP reader — fetches the most recent LinkedIn verification code.
 *
 * Uses an App Password (not your main password). Create one at:
 *   https://myaccount.google.com/apppasswords
 *
 * Env vars required:
 *   GMAIL_USER          — e.g. shaalucbe@gmail.com
 *   GMAIL_APP_PASSWORD  — 16-char app password
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ImapFlow } = require('imapflow')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { simpleParser } = require('mailparser')

const GMAIL_USER         = process.env.GMAIL_USER         ?? ''
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? ''

/**
 * Polls Gmail for a LinkedIn verification email and returns the 6-digit code.
 * Retries every 5 s for up to `timeoutMs` ms (default 90 s).
 */
export async function fetchLinkedInVerificationCode(timeoutMs = 90_000): Promise<string> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD env vars are required')
  }

  const deadline = Date.now() + timeoutMs
  let attempts = 0

  while (Date.now() < deadline) {
    attempts++
    console.log(`  [gmail] Polling for LinkedIn verification code (attempt ${attempts})…`)
    const code = await tryFetchCode()
    if (code) {
      console.log(`  [gmail] ✓ Code found: ${code}`)
      return code
    }
    await new Promise(r => setTimeout(r, 5_000))
  }

  throw new Error('LinkedIn verification code not received within the timeout period')
}

async function tryFetchCode(): Promise<string | null> {
  const client = new ImapFlow({
    host:   'imap.gmail.com',
    port:   993,
    secure: true,
    auth:   { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    logger: false,
  })

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      // Look at emails received in the last 10 minutes
      const since = new Date(Date.now() - 10 * 60 * 1000)

      const uids = await client.search({ from: 'security@linkedin.com', since })
      if (!uids || uids.length === 0) return null

      // Newest first — check last 3 in case of retries
      const toCheck = uids.slice(-3).reverse()

      for (const uid of toCheck) {
        const msg = await client.fetchOne(String(uid), { source: true })
        if (!msg?.source) continue

        const parsed = await simpleParser(msg.source)
        const body   = (parsed.text ?? '') + (parsed.html ?? '')

        // LinkedIn sends codes like "Your verification code is 123456" or just the digits
        const match = body.match(/\b([0-9]{6})\b/)
        if (match) return match[1]
      }
    } finally {
      lock.release()
    }

    await client.logout()
    return null
  } catch {
    await client.logout().catch(() => {})
    return null
  }
}
