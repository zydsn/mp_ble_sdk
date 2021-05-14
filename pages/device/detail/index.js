// pages/device/detail/index.js
Component({
  data: {
    buttons: [
      { text: '取消' },
      { text: '确定' }
    ],
    current: {}
  },
  methods: {
    onLoad (query) {
      this.setData({
        current: {
          deviceId: query.id
        }
      })
    },
    unbind () {
      this.setData({
        isDialogVisivle: true
      })
    },
    tapDialogButton (e) {
      let item = e.detail.item
      if(item.text === '确定') {
        let devices = wx.getStorageSync('devices')
        let current = this.data.current
        devices.forEach((item, i) => {
          if (item.deviceId === current.deviceId) {
            devices.splice(i, 1)
          }
        })
        console.log(devices)
        wx.setStorageSync('devices', devices)
        wx.navigateBack({
          delta: 1
        })
      }
      this.setData({
        isDialogVisivle: false
      })
    }
  }
})
