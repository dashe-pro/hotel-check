<script setup>
import { onLaunch } from '@dcloudio/uni-app'

// 全局 privacy resolver，供隐私页面调用
let _privacyResolver = null
uni._resolvePrivacy = (event) => {
  if (_privacyResolver) {
    _privacyResolver(event)
    _privacyResolver = null
    return true
  }
  return false
}

onLaunch(() => {
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({
      env: 'cloud1-d2gnannt0b0619333',
      traceUser: true
    })
  }

  if (typeof wx !== 'undefined' && wx.onNeedPrivacyAuthorization) {
    wx.onNeedPrivacyAuthorization((resolve) => {
      _privacyResolver = resolve
      // 直接跳转隐私页面，由那里的 agreePrivacyAuthorization 按钮完成授权
      uni.navigateTo({ url: '/pages/privacy/index' })
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
