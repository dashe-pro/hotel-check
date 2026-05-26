<template>
  <view class="page">
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <template v-else-if="hotel">
      <view class="hotel-header">
        <text class="hotel-name">{{ hotel.name }}</text>
        <text class="hotel-address">{{ hotel.address }}</text>
      </view>

      <view v-if="reviews.length > 0" class="reviews-section">
        <view class="section-label">相关记录（{{ reviews.length }}条）</view>
        <review-card
          v-for="item in reviews"
          :key="item._id"
          :type="item.type"
          :content="item.content"
          :discoveryDate="item.discoveryDate"
          :source="item.source"
          :images="item.images"
          :createdAt="item.createdAt"
        />
      </view>

      <view v-else class="empty-reviews">
        <text class="empty-text">该酒店暂无相关记录</text>
        <text class="empty-hint">如果您了解相关情况，欢迎提交评论</text>
      </view>

      <view class="disclaimer">
        <text class="disclaimer-text">免责声明：本站展示内容为用户自发分享和公开信息聚合，仅供参考，本站不对评论真实性负责。</text>
      </view>
    </template>

    <view class="bottom-bar">
      <button class="submit-btn" @click="goSubmit">我要评论 / 举报</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ReviewCard from '@/components/review-card.vue'

const loading = ref(true)
const hotel = ref(null)
const reviews = ref([])

onLoad(async (options) => {
  const hotelId = options.id
  if (!hotelId) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    uni.navigateBack()
    return
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'get-hotel-detail',
      data: { hotelId }
    })

    if (res.result && res.result.code === 0) {
      hotel.value = res.result.data.hotel
      reviews.value = res.result.data.reviews
    }
  } catch (err) {
    console.error('获取酒店详情失败:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

function goSubmit() {
  const hotelId = hotel.value?._id
  const hotelName = hotel.value?.name
  uni.navigateTo({
    url: `/pages/submit-review/index?hotelId=${hotelId}&hotelName=${encodeURIComponent(hotelName || '')}`
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $bg-color;
  padding-bottom: 120rpx;
}

.hotel-header {
  background: #fff;
  padding: $spacing-lg $spacing-md;
  margin-bottom: $spacing-md;

  .hotel-name {
    font-size: 36rpx;
    font-weight: 700;
    color: $text-color;
    display: block;
    margin-bottom: 8rpx;
  }

  .hotel-address {
    font-size: 26rpx;
    color: $text-light;
  }
}

.reviews-section {
  padding: 0 $spacing-md;
}

.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: $spacing-md;
}

.empty-reviews {
  text-align: center;
  padding: 100rpx $spacing-md;

  .empty-text {
    font-size: 30rpx;
    color: $text-color;
    display: block;
  }

  .empty-hint {
    font-size: 26rpx;
    color: $text-light;
    display: block;
    margin-top: 12rpx;
  }
}

.disclaimer {
  padding: $spacing-md;
  margin: $spacing-md 0;

  .disclaimer-text {
    font-size: 22rpx;
    color: $text-light;
    line-height: 1.6;
  }
}

.loading-state {
  text-align: center;
  padding: 200rpx 0;
  font-size: 28rpx;
  color: $text-light;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: $spacing-sm $spacing-md;
  padding-bottom: calc($spacing-sm + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);

  .submit-btn {
    background: $primary-color;
    color: #fff;
    font-size: 30rpx;
    border-radius: 40rpx;
    padding: 20rpx 0;
  }
}
</style>
