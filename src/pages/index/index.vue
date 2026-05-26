<template>
  <view class="page">
    <view class="search-section">
      <view class="search-box" @click="goSearch">
        <image class="search-icon" src="/static/search.svg" mode="aspectFit" />
        <text class="search-placeholder">搜索酒店名称</text>
      </view>
    </view>

    <view class="recent-section">
      <view class="section-title">
        <text class="title-text">最新评论</text>
      </view>

      <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>

      <view v-else-if="error" class="empty-state">
        <text class="empty-text">加载失败</text>
        <text class="empty-hint">请下拉刷新重试</text>
      </view>

      <view v-else-if="recentReviews.length > 0" class="review-list">
        <view
          v-for="item in recentReviews"
          :key="item._id"
          class="recent-item"
          @click="goDetail(item.hotelId)"
        >
          <view class="item-hotel-name">{{ item.hotelName || '未知酒店' }}</view>
          <text class="item-content">{{ item.content }}</text>
          <text class="item-time">{{ item.timeAgo }}</text>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-text">暂无评论数据</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'

const recentReviews = ref([])
const loading = ref(true)
const error = ref(false)

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const created = dayjs(dateStr)
  if (!created.isValid()) return ''
  const now = dayjs()
  const days = now.diff(created, 'day')
  if (days < 0) return ''
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

onMounted(async () => {
  try {
    const db = wx.cloud.database()
    const res = await db.collection('reviews')
      .where({ status: 'approved' })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    if (res.data && res.data.length > 0) {
      const hotelIds = [...new Set(res.data.map(r => r.hotelId))]
      const hotelMap = {}

      if (hotelIds.length > 0) {
        const hotelRes = await db.collection('hotels')
          .where({ _id: db.command.in(hotelIds) })
          .get()
        hotelRes.data.forEach(h => { hotelMap[h._id] = h.name })
      }

      recentReviews.value = res.data.map(r => ({
        ...r,
        hotelName: hotelMap[r.hotelId] || '未知酒店',
        timeAgo: formatTimeAgo(r.createdAt)
      }))
    }
  } catch (err) {
    console.error('获取最新评论失败:', err)
    error.value = true
  } finally {
    loading.value = false
  }
})

function goSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}

function goDetail(hotelId) {
  uni.navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $bg-color;
}

.search-section {
  padding: $spacing-md;
  background: #fff;
}

.search-box {
  display: flex;
  align-items: center;
  height: 80rpx;
  background: $bg-color;
  border-radius: 40rpx;
  padding: 0 $spacing-md;
}

.search-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: $spacing-sm;
}

.search-placeholder {
  font-size: 28rpx;
  color: $text-light;
}

.recent-section {
  padding: $spacing-md;
}

.section-title {
  margin-bottom: $spacing-md;

  .title-text {
    font-size: 32rpx;
    font-weight: 600;
    color: $text-color;
  }
}

.recent-item {
  background: #fff;
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-sm;
}

.item-hotel-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 8rpx;
}

.item-content {
  font-size: 26rpx;
  color: $text-light;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-time {
  display: block;
  font-size: 22rpx;
  color: $text-light;
  margin-top: 8rpx;
}

.empty-state {
  text-align: center;
  padding: 80rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: $text-light;
  }
}
</style>
