<template>
  <view class="page">
    <view class="user-section" @click="doLogin">
      <image
        v-if="userInfo.avatarUrl"
        :src="userInfo.avatarUrl"
        class="avatar"
        mode="aspectFill"
      />
      <view v-else class="avatar-placeholder">
        <text class="avatar-text">?</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userInfo.nickName || '点击登录' }}</text>
        <text class="user-hint">{{ userInfo.nickName ? '已授权' : '登录后可反馈' }}</text>
      </view>
    </view>

    <view v-if="historyList.length > 0" class="history-section">
      <view class="section-header">
        <text class="section-title">浏览历史</text>
        <text class="clear-btn" @click="doClearHistory">清空</text>
      </view>
      <view
        v-for="item in historyList"
        :key="item._id"
        class="history-item"
        @click="goDetail(item._id)"
      >
        <text class="history-name">{{ item.name }}</text>
        <text class="history-address">{{ item.address || item.city || '' }}</text>
        <text class="history-time">{{ formatViewTime(item.viewedAt) }}</text>
      </view>
    </view>

    <view v-if="favorites.length > 0" class="fav-section">
      <view class="section-header">
        <text class="section-title">我的收藏</text>
        <text class="clear-btn" @click="doClearFavorites">清空</text>
      </view>
      <view v-for="item in favorites" :key="item._id" class="fav-item" @click="goDetail(item._id)">
        <text class="fav-name">{{ item.name }}</text>
        <text class="fav-addr">{{ item.address || item.city }}</text>
      </view>
    </view>

    <view class="my-reviews-section">
      <view class="section-title">我的反馈</view>

      <view v-if="myReviews.length > 0 && !reviewsLoading" class="status-legend">
        <view class="legend-item">
          <view class="legend-dot legend-pending"></view>
          <text class="legend-text">审核中</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot legend-approved"></view>
          <text class="legend-text">已通过</text>
        </view>
        <view class="legend-item">
          <view class="legend-dot legend-rejected"></view>
          <text class="legend-text">未通过</text>
        </view>
      </view>

      <view v-if="reviewsLoading">
        <skeleton-card :count="3" itemHeight="130rpx" titleWidth="50%" bodyWidth="80%" />
      </view>

      <view v-else-if="myReviews.length > 0" class="review-list">
        <view v-for="item in myReviews" :key="item._id" class="my-review-item">
          <view class="item-header">
            <text class="item-hotel">{{ item.hotelName || '未知酒店' }}</text>
            <text :class="statusClass(item.status)">{{ statusLabel(item.status) }}</text>
          </view>
          <text class="item-content">{{ item.content }}</text>
          <text class="item-time">{{ item.timeAgo }}</text>
        </view>
      </view>

      <view v-else-if="!reviewsLoading" class="empty-state">
        <text class="empty-text">暂无反馈记录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { getHistory, clearHistory } from '@/common/history.js'
import { getFavorites, clearFavorites } from '@/common/favorites.js'

const userInfo = ref({})
const myReviews = ref([])
const reviewsLoading = ref(false)
const favorites = ref([])

function doLogin() {
  if (userInfo.value.nickName) return

  wx.getUserProfile({
    desc: '用于展示您的反馈身份'
  }).then((res) => {
    userInfo.value = res.userInfo
    uni.setStorageSync('userInfo', res.userInfo)
    loadMyReviews()
  }).catch(() => {
    uni.showToast({ title: '需要授权才能反馈', icon: 'none' })
  })
}

function statusLabel(status) {
  const map = { pending: '审核中', approved: '已通过', rejected: '未通过' }
  return map[status] || status
}

function statusClass(status) {
  const map = { pending: 's-pending', approved: 's-approved', rejected: 's-rejected' }
  return map[status] || ''
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

async function loadMyReviews() {
  reviewsLoading.value = true
  try {
    const db = wx.cloud.database()
    const res = await db.collection('reviews')
      .where({ _openid: '{openid}' })
      .orderBy('createdAt', 'desc')
      .limit(50)
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

      myReviews.value = res.data.map(r => ({
        ...r,
        hotelName: hotelMap[r.hotelId] || '未知酒店',
        timeAgo: formatTimeAgo(r.createdAt)
      }))
    }
  } catch (err) {
    console.error('加载我的评论失败:', err)
  } finally {
    reviewsLoading.value = false
  }
}

// restore login state on launch
const historyList = ref([])

