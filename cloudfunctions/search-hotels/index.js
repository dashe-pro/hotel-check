const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const PAGE_SIZE = 20

exports.main = async (event) => {
  const { keyword, city, skip = 0 } = event
  if (!keyword || !keyword.trim()) {
    return { code: 1, msg: '关键词不能为空' }
  }

  try {
    const kw = keyword.trim()
    console.log('search-hotels keyword:', kw, 'city:', city || '无', 'skip:', skip)

    // 构造模糊匹配条件
    const conditions = [
      { name: db.RegExp({ regexp: kw, options: 'i' }) },
      { address: db.RegExp({ regexp: kw, options: 'i' }) }
    ]
    const where = db.command.or(conditions)

    let query = db.collection('hotels').where(where)
    if (city) {
      query = db.collection('hotels').where(
        db.command.and([where, { city: db.RegExp({ regexp: city, options: 'i' }) }])
      )
    }

    // 多取一条用于判断是否还有下一页
    const result = await query.skip(skip).limit(PAGE_SIZE + 1).get()
    const data = result.data || []
    const hasMore = data.length > PAGE_SIZE

    console.log('search-hotels results:', Math.min(data.length, PAGE_SIZE), 'hasMore:', hasMore)

    // 第一页本地无结果 → 高德兜底
    if (skip === 0 && data.length === 0) {
      console.log('search-hotels: 本地无结果，尝试高德搜索')
      const amapHotels = await searchAmap(kw, city)
      console.log('search-hotels: 高德返回', amapHotels.length, '条')

      if (amapHotels.length > 0) {
        // 写入新酒店（name+city 去重）
        const seenKeys = new Set()
        for (const h of amapHotels) {
          const key = `${h.name}||${h.city}`
          if (seenKeys.has(key)) continue
          seenKeys.add(key)

          const exists = await db.collection('hotels')
            .where({ name: h.name, city: h.city })
            .count()
          if (exists.total === 0) {
            await db.collection('hotels').add({
              data: {
                name: h.name, city: h.city, address: h.address || '',
                rating: h.rating, photos: h.photos, tel: h.tel,
                hasCase: false, caseCount: 0, reviewCount: 0,
                createdAt: new Date()
              }
            })
          }
        }

        // 重新查询
        const freshResult = await query.limit(PAGE_SIZE + 1).get()
        const freshData = freshResult.data || []
        return {
          code: 0,
          data: freshData.slice(0, PAGE_SIZE),
          hasMore: freshData.length > PAGE_SIZE
        }
      }
    }

    return {
      code: 0,
      data: data.slice(0, PAGE_SIZE),
      hasMore
    }
  } catch (err) {
    console.error('search-hotels error:', err)
    return { code: 500, msg: '搜索失败，请重试' }
  }
}

async function searchAmap(keyword, city) {
  const AMAP_KEY = process.env.AMAP_KEY
  if (!AMAP_KEY) {
    console.error('search-hotels: AMAP_KEY environment variable is not set')
    return []
  }
  const https = require('https')

  return new Promise((resolve) => {
    let region = ''
    if (city) {
      region = `&region=${encodeURIComponent(city)}&city_limit=true`
    }
    const url = `https://restapi.amap.com/v5/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&types=100000&page_size=10${region}`
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.status === '1' && json.pois) {
            resolve(json.pois.map(p => ({
              name: p.name,
              city: p.cityname || '',
              address: `${p.pname || ''}${p.cityname || ''}${p.adname || ''}${p.address || ''}`,
              rating: (p.biz_ext && p.biz_ext.rating) || '',
              photos: (p.photos && Array.isArray(p.photos))
                ? p.photos.slice(0, 5).map(ph => (typeof ph === 'string' ? ph : ph.url))
                : [],
              tel: p.tel || ''
            })))
          } else {
            resolve([])
          }
        } catch (_) {
          resolve([])
        }
      })
    }).on('error', () => resolve([]))
  })
}
