const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async () => {
  // 1. 批量删除所有案件记录
  console.log('Clearing case reviews...')
  const caseRes = await db.collection('reviews').where({ type: 'case' }).remove()
  console.log(`  Deleted ${caseRes.stats?.removed || 0} cases`)

  // 2. 批量删除所有行业警示记录
  console.log('Clearing alert reviews...')
  const alertRes = await db.collection('reviews').where({ type: 'alert' }).remove()
  console.log(`  Deleted ${alertRes.stats?.removed || 0} alerts`)

  // 3. 批量重置所有酒店的 hasCase 和 caseCount
  console.log('Resetting hotel flags...')
  const hotelRes = await db.collection('hotels')
    .where({ hasCase: true })
    .update({
      data: { hasCase: false, caseCount: 0 }
    })
  console.log(`  Reset ${hotelRes.stats?.updated || 0} hotels`)

  return {
    code: 0,
    msg: `重置完成 — 删除案件 ${caseRes.stats?.removed || 0} 条，删除警示 ${alertRes.stats?.removed || 0} 条，重置酒店 ${hotelRes.stats?.updated || 0} 家`
  }
}
