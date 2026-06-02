const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { keyword, city } = event

  const hotWords = ['如家', '7天', '汉庭', '全季', '维也纳', '希尔顿', '万豪', '亚朵', '锦江之星', '速8', '格林豪泰', '民宿']

  if (!keyword || !keyword.trim()) {
    return { code: 0, data: { suggestions: [], hotWords } }
  }

  const kw = keyword.trim()
  try {
    const conditions = { name: db.RegExp({ regexp: kw, options: 'i' }) }
    if (city) {
      conditions.city = db.RegExp({ regexp: city, options: 'i' })
    }
    const res = await db.collection('hotels')
      .where(conditions)
      .field({ name: true, city: true })
      .limit(10)
      .get()
    return { code: 0, data: { suggestions: (res.data || []).map(h => ({ name: h.name, city: h.city })), hotWords: [] } }
  } catch (err) {
    console.error('search-suggest error:', err)
    return { code: 500, msg: '查询失败，请重试' }
  }
}
