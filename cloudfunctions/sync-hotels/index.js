const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const AMAP_KEY = process.env.AMAP_KEY
if (!AMAP_KEY) {
  throw new Error('sync-hotels: AMAP_KEY environment variable is not set')
}

const CITIES = [
  // 一线 / 新一线
  '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆',
  '武汉', '西安', '南京', '长沙', '郑州', '天津', '苏州',
  // 省会城市
  '合肥', '福州', '贵阳', '哈尔滨', '海口', '呼和浩特',
  '济南', '拉萨', '兰州', '南昌', '南宁', '宁波',
  '沈阳', '石家庄', '太原', '乌鲁木齐', '银川',
  '长春', '昆明', '西宁',
  // 热门旅游城市
  '厦门', '青岛', '大连', '三亚', '丽江', '大理',
  '桂林', '张家界', '黄山', '秦皇岛', '威海', '北海',
  '西双版纳', '烟台', '洛阳',
  // 二三线重要城市
  '东莞', '佛山', '无锡', '温州', '珠海', '中山',
  '惠州', '常州', '嘉兴', '绍兴', '金华', '台州',
  '泉州', '漳州', '莆田', '汕头', '湛江', '江门',
  '肇庆', '茂名', '梅州', '清远', '揭阳',
  '唐山', '保定', '邯郸', '廊坊', '沧州',
  '徐州', '南通', '盐城', '泰州', '镇江', '淮安',
  '临沂', '淄博', '潍坊', '济宁', '泰安',
  '洛阳', '南阳', '许昌', '周口', '新乡',
  '襄阳', '宜昌', '荆州', '黄冈',
  '岳阳', '衡阳', '株洲', '常德',
  '绵阳', '宜宾', '南充', '泸州',
  '九江', '赣州', '上饶', '宜春',
  '遵义', '毕节', '六盘水',
  '咸阳', '宝鸡', '榆林',
  '柳州', '玉林', '桂林'
]

// 多关键词搜索，覆盖更多住宿类型
const KEYWORD_CONFIGS = [
  { kw: '酒店', pages: 12 },
  { kw: '宾馆', pages: 5 },
  { kw: '民宿', pages: 3 }
]
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
  for (const cfg of KEYWORD_CONFIGS) {
    for (let page = 1; page <= cfg.pages; page++) {
      requests.push(fetchPage(city, page, cfg.kw))
    }
  }
  return Promise.all(requests).then(results => results.flat())
}

function fetchPage(city, page, keyword) {
  return new Promise((resolve) => {
    const url = `https://restapi.amap.com/v5/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&types=100100&region=${encodeURIComponent(city)}&city_limit=true&page_size=25&page=${page}`
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
