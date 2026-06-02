const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ADMIN_OPENIDS = (process.env.ADMIN_OPENIDS || '').split(',').map(s => s.trim()).filter(Boolean)

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID || !ADMIN_OPENIDS.includes(OPENID)) {
    return { code: 403, msg: '无权限' }
  }

  try {
    const caseRes = await db.collection('reviews').where({ type: 'case' }).remove()
    const alertRes = await db.collection('reviews').where({ type: 'alert' }).remove()
    const hotelRes = await db.collection('hotels')
      .where({ hasCase: true })
      .update({
        data: { hasCase: false, caseCount: 0 }
      })

    return {
      code: 0,
      msg: `重置完成 — 删除案件 ${caseRes.stats?.removed || 0} 条，删除警示 ${alertRes.stats?.removed || 0} 条，重置酒店 ${hotelRes.stats?.updated || 0} 家`
    }
  } catch (err) {
    console.error('reset-cases error:', err)
    return { code: 500, msg: '重置失败，请重试' }
  }
}
