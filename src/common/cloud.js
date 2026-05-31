/**
 * 云开发封装 & 登录态管理
 *
 * 职责：
 * - 封装 wx.cloud.callFunction 调用
 * - 管理 OpenID 缓存与登录状态
 * - 提供用户信息同步到服务端的方法
 */

let _openid = null
let _loginPromise = null

// ==================== 登录态 ====================

/** 获取缓存的 OpenID（同步，可能为 null） */
export function getOpenid() {
  return _openid
}

/** 是否已登录（OpenID 已获取） */
export function isLoggedIn() {
  return !!_openid
}

/**
 * 确保已登录：有缓存直接返回，否则发起登录流程
 * 多次并发调用只会发起一次网络请求
 */
export async function ensureLogin() {
  if (_openid) return _openid
  if (_loginPromise) return _loginPromise

  _loginPromise = doLogin()
  const openid = await _loginPromise
  _loginPromise = null
  return openid
}

async function doLogin() {
  try {
    const res = await wx.cloud.callFunction({ name: 'login' })
    if (res.result && res.result.openid) {
      _openid = res.result.openid
      uni.setStorageSync('_openid', _openid)
      return _openid
    }
    console.error('login 云函数未返回 openid:', res)
    return null
  } catch (err) {
    console.error('登录失败:', err)
    return null
  }
}

// ==================== 用户信息同步 ====================

/**
 * 将头像 / 昵称同步到服务端 users 集合
 * 与当前 OpenID 关联，换设备后可恢复
 */
export async function syncUserInfo(userInfo) {
  if (!_openid) {
    console.warn('syncUserInfo: 尚未登录，跳过同步')
    return
  }
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
  if (!_openid) return null
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

// ==================== 云函数调用封装 ====================

/**
 * 带登录态校验的云函数调用
 * 如果云函数返回「请先登录」则自动清除登录态
 */
export async function callCloudFunction(name, data = {}) {
  try {
    const res = await wx.cloud.callFunction({ name, data })
    // 检查业务层返回的登录态错误
    if (res.result && res.result.code === 1 && res.result.msg === '请先登录') {
      _openid = null
      uni.removeStorageSync('_openid')
    }
    return res.result
  } catch (err) {
    // 网络 / SDK 层错误，可能也是登录态问题
    if (err.errCode === -1 || (err.errMsg && err.errMsg.includes('not login'))) {
      _openid = null
      uni.removeStorageSync('_openid')
    }
    throw err
  }
}

// ==================== 初始化 ====================

// 从 Storage 恢复缓存的 OpenID（避免每次冷启动都调云函数）
const savedOpenid = uni.getStorageSync('_openid')
if (savedOpenid) {
  _openid = savedOpenid
}
