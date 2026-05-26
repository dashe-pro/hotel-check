<template>
  <view class="page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <input
          class="search-input"
          v-model="keyword"
          placeholder="输入酒店名称"
          confirm-type="search"
          @confirm="doSearch"
          focus
        />
      </view>
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <view v-if="loading" class="loading-state">
      <text>搜索中...</text>
    </view>

    <view v-else-if="results.length > 0" class="result-list">
      <view
        v-for="hotel in results"
        :key="hotel._id"
        class="result-item"
        @click="goDetail(hotel._id)"
      >
        <view class="hotel-name">{{ hotel.name }}</view>
        <view class="hotel-address">{{ hotel.address }}</view>
        <view class="hotel-stats">
          <text v-if="hotel.hasCase" class="stat case-stat">
            <text class="stat-dot case-dot"></text>
            {{ hotel.caseCount }}条案件记录
          </text>
          <text v-if="hotel.reviewCount > 0" class="stat review-stat">
            {{ hotel.reviewCount }}条评论
          </text>
          <text v-if="!hotel.hasCase && hotel.reviewCount === 0" class="stat no-stat">
            暂无记录
          </text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view v-else-if="searched && !loading" class="empty-result">
      <text class="empty-text">未找到相关酒店</text>
      <text class="empty-hint">请尝试其他关键词</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const keyword = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return

  loading.value = true
  searched.value = true
  results.value = []

  try {
    const res = await wx.cloud.callFunction({
      name: 'search-hotels',
      data: { keyword: kw }
    })

    if (res.result && res.result.code === 0) {
      results.value = res.result.data
    }
  } catch (err) {
    console.error('搜索失败:', err)
    uni.showToast({ title: '搜索失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
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

.search-bar {
  display: flex;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background: #fff;
}

.search-input-wrap {
  flex: 1;
  height: 72rpx;
  background: $bg-color;
  border-radius: 36rpx;
  padding: 0 $spacing-md;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  font-size: 28rpx;
}

.search-btn {
  margin-left: $spacing-md;
  font-size: 28rpx;
  color: $primary-color;
}

.loading-state {
  text-align: center;
  padding: 120rpx 0;
  font-size: 28rpx;
  color: $text-light;
}

.result-item {
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: $spacing-md;
  margin-bottom: 2rpx;
  position: relative;
}

.hotel-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 6rpx;
}

.hotel-address {
  font-size: 24rpx;
  color: $text-light;
  margin-bottom: $spacing-sm;
}

.hotel-stats {
  display: flex;
  gap: $spacing-md;
}

.stat {
  font-size: 24rpx;
  display: flex;
  align-items: center;
}

.case-stat {
  color: $danger-color;
}

.stat-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}

.case-dot {
  background: $danger-color;
}

.review-stat {
  color: $primary-color;
}

.no-stat {
  color: $safe-color;
}

.arrow {
  position: absolute;
  right: $spacing-md;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40rpx;
  color: #ccc;
}

.empty-result {
  text-align: center;
  padding: 120rpx 0;

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
</style>
