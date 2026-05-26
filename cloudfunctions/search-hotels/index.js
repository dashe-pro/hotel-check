const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { keyword } = event
  if (!keyword || !keyword.trim()) {
    return { code: 1, msg: '关键词不能为空' }
  }

  try {
    const kw = keyword.trim()

    const localResult = await db.collection('hotels')
      .where(db.command.or([
        { name: db.RegExp({ regexp: kw, options: 'i' }) },
        { address: db.RegExp({ regexp: kw, options: 'i' }) }
      ]))
      .limit(20)
      .get()

    if (!localResult.data || localResult.data.length === 0) {
      const amapHotels = await searchAmap(kw)
      if (amapHotels.length > 0) {
        const inserts = amapHotels.map(h => ({
          name: h.name,
          address: h.address || '',
          hasCase: false,
          caseCount: 0,
          reviewCount: 0,
          createdAt: new Date()
        }))

        for (const h of inserts) {
          await db.collection('hotels').add({ data: h })
        }

        const freshResult = await db.collection('hotels')
          .where(db.command.or([
            { name: db.RegExp({ regexp: kw, options: 'i' }) },
            { address: db.RegExp({ regexp: kw, options: 'i' }) }
          ]))
          .limit(20)
          .get()

        return { code: 0, data: freshResult.data }
      }
    }

    return { code: 0, data: localResult.data || [] }
  } catch (err) {
    console.error('search-hotels error:', err)
    return { code: 500, msg: '搜索失败', error: err.message }
  }
}

async function searchAmap(keyword) {
  const AMAP_KEY = 'YOUR-AMAP-KEY'
  const https = require('https')

  return new Promise((resolve) => {
    const url = `https://restapi.amap.com/v5/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&types=100000&city_limit=false&page_size=10`
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.status === '1' && json.pois) {
            resolve(json.pois.map(p => ({
              name: p.name,
              address: `${p.pname || ''}${p.cityname || ''}${p.adname || ''}${p.address || ''}`
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
