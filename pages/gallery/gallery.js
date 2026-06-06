// 图库页面
const app = getApp()

Page({
  data: {
    photos: []
  },

  onShow() {
    this.loadPhotos()
  },

  // 加载照片列表
  loadPhotos() {
    const photos = app.getPhotos()
    this.setData({ photos })
  },

  // 预览照片
  previewPhoto(e) {
    const id = e.currentTarget.dataset.id
    const photo = this.data.photos.find(p => p.id === id)
    if (photo) {
      wx.previewImage({
        current: photo.paths[0],
        urls: photo.paths
      })
    }
  },

  // 在地图上查看
  viewOnMap(e) {
    const id = e.currentTarget.dataset.id
    wx.switchTab({
      url: '/pages/map/map'
    })
    // 通过事件传递id，地图页面会在onShow中处理
    app._pendingMapPhotoId = id
  },

  // 删除照片
  deletePhoto(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          app.deletePhoto(id)
          this.loadPhotos()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})
