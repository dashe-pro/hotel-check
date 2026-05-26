<template>
  <view class="review-card">
    <view class="review-header">
      <view class="review-type">
        <text v-if="type === 'case'" class="tag tag-case">公开案件</text>
        <text v-else class="tag tag-user">用户评论</text>
      </view>
      <text class="review-date">{{ formatDate(discoveryDate) }}</text>
    </view>
    <view class="review-content">{{ content }}</view>
    <view v-if="source && type === 'case'" class="review-source">
      <text class="source-label">来源：</text>
      <text class="source-link">{{ source }}</text>
    </view>
    <view v-if="images && images.length > 0" class="review-images">
      <image
        v-for="(img, idx) in images"
        :key="idx"
        :src="img"
        mode="aspectFill"
        class="review-image"
      />
    </view>
    <view class="review-footer">
      <text class="review-time">{{ timeAgo }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  type: { type: String, default: 'user' },
  content: { type: String, default: '' },
  discoveryDate: { type: String, default: '' },
  source: { type: String, default: '' },
  images: { type: Array, default: () => [] },
  createdAt: { type: String, default: '' }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return dayjs(dateStr).format('YYYY年MM月DD日')
}

const timeAgo = computed(() => {
  if (!props.createdAt) return ''
  const now = dayjs()
  const created = dayjs(props.createdAt)
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
  background: #fff;
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.tag-case {
  background: #fde8e8;
  color: $danger-color;
  font-weight: 600;
}

.tag-user {
  background: #e8f0fe;
  color: $primary-color;
}

.review-date {
  font-size: 24rpx;
  color: $text-light;
}

.review-content {
  font-size: 28rpx;
  color: $text-color;
  line-height: 1.6;
  margin-bottom: $spacing-sm;
}

.review-source {
  font-size: 24rpx;
  color: $text-light;
  margin-bottom: $spacing-sm;

  .source-label { color: $text-light; }
  .source-link { color: $primary-color; }
}

.review-images {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;

  .review-image {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
  }
}

.review-footer {
  .review-time {
    font-size: 22rpx;
    color: $text-light;
  }
}
</style>
