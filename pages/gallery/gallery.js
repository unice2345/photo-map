// 图库页面
const app = getApp()

Page({
  data: {
    photos: []
  },

  onShow() {
    this.loadPhotos()
    this.showNewPhotoNotice()
  },

  // 显示新照片通知
  showNewPhotoNotice() {
    const count = app.consumeNewPhotoCount()
    if (count > 0) {
      wx.showToast({ title: `${count} 张新照片`, icon: 'none', duration: 2000 })
    }
  },

  // 加载照片列表（从云数据库获取所有用户的照片）
  async loadPhotos() {
    wx.showLoading({ title: '加载中...' })
    const photos = await app.getPhotos()
    wx.hideLoading()

    // 格式化时间显示
    photos.forEach(p => {
      if (p.createTime && typeof p.createTime.toLocaleString === 'function') {
        p._displayTime = p.createTime.toLocaleString()
      } else if (p.createTime) {
        p._displayTime = new Date(p.createTime).toLocaleString()
      } else {
        p._displayTime = '未知时间'
      }
    })

    this.setData({ photos })
  },

  // 预览照片
  previewPhoto(e) {
    const id = e.currentTarget.dataset.id
    const photo = this.data.photos.find(p => p._id === id)
    if (photo) {
      // 标记为已浏览，地图上的 new 角标随之消失
      app.markPhotoAsSeen(id)
      wx.previewImage({
        current: photo.paths[0],
        urls: photo.paths
      })
    }
  },

  // 在地图上查看
  viewOnMap(e) {
    const id = e.currentTarget.dataset.id
    app.markPhotoAsSeen(id)
    wx.switchTab({
      url: '/pages/map/map'
    })
    app._pendingMapPhotoId = id
  },

  // 删除照片
  deletePhoto(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      confirmColor: '#e74c3c',
      success: async (res) => {
        if (res.confirm) {
          const success = await app.deletePhoto(id)
          if (success) {
            this.loadPhotos()
            wx.showToast({ title: '已删除', icon: 'success' })
          }
        }
      }
    })
  }
})
