<template>
  <view class="page">
    <view v-if="loading">
      <view class="skeleton-header">
        <view class="skeleton-line" style="width:55%; height:32rpx; margin-bottom:12rpx;"></view>
        <view class="skeleton-line" style="width:80%; height:24rpx;"></view>
      </view>
      <skeleton-card :count="3" itemHeight="180rpx" />
    </view>

    <template v-else-if="hotel">
      <view class="hotel-header">
        <view class="fav-row">
          <text class="hotel-name">{{ hotel.name }}</text>
          <view class="fav-btn" @click.stop="toggleFav">
            <text :style="{ color: isFaved ? '#fd5e02' : '#ccc', fontSize: '40rpx' }">
              {{ isFaved ? '♥' : '♡' }}
            </text>
          </view>
        </view>
        <text class="hotel-address">{{ hotel.address }}</text>
      </view>

      <view v-if="hotel.rating || hotel.tel || (hotel.photos && hotel.photos.length)" class="hotel-info">
        <view v-if="hotel.rating" class="info-row">
          <text class="info-label">评分</text>
          <text class="rating-stars">{{ '★'.repeat(Math.floor(hotel.rating)) }}{{ '☆'.repeat(5 - Math.floor(hotel.rating)) }}</text>
          <text class="rating-num">{{ hotel.rating }}分</text>
        </view>
        <view v-if="hotel.tel" class="info-row">
          <text class="info-label">电话</text>
          <text class="info-value tel-link" @click.stop="callHotel">{{ hotel.tel }}</text>
        </view>
        <view v-if="hotel.photos && hotel.photos.length" class="info-photos">
          <scroll-view scroll-x class="photo-scroll" :show-scrollbar="false">
            <image
              v-for="(url, idx) in hotel.photos"
              :key="idx"
              :src="url"
              mode="aspectFill"
              class="photo-item"
              @click="previewPhoto(url)"
            />
          </scroll-view>
        </view>
      </view>

      <view v-if="reviews.length > 0" class="reviews-section">
        <view v-if="hotelReviews.length > 0" class="section-label">相关记录（{{ hotelReviews.length }}条）</view>
        <review-card
          v-for="item in reviews"
          :key="item._id"
          :reviewId="item._id"
          :type="item.type"
          :content="item.content"
          :discoveryDate="item.discoveryDate"
          :source="item.source"
          :images="item.images"
          :createdAt="item.createdAt"
          :upvotes="item.upvotes || 0"
          :downvotes="item.downvotes || 0"
        />
      </view>

      <view v-else class="safe-badge">
        <view class="safe-icon-wrap">
          <text class="safe-icon">✓</text>
        </view>
        <text class="safe-title">暂未发现风险</text>
        <text class="safe-desc">该酒店暂无隐藏摄像头/偷拍相关记录</text>
        <text class="safe-hint">数据来自用户反馈与公开案件，仅供参考</text>
        <view class="safe-submit-link" @click="goSubmit">
          <text>如果您了解相关情况，欢迎提交反馈</text>
        </view>
      </view>

      <view v-if="hotelReviews.length > 0" class="reciprocity-banner" @click="goSubmit">
        <text class="reciprocity-text">这些信息帮到你了吗？如果你也有经历，帮帮下一位住客 →</text>
      </view>
    </template>

    <view v-else class="error-state">
      <text class="error-text">加载失败</text>
      <text class="error-hint">请返回重试</text>
    </view>

    <view class="disclaimer">
      <text class="disclaimer-text">免责声明：本站展示内容为用户自发分享和公开信息聚合，仅供参考，本站不对反馈真实性负责。</text>
      <view class="appeal-link" @click="goAppeal">
        <text>信息有误？我要申诉/纠错</text>
      </view>
    </view>

    <view class="bottom-bar">
      <button class="submit-btn" @click="goSubmit">我要反馈</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import ReviewCard from '@/components/review-card.vue'
import { addToHistory } from '@/common/history.js'
import { addFavorite, removeFavorite, isFavorite } from '@/common/favorites.js'

const loading = ref(true)
const hotel = ref(null)
const reviews = ref([])
const hotelId = ref('')
const isFaved = ref(false)
const hotelReviews = computed(() => reviews.value.filter(r => r.type !== 'alert'))

onShareAppMessage(() => {
  const name = hotel.value?.name || '酒店详情'
  const status = hotelReviews.value.length > 0
    ? `已有${hotelReviews.value.length}条反馈`
    : '暂未发现风险'
  return {
    title: `${name} - ${status} - 住前查`,
    path: `/pages/hotel-detail/index?id=${hotelId.value}`
  }
})

onShareTimeline(() => {
  const name = hotel.value?.name || '酒店详情'
  return {
    title: `${name} - 住前查酒店安全查询`,
    query: `id=${hotelId.value}`
  }
})