function loadHistory() {
  historyList.value = getHistory()
}

function loadFavorites() {
  favorites.value = getFavorites()
}

function doClearFavorites() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有收藏吗？',
    success: (res) => {
      if (res.confirm) {
        clearFavorites()
        loadFavorites()
      }
    }
  })
}

function doClearHistory() {
  clearHistory()
  historyList.value = []
}

function goDetail(hotelId) {
  uni.navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
}

function formatViewTime(ts) {
  return dayjs(ts).format('MM-DD HH:mm')
}

onShow(() => {
  loadHistory()
  loadFavorites()
  loadMyReviews()
})

onPullDownRefresh(async () => {
  loadHistory()
  loadFavorites()
  await loadMyReviews()
  uni.stopPullDownRefresh()
})

loadHistory()
loadFavorites()

const saved = uni.getStorageSync('userInfo')
if (saved) {
  userInfo.value = saved
  loadMyReviews()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-color);
}

.user-section {
  display: flex;
  align-items: center;
  padding: $spacing-lg $spacing-md;
  background: var(--bg-white);
  margin-bottom: $spacing-md;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);

  &:active { transform: scale(0.98); }
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  margin-right: $spacing-md;
  box-shadow: var(--shadow-sm);
}

.avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: $spacing-md;

  .avatar-text {
    font-size: 40rpx;
    color: var(--text-muted);
    font-weight: 500;
  }
}

.user-name {
  font-size: $font-lg;
  font-weight: 600;
  color: var(--text-color);
  display: block;
}

.user-hint {
  font-size: $font-sm;
  color: var(--text-muted);
}

.history-section {
  padding: 0 $spacing-md;
  margin-bottom: $spacing-md;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;

  .clear-btn {
    font-size: $font-xs;
    color: var(--text-muted);
  }
}

.history-item {
  background: var(--bg-white);
  border-radius: $radius;
  padding: $spacing-sm $spacing-md;
  margin-bottom: $spacing-xs;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);

  &:active { transform: scale(0.98); }

  .history-name {
    font-size: $font-sm;
    font-weight: 600;
    color: var(--text-color);
    display: block;
  }

  .history-address {
    font-size: $font-xs;
    color: var(--text-muted);
    display: block;
    margin-top: 2rpx;
  }

  .history-time {
    font-size: $font-xs;
    color: var(--text-muted);
    margin-top: 4rpx;
    display: block;
  }
}

.status-legend {
  display: flex;
  gap: $spacing-lg;
  margin-bottom: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-white);
  border-radius: $radius;
}

.legend-item {
  display: flex;
  align-items: center;
}

.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 6rpx;
}

.legend-pending { background: var(--warning-color); }
.legend-approved { background: var(--safe-color); }
.legend-rejected { background: var(--danger-color); }

.legend-text {
  font-size: $font-xs;
  color: var(--text-muted);
}

.fav-section {
  padding: 0 $spacing-md;
  margin-bottom: $spacing-md;
}

.fav-item {
  background: var(--bg-white);
  border-radius: $radius;
  padding: $spacing-sm $spacing-md;
  margin-bottom: $spacing-xs;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);

  &:active { transform: scale(0.98); }

  .fav-name {
    font-size: $font-sm;
    font-weight: 600;
    color: var(--text-color);
    display: block;
  }

  .fav-addr {
    font-size: $font-xs;
    color: var(--text-muted);
    display: block;
    margin-top: 2rpx;
  }
}

.my-reviews-section {
  padding: 0 $spacing-md;
}

.section-title {
  font-size: $font-lg;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: $spacing-md;
}

.my-review-item {
  background: var(--bg-white);
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-sm;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition);

  &:active { transform: scale(0.98); }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;
  }

  .item-hotel {
    font-size: $font-sm;
    font-weight: 600;
    color: var(--text-color);
  }

  .s-pending { font-size: $font-xs; color: var(--warning-color); font-weight: 500; }
  .s-approved { font-size: $font-xs; color: var(--safe-color); font-weight: 500; }
  .s-rejected { font-size: $font-xs; color: var(--danger-color); font-weight: 500; }

  .item-content {
    font-size: $font-sm;
    color: var(--text-secondary);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.6;
  }

  .item-time {
    font-size: $font-xs;
    color: var(--text-muted);
    margin-top: $spacing-xs;
    display: block;
  }
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;

  .empty-text {
    font-size: $font-md;
    color: var(--text-muted);
  }
}
</style>
