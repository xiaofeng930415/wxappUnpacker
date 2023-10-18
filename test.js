var unpack = require('webpack-unpack');

function findTheEnd({str, prefix = 'if(path&&e_[path]){', start = '{', end = '}'}) {
  if(!str.includes(prefix)){
      return str;
  }
  const str_list = str.split(prefix);

  function findTheEndCore(str, start, end) {
      let [startNum, endNum] = [1, 0];
      let _str = str;
      for(let i = 0; i < str.length; i++){
          let temp = str[i];
          if(temp === start){
              startNum += 1;
          } else if(temp === end){
              endNum += 1;
          }
          if(startNum === endNum){
              _str = str.slice(i+1);
              break;
          }
      }
      return _str;
  }
  const [str_list_0, ...str_list_rest] = str_list;
  const _str_list = [str_list_0, ...str_list_rest.map(item => {
      return findTheEndCore(item, '{', '}')
  })];
  return _str_list.join('');
}

var str = `
var x=[];if(path&&e_[path]){
  return function(env,dd,global){$gwxc=0;var root={"tag":"wx-page"};root.children=[]
  ;g="$gwx";var main=e_[path].f
  if (typeof global==="undefined")global={};global.f=$gdc(f_[path],"",1);
  try{
  main(env,{},root,global);
  _tsd(root)
  }catch(err){
  console.log(err)
  }
  ;g="";
  return root;
  }
  if(true){}
}
var y = '';
`

// console.log(findTheEnd({str}));
// findTheEnd({str, prefix: 'if(path&&e_[path]){', start: '{', end: '}'})


