const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { keyword, city } = event
  if (!keyword || !keyword.trim()) {
    return { code: 1, msg: '关键词不能为空' }
  }

  try {
    const kw = keyword.trim()

    const conditions = [
      { name: db.RegExp({ regexp: kw, options: 'i' }) },
      { address: db.RegExp({ regexp: kw, options: 'i' }) }
    ]
    const where = db.command.or(conditions)

    let localQuery = db.collection('hotels').where(where)
    if (city) {
      localQuery = db.collection('hotels').where(
        db.command.and([
          where,
          { city: db.RegExp({ regexp: city, options: 'i' }) }
        ])
      )
    }

    const localResult = await localQuery.limit(20).get()

    if (!localResult.data || localResult.data.length === 0) {
      const amapHotels = await searchAmap(kw, city)
      if (amapHotels.length > 0) {
        const inserts = amapHotels.map(h => ({
          name: h.name,
          city: h.city,
          address: h.address || '',
          rating: h.rating,
          photos: h.photos,
          tel: h.tel,
          hasCase: false,
          caseCount: 0,
          reviewCount: 0,
          createdAt: new Date()
        }))

        for (const h of inserts) {
          const exists = await db.collection('hotels')
            .where({ name: h.name, city: h.city })
            .count()
          if (exists.total === 0) {
            await db.collection('hotels').add({ data: h })
          }
        }

        let freshQuery = db.collection('hotels').where(where)
        if (city) {
          freshQuery = db.collection('hotels').where(
            db.command.and([
              where,
              { city: db.RegExp({ regexp: city, options: 'i' }) }
            ])
          )
        }
        const freshResult = await freshQuery.limit(20).get()

        return { code: 0, data: freshResult.data }
      }
    }

    return { code: 0, data: localResult.data || [] }
  } catch (err) {
    console.error('search-hotels error:', err)
    return { code: 500, msg: '搜索失败', error: err.message }
  }
}

async function searchAmap(keyword, city) {
  const AMAP_KEY = process.env.AMAP_KEY || 'a91a5e948233b056f9981f5401cf3875'
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
