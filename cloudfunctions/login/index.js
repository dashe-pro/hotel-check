const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return { code: 1, msg: '未能获取用户身份' }
  }

  const { action } = event || {}

  // ========== 同步用户信息 ==========
  if (action === 'syncProfile') {
    const { nickName, avatarUrl } = event
    const usersCol = db.collection('users')

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

    return { code: 0, msg: 'ok' }
  }

  // ========== 拉取用户信息 ==========
  if (action === 'getProfile') {
    const usersCol = db.collection('users')
    const exist = await usersCol.where({ _openid: OPENID }).get()

    if (exist.data.length > 0) {
      return {
        code: 0,
        profile: {
          nickName: exist.data[0].nickName || '',
          avatarUrl: exist.data[0].avatarUrl || ''
        }
      }
    }

    return { code: 0, profile: null }
  }

  // ========== 默认：仅返回 OpenID ==========
  return { code: 0, openid: OPENID }
}