var sources = `
(global.webpackJsonp = global.webpackJsonp || []).push([
    ['common/main'],
    {
        '01a2': function (e, o, a) {
            var t = a('05e2');
            a.n(t).a;
        },
        '05e2': function (e, o, a) {},
        '0d40': function (e, o, a) {
            (function (e) {
                var t = a('4ea4');
                Object.defineProperty(o, '__esModule', {
                    value: true
                });
                o.default = void 0;
                var n = a('9fb7');
                var r = a('59d4');
                var s = t(a('a894'));
                var i = {
                    globalData: {
                        userInfo: {
                            nick: '',
                            token: '',
                            coin: 0,
                            userId: 0,
                            vipType: 0,
                            vipTime: 0,
                            headImg: 'https://cdn.icnpy.com/webroot/img/wapp/headImg.png'
                        },
                        maxEditNum: 5000,
                        shareCode: null,
                        shareLink: null,
                        shareBigCode: null,
                        anchorInfo: {
                            anchorId: 0
                        },
                        _dateCache: {},
                        putCache: function (e, o) {
                            this._dateCache[e] = o;
                        },
                        getCache: function (e) {
                            return this._dateCache[e];
                        },
                        moreAnchorData: {
                            index: 0,
                            info: {
                                anchorId: 0
                            }
                        },
                        moreAnchorDatas: {
                            index: 0,
                            info: {
                                anchorId: 0
                            }
                        },
                        bgMusicInfo: {
                            id: 0
                        },
                        reloadPages: {
                            flag: 0,
                            reset: function (e) {
                                if (e) {
                                    var o = 1 << e;
                                    this.flag |= o;
                                } else {
                                    this.flag = 4294967295;
                                }
                            },
                            get: function (e) {
                                if (e > 0 && e < 64) {
                                    var o = 1 << e;
                                    var a = 0 != (this.flag & o);
                                    this.flag = this.flag & ~o;
                                    return a;
                                }
                            }
                        },
                        openId: 0,
                        system: '',
                        sessionKey: '',
                        uuid: 0,
                        sensitiveWords: '',
                        reload: 0,
                        plat: 0,
                        token: '',
                        isLogin: false,
                        url: '',
                        loadHomeData: false,
                        deviceModel: '',
                        coverFile: '',
                        shareUserId: '',
                        shareType: 0
                    },
                    onLaunch: function (o) {
                        console.log('App Launch');
                        console.log('onLaunch');
                        this.$options.globalData.loadHomeData = true;
                        this.$options.globalData.plat = 1;
                        this.$options.globalData.deviceModel = e.$u.sys().deviceModel;
                        var a = e.$u.os();
                        this.$options.globalData.system = 'devtools' == a ? e.$u.sys().osName : a;
                        var t = (0, n.getUserCache)();
                        t
                            ? (console.log('user has cache', t),
                              (this.globalData.userInfo = t),
                              (this.globalData.openId = t.openId),
                              (this.globalData.token = t.token),
                              (this.globalData.isLogin = true),
                              console.info(this.globalData))
                            : (console.log('user cache none'), this.login());
                    },
                    onShow: function (e) {
                        console.log('App Show', e);
                        if (e.shareUserId) {
                            getApp().globalData.shareUserId = e.shareUserId;
                        }
                        if (e.shareType) {
                            getApp().globalData.shareType = e.shareType;
                        }
                        var o = e.referrerInfo.extraData;
                        if (o) {
                            console.log('App Show  scene', o, e.scene);
                            if (o.shareUserId) {
                                (getApp().globalData.shareUserId = o.shareUserId), setShareUid(o.shareUserId);
                            }
                            if (o.shareType) {
                                (getApp().globalData.shareType = o.shareType), setShareType(o.shareType);
                            }
                        }
                    },
                    onHide: function () {
                        console.log('App Hide');
                    },
                    methods: {
                        reloadPageFunction: function () {
                            if (arguments.length > 0 && void 0 !== arguments[0]) {
                                var e = arguments[0];
                            } else {
                                var e = 'home';
                            }
                            if (arguments.length > 1) {
                                var o = arguments[1];
                            } else {
                                var o = void 0;
                            }
                            var a = s.default[e];
                            console.log('reloadPageFunction', a);
                            var app = getApp();
                            return o ? app.globalData.reloadPages.reset(a) : app.globalData.reloadPages.get(a);
                        },
                        login: function (o) {
                            e.login({
                                provider: 'weixin',
                                success: function (o) {
                                    var a = o.code;
                                    console.log('loginRes', a);
                                    (0, r.request)(
                                        'app/user/getOpenId',
                                        {
                                            code: a
                                        },
                                        function (o) {
                                            console.log('app/user/getOpenId11', o);
                                            if (200 == o.code) {
                                                var a = o.data;
                                                var t = a.openId;
                                                var s = a.sessionKey;
                                                var i = a.uid;
                                                console.log('app/user/getOpenId', o.data);
                                                (0, r.request)(
                                                    'app/user/login',
                                                    {
                                                        openId: t,
                                                        uuid: i
                                                    },
                                                    function (a) {
                                                        if (200 == o.code) {
                                                            getApp().globalData.openId = t;
                                                            getApp().globalData.sessionKey = s;
                                                            var r = a.data.userInfo;
                                                            r.sessionKey = s;
                                                            console.log(r);
                                                            (0, n.setUserCache)(r);
                                                            e.$emit('appLogin', true);
                                                        }
                                                    }
                                                );
                                            } else {
                                                console.log('getOpenId error');
                                            }
                                        }
                                    );
                                },
                                fail: function () {
                                    console.log('login error');
                                    e.$emit('appLogin', false);
                                }
                            });
                        },
                        ttLogin: function () {
                            tt.login({
                                success: function (o) {
                                    var a = o.code;
                                    var t = o.anonymousCode;
                                    (0, r.request)(
                                        'app/user/getOpenId',
                                        {
                                            code: a,
                                            anonymousCode: t
                                        },
                                        function (o) {
                                            if (200 == o.code) {
                                                var a = o.data.openId;
                                                var t = '';
                                                if (o.data.uid) {
                                                    t = o.data.uid;
                                                }
                                                var s = o.data.sessionKey;
                                                console.log('loginParams--->', o.data);
                                                getApp().globalData.openId = a;
                                                getApp().globalData.uuid = t;
                                                getApp().globalData.sessionKey = s;
                                                (0, r.request)(
                                                    'app/user/login',
                                                    {
                                                        openId: a,
                                                        uuid: t
                                                    },
                                                    function (a) {
                                                        if (200 == o.code) {
                                                            var t = a.data.userInfo;
                                                            e.$emit('appLogin', true);
                                                            (0, n.setUserCache)(t);
                                                        } else {
                                                            console.log('================>dyLogin error', o.code);
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                    );
                                },
                                fail: function (o) {
                                    console.log('登录失败->', o);
                                    e.$emit('appLogin', false);
                                }
                            });
                        },
                        baiduLogin: function () {
                            swan.isLoginSync().isLogin
                                ? swan.getLoginCode({
                                      success: function (o) {
                                          var a = o.code;
                                          console.log('百度登录', o);
                                          (0, r.request)(
                                              'app/user/getOpenId',
                                              {
                                                  code: a
                                              },
                                              function (o) {
                                                  console.log('loginParams--->', o);
                                                  if (200 == o.code) {
                                                      var a = o.data.openId;
                                                      var t = o.data.sessionKey;
                                                      var s = '';
                                                      if (o.data.uid) {
                                                          s = o.data.uid;
                                                      }
                                                      getApp().globalData.openId = a;
                                                      getApp().globalData.sessionKey = t;
                                                      (0, r.request)(
                                                          'app/user/login',
                                                          {
                                                              openId: a,
                                                              uuid: s
                                                          },
                                                          function (a) {
                                                              if (200 == o.code) {
                                                                  var t = a.data.userInfo;
                                                                  (0, n.setUserCache)(t);
                                                                  e.$emit('appLogin', true);
                                                              } else {
                                                                  console.log('================>baiduLogin error', o.code);
                                                              }
                                                          }
                                                      );
                                                  }
                                              }
                                          );
                                      },
                                      fail: function (o) {
                                          console.log('百度登录 error', o);
                                          e.$emit('appLogin', false);
                                      }
                                  })
                                : (e.$emit('appLogin', false), e.$emit('appLoginBaidu', false));
                        },
                        getPhoneState: function () {
                            var e = getApp().globalData.userInfo;
                            return !!(e.userId > 0 && e.hasOwnProperty('phone') && e.phone && e.phone.length > 0);
                        },
                        goVip: function () {
                            console.log('system========>', this.globalData.system);
                            'ios' == this.globalData.system ? this.appHref('/pages/pay/pays') : this.appHref('/pages/pay/pay');
                        },
                        appHref: function (o, a) {
                            if (!o) {
                                return false;
                            }
                            console.log('appHref---->', o, getApp().globalData.plat);
                            var t = RegExp(/http/);
                            var n = RegExp(/tabbar/);
                            var r = RegExp(/wapp/);
                            if (o.match(r) || o.match(n))
                                switch ((o.match(r) ? ((a = 2), (o = o.replace('wapp', ''))) : o.match(n) && ((a = 1), (o = o.replace('tabbar', ''))), a)) {
                                    case 1:
                                        e.switchTab({
                                            url: o
                                        });
                                        break;
                                    case 2:
                                        var s;
                                        var i = o;
                                        var l = o.indexOf('!');
                                        var p = o.indexOf('@');
                                        var c = o.substring(0, l);
                                        if (p >= 0) {
                                            o = o.substring(0, p);
                                            i.substring(p + 1, i.length);
                                        }
                                        s = o.substring(l + 1, o.length);
                                        e.navigateToMiniProgram({
                                            appId: s,
                                            path: c,
                                            success: function (e) {}
                                        });
                                        break;
                                    default:
                                        e.navigateTo({
                                            url: o
                                        });
                                }
                            else if (o.match(t)) {
                                var u = RegExp(/browser/);
                                var d = this.queryStr(o);
                                var g = getApp().globalData.token;
                                var f = getApp().globalData.plat;
                                if (o.match(u)) {
                                    o = o.replace('/browser', '');
                                    var h = RegExp(/token/);
                                    if (!o.match(h) && g) {
                                        o += d + 'token=' + g + '&plat=' + f;
                                    }
                                    console.log('appHref--browser-->', o);
                                    plus.runtime.openURL(o, function (e) {});
                                } else {
                                    var b = RegExp(/token/);
                                    if (!o.match(b) && g) {
                                        o += d + 'token=' + g + '&plat=' + f;
                                    }
                                    getApp().globalData.url = o;
                                    console.log('appHref--webview-->', o);
                                    e.navigateTo({
                                        url: '/pages/web/web'
                                    });
                                }
                            } else {
                                a
                                    ? e.switchTab({
                                          url: o
                                      })
                                    : e.navigateTo({
                                          url: o
                                      });
                            }
                        },
                        getUrlParam: function (e, o) {
                            var a = e.split('?');
                            if (a.length > 1) {
                                for (n = a[1].split('&'), r = 0, void 0; r < n.length; r++) {
                                    var t;
                                    var n;
                                    var r;
                                    if (null != (t = n[r].split('=')) && t[0] == o) {
                                        return t[1];
                                    }
                                }
                                return '';
                            }
                            return '';
                        },
                        copyText: function (o) {
                            var a = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : '复制成功';
                            e.setClipboardData({
                                data: o,
                                success: function (o) {
                                    e.showToast({
                                        icon: 'none',
                                        title: a
                                    });
                                }
                            });
                        },
                        queryStr: function (e) {
                            var o = RegExp(/\?(\w+)=/);
                            var a = '?';
                            if (e.match(o)) {
                                a = '&';
                            }
                            return a;
                        }
                    }
                };
                o.default = i;
            }.call(this, a('543d').default));
        },
        '4afd': function (e, o, a) {
            var t = a('b360');
            a.n(t).a;
        },
        6127: function (e, o, a) {
            a.r(o);
            var t = a('0d40');
            var n = a.n(t);
            for (var r in t) {
                if (['default'].indexOf(r) < 0) {
                    (function (e) {
                        a.d(o, e, function () {
                            return t[e];
                        });
                    })(r);
                }
            }
            o.default = n.a;
        },
        b360: function (e, o, a) {},
        b983: function (e, o, a) {
            var t = a('f282');
            a.n(t).a;
        },
        e43b: function (e, o, a) {
            a.r(o);
            var t = a('6127');
            for (var n in t) {
                if (['default'].indexOf(n) < 0) {
                    (function (e) {
                        a.d(o, e, function () {
                            return t[e];
                        });
                    })(n);
                }
            }
            a('4afd');
            a('01a2');
            a('b983');
            var r = a('f0c5');
            var s = Object(r.a)(t.default, void 0, void 0, false, null, null, null, false, void 0, void 0);
            o.default = s.exports;
        },
        f282: function (e, o, a) {},
        fdcf: function (e, o, a) {
            (function (e, o, t) {
                var n = a('4ea4');
                var r = n(a('9523'));
                a('1547');
                a('33db');
                var s = n(a('0ed3'));
                var i = n(a('e43b'));
                var l = n(a('66fd'));
                var p = n(a('66fe'));
                var c = n(a('5933'));
                var u = n(a('6e65'));
                var d = n(a('f549'));
                function g(e, o) {
                    var a = Object.keys(e);
                    if (Object.getOwnPropertySymbols) {
                        var t = Object.getOwnPropertySymbols(e);
                        if (o) {
                            t = t.filter(function (o) {
                                return Object.getOwnPropertyDescriptor(e, o).enumerable;
                            });
                        }
                        a.push.apply(a, t);
                    }
                    return a;
                }
                e.__webpack_require_UNI_MP_PLUGIN__ = a;
                l.default.prototype.$config = u.default;
                l.default.config.productionTip = false;
                l.default.use(s.default);
                l.default.prototype.$tools = c.default;
                l.default.prototype.tips = function (e) {
                    o.$u.toast(e);
                };
                l.default.prototype.$copyText = function () {
                    var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : '';
                    var a = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : '复制成功';
                    o.setClipboardData({
                        data: e,
                        success: function () {
                            o.showToast({
                                icon: 'none',
                                title: a
                            });
                        }
                    });
                };
                l.default.prototype.myUrlEncode = function (e) {
                    e = (e + '').toString();
                    return encodeURIComponent(e).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
                };
                l.default.component('stateful-view', function () {
                    a.e('components/stateful-view')
                        .then(
                            function () {
                                return resolve(a('acac'));
                            }.bind(null, a)
                        )
                        .catch(a.oe);
                });
                l.default.use(p.default);
                o.$u.setConfig({
                    props: {
                        statusBar: {
                            bgColor: '#fff'
                        }
                    }
                });
                i.default.mpType = 'app';
                l.default.mixin(d.default);
                t(
                    new l.default(
                        (function (e) {
                            for (var o = 1; o < arguments.length; o++) {
                                var a = null != arguments[o] ? arguments[o] : {};
                                o % 2
                                    ? g(Object(a), true).forEach(function (o) {
                                          (0, r.default)(e, o, a[o]);
                                      })
                                    : Object.getOwnPropertyDescriptors
                                    ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(a))
                                    : g(Object(a)).forEach(function (o) {
                                          Object.defineProperty(e, o, Object.getOwnPropertyDescriptor(a, o));
                                      });
                            }
                            return e;
                        })({}, i.default)
                    )
                ).$mount();
            }.call(this, a('bc2e').default, a('543d').default, a('543d').createApp));
        }
    },
    [['fdcf', 'common/runtime', 'common/vendor']]
]);

`;

