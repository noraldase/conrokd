import CryptoJS from 'crypto-js'
import { CONFIG } from './config'

export function encrypt(text: string) {
  return CryptoJS.AES.encrypt(text, CONFIG.MASTER_KEY).toString()
}

export function decrypt(text: string) {
  return CryptoJS.AES.decrypt(text, CONFIG.MASTER_KEY)
    .toString(CryptoJS.enc.Utf8)
}
