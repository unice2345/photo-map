// 地图页面
const app = getApp()

Page({
  data: {
    latitude: 39.9042,
    longitude: 116.4074,
    scale: 12,
    markers: [],
    photosWithLocation: [],
    selectedPhoto: null
  },

  onReady() {
    this.mapContext = wx.createMapContext('photoMap')
  },

  onShow() {
    this.loadMarkers()

    // 处理从图库页面跳转来的情况
    if (app._pendingMapPhotoId) {
      const photoId = app._pendingMapPhotoId
      app._pendingMapPhotoId = null
      this.focusOnPhoto(photoId)
    }

    // ★ 先注册回调，再消费通知——防止在消费和注册之间漏掉 watch 事件
    app._onPhotosChanged = (newCount) => {
      console.log('🗺 _onPhotosChanged 触发, newCount:', newCount)
      this.loadMarkers(true)
      wx.showToast({ title: `${newCount} 张新照片 🆕`, icon: 'none', duration: 2000 })
    }

    const count = app.consumeNewPhotoCount()
    if (count > 0) {
      wx.showToast({ title: `${count} 张新照片 🆕`, icon: 'none', duration: 2500 })
    }
  },

  onHide() {
    // 离开地图页面时取消回调 + 清除新照片高亮标记
    app._onPhotosChanged = null
    app.clearNewPhotoFlags()
  },

  // 构建单个标记点
  buildMarker(photo) {
    const isNew = app.isNewPhoto(photo._id)
    return {
      id: photo._id,
      latitude: photo.location.latitude,
      longitude: photo.location.longitude,
      title: photo.description || photo.location.name || '图片',
      iconPath: '/images/marker.png',
      width: 36,
      height: 45,
      // 新照片添加 "新" 标签
      label: isNew ? {
        content: '新',
        color: '#fff',
        fontSize: 10,
        bgColor: '#e74c3c',
        borderRadius: 4,
        padding: 3,
        anchorX: 5,
        anchorY: -5
      } : undefined,
      // 新照片 callout 高亮：红色系文字 + 浅红背景
      callout: {
        content: `${isNew ? '🆕 ' : ''}${photo.user?.nickName || '匿名'}: ${photo.description || photo.location.name || '图片'}`,
        color: isNew ? '#e74c3c' : '#333',
        fontSize: isNew ? 13 : 12,
        borderRadius: 8,
        bgColor: isNew ? '#fff0f0' : '#fff',
        padding: isNew ? 10 : 8,
        display: 'BYCLICK'
      }
    }
  },

  // 加载标记点（silent: true 时不显示 loading）
  async loadMarkers(silent = false) {
    if (!silent) wx.showLoading({ title: '加载中...' })
    const photos = await app.getPhotos()
    if (!silent) wx.hideLoading()

    const photosWithLocation = photos.filter(p => p.location && p.location.latitude)
    const markers = photosWithLocation.map(p => this.buildMarker(p))

    this.setData({
      markers,
      photosWithLocation
    })

    // 如果有标记，自动定位到第一个
    if (photosWithLocation.length > 0) {
      const first = photosWithLocation[0]
      this.setData({
        latitude: first.location.latitude,
        longitude: first.location.longitude
      })
    }
  },

  // 点击标记
  onMarkerTap(e) {
    const markerId = e.detail.markerId
    const photoIndex = this.data.photosWithLocation.findIndex(p => p._id === markerId)
    if (photoIndex < 0) return

    const photo = this.data.photosWithLocation[photoIndex]
    this.setData({ selectedPhoto: photo })

    // 仅清除当前浏览照片的 "新" 标记
    if (app.markPhotoAsSeen(markerId)) {
      const markers = [...this.data.markers]
      markers[photoIndex] = this.buildMarker(photo)
      this.setData({ markers })
    }
  },

  // 聚焦到指定照片
  focusOnPhoto(photoId) {
    const photo = this.data.photosWithLocation.find(p => p._id === photoId)
    if (photo) {
      this.setData({
        latitude: photo.location.latitude,
        longitude: photo.location.longitude,
        scale: 15,
        selectedPhoto: photo
      })
    }
  },

  // 预览选中的照片
  previewSelectedPhoto() {
    if (this.data.selectedPhoto) {
      const paths = this.data.selectedPhoto.paths
      wx.previewImage({
        current: paths[0],
        urls: paths
      })
    }
  },

  // 关闭信息面板
  closePanel() {
    this.setData({ selectedPhoto: null })
  },

  // 定位到用户位置
  locateToUser() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          scale: 14
        })
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败', icon: 'none' })
      }
    })
  },

  // 地图区域变化
  onRegionChange(e) {
    // 可用于后续扩展功能
  }
})
