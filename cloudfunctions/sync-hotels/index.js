const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const AMAP_KEY = process.env.AMAP_KEY
if (!AMAP_KEY) {
  throw new Error('sync-hotels: AMAP_KEY environment variable is not set')
}

const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆',
  '武汉', '西安', '南京', '长沙', '郑州', '天津', '苏州',
  '厦门', '青岛', '大连', '昆明', '三亚', '丽江', '大理',
  '东莞', '佛山', '合肥', '福州', '贵阳', '哈尔滨', '海口',
  '呼和浩特', '济南', '拉萨', '兰州', '南昌', '南宁', '宁波',
  '沈阳', '石家庄', '太原', '乌鲁木齐', '无锡', '温州', '银川',
  '长春', '珠海', '桂林', '烟台', '扬州', '洛阳', '九江',
  '黄山', '张家界', '秦皇岛', '威海', '北海', '西双版纳'
]

const PAGES = 8
const BATCH_SIZE = 100 // db.command.in 上限

exports.main = async () => {
  let totalAdded = 0

  for (const city of CITIES) {
    try {
      const hotels = await fetchHotelsFromAmap(city)
      if (hotels.length === 0) continue

      // 1. 同一批次内按 name+city 去重
      const seen = new Set()
      const uniqueHotels = hotels.filter(h => {
        const key = `${h.name}||${h.city}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      // 2. 分批查询已存在的酒店（db.command.in 上限 100）
      const existingKeys = new Set()
      for (let i = 0; i < uniqueHotels.length; i += BATCH_SIZE) {
        const batch = uniqueHotels.slice(i, i + BATCH_SIZE)
        const batchNames = batch.map(h => h.name)
        const existing = await db.collection('hotels')
          .where({ name: db.command.in(batchNames) })
          .field({ name: true, city: true })
          .limit(BATCH_SIZE)
          .get()
        ;(existing.data || []).forEach(h => existingKeys.add(`${h.name}||${h.city}`))
      }

      // 3. 插入不存在的酒店，同时更新 existingKeys 防止同批重复
      for (const h of uniqueHotels) {
        const key = `${h.name}||${h.city}`
        if (existingKeys.has(key)) continue

        await db.collection('hotels').add({
          data: {
            name: h.name,
            city: h.city,
            address: h.address,
            rating: h.rating,
            photos: h.photos,
            tel: h.tel,
            location: h.location,
            hasCase: false,
            caseCount: 0,
            reviewCount: 0,
            createdAt: new Date()
          }
        })
        existingKeys.add(key)
        totalAdded++
      }
    } catch (err) {
      console.error(`Sync ${city} failed:`, err.message)
    }
  }

  return { code: 0, msg: `同步完成，新增 ${totalAdded} 家酒店` }
}

function fetchHotelsFromAmap(city) {
  const requests = []
  for (let page = 1; page <= PAGES; page++) {
    requests.push(fetchPage(city, page))
  }
  return Promise.all(requests).then(results => results.flat())
}

function fetchPage(city, page) {
  return new Promise((resolve) => {
    const url = `https://restapi.amap.com/v5/place/text?key=${AMAP_KEY}&keywords=酒店&types=100100&region=${encodeURIComponent(city)}&city_limit=true&page_size=25&page=${page}`
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.status === '1' && json.pois && json.pois.length > 0) {
            resolve(json.pois.map(p => ({
              name: p.name,
              city: p.cityname || '',
              address: `${p.pname || ''}${p.cityname || ''}${p.adname || ''}${p.address || ''}`,
              rating: (p.biz_ext && p.biz_ext.rating) || '',
              photos: (p.photos && Array.isArray(p.photos))
                ? p.photos.slice(0, 5).map(ph => (typeof ph === 'string' ? ph : ph.url))
                : [],
              tel: p.tel || '',
              location: (p.location && typeof p.location === 'string') ? p.location : null
            })))
          } else {
            resolve([])
          }
        } catch (e) {
          console.error(`${city} page ${page} JSON parse error:`, e.message)
          resolve([])
        }
      })
    }).on('error', (e) => {
      console.error(`${city} page ${page} https error:`, e.message)
      resolve([])
    })
  })
}
