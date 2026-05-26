const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { reviewId, voteType } = event
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: 1, msg: '请先登录' }
  if (!reviewId || !['up', 'down'].includes(voteType)) return { code: 2, msg: '参数错误' }

  try {
    const review = await db.collection('reviews').doc(reviewId).get()
    if (!review.data) return { code: 3, msg: '评论不存在' }

    const voters = review.data.voters || []
    const currentUp = review.data.upvotes || 0
    const currentDown = review.data.downvotes || 0
    const existing = voters.find(v => v.openid === OPENID)

    if (existing) {
      if (existing.voteType === voteType) {
        return { code: 4, msg: '已投票，不可重复操作' }
      }
      await db.collection('reviews').doc(reviewId).update({
        data: {
          voters: voters.map(v => v.openid === OPENID ? { openid: OPENID, voteType } : v),
          upvotes: voteType === 'up' ? currentUp + 1 : currentUp - 1,
          downvotes: voteType === 'down' ? currentDown + 1 : currentDown - 1
        }
      })
    } else {
      await db.collection('reviews').doc(reviewId).update({
        data: {
          voters: db.command.push({ openid: OPENID, voteType }),
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
