import 'dotenv/config'

export const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN!,
  RPC_URL: process.env.RPC_URL!,
  MASTER_KEY: process.env.MASTER_KEY!,
  ROUTER_ADDRESS: process.env.ROUTER_ADDRESS!,
  WETH_ADDRESS: process.env.WETH_ADDRESS!,
  CHAIN_ID: Number(process.env.CHAIN_ID)
}
