<template>
  <view class="page">
    <view class="user-section">
      <button
        class="avatar-btn"
        open-type="chooseAvatar"
        @chooseavatar="onChooseAvatar"
      >
        <image
          v-if="userInfo.avatarUrl"
          :src="userInfo.avatarUrl"
          class="avatar"
          mode="aspectFill"
        />
        <view v-else class="avatar-placeholder">
          <text class="avatar-text">?</text>
        </view>
      </button>
      <view class="user-info">
        <input
          type="nickname"
          class="nickname-input"
          v-model="userInfo.nickName"
          placeholder="点击设置昵称"
          @blur="onNicknameBlur"
          @nicknamereview="onNicknameReview"
        />
        <text class="user-hint">{{ loginHint }}</text>
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

    <view class="footer-links">
      <text class="footer-link" @click="goPrivacy">隐私保护指引</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { getHistory, clearHistory } from '@/common/history.js'
import { getFavorites, clearFavorites } from '@/common/favorites.js'
import {
  ensureLogin,
  isLoggedIn,
  syncUserInfo,
  fetchUserInfo
} from '@/common/cloud.js'

const userInfo = ref({})
const myReviews = ref([])
const reviewsLoading = ref(false)
const favorites = ref([])
const loginReady = ref(false)

// 登录状态提示
const loginHint = computed(() => {
  if (!loginReady.value) return '连接中…'
  if (userInfo.value.nickName) return '已授权'
  if (isLoggedIn()) return '点击设置昵称'
  return '登录后可反馈'
})

function onChooseAvatar(e) {
  const { avatarUrl } = e.detail
  userInfo.value.avatarUrl = avatarUrl
  saveUserInfo()
}

function onNicknameBlur() {
  saveUserInfo()
}

function onNicknameReview(e) {
  // 微信昵称自动填充事件，v-model 已自动更新 userInfo.nickName
  if (e.detail && e.detail.pass) {
    saveUserInfo()
  }
}

function saveUserInfo() {
  // 本地持久化
  uni.setStorageSync('userInfo', userInfo.value)
  // 同步到服务端，绑定 OpenID
  syncUserInfo(userInfo.value)
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
          .limit(100)
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

// ========== 本地数据 ==========
const historyList = ref([])

function loadHistory() {
  historyList.value = getHistory()
}

function loadFavorites() {
  favorites.value = getFavorites()
}

function goPrivacy() {
  uni.navigateTo({ url: '/pages/privacy/index' })
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

// ========== 初始化 ==========
async function initLogin() {
  loginReady.value = false
  await ensureLogin()
  loginReady.value = true

  // 优先从本地恢复
  const saved = uni.getStorageSync('userInfo')
  if (saved && (saved.nickName || saved.avatarUrl)) {
    userInfo.value = saved
    // 后台同步到云端（补充本地可能缺少的字段）
    syncUserInfo(saved)
  } else if (isLoggedIn()) {
    // 本地没有，尝试从云端恢复（换设备场景）
    const remote = await fetchUserInfo()
    if (remote && (remote.nickName || remote.avatarUrl)) {
      userInfo.value = remote
      uni.setStorageSync('userInfo', remote)
    }
  }

  // 反馈数据由 onShow 统一加载，此处仅恢复登录态
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

initLogin()
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

.avatar-btn {
  width: 96rpx;
  height: 96rpx;
  padding: 0;
  margin: 0;
  margin-right: $spacing-md;
  background: transparent;
  border: none;
  line-height: 1;

  &::after { border: none; }
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
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

  .avatar-text {
    font-size: 40rpx;
    color: var(--text-muted);
    font-weight: 500;
  }
}

.nickname-input {
  font-size: $font-lg;
  font-weight: 600;
  color: var(--text-color);
  height: 48rpx;
  line-height: 48rpx;
  padding: 0;
  background: transparent;
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

.footer-links {
  text-align: center;
  padding: $spacing-lg $spacing-md;
  padding-bottom: calc($spacing-lg + env(safe-area-inset-bottom));

  .footer-link {
    font-size: $font-xs;
    color: var(--text-muted);
  }
}
</style>
