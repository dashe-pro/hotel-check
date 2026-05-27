const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  try {
    const [hotelsRes, reviewsRes, casesRes, citiesRes] = await Promise.all([
      db.collection('hotels').count(),
      db.collection('reviews').where({ status: 'approved', type: 'user' }).count(),
      db.collection('reviews').where({ type: 'case', status: 'approved' }).count(),
      db.collection('hotels').field({ city: true }).limit(1000).get()
    ])
    const citySet = new Set()
    ;(citiesRes.data || []).forEach(h => { if (h.city) citySet.add(h.city.trim()) })
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
