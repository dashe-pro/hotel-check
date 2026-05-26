// 前端敏感词过滤（基础版）
// 实际使用时可扩展为云端敏感词库

const blockedPatterns = [
  /(微信|qq|手机号|电话|联系方式)\s*[:：]\s*\d+/gi,
  /http[s]?:\/\/[^\s]+/gi,
  /[一-龥]*[骂操傻逼滚蛋][一-龥]*/gi
]

export function filterSensitive(text) {
  let filtered = text
  let hasSensitive = false

  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      hasSensitive = true
      filtered = filtered.replace(pattern, '***')
    }
  }

  return { filtered, hasSensitive }
}

// 纯色情/暴恐/政治类需依赖微信 API
export function preValidate(text) {
  if (!text || text.trim().length < 10) {
    return { valid: false, msg: '内容至少10个字' }
  }
  if (text.length > 500) {
    return { valid: false, msg: '内容不能超过500字' }
  }

  const { hasSensitive } = filterSensitive(text)
  if (hasSensitive) {
    return { valid: false, msg: '内容包含不被允许的信息，请修改后提交' }
  }

  return { valid: true }
}
