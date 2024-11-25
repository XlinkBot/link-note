import crypto from 'crypto'

export const calculateMD5 = async (content: string): Promise<string> => {
  const hash = crypto.createHash('md5')
  hash.update(content)
  return hash.digest('hex')
} 