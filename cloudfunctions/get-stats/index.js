const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const [hotelsRes, reviewsRes, casesRes, recentRes] = await Promise.all([
    db.collection('hotels').count(),
    db.collection('reviews').where({ status: 'approved', type: 'user' }).count(),
    db.collection('reviews').where({ type: 'case', status: 'approved' }).count(),
    db.collection('reviews')
      .where({ status: 'approved', type: 'user' })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
  ])

  // 解析酒店名称
  const recentReviews = (recentRes.data || []).map(r => ({
    _id: r._id,
    hotelId: r.hotelId,
    hotelName: r.hotelName || '',
    content: r.content,
    createdAt: r.createdAt,
    type: r.type,
    discoveryDate: r.discoveryDate,
    source: r.source,
    images: r.images
  }))

  // 补全酒店名：没存 hotelName 的通过 hotelId 查
  const missingIds = [...new Set(
    recentReviews.filter(r => !r.hotelName && r.hotelId).map(r => r.hotelId)
  )]
  if (missingIds.length > 0) {
    try {
      const hotelRes = await db.collection('hotels')
        .where({ _id: db.command.in(missingIds.slice(0, 20)) })
        .field({ name: true })
        .get()
      const nameMap = {}
      ;(hotelRes.data || []).forEach(h => { nameMap[h._id] = h.name })
      recentReviews.forEach(r => {
        if (!r.hotelName && r.hotelId && nameMap[r.hotelId]) {
          r.hotelName = nameMap[r.hotelId]
        }
      })
    } catch {}
  }

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
  }

  return {
    code: 0,
    data: {
      hotelCount: hotelsRes.total,
      reviewCount: reviewsRes.total,
      caseCount: casesRes.total,
      recentReviews,
      cities
    }
  }
}
