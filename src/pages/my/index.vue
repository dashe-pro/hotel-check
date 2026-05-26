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
        <text class="user-hint">{{ userInfo.nickName ? '已授权' : '登录后可评论' }}</text>
      </view>
    </view>

    <view class="my-reviews-section">
      <view class="section-title">我的评论</view>

      <view v-if="myReviews.length > 0" class="review-list">
        <view v-for="item in myReviews" :key="item._id" class="my-review-item">
          <view class="item-header">
            <text class="item-hotel">{{ item.hotelName || '未知酒店' }}</text>
            <text :class="statusClass(item.status)">{{ statusLabel(item.status) }}</text>
          </view>
          <text class="item-content">{{ item.content }}</text>
          <text class="item-time">{{ item.timeAgo }}</text>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-text">暂无评论记录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import dayjs from 'dayjs'

const userInfo = ref({})
const myReviews = ref([])

function doLogin() {
  if (userInfo.value.nickName) return

  wx.getUserProfile({
    desc: '用于展示您的评论身份'
  }).then((res) => {
    userInfo.value = res.userInfo
    uni.setStorageSync('userInfo', res.userInfo)
    loadMyReviews()
  }).catch(() => {
    uni.showToast({ title: '需要授权才能评论', icon: 'none' })
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
  }
}

// restore login state on launch
const saved = uni.getStorageSync('userInfo')
if (saved) {
  userInfo.value = saved
  loadMyReviews()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $bg-color;
}

.user-section {
  display: flex;
  align-items: center;
  padding: $spacing-lg $spacing-md;
  background: #fff;
  margin-bottom: $spacing-md;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  margin-right: $spacing-md;
}

.avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: $spacing-md;

  .avatar-text {
    font-size: 40rpx;
    color: #999;
  }
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-color;
  display: block;
}

.user-hint {
  font-size: 24rpx;
  color: $text-light;
}

.my-reviews-section {
  padding: 0 $spacing-md;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: $spacing-md;
}

.my-review-item {
  background: #fff;
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-sm;

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;
  }

  .item-hotel {
    font-size: 26rpx;
    font-weight: 600;
    color: $text-color;
  }

  .s-pending { font-size: 22rpx; color: $warning-color; }
  .s-approved { font-size: 22rpx; color: $safe-color; }
  .s-rejected { font-size: 22rpx; color: $danger-color; }

  .item-content {
    font-size: 26rpx;
    color: $text-light;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .item-time {
    font-size: 22rpx;
    color: $text-light;
    margin-top: 8rpx;
    display: block;
  }
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: $text-light;
  }
}
</style>