var sources2 = `
(global.webpackJsonp = global.webpackJsonp || []).push([
    ['pages/index/anchors'],
    {
        '1a1c': function (t, e, a) {
            var n = a('1fda');
            a.n(n).a;
        },
        '1eaa': function (t, e, a) {
            a.r(e);
            var n = a('a76f');
            var i = a('f5c7');
            for (var c in i) {
                if (['default'].indexOf(c) < 0) {
                    (function (t) {
                        a.d(e, t, function () {
                            return i[t];
                        });
                    })(c);
                }
            }
            a('1a1c');
            a('2353');
            a('29a6');
            var s = a('f0c5');
            var o = Object(s.a)(i.default, n.b, n.c, false, null, '4d052505', null, false, n.a, void 0);
            e.default = o.exports;
        },
        '1fda': function (t, e, a) {},
        2353: function (t, e, a) {
            var n = a('bc9c');
            a.n(n).a;
        },
        '29a6': function (t, e, a) {
            var n = a('5860');
            a.n(n).a;
        },
        5860: function (t, e, a) {},
        7197: function (t, e, a) {
            (function (t, e) {
                var n = a('4ea4');
                a('1547');
                a('33db');
                n(a('66fd'));
                var i = n(a('1eaa'));
                t.__webpack_require_UNI_MP_PLUGIN__ = a;
                e(i.default);
            }.call(this, a('bc2e').default, a('543d').createPage));
        },
        a76f: function (t, e, a) {
            a.d(e, 'b', function () {
                return i;
            });
            a.d(e, 'c', function () {
                return c;
            });
            a.d(e, 'a', function () {
                return n;
            });
            var n = {
                uSticky: function () {
                    return Promise.all([a.e('common/vendor'), a.e('uni_modules/uview-ui/components/u-sticky/u-sticky')]).then(a.bind(null, 'eb2f'));
                },
                uGap: function () {
                    return Promise.all([a.e('common/vendor'), a.e('uni_modules/uview-ui/components/u-gap/u-gap')]).then(a.bind(null, '2dbc'));
                },
                uLoadingPage: function () {
                    return Promise.all([a.e('common/vendor'), a.e('uni_modules/uview-ui/components/u-loading-page/u-loading-page')]).then(a.bind(null, 'c640'));
                }
            };
            var i = function () {
                this.$createElement;
                var t = (this._self._c, this.tabs.length);
                if (t > 0) {
                    var e = this.getImgUrl('com/search.png');
                } else {
                    var e = null;
                }
                if (t > 0 && this.searchState && !(this.searchLoading < 2)) {
                    var a = this.searchList.length;
                } else {
                    var a = null;
                }
                this.setData(
                    Object.assign(
                        {},
                        {
                            $root: {
                                g0: t,
                                m0: e,
                                g1: a
                            }
                        }
                    )
                );
            };
            var c = [];
        },
        bc9c: function (t, e, a) {},
        ec5f: function (t, e, a) {
            (function (t) {
                var n = a('4ea4');
                Object.defineProperty(e, '__esModule', {
                    value: true
                });
                e.default = void 0;
                var i = n(a('448a'));
                var c = a('85c4');
                var s = (a('9fb7'), a('32b1'));
                var o = n(a('2fcf'));
                var app = getApp();
                var u = {
                    components: {
                        loadMore: function () {
                            a.e('components/com/loadMore')
                                .then(
                                    function () {
                                        return resolve(a('7a14'));
                                    }.bind(null, a)
                                )
                                .catch(a.oe);
                        },
                        anchorList: function () {
                            a.e('components/anchorList')
                                .then(
                                    function () {
                                        return resolve(a('65d6'));
                                    }.bind(null, a)
                                )
                                .catch(a.oe);
                        }
                    },
                    data: function () {
                        return {
                            searchLoading: 1,
                            searchList: [],
                            keywords: '',
                            searchState: false,
                            tabCurrent: 0,
                            current: 0,
                            iconSelId: '',
                            inactiveStyle: {
                                color: '#2C2927',
                                fontSize: '30rpx'
                            },
                            activeStyle: {
                                color: '#FF3F6B',
                                fontSize: '30rpx',
                                fontWeight: 'bold'
                            },
                            lineStyle: {
                                top: '14%',
                                left: '-20rpx',
                                zIndex: '1'
                            },
                            tabs: [],
                            playIconSel: '',
                            locaType: 0,
                            locaIndex: 0,
                            cacheKey: '',
                            musicPlayers: ''
                        };
                    },
                    computed: {
                        playState: function () {
                            return !!this.musicPlayers && this.musicPlayers.state;
                        }
                    },
                    onLoad: function (t) {
                        var e = t.current ? t.current : 0;
                        this.init(e);
                        if (t.cacheKey) {
                            this.cacheKey = t.cacheKey;
                        }
                        this.musicPlayers = new o.default();
                    },
                    onUnload: function () {
                        if (this.musicPlayers.state) {
                            this.musicPlayers.stop();
                        }
                        this.musicPlayers = null;
                    },
                    onHide: function () {
                        if (this.musicPlayers.state) {
                            this.musicPlayers.stop();
                        }
                    },
                    onReachBottom: function () {
                        this.searchState || this.loadData();
                    },
                    methods: {
                        playerTap: function (t) {
                            this.musicPlayers.state = t;
                        },
                        setUrl: function (t) {
                            this.musicPlayers.setUrl(t);
                        },
                        clearKeyword: function () {
                            this.searchState = false;
                            this.keywords = '';
                            this.searchLoading = 1;
                            this.searchList = [];
                        },
                        searchInput: function (t) {
                            if (0 == t.detail.value.length) {
                                this.clearKeyword();
                            }
                        },
                        searchTap: function (t) {
                            var that = this;
                            var a = t.detail.value;
                            if (0 == a.length) {
                                return this.tips('请输入要搜索的主播');
                            }
                            this.searchLoading = 1;
                            this.searchState = true;
                            this.searchList = [];
                            (0, c.searchAnchorApi)(a)
                                .then(function (t) {
                                    that.searchLoading = 2;
                                    that.searchList = t;
                                })
                                .catch(function (t) {
                                    that.searchLoading = 3;
                                });
                        },
                        collectTap: function (t) {
                            var that = this;
                            var a = t.item;
                            var n = t.index;
                            var i = t.index1;
                            (0, s.addCollect)(a.anchorId)
                                .then(function (t) {
                                    var c = parseInt(a.atten) ? 0 : 1;
                                    var s = c ? '收藏成功' : '取消收藏成功';
                                    that.searchState
                                        ? (that.searchList[i].atten = c)
                                        : ((that.tabs[n].list[i].atten = c),
                                          1 == that.current &&
                                              (c || (that.tabs[that.current].list.splice(i, 1), 0 == that.tabs[that.current].list.length && (that.tabs[that.current].load = 3))),
                                          that.reloadList());
                                    that.tips(s);
                                })
                                .catch(function (t) {
                                    that.tips(t.msg);
                                });
                        },
                        init: function () {
                            var that = this;
                            var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0;
                            (0, c.getAnchorCate)().then(function (a) {
                                that.tabs = a;
                                if (e > 0) {
                                    that.current = e;
                                    that.loadData(1);
                                }
                            });
                        },
                        resultData: function (e) {
                            app.globalData.putCache(this.cacheKey, e);
                            if ('moreSetting' == this.cacheKey) {
                                app.globalData.putCache('moreSettingSel', true);
                            }
                            t.navigateBack();
                        },
                        tabsTap: function (t) {
                            this.current = t;
                            var e = this.tabs[t].title;
                            this.$uma.trackEvent('bgMusicSort', {
                                userId: app.globalData.userInfo.userId,
                                title: e
                            });
                            this.loadData(1);
                        },
                        reloadList: function () {
                            this.tabs.forEach(function (t) {
                                t.reload = 1;
                            });
                        },
                        loadData: function (t) {
                            var that = this;
                            var a = this.current;
                            if (this.tabs[a].reload) {
                                this.tabs[a].list = [];
                                this.tabs[a].page = 1;
                                this.tabs[a].load = 0;
                                var n = this.tabs[a];
                                var s = n.page;
                            } else {
                                s = n.page;
                                {
                                    n = this.tabs[a];
                                    if (t && s > 1) {
                                        return false;
                                    }
                                }
                            }
                            var o = n.id;
                            if (n.load) {
                                return false;
                            }
                            this.tabs[a].load = 1;
                            (0, c.getAnchorData)(o, s).then(function (t) {
                                var n = t.list;
                                var c = t.next;
                                that.tabs[a].load = 0;
                                c || (that.tabs[a].load = 2);
                                if (1 == s && 0 == n.length) {
                                    that.tabs[a].load = 3;
                                }
                                that.tabs[a].reload = 0;
                                that.tabs[a].list = [].concat((0, i.default)(that.tabs[that.current].list), (0, i.default)(n));
                                that.tabs[a].page++;
                            });
                        }
                    }
                };
                e.default = u;
            }.call(this, a('543d').default));
        },
        f5c7: function (t, e, a) {
            a.r(e);
            var n = a('ec5f');
            var i = a.n(n);
            for (var c in n) {
                if (['default'].indexOf(c) < 0) {
                    (function (t) {
                        a.d(e, t, function () {
                            return n[t];
                        });
                    })(c);
                }
            }
            e.default = i.a;
        }
    },
    [['7197', 'common/runtime', 'common/vendor']]
]);


`
var modules = unpack(sources2)

console.log(modules);
// modules.map(item => {
//     const { id, source } = item;
//     console.log('id', id);
//     console.log('source', source);
// })
