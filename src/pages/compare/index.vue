<template>
  <view class="page">
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <view v-else-if="hotels.length > 0" class="compare-content">
      <scroll-view scroll-x class="compare-scroll" :show-scrollbar="false">
        <view class="compare-table">
          <view class="compare-header">
            <text class="header-label">对比项</text>
            <view v-for="h in hotels" :key="h._id" class="header-cell">
              <text class="header-name">{{ h.hotel.name }}</text>
            </view>
          </view>

          <view class="compare-row">
            <text class="row-label">地址</text>
            <view v-for="h in hotels" :key="h._id" class="row-cell">
              <text class="cell-text">{{ h.hotel.address || h.hotel.city || '-' }}</text>
            </view>
          </view>

          <view class="compare-row">
            <text class="row-label">评分</text>
            <view v-for="h in hotels" :key="h._id" class="row-cell">
              <text v-if="h.hotel.rating" class="cell-rating">{{ '★'.repeat(Math.floor(h.hotel.rating)) }} {{ h.hotel.rating }}分</text>
              <text v-else class="cell-text muted">-</text>
            </view>
          </view>

          <view class="compare-row">
            <text class="row-label">案件数</text>
            <view v-for="h in hotels" :key="h._id" class="row-cell">
              <text :class="h.hotel.caseCount > 0 ? 'cell-danger' : 'cell-text'">{{ h.hotel.caseCount || 0 }}条</text>
            </view>
          </view>

          <view class="compare-row">
            <text class="row-label">反馈数</text>
            <view v-for="h in hotels" :key="h._id" class="row-cell">
              <text :class="h.hotel.reviewCount > 0 ? 'cell-primary' : 'cell-text'">{{ h.hotel.reviewCount || 0 }}条</text>
            </view>
          </view>

          <view class="compare-row">
            <text class="row-label">安全状态</text>
            <view v-for="h in hotels" :key="h._id" class="row-cell">
              <text v-if="h.hotel.caseCount > 0" class="cell-danger">⚠ 有案件</text>
              <text v-else-if="h.hotel.reviewCount > 0" class="cell-primary">有反馈</text>
              <text v-else class="cell-safe">✓ 安全</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-else class="error-state">
      <text class="empty-text">加载失败</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const loading = ref(true)
const hotels = ref([])

onLoad(async (options) => {
  const ids = (options.ids || '').split(',').filter(Boolean)
  if (ids.length < 2) {
    uni.showToast({ title: '请至少选择2家酒店', icon: 'none' })
    uni.navigateBack()
    return
  }

  try {
    const results = await Promise.all(ids.map(id =>
      wx.cloud.callFunction({ name: 'get-hotel-detail', data: { hotelId: id } })
    ))
    hotels.value = results
      .map(r => r.result?.data)
      .filter(Boolean)
  } catch (err) {
    console.error('对比加载失败:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-color);
}

.compare-content {
  padding: $spacing-md;
}

.compare-scroll {
  width: 100%;
}

.compare-table {
  min-width: 200%;
  border-radius: $radius;
  overflow: hidden;
  background: var(--bg-white);
  box-shadow: var(--shadow-sm);
}

.compare-header {
  display: flex;
  background: var(--bg-white);
  border-bottom: 1rpx solid var(--border-color);

  .header-label {
    width: 140rpx;
    flex-shrink: 0;
    padding: $spacing-md;
    font-size: $font-md;
    font-weight: 700;
    color: var(--text-color);
  }

  .header-cell {
    flex: 1;
    min-width: 200rpx;
    padding: $spacing-md;
    border-left: 1rpx solid var(--border-color);
  }

  .header-name {
    font-size: $font-md;
    font-weight: 600;
    color: var(--primary-color);
  }
}

.compare-row {
  display: flex;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }

  .row-label {
    width: 140rpx;
    flex-shrink: 0;
    padding: $spacing-sm $spacing-md;
    font-size: $font-sm;
    color: var(--text-secondary);
    background: var(--bg-color);
  }

  .row-cell {
    flex: 1;
    min-width: 200rpx;
    padding: $spacing-sm $spacing-md;
    border-left: 1rpx solid var(--border-color);
  }
}

.cell-text {
  font-size: $font-sm;
  color: var(--text-secondary);

  &.muted { color: var(--text-muted); }
}

.cell-rating {
  font-size: $font-sm;
  color: var(--warning-color);
}

.cell-danger {
  font-size: $font-sm;
  color: var(--danger-color);
  font-weight: 500;
}

.cell-primary {
  font-size: $font-sm;
  color: var(--primary-color);
}

.cell-safe {
  font-size: $font-sm;
  color: var(--safe-color);
  font-weight: 500;
}

.loading-state, .error-state {
  text-align: center;
  padding: 200rpx 0;
  font-size: $font-md;
  color: var(--text-muted);
}

.empty-text {
  font-size: $font-md;
  color: var(--text-secondary);
}
</style>
