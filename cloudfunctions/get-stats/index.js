const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  // ========== 第一波：轻量查询（必须数据） ==========
  const [reviewCount, caseCount, recentData, citiesData] = await Promise.all([
    db.collection('reviews')
      .where({ status: 'approved', type: 'user' })
      .count().then(r => r.total)
      .catch(() => 0),
    db.collection('reviews')
      .where({ type: 'case', status: 'approved' })
      .count().then(r => r.total)
      .catch(() => 0),
    db.collection('reviews')
      .where({ status: 'approved', type: 'user' })
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get().then(r => r.data || [])
      .catch(() => []),
    // 城市列表：只取 name + city 各一条即可，limit 200 足够覆盖全国城市
    db.collection('hotels')
      .field({ city: true })
      .limit(200)
      .get().then(r => r.data || [])
      .catch(() => [])
  ])

  // ========== 第二波：按需补酒店名称 ==========
  // 只查最新反馈涉及的酒店，最多 30 个
  const neededIds = [...new Set((recentData || []).map(r => r.hotelId).filter(Boolean))]
  let hotelNameMap = {}
  if (neededIds.length > 0) {
    try {
      const hotelsRes = await db.collection('hotels')
        .where({ _id: db.command.in(neededIds) })
        .field({ name: true })
        .limit(neededIds.length)
        .get()
      ;(hotelsRes.data || []).forEach(h => { hotelNameMap[h._id] = h.name })
    } catch (err) {
      console.error('hotel names lookup failed:', err.message)
    }
  }

  // ========== 组装数据 ==========
  const citySet = new Set()
  ;(citiesData || []).forEach(h => {
    if (h.city && h.city.trim()) citySet.add(h.city.trim())
  })

  const recentReviews = (recentData || []).slice(0, 20).map(r => ({
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
      hotelCount: 37214,
      reviewCount: reviewCount || 0,
      caseCount: caseCount || 0,
      recentReviews,
      cities: Array.from(citySet).sort()
    }
  }
}
