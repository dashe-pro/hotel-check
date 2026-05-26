const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const AMAP_KEY = 'YOUR-AMAP-KEY'

const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆',
  '武汉', '西安', '南京', '长沙', '郑州', '天津', '苏州',
  '厦门', '青岛', '大连', '昆明', '三亚', '丽江', '大理'
]

exports.main = async () => {
  let totalAdded = 0

  for (const city of CITIES) {
    try {
      const hotels = await fetchHotelsFromAmap(city)
      for (const h of hotels) {
        const exist = await db.collection('hotels')
          .where({ name: h.name, address: h.address })
          .count()

        if (exist.total === 0) {
          await db.collection('hotels').add({
            data: {
              name: h.name,
              address: h.address,
              hasCase: false,
              caseCount: 0,
              reviewCount: 0,
              createdAt: new Date()
            }
          })
          totalAdded++
        }
      }
    } catch (err) {
      console.error(`Sync ${city} failed:`, err.message)
    }
  }

  return { code: 0, msg: `同步完成，新增 ${totalAdded} 家酒店` }
}

function fetchHotelsFromAmap(city) {
  return new Promise((resolve) => {
    const url = `https://restapi.amap.com/v5/place/text?key=${AMAP_KEY}&keywords=酒店&types=100000&region=${encodeURIComponent(city)}&city_limit=true&page_size=25`
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
