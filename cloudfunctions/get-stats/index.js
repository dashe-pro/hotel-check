const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  try {
    const [hotelsRes, reviewsRes, casesRes, recentRes, hotelsMetaRes] = await Promise.all([
      db.collection('hotels').count(),
      db.collection('reviews').where({ status: 'approved', type: 'user' }).count(),
      db.collection('reviews').where({ type: 'case', status: 'approved' }).count(),
      // 不传 orderBy，避免全表扫描+排序导致的超时
      // 取 200 条后在内存中按 createdAt 降序排列，取前 20 条
      db.collection('reviews')
        .where({ status: 'approved', type: 'user' })
        .limit(200)
        .get(),
      db.collection('hotels').field({ name: true, city: true }).limit(2000).get()
    ])

    // 构建酒店名称映射 + 城市去重
    const hotelNameMap = {}
    const citySet = new Set()
    ;(hotelsMetaRes.data || []).forEach(h => {
      if (h.name) hotelNameMap[h._id] = h.name
      if (h.city && h.city.trim()) citySet.add(h.city.trim())
    })

    // 内存排序：按 createdAt 降序，取前 20
    const sorted = (recentRes.data || [])
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 20)

    const recentReviews = sorted.map(r => ({
      _id: r._id,
      hotelId: r.hotelId,
      hotelName: r.hotelName || hotelNameMap[r.hotelId] || '',
      content: r.content,
      createdAt: r.createdAt,
      type: r.type,
      discoveryDate: r.discoveryDate,
      source: r.source,
      images: r.images
    }))

    return {
      code: 0,
      data: {
        hotelCount: hotelsRes.total,
        reviewCount: reviewsRes.total,
        caseCount: casesRes.total,
        recentReviews,
        cities: Array.from(citySet).sort()
      }
    }
  } catch (err) {
    console.error('get-stats error:', err)
    return { code: 500, msg: err.message || 'server error' }
  }
}
