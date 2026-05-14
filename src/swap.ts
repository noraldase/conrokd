import { ethers } from 'ethers'
import { CONFIG } from './config'
import { ROUTER_ABI } from './routerAbi'

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL)

export async function buyToken(
  privateKey: string,
  tokenAddress: string,
  ethAmount: string
) {
  const wallet = new ethers.Wallet(privateKey, provider)

  const router = new ethers.Contract(
    CONFIG.ROUTER_ADDRESS,
    ROUTER_ABI,
    wallet
  )

  const deadline = Math.floor(Date.now() / 1000) + 60 * 5

  const path = [
    CONFIG.WETH_ADDRESS,
    tokenAddress
  ]

  const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
    0,
    path,
    wallet.address,
    deadline,
    {
      value: ethers.parseEther(ethAmount)
    }
  )

  return tx.hash
}
