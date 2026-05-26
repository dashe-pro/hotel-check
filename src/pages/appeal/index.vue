<template>
  <view class="page">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">酒店</text>
        <text class="form-value">{{ hotelName }}</text>
      </view>

      <view class="form-item form-item-textarea">
        <text class="form-label">申诉原因</text>
        <textarea
          class="form-textarea"
          v-model="reason"
          placeholder="请详细说明申诉原因（至少10个字）"
          :maxlength="500"
          :show-confirm-bar="false"
        />
        <text class="char-count">{{ reason.length }}/500</text>
      </view>

      <view class="form-item">
        <text class="form-label">联系方式（选填）</text>
        <input
          class="form-input"
          v-model="contact"
          placeholder="手机号或微信号，方便我们联系您核实"
          :maxlength="50"
        />
      </view>
    </view>

    <view class="disclaimer-box">
      <text class="disclaimer-title">提交须知</text>
      <text class="disclaimer-text">1. 请确保申诉内容真实可信，恶意申诉可能承担法律责任。</text>
      <text class="disclaimer-text">2. 申诉提交后进入审核，我们会尽快核实处理。</text>
      <text class="disclaimer-text">3. 如有相关证据材料，请在申诉原因中详细说明。</text>
    </view>

    <button class="submit-btn" @click="doSubmit" :disabled="submitting">
      {{ submitting ? '提交中...' : '提交申诉' }}
    </button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const hotelId = ref('')
const hotelName = ref('')
const reason = ref('')
const contact = ref('')
const submitting = ref(false)

onLoad((options) => {
  hotelId.value = options.hotelId || ''
  hotelName.value = decodeURIComponent(options.hotelName || '')
})

async function doSubmit() {
  if (!hotelId.value) {
    uni.showToast({ title: '酒店信息缺失', icon: 'none' })
    return
  }
  if (!reason.value.trim() || reason.value.trim().length < 10) {
    uni.showToast({ title: '申诉原因至少10个字', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const res = await wx.cloud.callFunction({
      name: 'submit-appeal',
      data: {
        hotelId: hotelId.value,
        hotelName: hotelName.value,
        reason: reason.value,
        contact: contact.value
      }
    })
    if (res.result?.code === 0) {
      uni.showToast({ title: '申诉已提交', icon: 'success' })
      setTimeout(() => { uni.navigateBack() }, 1500)
    } else {
      uni.showToast({ title: res.result?.msg || '提交失败', icon: 'none' })
    }
  } catch (err) {
    console.error('提交申诉失败:', err)
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-color);
  padding-bottom: 60rpx;
}

.form-section {
  background: var(--bg-white);
  margin: $spacing-md;
  border-radius: $radius;
  box-shadow: var(--shadow-sm);
}

.form-item {
  padding: $spacing-md;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }
}

.form-label {
  display: block;
  font-size: $font-md;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: $spacing-sm;
}

.form-value {
  font-size: $font-md;
  color: var(--text-secondary);
}

.form-textarea {
  width: 100%;
  height: 240rpx;
  font-size: $font-md;
  line-height: 1.6;
  color: var(--text-color);
}

.form-input {
  width: 100%;
  height: 60rpx;
  font-size: $font-md;
  color: var(--text-color);
}

.char-count {
  text-align: right;
  font-size: $font-xs;
  color: var(--text-muted);
  margin-top: $spacing-xs;
}

.disclaimer-box {
  margin: 0 $spacing-md $spacing-md;
  padding: $spacing-md;
  background: var(--primary-light);
  border-radius: $radius;

  .disclaimer-title {
    display: block;
    font-size: $font-sm;
    font-weight: 600;
    color: var(--primary-dark);
    margin-bottom: $spacing-xs;
  }

  .disclaimer-text {
    display: block;
    font-size: $font-xs;
    color: var(--text-secondary);
    line-height: 1.8;
  }
}

.submit-btn {
  margin: 0 $spacing-md;
  background: var(--primary-color);
  color: #fff;
  font-size: $font-lg;
  border-radius: $radius-round;
  padding: 24rpx 0;
  font-weight: 500;
}
</style>
