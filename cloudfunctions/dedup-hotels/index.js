const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 清理重复酒店：按 name+city 去重
 * 只扫描 name/city 字段，速度快
 */
exports.main = async () => {
  const seen = new Map()
  const toRemove = []
  let scanned = 0
  const BATCH = 100

  // 扫描全表，只取 name + city
  let skip = 0
  while (true) {
    const res = await db.collection('hotels')
      .field({ name: true, city: true })
      .skip(skip)
      .limit(BATCH)
      .get()

    if (!res.data || res.data.length === 0) break

    for (const h of res.data) {
      const key = (h.name || '') + '||' + (h.city || '')
      if (seen.has(key)) {
        toRemove.push(h._id)
      } else {
        seen.set(key, h._id)
      }
    }

    scanned += res.data.length
    skip += BATCH

    if (res.data.length < BATCH) break
  }

  console.log(`scanned ${scanned}, duplicates: ${toRemove.length}`)

  // 分批删除（每批 50 条）
  let removed = 0
  const DELETE_BATCH = 50
  for (let i = 0; i < toRemove.length; i += DELETE_BATCH) {
    const batch = toRemove.slice(i, i + DELETE_BATCH)
    try {
      const delRes = await db.collection('hotels')
        .where({ _id: db.command.in(batch) })
        .remove()
      removed += (delRes.stats && delRes.stats.removed) || batch.length
    } catch (err) {
      // 降级为逐条删除
      for (const id of batch) {
        try { await db.collection('hotels').doc(id).remove(); removed++ } catch {}
      }
    }
    if (i % 500 === 0) console.log(`removed ${removed}/${toRemove.length}`)
  }

  return {
    code: 0,
    msg: `扫描 ${scanned} 条，删除 ${removed} 条，剩余 ${scanned - removed} 条`
  }
}
