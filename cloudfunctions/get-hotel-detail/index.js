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

    const reviewsRes = await db.collection('reviews')
      .where({
        hotelId,
        status: 'approved'
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    return {
      code: 0,
      data: {
        hotel,
        reviews: reviewsRes.data || []
      }
    }
  } catch (err) {
    console.error('get-hotel-detail error:', err)
    return { code: 500, msg: '获取详情失败', error: err.message }
  }
}
