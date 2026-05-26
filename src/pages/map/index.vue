<template>
  <view class="map-page">
    <map
      style="width: 100%; height: 100vh;"
      :latitude="centerLat"
      :longitude="centerLng"
      :markers="markers"
      :scale="scale"
      @markertap="onMarkerTap"
      show-location
    />
    <view class="map-legend">
      <view class="legend-item">
        <view class="dot dot-danger"></view>
        <text>有案件记录</text>
      </view>
      <view class="legend-item">
        <view class="dot dot-warn"></view>
        <text>有用户反馈</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const centerLat = ref(39.9042)
const centerLng = ref(116.4074)
const scale = ref(5)
const markers = ref([])

onLoad(async () => {
  try {
    const db = wx.cloud.database()
    const _ = db.command
    const res = await db.collection('hotels')
      .where(_.or([
        { hasCase: true },
        { reviewCount: _.gt(0) }
      ]))
      .field({ name: true, location: true, hasCase: true, reviewCount: true, caseCount: true })
      .limit(200)
      .get()

    const list = (res.data || []).filter(h => h.location)
    markers.value = list.map((h, i) => {
      const [lng, lat] = h.location.split(',').map(Number)
      const label = h.hasCase ? '⚠' : '●'
      return {
        id: i,
        hotelId: h._id,
        latitude: lat,
        longitude: lng,
        title: h.name,
        label: {
          content: h.name,
          fontSize: 12,
          anchorX: 0,
          anchorY: -30
        },
        callout: {
          content: `${h.name}\n${h.hasCase ? `案件${h.caseCount || 0}条` : ''}反馈${h.reviewCount || 0}条`,
          display: 'BYCLICK',
          padding: 10,
          borderRadius: 4
        }
      }
    })

    try {
      const loc = await new Promise((resolve, reject) => {
        uni.getLocation({ type: 'gcj02', success: resolve, fail: reject })
      })
      centerLat.value = loc.latitude
      centerLng.value = loc.longitude
      scale.value = 12
    } catch {
      // 使用默认中心点
    }
  } catch (err) {
    console.error('load map data error:', err)
  }
})

function onMarkerTap(e) {
  const marker = markers.value.find(m => m.id === e.detail.markerId)
  if (marker && marker.hotelId) {
    uni.navigateTo({ url: `/pages/hotel-detail/index?id=${marker.hotelId}` })
  }
}
</script>

<style lang="scss" scoped>
.map-page {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map-legend {
  position: absolute;
  bottom: 40rpx;
  left: 20rpx;
  background: var(--bg-white);
  border-radius: $radius;
  padding: $spacing-sm $spacing-md;
  box-shadow: var(--shadow-sm);
  display: flex;
  gap: $spacing-md;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: $font-xs;
  color: var(--text-secondary);

  .dot {
    width: 16rpx;
    height: 16rpx;
    border-radius: 50%;
    margin-right: 6rpx;
  }

  .dot-danger { background: var(--danger-color); }
  .dot-warn { background: var(--warning-color); }
}
</style>
