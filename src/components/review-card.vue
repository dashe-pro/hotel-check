<template>
  <view class="review-card">
    <view class="review-header">
      <view class="review-type">
        <text v-if="type === 'alert'" class="tag tag-alert">行业警示</text>
        <text v-else-if="type === 'case'" class="tag tag-case">公开案件</text>
        <text v-else class="tag tag-user">用户反馈</text>
      </view>
      <text class="review-date">{{ formatDate(discoveryDate) }}</text>
    </view>
    <view class="review-content">{{ content }}</view>
    <view v-if="source && (type === 'case' || type === 'alert')" class="review-source">
      <text class="source-label">来源：</text>
      <text class="source-link">{{ source }}</text>
    </view>
    <view v-if="images && images.length > 0" class="review-images">
      <view
        v-for="(img, idx) in images"
        :key="img"
        class="review-image-wrap"
        @click.stop="previewImage(idx)"
      >
        <image :src="img" mode="aspectFill" class="review-image" />
      </view>
    </view>
    <view class="review-footer">
      <text v-if="reviewerName && type === 'user'" class="reviewer-name">{{ reviewerName }}</text>
      <text class="review-time">{{ timeAgo }}</text>
    </view>
    <view v-if="reviewId && type !== 'alert'" class="vote-bar">
      <view :class="['vote-btn', myVote === 'up' ? 'voted-up' : '']" @click.stop="doVote('up')">
        <text class="vote-icon">▲</text>
        <text class="vote-text">有用 {{ upvotes }}</text>
      </view>
      <view :class="['vote-btn', myVote === 'down' ? 'voted-down' : '']" @click.stop="doVote('down')">
        <text class="vote-icon">▼</text>
        <text class="vote-text">{{ downvotes }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  type: { type: String, default: 'user', validator: (v) => ['user', 'case', 'alert'].includes(v) },
  content: { type: String, default: '' },
  discoveryDate: { type: String, default: '' },
  source: { type: String, default: '' },
  images: { type: Array, default: () => [] },
  createdAt: { type: String, default: '' },
  reviewId: { type: String, default: '' },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  reviewerName: { type: String, default: '' }
})

const emit = defineEmits(['voted'])

const myVote = ref(uni.getStorageSync(`vote_${props.reviewId}`) || '')

async function doVote(voteType) {
  if (!props.reviewId) return
  try {
    const res = await wx.cloud.callFunction({
      name: 'vote-review',
      data: { reviewId: props.reviewId, voteType }
    })
    if (res.result && res.result.code === 0) {
      myVote.value = voteType
      uni.setStorageSync(`vote_${props.reviewId}`, voteType)
    } else {
      uni.showToast({ title: res.result?.msg || '操作失败', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: '网络错误', icon: 'none' })
  }
}

function previewImage(idx) {
  uni.previewImage({
    urls: props.images,
    current: String(props.images[idx]),
    fail: (err) => {
      console.error('previewImage fail:', err)
    }
  })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = dayjs(dateStr)
  if (!d.isValid()) return ''
  return d.format('YYYY年MM月DD日')
}

const timeAgo = computed(() => {
  if (!props.createdAt) return ''
  const now = dayjs()
  const created = dayjs(props.createdAt)
  if (!created.isValid()) return ''
  const days = now.diff(created, 'day')
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
})
</script>

<style lang="scss" scoped>
.review-card {
  background: var(--bg-white);
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);

  &:active { transform: scale(0.98); }
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;
}

.tag {
  font-size: $font-xs;
  padding: 4rpx 14rpx;
  border-radius: $radius-sm;
  font-weight: 500;
}

.tag-case {
  background: #fde8e8;
  color: var(--danger-color);
}

.tag-alert {
  background: #fff3cd;
  color: #856404;
}

.tag-user {
  background: var(--primary-light);
  color: var(--primary-color);
}

.review-date {
  font-size: $font-xs;
  color: var(--text-muted);
}

.review-content {
  font-size: $font-md;
  color: var(--text-color);
  line-height: 1.7;
  margin-bottom: $spacing-sm;
}

.review-source {
  font-size: $font-sm;
  color: var(--text-light);
  margin-bottom: $spacing-sm;

  .source-label { color: var(--text-light); }
  .source-link { color: var(--primary-color); }
}

.review-images {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;

  .review-image-wrap {
    width: 160rpx;
    height: 160rpx;
  }

  .review-image {
    width: 100%;
    height: 100%;
    border-radius: $radius-sm;
  }
}

.review-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .reviewer-name {
    font-size: $font-xs;
    color: var(--text-secondary);
  }

  .review-time {
    font-size: $font-xs;
    color: var(--text-muted);
  }
}

.vote-bar {
  display: flex;
  gap: $spacing-lg;
  margin-top: $spacing-sm;
  padding-top: $spacing-sm;
  border-top: 1rpx solid var(--border-color);
}

.vote-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: $font-xs;
  color: var(--text-muted);
  padding: 4rpx 8rpx;
  border-radius: $radius-sm;
  transition: all var(--transition);

  &:active { background: var(--bg-color); }
}

.voted-up {
  color: var(--primary-color);

  .vote-icon { color: var(--primary-color); }
}

.voted-down {
  color: var(--text-light);

  .vote-icon { color: var(--text-light); }
}

.vote-icon {
  font-size: 18rpx;
}

.vote-text {
  font-size: $font-xs;
}
</style>
