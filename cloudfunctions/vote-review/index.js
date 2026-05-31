const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { reviewId, voteType } = event
  const { OPENID } = cloud.getWXContext()

  if (!reviewId || !['up', 'down'].includes(voteType)) {
    return { code: 2, msg: '参数错误' }
  }

  // 去重标识：优先用 OpenID，匿名用户用 clientIP 兜底
  const voterId = OPENID || context.CLIENTIP || 'anonymous'

  try {
    const review = await db.collection('reviews').doc(reviewId).get()
    if (!review.data) return { code: 3, msg: '评论不存在' }

    const voters = review.data.voters || []
    const currentUp = review.data.upvotes || 0
    const currentDown = review.data.downvotes || 0

    // 兼容旧数据（openid 字段）和新数据（voterId 字段）
    const existing = voters.find(v =>
      (v.voterId && v.voterId === voterId) ||
      (v.openid && v.openid === voterId)
    )

    if (existing) {
      if (existing.voteType === voteType) {
        return { code: 4, msg: '已投票，不可重复操作' }
      }
      // 统一迁移到 voterId 格式
      await db.collection('reviews').doc(reviewId).update({
        data: {
          voters: voters.map(v => {
            const isSame = (v.voterId && v.voterId === voterId) ||
                           (v.openid && v.openid === voterId)
            return isSame ? { voterId, voteType } : (v.voterId ? v : { voterId: v.openid || voterId, voteType: v.voteType })
          }),
          upvotes: voteType === 'up' ? currentUp + 1 : currentUp - 1,
          downvotes: voteType === 'down' ? currentDown + 1 : currentDown - 1
        }
      })
    } else {
      await db.collection('reviews').doc(reviewId).update({
        data: {
          voters: db.command.push({ voterId, voteType }),
          upvotes: voteType === 'up' ? currentUp + 1 : currentUp,
          downvotes: voteType === 'down' ? currentDown + 1 : currentDown
        }
      })
    }

    return { code: 0, msg: '投票成功' }
  } catch (err) {
    return { code: 500, msg: '操作失败', error: err.message }
  }
}
