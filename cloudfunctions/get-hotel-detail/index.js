const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { hotelId } = event
  if (!hotelId) {
    return { code: 1, msg: '酒店ID不能为空' }
  }

  try {
    const hotelRes = await db.collection('hotels').doc(hotelId).get()
    const hotel = hotelRes.data

    if (!hotel) {
      return { code: 2, msg: '酒店不存在' }
    }

    // 行业警示：全局通用，置顶最前
    const alertsRes = await db.collection('reviews')
      .where({
        type: 'alert',
        status: 'approved'
      })
      .orderBy('discoveryDate', 'desc')
      .limit(10)
      .get()

    // 案件置顶：按发现日期倒序
    const casesRes = await db.collection('reviews')
      .where({
        hotelId,
        type: 'case',
        status: 'approved'
      })
      .orderBy('discoveryDate', 'desc')
      .limit(20)
      .get()

    // 用户评论在后：按创建时间倒序
    const reviewsRes = await db.collection('reviews')
      .where({
        hotelId,
        type: db.command.neq('case'),
        status: 'approved'
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const userReviews = (reviewsRes.data || []).sort((a, b) => {
      return (b.upvotes || 0) - (a.upvotes || 0)
    })

    return {
      code: 0,
      data: {
        hotel,
        reviews: [
          ...(alertsRes.data || []),
          ...(casesRes.data || []),
          ...userReviews
        ]
      }
    }
  } catch (err) {
    console.error('get-hotel-detail error:', err)
    return { code: 500, msg: '获取详情失败', error: err.message }
  }
}
