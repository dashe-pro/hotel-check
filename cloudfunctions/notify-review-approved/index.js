const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const TMPL_ID = 'QCXWPP2a79qUfchm7Rfg0c3E4HY_Vi1hhLE3X1R3bKk'

exports.main = async (event) => {
  const { reviewId } = event
  if (!reviewId) return { code: 1, msg: '缺少reviewId' }

  try {
    const review = await db.collection('reviews').doc(reviewId).get()
    if (!review.data) return { code: 2, msg: '评论不存在' }
    if (review.data.status !== 'approved') return { code: 3, msg: '评论尚未通过审核' }
    if (!review.data.subscribeAuth) return { code: 0, msg: '用户未订阅通知' }
    if (review.data.notified) return { code: 0, msg: '已通知过' }

    await cloud.openapi.subscribeMessage.send({
      touser: review.data._openid,
      page: `/pages/hotel-detail/index?id=${review.data.hotelId}`,
      data: {
        thing1: { value: (review.data.hotelName || '酒店').slice(0, 20) },
        phrase2: { value: '已通过审核' },
        thing3: { value: review.data.content.slice(0, 50) + (review.data.content.length > 50 ? '...' : '') }
      },
      templateId: TMPL_ID,
      miniprogramState: 'formal'
    })

    await db.collection('reviews').doc(reviewId).update({
      data: { notified: true }
    })

    return { code: 0, msg: '通知已发送' }
  } catch (err) {
    console.error('notify-review-approved error:', err)
    return { code: 500, msg: '通知发送失败，请重试' }
  }
}
