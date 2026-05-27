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

    // 分页拉取全部酒店的城市字段，避免 limit 截断
    const citySet = new Set()
    let skip = 0
    const pageSize = 1000
    while (true) {
      const res = await db.collection('hotels')
        .field({ city: true })
        .skip(skip)
        .limit(pageSize)
        .get()
      if (!res.data || res.data.length === 0) break
      res.data.forEach(h => { if (h.city && h.city.trim()) citySet.add(h.city.trim()) })
      if (res.data.length < pageSize) break
      skip += pageSize
    }
    const cities = Array.from(citySet).sort()

    return {
      code: 0,
      data: {
        hotelCount: hotelsRes.total,
        reviewCount: reviewsRes.total,
        caseCount: casesRes.total,
        cities
      }
    }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}
