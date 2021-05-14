import config from './config'
let fun = function () {}
class BLE_SDK {
  constructor (opt = {}) {
    this.isOpen = false // 蓝牙是否打开
    this.isConnect = false // 是否链接体温计
    this.connecting = false // 正在尝试链接体温计
    this.isSearch = false // 是否正在搜索体温计
    this.isEnd = false // 是否结束搜索
    this.historyList = []

    this.timeout = opt.timeout // 搜索超时时间
    // this.autoplay = opt.autoplay !== undefined? opt.autoplay: true // 初始化成功后是否自动开始搜索设备， 默认为true
    this.devices = opt.devices // 已绑定设备，检索到后会自动链接
    this.mode = opt.mode || 'search' // search|conn，search 自动搜索设备模式，conn 自动链接设备模式（需要传入device字段） 
    this.interval = opt.interval || 1 // 蓝牙搜索间隔，默认为1秒，通过onSearch返回

    this.onSearch = opt.onSearch || fun // 定时返回搜索到的蓝牙设备，默认1秒
    // this.onNotice = opt.onNotice || fun // 收到设备传入数据
    this.offConnect = opt.offConnect || fun // 蓝牙断开链接
    this.onConnect = opt.onConnect || fun // 蓝牙链接成功
    this.onError = opt.onError || fun // 发生异常
    this.init = opt.init || fun // 蓝牙初始化成功
    this.onUpload = opt.onUpload || fun // 设备数据上传
    this.onTimeout = opt.onTimeout || fun // 设备链接超时触发

    this.initBluetooth() // 初始化
  }
  // 初始化蓝牙模块
  initBluetooth () {
    wx.openBluetoothAdapter({
      success: (res) => {
        this.isOpen = true
        this.isSearch = true
        this.init(res)
        if (this.mode === 'search') {
          this.searchBluetooth()
        } else if (this.mode === 'conn') {
          if (this.devices && this.devices.length > 0) {
            this.tryConnectBluetooth()
          } else {
            this.searchBluetooth()
          }
        }
        this.onBLEConnectionStateChange()
      },
      fail: (err) => {
        this.isOpen = false
        this.onError(err)
      }
    })
  }

  // 开始搜索蓝牙设备
  searchBluetooth () {
    wx.startBluetoothDevicesDiscovery({
      services: config.service,
      success: () => {
        this.checkBluetooth()
      },
      fail: (err) => {
        this.onError(err)
      }
    })
  }

  // 定时查询附近设备
  checkBluetooth () {
    let interval = this.interval
    let timer = setInterval(() => {
      this.getDevices()
      if (!this.isSearch || this.isEnd) {
        clearInterval(timer)
        this.stopBluetooth()
      }
    }, interval * 1000)
  }

  // 获取附近蓝牙设备
  getDevices () {
    wx.getBluetoothDevices({
      success: (res) => {
        this.onSearch(res)
      }
    })
  }

  // 链接蓝牙
  connectedBluetooth (device) {
    if (!device || !device.deviceId) return
    if (this.isConnect) return
    this.connecting = true
    wx.createBLEConnection({
      deviceId: device.deviceId,
      timeout: 5000,
      success: () => {
        this.isConnect = true
        this.isSearch = false
        this.device = device
        this.getServiceId(device)
      },
      fail: (err) => {
        this.connecting = false
        this.onError(err)
      }
    })
  }

  // 定时链接附近设备
  tryConnectBluetooth () {
    let interval = this.interval
    let timeout = this.timeout
    let devices = this.devices
    let time = 0
    let i = 0
    if (devices && devices.length > 0) {
      let timer = setInterval(() => {
        if (time >= timeout) {
          clearInterval(timer)
          this.onTimeout({
            msg: '链接设备超时，请检查设备是否打开'
          })
          return
        }
        if (this.isConnect) {
          clearInterval(timer)
          return
        }
        time += interval
        if (!this.connecting) {
          this.connectedBluetooth(devices[i])
          i = (i + 1) >= devices.length? 0: i++
        }
      }, interval * 1000)
    }
  }

  // 获取链接蓝牙的serviceID
  getServiceId (device) {
    wx.getBLEDeviceServices({
      deviceId: device.deviceId,
      success: (res) => {
        this.getCharacteId(device)
      },
      fail: (res) => {
        console.log('get serviceId fail', res)
      }
    })
  }

