<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import { ensureLogin } from '@/common/cloud.js'

onLaunch(() => {
  // 云开发初始化
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({
      env: 'cloud1-d2gnannt0b0619333',
      traceUser: true
    })
  }

  // 预登录：提前获取 OpenID，让后续云函数调用都能拿到用户身份
  ensureLogin()

  // 隐私授权处理
  // 当用户未同意隐私协议却调用了隐私 API 时，微信会触发此事件
  if (typeof wx !== 'undefined' && wx.onNeedPrivacyAuthorization) {
    wx.onNeedPrivacyAuthorization((resolve) => {
      // 弹出隐私保护指引，用户同意后 resolve
      uni.showModal({
        title: '隐私保护提示',
        content: '为了提供酒店安全信息查询与反馈服务，我们需要获取您的微信头像和昵称。请阅读并同意《隐私保护指引》。',
        confirmText: '同意',
        cancelText: '查看指引',
        success: (res) => {
          if (res.confirm) {
            resolve({ event: 'agree', buttonId: 'agree-btn' })
          } else {
            // 跳转到隐私保护指引页面
            uni.navigateTo({ url: '/pages/privacy/index' })
            resolve({ event: 'disagree' })
          }
        }
      })
    })
  }
})
</script>

<style lang="scss">
@import '@/uni.scss';

page {
  --bg-color: #F5F5F5;
  --bg-white: #FFFFFF;
  --primary-color: #fd5e02;
  --primary-light: #fff3e8;
  --primary-dark: #d44d00;
  --text-color: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
  --text-light: #bbbbbb;
  --border-color: #EBEBEB;
  --safe-color: #4caf50;
  --danger-color: #e8554a;
  --warning-color: #f0a040;
  --shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  --transition: 0.2s ease;
  background: var(--bg-color);
  color: var(--text-color);
}

@media (prefers-color-scheme: dark) {
  page {
    --bg-color: #1a1a1a;
    --bg-white: #2c2c2c;
    --primary-color: #ff7a2e;
    --primary-light: #3d2a1a;
    --primary-dark: #ff9555;
    --text-color: #e0e0e0;
    --text-secondary: #aaaaaa;
    --text-muted: #808080;
    --text-light: #666666;
    --border-color: #3a3a3a;
    --safe-color: #66bb6a;
    --danger-color: #ef5350;
    --warning-color: #ffb74d;
    --shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.4);
    --transition: 0.2s ease;
    background: var(--bg-color);
    color: var(--text-color);
  }
}
</style>
