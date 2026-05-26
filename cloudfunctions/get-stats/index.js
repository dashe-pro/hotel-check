const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  try {
    const [hotelsRes, reviewsRes, casesRes] = await Promise.all([
      db.collection('hotels').count(),
      db.collection('reviews').where({ status: 'approved', type: 'user' }).count(),
      db.collection('reviews').where({ type: 'case', status: 'approved' }).count()
    ])
    return {
      code: 0,
      data: {
        hotelCount: hotelsRes.total,
        reviewCount: reviewsRes.total,
        caseCount: casesRes.total
      }
    }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}
