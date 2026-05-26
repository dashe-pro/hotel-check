<template>
  <view class="page">
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <view v-else-if="review" class="detail-card">
      <view class="review-header">
        <view class="review-type">
          <text v-if="review.type === 'alert'" class="tag tag-alert">行业警示</text>
          <text v-else-if="review.type === 'case'" class="tag tag-case">公开案件</text>
          <text v-else class="tag tag-user">用户反馈</text>
        </view>
        <text class="review-date">{{ formatDate(review.discoveryDate) }}</text>
      </view>

      <view class="review-content">{{ review.content }}</view>

      <view v-if="review.source" class="review-source">
        <text class="source-label">来源：</text>
        <text class="source-link">{{ review.source }}</text>
      </view>

      <view v-if="review.images && review.images.length" class="review-images">
        <image
          v-for="(img, idx) in review.images"
          :key="img"
          :src="img"
          mode="widthFix"
          class="detail-image"
          @click="previewImage(idx)"
        />
      </view>
    </view>

    <view v-if="review && review.hotelId && review.hotelName" class="hotel-link" @click="goHotel">
      <text>查看酒店：{{ review.hotelName }}</text>
      <text class="arrow">→</text>
    </view>

    <view v-if="review && review._id && review.type !== 'alert'" class="vote-section">
      <view class="vote-title">这篇反馈对你有用吗？</view>
      <view class="vote-bar">
        <view :class="['vote-btn', myVote === 'up' ? 'voted-up' : '']" @click="doVote('up')">
          <text class="vote-icon">▲</text>
          <text class="vote-text">有用 {{ review.upvotes || 0 }}</text>
        </view>
        <view :class="['vote-btn', myVote === 'down' ? 'voted-down' : '']" @click="doVote('down')">
          <text class="vote-icon">▼</text>
          <text class="vote-text">{{ review.downvotes || 0 }}</text>
        </view>
      </view>
    </view>

    <view class="disclaimer">
      以上信息来自用户提交与公开媒体报道，仅供参考。
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import dayjs from 'dayjs'

const reviewId = ref('')
const review = ref(null)
const loading = ref(true)
const myVote = ref('')

onLoad(async (options) => {
  reviewId.value = options.id || ''
  if (!reviewId.value) {
    loading.value = false
    return
  }
  try {
    const db = wx.cloud.database()
    const res = await db.collection('reviews').doc(reviewId.value).get()
    review.value = res.data
    myVote.value = uni.getStorageSync(`vote_${reviewId.value}`) || ''
  } catch (err) {
    console.error('加载反馈详情失败:', err)
  } finally {
    loading.value = false
  }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = dayjs(dateStr)
  return d.isValid() ? d.format('YYYY年MM月DD日') : ''
}

function previewImage(idx) {
  uni.previewImage({ urls: review.value.images, current: String(review.value.images[idx]) })
}

async function doVote(voteType) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'vote-review',
      data: { reviewId: reviewId.value, voteType }
    })
    if (res.result && res.result.code === 0) {
      myVote.value = voteType
      uni.setStorageSync(`vote_${reviewId.value}`, voteType)
      review.value = { ...review.value, ...res.result.data }
    } else {
      uni.showToast({ title: res.result?.msg || '操作失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

function goHotel() {
  uni.navigateTo({ url: `/pages/hotel-detail/index?id=${review.value.hotelId}` })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-color);
  padding: $spacing-md;
}

.loading-state {
  text-align: center;
  padding: 200rpx 0;
  color: var(--text-muted);
  font-size: $font-md;
}

.detail-card {
  background: var(--bg-white);
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: var(--shadow-sm);
  margin-bottom: $spacing-md;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
}

.tag {
  font-size: $font-xs;
  padding: 4rpx 14rpx;
  border-radius: $radius-sm;
  font-weight: 500;
}

.tag-case { background: #fde8e8; color: var(--danger-color); }
.tag-alert { background: #fff3cd; color: #856404; }
.tag-user { background: var(--primary-light); color: var(--primary-color); }

.review-date {
  font-size: $font-xs;
  color: var(--text-muted);
}

.review-content {
  font-size: $font-md;
  color: var(--text-color);
  line-height: 1.8;
  margin-bottom: $spacing-md;
  white-space: pre-wrap;
  word-break: break-all;
}

.review-source {
  font-size: $font-sm;
  color: var(--text-light);
  margin-bottom: $spacing-md;

  .source-link { color: var(--primary-color); }
}

.review-images {
  margin-bottom: $spacing-md;

  .detail-image {
    width: 100%;
    border-radius: $radius;
    margin-bottom: $spacing-sm;
  }
}

.hotel-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-white);
  border-radius: $radius-lg;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
  font-size: $font-md;
  color: var(--primary-color);
  font-weight: 500;

  .arrow { font-size: $font-md; }
}

.vote-section {
  background: var(--bg-white);
  border-radius: $radius-lg;
  padding: $spacing-md;
  margin-bottom: $spacing-md;

  .vote-title {
    font-size: $font-sm;
    color: var(--text-secondary);
    margin-bottom: $spacing-sm;
  }
}

.vote-bar {
  display: flex;
  gap: $spacing-lg;
}

.vote-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: $font-sm;
  color: var(--text-muted);
  padding: 8rpx 16rpx;
  border-radius: $radius-sm;
  background: var(--bg-color);

  .vote-icon { font-size: 18rpx; }
}

.voted-up { color: var(--primary-color); }
.voted-down { color: var(--text-light); }

.disclaimer {
  text-align: center;
  font-size: $font-xs;
  color: var(--text-muted);
  padding: $spacing-md;
  line-height: 1.6;
}
</style>
