const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const [hotelsRes, reviewsRes, casesRes, recentRes, citiesRes] = await Promise.all([
    db.collection('hotels').count(),
    db.collection('reviews').where({ status: 'approved', type: 'user' }).count(),
    db.collection('reviews').where({ type: 'case', status: 'approved' }).count(),
    db.collection('reviews')
      .where({ status: 'approved', type: 'user' })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
    db.collection('hotels').field({ city: true }).limit(1000).get()
  ])

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

  // 城市去重排序
  let cities = []
  try {
    const citySet = new Set()
    ;(citiesRes.data || []).forEach(h => { if (h.city && h.city.trim()) citySet.add(h.city.trim()) })
    cities = Array.from(citySet).sort()
  } catch {}

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
