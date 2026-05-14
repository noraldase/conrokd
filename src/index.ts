import { Telegraf, Markup } from 'telegraf'
import { ethers } from 'ethers'

import { CONFIG } from './config'
import { db, initDatabase } from './database'
import { encrypt, decrypt } from './encryption'
import { buyToken } from './swap'

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL)

const bot = new Telegraf(CONFIG.BOT_TOKEN)

initDatabase()

const importMode = new Map<number, boolean>()

function getWallets(userId: number) {
  return db.prepare(
    `SELECT * FROM wallets WHERE telegram_id = ?`
  ).all(String(userId))
}

function getActiveWallet(userId: number): any {
  const user: any = db.prepare(
    `SELECT * FROM users WHERE telegram_id = ?`
  ).get(String(userId))

  if (!user) return null

  if (!user.active_wallet) return null

  return db.prepare(
    `SELECT * FROM wallets WHERE id = ?`
  ).get(user.active_wallet)
}

async function sendDashboard(ctx: any) {
  const activeWallet = getActiveWallet(ctx.from.id)

  let text = `🚀 HYPE EVM BOT\n\n`

  if (activeWallet) {
    const balance = await provider.getBalance(activeWallet.address)

    text += `👛 Active Wallet\n`
    text += `${activeWallet.address}\n\n`

    text += `💰 Balance\n`
    text += `${ethers.formatEther(balance)} HYPE\n\n`
  } else {
    text += `No active wallet\n\n`
  }

  await ctx.reply(
    text,
    Markup.inlineKeyboard([
      [Markup.button.callback('➕ Create Wallet', 'CREATE_WALLET')],
      [Markup.button.callback('📥 Import Wallet', 'IMPORT_WALLET')],
      [Markup.button.callback('👛 Wallets', 'WALLETS')],
      [Markup.button.callback('📤 Export Wallet', 'EXPORT_WALLET')]
    ])
  )
}

bot.start(async (ctx) => {
  const telegramId = String(ctx.from.id)

  const exists = db.prepare(
    `SELECT * FROM users WHERE telegram_id = ?`
  ).get(telegramId)

  if (!exists) {
    db.prepare(
      `INSERT INTO users (telegram_id) VALUES (?)`
    ).run(telegramId)
  }

  await sendDashboard(ctx)
})

bot.action('CREATE_WALLET', async (ctx) => {
  const wallet = ethers.Wallet.createRandom()

  const encrypted = encrypt(wallet.privateKey)

  const result: any = db.prepare(`
    INSERT INTO wallets (
      telegram_id,
      address,
      encrypted_private_key
    ) VALUES (?, ?, ?)
  `).run(
    String(ctx.from.id),
    wallet.address,
    encrypted
  )

  db.prepare(
    `UPDATE users SET active_wallet = ? WHERE telegram_id = ?`
  ).run(result.lastInsertRowid, String(ctx.from.id))

  await ctx.reply(
    `✅ Wallet Created\n\nAddress:\n${wallet.address}\n\nPrivate Key:\n${wallet.privateKey}`
  )
})

bot.action('IMPORT_WALLET', async (ctx) => {
  importMode.set(ctx.from.id, true)

  await ctx.reply(
    '📥 Send your private key.'
  )
})

bot.on('text', async (ctx) => {
  if (!importMode.get(ctx.from.id)) return

  try {
    const privateKey = ctx.message.text.trim()

    const wallet = new ethers.Wallet(privateKey)

    const encrypted = encrypt(privateKey)

    const result: any = db.prepare(`
      INSERT INTO wallets (
        telegram_id,
        address,
        encrypted_private_key
      ) VALUES (?, ?, ?)
    `).run(
      String(ctx.from.id),
      wallet.address,
      encrypted
    )

    db.prepare(
      `UPDATE users SET active_wallet = ? WHERE telegram_id = ?`
    ).run(result.lastInsertRowid, String(ctx.from.id))

    importMode.delete(ctx.from.id)

    await ctx.reply(
      `✅ Wallet Imported\n\n${wallet.address}`
    )

  } catch {
    await ctx.reply('❌ Invalid private key.')
  }
})

bot.action('WALLETS', async (ctx) => {
  const wallets: any[] = getWallets(ctx.from.id)

  if (!wallets.length) {
    return ctx.reply('No wallets.')
  }

  const buttons = wallets.map((wallet) => {
    return [
      Markup.button.callback(
        `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
        `SET_${wallet.id}`
      )
    ]
  })

  await ctx.reply(
    '👛 Select active wallet',
    Markup.inlineKeyboard(buttons)
  )
})

bot.action(/SET_(\d+)/, async (ctx: any) => {
  const walletId = Number(ctx.match[1])

  db.prepare(
    `UPDATE users SET active_wallet = ? WHERE telegram_id = ?`
  ).run(walletId, String(ctx.from.id))

  await ctx.reply('✅ Active wallet updated.')
})

bot.action('EXPORT_WALLET', async (ctx) => {
  const wallet = getActiveWallet(ctx.from.id)

  if (!wallet) {
    return ctx.reply('❌ No active wallet.')
  }

  const pk = decrypt(wallet.encrypted_private_key)

  await ctx.reply(
    `⚠️ PRIVATE KEY\n\n${pk}`
  )
})

bot.command('buy', async (ctx) => {
  try {
    const args = ctx.message.text.split(' ')

    if (args.length < 3) {
      return ctx.reply(
        '/buy TOKEN_ADDRESS AMOUNT'
      )
    }

    const tokenAddress = args[1]
    const amount = args[2]

    const activeWallet = getActiveWallet(ctx.from.id)

    if (!activeWallet) {
      return ctx.reply('❌ No active wallet.')
    }

    const privateKey = decrypt(
      activeWallet.encrypted_private_key
    )

    await ctx.reply('🚀 Sending transaction...')

    const hash = await buyToken(
      privateKey,
      tokenAddress,
      amount
    )

    await ctx.reply(
      `✅ BUY SUCCESS\n\nTX:\n${hash}`
    )

  } catch (e: any) {
    await ctx.reply(
      `❌ ERROR\n${e.message}`
    )
  }
})

bot.command('balance', async (ctx) => {
  const wallet = getActiveWallet(ctx.from.id)

  if (!wallet) {
    return ctx.reply('❌ No active wallet.')
  }

  const balance = await provider.getBalance(wallet.address)

  await ctx.reply(
    `💰 Balance\n\n${ethers.formatEther(balance)} HYPE`
  )
})

bot.launch()

console.log('🚀 BOT RUNNING')
