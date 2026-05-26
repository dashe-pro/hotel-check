const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { hotelId, hotelName, reason, contact } = event
  const { OPENID } = cloud.getWXContext()

  if (!hotelId || !reason || !reason.trim()) {
    return { code: 400, msg: '请填写申诉原因' }
  }
  if (reason.trim().length < 10) {
    return { code: 400, msg: '申诉原因至少10个字' }
  }

  try {
    await db.collection('appeals').add({
      data: {
        _openid: OPENID,
        hotelId,
        hotelName: hotelName || '',
        reason: reason.trim(),
        contact: contact || '',
        status: 'pending',
        createdAt: new Date()
      }
    })
    return { code: 0, msg: '申诉已提交，我们会尽快核实处理' }
  } catch (err) {
    return { code: 500, msg: '提交失败', error: err.message }
  }
}
