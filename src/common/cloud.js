// 云开发能力封装

const envId = 'YOUR-ENV-ID'

// 调用云函数
export function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data
    }).then((res) => {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data)
      } else {
        reject(res.result || { msg: '请求失败' })
      }
    }).catch((err) => {
      console.error(`[${name}] 云函数调用失败:`, err)
      reject({ msg: '网络错误，请稍后重试' })
    })
  })
}

// 上传图片到云存储
export function uploadImage(filePath) {
  const cloudPath = `review-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath
    }).then((res) => {
      resolve(res.fileID)
    }).catch((err) => {
      console.error('图片上传失败:', err)
      reject({ msg: '图片上传失败' })
    })
  })
}

// 获取微信用户信息
export function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于展示您的评论身份'
    }).then((res) => {
      resolve(res.userInfo)
    }).catch(() => {
      reject({ msg: '获取用户信息失败' })
    })
  })
}

export default {
  callCloudFunction,
  uploadImage,
  getUserProfile
}
