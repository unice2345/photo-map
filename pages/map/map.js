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
  },

  // 加载标记点（从云数据库获取所有用户的照片）
  async loadMarkers() {
    wx.showLoading({ title: '加载中...' })
    const photos = await app.getPhotos()
    wx.hideLoading()

    const photosWithLocation = photos.filter(p => p.location && p.location.latitude)
    const markers = photosWithLocation.map((photo) => ({
      id: photo._id,
      latitude: photo.location.latitude,
      longitude: photo.location.longitude,
      title: photo.description || photo.location.name || '图片',
      iconPath: '/images/marker.png',
      width: 32,
      height: 40,
      callout: {
        content: `${photo.user?.nickName || '匿名'}: ${photo.description || photo.location.name || '图片'}`,
        color: '#333',
        fontSize: 12,
        borderRadius: 8,
        bgColor: '#fff',
        padding: 8,
        display: 'BYCLICK'
      }
    }))

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
    const photo = this.data.photosWithLocation.find(p => p._id === markerId)
    if (photo) {
      this.setData({ selectedPhoto: photo })
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
