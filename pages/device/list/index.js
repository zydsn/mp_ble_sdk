// pages/device/list/index.js
Component({
  pageLifetimes: {
    show () {
      this.getDevices()
    }
  },
  data: {
    isDialogVisivle: false,
    devices: [],
    current: {},
    visivle: false
  },
  methods: {

    getDevices () {
      let devices = wx.getStorageSync('devices')
      console.log(devices)
      this.setData({ devices })
    },
    selecter (e) {
      let dataset = e.currentTarget.dataset
      wx.navigateTo({
        url: `/pages/device/detail/index?id=${ dataset.item.deviceId }`,
      })
    },
    binding () {
      wx.navigateTo({
        url: '/pages/device/binding/index',
      })
    }
  }
})
