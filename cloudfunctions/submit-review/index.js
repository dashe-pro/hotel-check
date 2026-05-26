const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { hotelId, content, discoveryDate, images = [] } = event
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    return { code: 1, msg: '请先登录' }
  }

  if (!hotelId || !content || !content.trim()) {
    return { code: 2, msg: '参数不完整' }
  }

  if (content.trim().length < 10) {
    return { code: 3, msg: '内容至少10个字' }
  }

  if (content.length > 500) {
    return { code: 4, msg: '内容不能超过500字' }
  }

  try {
    const checkResult = await cloud.openapi.security.msgSecCheck({
      content: content.trim(),
      version: 2,
      scene: 2,
      openid: OPENID
    })

    if (checkResult.result && checkResult.result.suggest === 'risky') {
      return { code: 5, msg: '内容包含违规信息，请修改后提交' }
    }
  } catch (err) {
    console.warn('msgSecCheck failed, fallback to manual review:', err.message)
  }

  if (images.length > 0) {
    try {
      for (const fileId of images) {
        const imgCheck = await cloud.openapi.security.imgSecCheck({
          media: { contentType: 'image/jpeg', value: fileId }
        })
        if (imgCheck.result && imgCheck.result.suggest === 'risky') {
          return { code: 6, msg: '图片包含违规内容，请更换' }
        }
      }
    } catch (err) {
      console.warn('imgSecCheck failed:', err.message)
    }
  }

  try {
    const res = await db.collection('reviews').add({
      data: {
        hotelId,
        content: content.trim(),
        discoveryDate: discoveryDate || '',
        images,
        type: 'user',
        status: 'pending',
        createdAt: new Date()
      }
    })

    return { code: 0, msg: '提交成功', data: { reviewId: res._id } }
  } catch (err) {
    console.error('submit-review write error:', err)
    return { code: 500, msg: '提交失败', error: err.message }
  }
}
