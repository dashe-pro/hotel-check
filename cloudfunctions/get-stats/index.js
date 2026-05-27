const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const [hotelsRes, reviewsRes, casesRes] = await Promise.all([
    db.collection('hotels').count(),
    db.collection('reviews').where({ status: 'approved', type: 'user' }).count(),
    db.collection('reviews').where({ type: 'case', status: 'approved' }).count()
  ])

  // 城市列表：独立 try-catch，不影响统计数据返回
  let cities = []
  try {
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
    cities = Array.from(citySet).sort()
  } catch (err) {
    console.error('get-stats cities error:', err.message)
    // cities 为空数组，前端使用默认列表兜底
  }

  return {
    code: 0,
    data: {
      hotelCount: hotelsRes.total,
      reviewCount: reviewsRes.total,
      caseCount: casesRes.total,
      cities
    }
  }
}