onLoad(async (options) => {
  hotelId.value = options.id
  if (!hotelId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    uni.navigateBack()
    return
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'get-hotel-detail',
      data: { hotelId: hotelId.value }
    })

    if (res.result && res.result.code === 0) {
      hotel.value = res.result.data.hotel
      reviews.value = res.result.data.reviews
      addToHistory(hotel.value)
      isFaved.value = isFavorite(hotelId.value)
    }
  } catch (err) {
    console.error('获取酒店详情失败:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

function callHotel() {
  if (hotel.value?.tel) {
    uni.makePhoneCall({ phoneNumber: hotel.value.tel })
  }
}

function toggleFav() {
  if (!hotel.value || !hotel.value._id) return
  if (isFaved.value) {
    removeFavorite(hotel.value._id)
    isFaved.value = false
    uni.showToast({ title: '已取消收藏', icon: 'none' })
  } else {
    addFavorite({
      _id: hotel.value._id,
      name: hotel.value.name,
      city: hotel.value.city,
      address: hotel.value.address
    })
    isFaved.value = true
    uni.showToast({ title: '已收藏', icon: 'success' })
  }
}

function previewPhoto(url) {
  const urls = (hotel.value?.photos || []).filter(Boolean)
  uni.previewImage({ urls, current: url })
}

function goSubmit() {
  const hid = hotel.value?._id
  const hotelName = hotel.value?.name
  uni.navigateTo({
    url: `/pages/submit-review/index?hotelId=${hid}&hotelName=${encodeURIComponent(hotelName || '')}`
  })
}

function goAppeal() {
  uni.navigateTo({
    url: `/pages/appeal/index?hotelId=${hotelId.value}&hotelName=${encodeURIComponent(hotel.value.name || '')}`
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-color);
  padding-bottom: 120rpx;
}

.hotel-header {
  background: var(--bg-white);
  padding: $spacing-lg $spacing-md;
  margin-bottom: $spacing-md;
  box-shadow: var(--shadow-sm);

  .fav-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hotel-name {
    font-size: $font-xl;
    font-weight: 700;
    color: var(--text-color);
    flex: 1;
    margin-bottom: $spacing-xs;
  }

  .hotel-address {
    font-size: $font-sm;
    color: var(--text-muted);
  }
}

.reviews-section {
  padding: 0 $spacing-md;
}

.section-label {
  font-size: $font-md;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: $spacing-md;
}

.hotel-info {
  background: var(--bg-white);
  margin: 0 $spacing-md $spacing-md;
  border-radius: $radius;
  box-shadow: var(--shadow-sm);
  padding: $spacing-md;
}

.info-row {
  display: flex;
  align-items: center;
  padding: $spacing-xs 0;

  .info-label {
    font-size: $font-sm;
    color: var(--text-muted);
    width: 80rpx;
    flex-shrink: 0;
  }

  .rating-stars {
    color: var(--warning-color);
    font-size: $font-md;
    letter-spacing: 4rpx;
  }

  .rating-num {
    font-size: $font-sm;
    color: var(--warning-color);
    margin-left: $spacing-sm;
    font-weight: 500;
  }

  .tel-link {
    font-size: $font-sm;
    color: var(--primary-color);
  }
}

.info-photos {
  padding-top: $spacing-sm;

  .photo-scroll {
    white-space: nowrap;
  }

  .photo-item {
    width: 200rpx;
    height: 150rpx;
    border-radius: $radius-sm;
    margin-right: $spacing-sm;
    display: inline-block;
  }
}

.safe-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-xl $spacing-md;
  margin: $spacing-md;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border-radius: $radius-lg;
  text-align: center;
}

.safe-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: var(--safe-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $spacing-md;

  .safe-icon {
    font-size: 52rpx;
    color: #fff;
    font-weight: bold;
  }
}

.safe-title {
  font-size: $font-xl;
  font-weight: 700;
  color: #2e7d32;
  margin-bottom: $spacing-xs;
}

.safe-desc {
  font-size: $font-md;
  color: #388e3c;
  margin-bottom: $spacing-xs;
}

.safe-hint {
  font-size: $font-xs;
  color: #66bb6a;
  margin-bottom: $spacing-md;
}

.safe-submit-link {
  font-size: $font-sm;
  color: var(--primary-color);
  padding: $spacing-xs $spacing-md;
  border: 1rpx solid var(--primary-color);
  border-radius: $radius-round;
}

.reviews-section {
  padding: 0 $spacing-md;
}

.reciprocity-banner {
  margin: $spacing-md;
  padding: $spacing-md;
  background: var(--primary-light);
  border-radius: $radius;
  transition: transform var(--transition);

  &:active { transform: scale(0.98); }

  .reciprocity-text {
    font-size: $font-sm;
    color: var(--primary-dark);
    line-height: 1.5;
  }
}

.disclaimer {
  padding: $spacing-md;
  margin: $spacing-md 0;

  .disclaimer-text {
    font-size: $font-xs;
    color: var(--text-muted);
    line-height: 1.6;
  }

  .appeal-link {
    text-align: center;
    padding-top: $spacing-sm;
    font-size: $font-xs;
    color: var(--text-muted);
    text-decoration: underline;
  }
}

.skeleton-header {
  background: var(--bg-white);
  padding: $spacing-lg $spacing-md;
  margin-bottom: $spacing-md;

  .skeleton-line {
    height: 24rpx;
    border-radius: $radius-sm;
    background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
}

.loading-state {
  text-align: center;
  padding: 200rpx 0;
  font-size: $font-md;
  color: var(--text-muted);
}

.error-state {
  text-align: center;
  padding: 200rpx 0;

  .error-text {
    font-size: $font-lg;
    color: var(--text-secondary);
    display: block;
  }

  .error-hint {
    font-size: $font-sm;
    color: var(--text-muted);
    display: block;
    margin-top: $spacing-sm;
  }
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-white);
  padding: $spacing-sm $spacing-md;
  padding-bottom: calc($spacing-sm + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.04);

  .submit-btn {
    background: var(--primary-color);
    color: #fff;
    font-size: $font-lg;
    border-radius: $radius-round;
    padding: 20rpx 0;
    font-weight: 500;
  }
}
</style>
