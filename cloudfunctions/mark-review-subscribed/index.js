const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { reviewId } = event
  const { OPENID } = cloud.getWXContext()
  if (!reviewId || !OPENID) return { code: 1, msg: '参数错误' }
  try {
    await db.collection('reviews').doc(reviewId).update({
      data: { subscribeAuth: true }
    })
    return { code: 0 }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}
