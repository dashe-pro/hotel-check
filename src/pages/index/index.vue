<template>
  <view class="page">
    <view class="search-section">
      <view class="search-box" @click="goSearch">
        <image class="search-icon" src="/static/search.svg" mode="aspectFit" />
        <text class="search-placeholder">搜索酒店名称</text>
      </view>
      <view class="map-entry" @click="goMap">
        <text class="map-entry-text">查看风险地图</text>
        <text class="map-entry-arrow">→</text>
      </view>
    </view>

    <view class="intro-section">
      <view class="intro-card">
        <view class="intro-icon">🚨</view>
        <text class="intro-title">住前查 — 酒店偷拍风险查询</text>
        <text class="intro-desc">
          本站<text class="highlight">仅收录隐藏摄像头/偷拍相关</text>的用户反馈与公开案件，非通用酒店评价平台。
        </text>
        <text class="intro-subdesc">
          每条反馈都来自真实住客的亲身经历，数据有限但力求真实。
        </text>
        <view class="intro-tips">
          <view class="tip-item">
            <view class="tip-dot"></view>
            <text class="tip-text">搜索酒店，查看是否有偷拍记录</text>
          </view>
          <view class="tip-item">
            <view class="tip-dot"></view>
            <text class="tip-text">如果你发现过摄像头，帮帮下一位住客</text>
          </view>
        </view>
        <navigator url="/pages/search/index" class="intro-cta">
          <text class="cta-text">搜索酒店查一查</text>
          <text class="cta-arrow">→</text>
        </navigator>
      </view>
    </view>

    <view v-if="stats" class="stats-section">
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-num">{{ formatNum(stats.hotelCount) }}</text>
          <text class="stat-label">已收录酒店</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ formatNum(stats.caseCount) }}</text>
          <text class="stat-label">安全事件</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ formatNum(stats.reviewCount) }}</text>
          <text class="stat-label">用户反馈</text>
        </view>
      </view>
    </view>

    <view class="recent-section">
      <view class="section-title">
        <text class="title-text">最新反馈</text>
      </view>

      <view v-if="loading">
        <skeleton-card :count="5" itemHeight="120rpx" titleWidth="50%" bodyWidth="85%" />
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
        <text class="empty-text">暂无反馈数据</text>
      </view>
    </view>

    <view v-if="historyList.length > 0" class="recent-section">
      <view class="section-title">
        <text class="title-text">最近浏览</text>
      </view>
      <view
        v-for="item in historyList.slice(0, 3)"
        :key="item._id"
        class="recent-item"
        @click="goDetail(item._id)"
      >
        <view class="item-hotel-name">{{ item.name }}</view>
        <text class="item-content">{{ item.address || item.city || '' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { getHistory } from '@/common/history.js'

onShareAppMessage(() => {
  return {
    title: '住前查 - 酒店偷拍风险查询，入住前查一查更安心',
    path: '/pages/index/index'
  }
})

onShareTimeline(() => {
  return {
    title: '住前查 - 酒店偷拍风险查询',
    query: ''
  }
})

const recentReviews = ref([])
const loading = ref(true)
const error = ref(false)
const historyList = ref([])
const stats = ref(null)

function formatNum(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

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
      .where({
        status: 'approved',
        type: 'user'
      })
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
  historyList.value = getHistory()
  wx.cloud.callFunction({ name: 'get-stats' }).then(res => {
    if (res.result?.code === 0) {
      stats.value = res.result.data
    }
  }).catch(() => {})
})

function goSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}

function goMap() {
  uni.navigateTo({ url: '/pages/map/index' })
}

function goDetail(hotelId) {
  if (!hotelId) return
  uni.navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-color);
}

.search-section {
  padding: $spacing-md;
  background: var(--bg-white);
}

.search-box {
  display: flex;
  align-items: center;
  height: 80rpx;
  background: var(--bg-color);
  border-radius: $radius-round;
  padding: 0 $spacing-md;
  box-shadow: var(--shadow-sm);
}

.search-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: $spacing-sm;
}

.search-placeholder {
  font-size: $font-md;
  color: var(--text-muted);
}

.map-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: var(--primary-light);
  border-radius: $radius-round;

  .map-entry-text { font-size: $font-sm; color: var(--primary-color); font-weight: 500; }
  .map-entry-arrow { font-size: $font-sm; color: var(--primary-color); }
}

.intro-section {
  padding: $spacing-md;
}

.intro-card {
  background: var(--bg-white);
  border-radius: $radius-lg;
  padding: $spacing-lg $spacing-md;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.intro-icon {
  font-size: 64rpx;
  margin-bottom: $spacing-sm;
}

.intro-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: $spacing-sm;
}

.intro-desc {
  font-size: $font-sm;
  color: var(--text-secondary);
  line-height: 1.6;
  text-align: center;
  margin-bottom: $spacing-xs;

  .highlight {
    color: var(--primary-color);
    font-weight: 500;
  }
}

.intro-subdesc {
  font-size: $font-xs;
  color: var(--text-muted);
  line-height: 1.5;
  text-align: center;
  margin-bottom: $spacing-md;
}

.intro-tips {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  background: var(--bg-color);
  border-radius: $radius;
  margin-bottom: $spacing-md;
}

.tip-item {
  display: flex;
  align-items: center;
}

.tip-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: var(--primary-color);
  margin-right: $spacing-sm;
  flex-shrink: 0;
}

.tip-text {
  font-size: $font-sm;
  color: var(--text-secondary);
}

.intro-cta {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color);
  border-radius: $radius-round;
  padding: 20rpx 0;
  box-shadow: 0 4rpx 12rpx rgba(253, 94, 2, 0.3);
  transition: transform var(--transition);

  &:active { transform: scale(0.97); }

  .cta-text {
    font-size: $font-md;
    color: #fff;
    font-weight: 500;
    margin-right: $spacing-xs;
  }

  .cta-arrow {
    font-size: $font-md;
    color: rgba(255,255,255,0.8);
  }
}

.stats-section {
  padding: 0 $spacing-md $spacing-md;
}

.stats-card {
  display: flex;
  align-items: center;
  background: var(--bg-white);
  border-radius: $radius-lg;
  padding: $spacing-lg $spacing-md;
  box-shadow: var(--shadow-sm);
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: $font-xs;
  color: var(--text-muted);
  margin-top: 4rpx;
}

.stat-divider {
  width: 1rpx;
  height: 60rpx;
  background: var(--border-color);
}

.recent-section {
  padding: $spacing-md;
}

.section-title {
  margin-bottom: $spacing-md;

  .title-text {
    font-size: $font-lg;
    font-weight: 600;
    color: var(--text-color);
  }
}

.recent-item {
  background: var(--bg-white);
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-sm;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);

  &:active { transform: scale(0.98); }
}

.item-hotel-name {
  font-size: $font-md;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: $spacing-xs;
}

.item-content {
  font-size: 26rpx;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.6;
}

.item-time {
  display: block;
  font-size: $font-xs;
  color: var(--text-muted);
  margin-top: $spacing-xs;
}

.loading-state {
  text-align: center;
  padding: 80rpx 0;
  font-size: $font-md;
  color: var(--text-muted);
}

.empty-state {
  text-align: center;
  padding: 80rpx 0;

  .empty-text {
    font-size: $font-md;
    color: var(--text-light);
    display: block;
  }

  .empty-hint {
    font-size: $font-sm;
    color: var(--text-muted);
    display: block;
    margin-top: $spacing-xs;
  }
}
</style>
