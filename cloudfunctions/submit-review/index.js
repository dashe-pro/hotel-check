const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { hotelId, hotelName, content, discoveryDate, images = [] } = event
  const { OPENID } = cloud.getWXContext()

  // 参数校验
  if (!hotelId || !content || !content.trim()) {
    return { code: 2, msg: '参数不完整' }
  }

  if (content.trim().length < 10) {
    return { code: 3, msg: '内容至少10个字' }
  }

  if (content.length > 500) {
    return { code: 4, msg: '内容不能超过500字' }
  }

  // ========== 内容安全检测 ==========

  let contentCheckPassed = true
  try {
    const checkResult = await cloud.openapi.security.msgSecCheck({
      content: content.trim(),
      version: 2,
      scene: 2,
      openid: OPENID || ''
    })

    if (checkResult.result && checkResult.result.suggest === 'risky') {
      return { code: 5, msg: '内容包含违规信息，请修改后提交' }
    }
  } catch (err) {
    console.error('msgSecCheck error:', err)
    contentCheckPassed = false
  }

  let imageCheckPassed = true
  if (images.length > 0) {
    try {
      for (const fileId of images) {
        const downloadRes = await cloud.downloadFile({ fileID: fileId })
        const imgCheck = await cloud.openapi.security.imgSecCheck({
          media: {
            contentType: 'image/jpeg',
            value: downloadRes.fileContent
          }
        })
        if (imgCheck.result && imgCheck.result.suggest === 'risky') {
          return { code: 6, msg: '图片包含违规内容，请更换' }
        }
      }
    } catch (err) {
      console.error('imgSecCheck error:', err)
      imageCheckPassed = false
    }
  }

  // ========== 获取用户昵称（登录用户） ==========

  let reviewerName = '匿名用户'
  let reviewerAvatar = ''

  if (OPENID) {
    try {
      const userRes = await db.collection('users')
        .where({ _openid: OPENID })
        .limit(1)
        .get()

      if (userRes.data.length > 0) {
        reviewerName = userRes.data[0].nickName || '匿名用户'
        reviewerAvatar = userRes.data[0].avatarUrl || ''
      }
    } catch (err) {
      console.error('获取用户信息失败:', err)
      // 不影响主流程，使用默认匿名
    }
  }

  // ========== 写入数据库 ==========

  try {
    const res = await db.collection('reviews').add({
      data: {
        hotelId,
        hotelName: hotelName || '',
        content: content.trim(),
        discoveryDate: discoveryDate || '',
        images,
        type: 'user',
        status: 'pending',
        reviewerName,
        reviewerAvatar,
        contentCheckPassed,
        imageCheckPassed,
        createdAt: new Date()
      }
    })

    return { code: 0, msg: '提交成功', data: { reviewId: res._id } }
  } catch (err) {
    console.error('submit-review write error:', err)
    return { code: 500, msg: '提交失败', error: err.message }
  }
}