  // 获取特征值
  getCharacteId (device) {
    wx.getBLEDeviceCharacteristics({
      deviceId: device.deviceId,
      serviceId: config.serviceId,
      success: (res) => {
        console.log(res)
        this.onConnect(device)
      },
      fail: err => {
        this.onError(err)
      }
    })
  }

  onBLEConnectionStateChange () {
    wx.onBLEConnectionStateChange((res) => {
      // 该方法回调中可以用于处理连接意外断开等异常情况
      if (!res.connected) {
        this.offConnect(res)
      }
    })
  }

  // 监听设备传入数据
  startNotice () {
    let device = this.device
    wx.notifyBLECharacteristicValueChange({
      characteristicId: config.notifyId,
      deviceId: device.deviceId,
      serviceId: config.serviceId,
      state: true,
      success: (res) => {
        wx.onBLECharacteristicValueChange(result => {
          let arr = this.ab2hex(result.value)
          this.analysis(arr)
        })
        // this.startNotifyBack()
      },
      fail: (err) => {
        this.onError(err)
      }
    })
  }
  
  // 转换为二进制
  ab2hex (buffer) {
    let hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr
  }

  // 接受蓝牙设备信息
  analysis (arr) {
    let type = arr[1]
    let historyList = this.historyList
    let result
    if (type === '11') {
      if (arr[5] == '00' && arr[4] == '00') {
        result = historyList
        return
      } else {
        let temperature = (parseInt(arr[5], 16) * 256 + parseInt(arr[4], 16)) / 100
        let str = this.replyHistory(arr[6], arr[7])
        let val = this.str2buffer(str)
        let date = [1970 + parseInt(arr[8], 16), parseInt(arr[10], 16), parseInt(arr[11], 16)].join('-')
        let time = [parseInt(arr[12], 16), parseInt(arr[13], 16), parseInt(arr[14], 16)].join(':')
        this.writeBluetooth(val)
        result = [...historyList, {
          temperature,  date, time
        }]
      }
    } else if (type === '06') {
      // 设置单位
      // let company
      // if (arr[3] === '00') {
      //   company = arr[4]
      // } else {
      //   company = arr[3]
      // }
      // this.setData({
      //   company
      // })
    } else if (type === '01') {
      let val = this.str2buffer(config.HFDCWD)
      let temperature = (parseInt(arr[5], 16) * 256 + parseInt(arr[4], 16)) / 100
      let date = [1970 + parseInt(arr[8], 16), parseInt(arr[10], 16), parseInt(arr[11], 16)].join('-')
      let time = [parseInt(arr[12], 16), parseInt(arr[13], 16), parseInt(arr[14], 16)].join(':')
      this.writeBluetooth(val)
      result = {
        temperature, date, time
      }
    } else if (type === '12') {
      result = historyList
    }
    this.onUpload({
      type: type,
      result
    })
  }

  restart () {
    this.isOpen = false
    this.isConnect = false
    this.connecting = false
    this.isSearch = false
    this.isEnd = false
    this.initBluetooth()
  }

  // 写入数据
  writeBluetooth (value) {
    let device = this.device
    wx.writeBLECharacteristicValue({
      characteristicId: config.writeId,
      deviceId: device.deviceId,
      serviceId: config.serviceId,
      value: value,
      success: (res) => {
        // this.readBluetooth()
      },
      fail: (err) => {
        this.onError(err)
      }
    })
  }

  // 获取历史数据
  offlineData () {
    let val = this.str2buffer(config.OFF_LINE)
    this.writeBluetooth(val)
  }

  // 回复历史温度
  replyHistory (xx, yy) {
    let str = `5A1106FFFFFF${xx}${yy}FA`
    return str
  }

  // 二进制转换字符串
  str2buffer (str) {
    let buffer = new ArrayBuffer(9)
    let dataView = new DataView(buffer)
    let count = 0
    for (let i = 0; i < str.length; i = i + 2) {
      let numStr16 = str.substr(i, 2)
      let num = parseInt(numStr16, 16)
      dataView.setUint8(count, num)
      count++
    }
    return buffer
  }

  // 关闭蓝牙搜索
  stopBluetooth () {
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        this.isSearch = false
      }
    })
  }

}

export default BLE_SDK