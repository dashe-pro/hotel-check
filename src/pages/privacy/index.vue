<template>
  <view class="page">
    <view class="content">
      <text class="title">隐私保护指引</text>
      <text class="update-date">更新日期：2026年5月27日</text>

      <view class="section">
        <text class="sec-title">1. 我们收集的信息</text>
        <text class="sec-text">1.1 当您提交酒店反馈时，我们会收集您的微信OpenID（匿名标识符），用于反馈归属标识和审核状态通知。</text>
        <text class="sec-text">1.2 您主动上传的截图证据图片，将存储于微信云存储中，仅用于反馈内容的真实性佐证。</text>
        <text class="sec-text">1.3 当您使用风险地图功能时，我们会申请您的位置权限，用于在地图上展示您附近的酒店风险信息。位置信息仅在本地使用，不会上传至服务器。</text>
        <text class="sec-text">1.4 您的收藏记录和浏览历史仅存储在您的设备本地，不会上传至服务器。</text>
      </view>

      <view class="section">
        <text class="sec-title">2. 信息的使用</text>
        <text class="sec-text">2.1 您提交的反馈内容（不含OpenID等身份信息）经审核通过后将公开展示，供其他用户参考。</text>
        <text class="sec-text">2.2 您的OpenID仅用于：识别您的反馈记录、发送审核结果通知、防止重复提交。我们不会将您的OpenID与任何第三方共享。</text>
      </view>

      <view class="section">
        <text class="sec-title">3. 信息的存储与安全</text>
        <text class="sec-text">3.1 所有数据存储在微信云开发环境中，依托微信平台的安全基础设施进行保护。</text>
        <text class="sec-text">3.2 上传的图片将经过微信内容安全API检测，违规内容将被拒绝。</text>
        <text class="sec-text">3.3 我们不会将您的个人信息出售、交易或转让给任何第三方。</text>
      </view>

      <view class="section">
        <text class="sec-title">4. 您的权利</text>
        <text class="sec-text">4.1 您可以在"我的"页面查看和管理您的反馈记录。</text>
        <text class="sec-text">4.2 如发现信息有误，您可以通过酒店详情页的"申诉/纠错"入口提交更正请求。</text>
        <text class="sec-text">4.3 您可以随时清空设备本地的收藏记录和浏览历史。</text>
      </view>

      <view class="section">
        <text class="sec-title">5. 免责声明</text>
        <text class="sec-text">5.1 本小程序展示的酒店风险信息来自用户自愿提交和公开媒体报道的聚合，本站不对信息真实性作任何保证。</text>
        <text class="sec-text">5.2 本小程序仅收录隐藏摄像头/偷拍相关的安全信息，非通用酒店评价平台，数据覆盖范围有限。</text>
        <text class="sec-text">5.3 如果您是酒店方，认为展示的信息不实，请通过申诉/纠错功能联系我们，我们将尽快核实处理。</text>
      </view>

      <view class="section">
        <text class="sec-title">6. 联系我们</text>
        <text class="sec-text">如对本隐私政策有任何疑问或建议，请通过以下方式联系我们：</text>
        <text class="sec-text">在"我的"页面使用申诉功能提交反馈，我们将尽快回复。</text>
      </view>

      <view class="section">
        <text class="sec-title">7. 政策更新</text>
        <text class="sec-text">我们可能会不时更新本隐私保护指引。更新后的版本将在本页面发布，并自发布之日起生效。</text>
      </view>
    </view>
  </view>
</template>

<script setup>
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-color);
  padding-bottom: 60rpx;
}

.content {
  padding: $spacing-lg $spacing-md;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-color);
  text-align: center;
  margin-bottom: $spacing-xs;
}

.update-date {
  display: block;
  font-size: $font-xs;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: $spacing-xl;
}

.section {
  margin-bottom: $spacing-lg;
}

.sec-title {
  display: block;
  font-size: $font-md;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: $spacing-sm;
}

.sec-text {
  display: block;
  font-size: $font-sm;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 4rpx;
}
</style>
