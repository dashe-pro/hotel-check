const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function safeCount(collection, where) {
  try {
    const res = await db.collection(collection).where(where).count()
    return res.total
  } catch (err) {
    console.error(`count ${collection} failed:`, err.message)
    return -1
  }
}

async function safeGet(collection, where, limit) {
  try {
    const res = await db.collection(collection).where(where).limit(limit).get()
    return res.data || []
  } catch (err) {
    console.error(`get ${collection} failed:`, err.message)
    return []
  }
}

exports.main = async () => {
  const [
    hotelCount,
    reviewCount,
    caseCount,
    recentData,
    hotelsMeta
  ] = await Promise.all([
    safeCount('hotels', {}),
    safeCount('reviews', { status: 'approved', type: 'user' }),
    safeCount('reviews', { type: 'case', status: 'approved' }),
    db.collection('reviews')
      .where({ status: 'approved', type: 'user' })
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get()
      .then(res => res.data || [])
      .catch(err => { console.error('recent reviews failed:', err.message); return [] }),
    db.collection('hotels')
      .field({ name: true, city: true })
      .limit(1000)
      .get()
      .then(res => res.data || [])
      .catch(err => { console.error('hotels meta failed:', err.message); return [] })
  ])

  const hotelNameMap = {}
  const citySet = new Set()
  ;(hotelsMeta || []).forEach(h => {
    if (h.name) hotelNameMap[h._id] = h.name
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
      hotelCount: hotelCount >= 0 ? hotelCount : 0,
      reviewCount: reviewCount >= 0 ? reviewCount : 0,
      caseCount: caseCount >= 0 ? caseCount : 0,
      recentReviews,
      cities: Array.from(citySet).sort()
    }
  }
}
