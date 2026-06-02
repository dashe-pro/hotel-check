/**
 * 云开发封装 & 用户信息管理
 *
 * 说明：
 * - 微信小程序中每个用户自动拥有 OpenID，无需手动"登录"
 * - 云函数通过 cloud.getWXContext().OPENID 自动获取用户身份
 * - 用户可选择设置昵称/头像，评论中展示身份；未设置则显示「匿名用户」
 */

// ==================== 用户信息同步 ====================

/**
 * 将头像 / 昵称同步到服务端 users 集合
 */
export async function syncUserInfo(userInfo) {
  if (!userInfo.nickName && !userInfo.avatarUrl) return

  try {
    await wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'syncProfile',
        nickName: userInfo.nickName || '',
        avatarUrl: userInfo.avatarUrl || ''
      }
    })
  } catch (err) {
    console.error('同步用户信息失败:', err)
  }
}

/**
 * 从服务端拉取用户信息（换设备恢复时使用）
 */
export async function fetchUserInfo() {
  try {
    const res = await wx.cloud.callFunction({
      name: 'login',
      data: { action: 'getProfile' }
    })
    if (res.result && res.result.code === 0 && res.result.profile) {
      return {
        nickName: res.result.profile.nickName || '',
        avatarUrl: res.result.profile.avatarUrl || ''
      }
    }
    return null
  } catch (err) {
    console.error('拉取用户信息失败:', err)
    return null
  }
}
