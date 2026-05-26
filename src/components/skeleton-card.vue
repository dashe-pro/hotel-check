<template>
  <view class="skeleton-wrap" :style="{ height }">
    <view v-for="i in count" :key="i" class="skeleton-item" :style="{ height: itemHeight }">
      <view class="skeleton-line skeleton-title" :style="{ width: titleWidth }"></view>
      <view class="skeleton-line skeleton-body" :style="{ width: bodyWidth }"></view>
      <view class="skeleton-line skeleton-body" :style="{ width: bodyWidth2 }"></view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 3 },
  height: { type: String, default: 'auto' },
  itemHeight: { type: String, default: '140rpx' },
  titleWidth: { type: String, default: '50%' },
  bodyWidth: { type: String, default: '85%' },
  bodyWidth2: { type: String, default: '60%' }
})
</script>

<style lang="scss" scoped>
.skeleton-wrap {
  padding: $spacing-md;
}

.skeleton-item {
  background: var(--bg-white);
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
  box-shadow: var(--shadow-sm);
}

.skeleton-line {
  height: 22rpx;
  border-radius: $radius-sm;
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: $spacing-sm;
}

.skeleton-title {
  height: 30rpx;
  margin-bottom: $spacing-sm;
}

.skeleton-body {
  height: 20rpx;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
