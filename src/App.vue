<script setup>
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  // 云开发初始化
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({
      env: 'YOUR-ENV-ID',
      traceUser: true
    })
  }
})
</script>

<style lang="scss">
@import '@/uni.scss';
</style>
