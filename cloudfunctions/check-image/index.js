const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { fileID } = event
  if (!fileID) {
    return { code: 1, msg: '缺少文件ID' }
  }

  try {
    const downloadRes = await cloud.downloadFile({ fileID })
    if (!downloadRes.fileContent) {
      return { code: 2, msg: '文件下载失败' }
    }

    const checkRes = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/jpeg',
        value: downloadRes.fileContent
      }
    })

    if (checkRes.errCode !== 0) {
      // 违规图片，从云存储中删除
      try {
        await cloud.deleteFile({ fileList: [fileID] })
      } catch {}
      return { code: 3, msg: '图片包含违规内容，已拒绝上传' }
    }

    return { code: 0, msg: 'ok' }
  } catch (err) {
    console.error('check-image error:', err)
    return { code: 500, msg: '图片检测失败: ' + (err.errMsg || err.message || '') }
  }
}
