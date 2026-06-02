const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 用户身份管理
 * - syncProfile: 保存昵称/头像到 users 集合
 * - getProfile: 从 users 集合拉取昵称/头像
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  console.log('login OPENID:', OPENID)
  if (!OPENID) {
    return { code: 1, msg: '未能获取用户身份' }
  }

  const { action } = event || {}

  // ========== 获取 OpenID ==========
  if (action === 'getOpenid') {
    return { code: 0, openid: OPENID }
  }

  // ========== 保存用户信息 ==========
  if (action === 'syncProfile') {
    const { nickName, avatarUrl } = event
    const usersCol = db.collection('users')

    try {
      const exist = await usersCol.where({ _openid: OPENID }).get()

      if (exist.data.length > 0) {
        await usersCol.doc(exist.data[0]._id).update({
          data: {
            nickName: nickName || '',
            avatarUrl: avatarUrl || '',
            updatedAt: Date.now()
          }
        })
      } else {
        await usersCol.add({
          data: {
            _openid: OPENID,
            nickName: nickName || '',
            avatarUrl: avatarUrl || '',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        })
      }
    } catch (err) {
      console.error('syncProfile error:', err)
      return { code: 500, msg: '保存失败，请重试' }
    }

    return { code: 0, msg: 'ok' }
  }

  // ========== 拉取用户信息 ==========
  if (action === 'getProfile') {
    try {
      const exist = await db.collection('users').where({ _openid: OPENID }).get()

      if (exist.data.length > 0) {
        return {
          code: 0,
          profile: {
            nickName: exist.data[0].nickName || '',
            avatarUrl: exist.data[0].avatarUrl || ''
          }
        }
      }
    } catch (err) {
      console.error('getProfile error:', err)
      return { code: 500, msg: '获取失败，请重试' }
    }

    return { code: 0, profile: null }
  }

  return { code: 2, msg: '未知操作' }
}
