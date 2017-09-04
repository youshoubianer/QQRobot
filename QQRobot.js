/**
 * Created by zhaoxd 
 */

'use strict'

const getPixels = require("get-pixels");
const request = require('request');

const xuiUrl = `https://xui.ptlogin2.qq.com/cgi-bin/xlogin?daid=164&target=self&style=40&mibao_css=m_webqq&appid=501004106&enable_qlogin=0&no_verifyimg=1&s_url=http%3A%2F%2Fw.qq.com%2Fproxy.html&f_url=loginerroralert&strong_login=1&login_state=10&t=20131024001`;
const targetUrl = 'https://ssl.ptlogin2.qq.com/ptqrshow?appid=501004106&e=2&l=M&s=3&d=72&v=4&t=0.0426060950619096&daid=164';
const tulingKey = '';

// cookies
let j = request.jar();
let cookies = {
  pgv_pvi: r(),
  pgv_si: r('s'),
};
let parameters = {}; // 全局参数
let friends = {}; // 好友
let groups = {}; // 群
let discuss = {}; // 讨论组
let myselfInfo = {}; // 自己

//用于生成msgid
let sequence = 0;
let t = (new Date()).getTime();
t = (t - t % 1000) / 1000;
t = t % 10000 * 10000;
//获取msgId
const getMsgId = function () {
  sequence++;
  return t + sequence;
};

/**
 * generate pgv_pvi and pgv_si
 * @param {*} c 
 */
function r(c) {
  return (c || "") + Math.round(2147483647 * (Math.random() || .5)) * +new Date % 1E10
}

/**
 * 初始化获取cookie
 */
function setCookies() {
  return new Promise(function (resolve, reject) {
    request({
      url: xuiUrl,
      jar: j,
    }, function (error, resp, body) {
      if (error) {
        console.log(error)
        return reject(error);
      }
      let cookieString = j.getCookieString(xuiUrl);
      cookies = Object.assign(cookies, cookieParser(cookieString));
      for (let key in cookies) {
        let item = `${key}=${cookies[key]}`;
        j.setCookie(item, xuiUrl);
      }
      return resolve()
    });
  })
}

/**
 * 获取登陆二维码
 */
function getLoginQr() {
  return new Promise(function (resolve, reject) {
    request({
      url: targetUrl,
      encoding: null,
      jar: j,
    }, function (error, resp, body) {
      if (error) {
        console.log(error)
        return reject(error);
      }
      let cookieString = j.getCookieString(targetUrl);
      cookies = Object.assign(cookies, cookieParser(cookieString));
      for (let key in cookies) {
        let item = `${key}=${cookies[key]}`;
        j.setCookie(item, targetUrl);
      }
      return resolve({
        data: body,
        type: resp.headers['content-type'],
      })
    });
  }).then(function (res) {
    return showQr(res.data, {
      type: res.type
    });
  }).catch(function (error) {
    console.log('getLoginQr error\n', error)
    return reject(error);
  })
}

/**
 * 输出二维码
 * @param {*} data 
 * @param {*} options 
 */
function showQr(data, options) {
  return new Promise(function (resolve, reject) {
    const WHITE_ALL = '\u2588';
    const WHITE_BLACK = '\u2580';
    const BLACK_WHITE = '\u2584';
    const BLACK_ALL = ' ';
    let type = options.type || '';
    getPixels(data, type, function (err, pixels) {
      if (err) {
        console.log("Bad image:", err)
        return reject(err)
      }
      let output = '';
      let width = pixels.shape[0];
      let height = pixels.shape[1];
      let channel = pixels.shape[2];

      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
          let pixUp = pixels.get(i, j, 0);
          let pixDown = i + 1 < height ? pixels.get(i + 1, j, 0) : 0;
          if (pixUp <= 127 && pixDown < 127) {
            output += BLACK_ALL
          } else if (pixUp <= 127 && pixDown > 127) {
            output += BLACK_WHITE;
          } else if (pixUp >= 127 && pixDown < 127) {
            output += WHITE_BLACK;
          } else if (pixUp >= 127 && pixDown > 127) {
            output += WHITE_ALL;
          }
        }
        i + 1 < height ? ++i : i;
        output += '\n';
      }
      console.log(output);
      return resolve(output);
    })
  })
}

/**
 * hash33 函数，计算qrtoken
 * @param {*} t 
 */
function hash33(t) {
  for (var e = 0, i = 0, n = t.length; i < n; ++i)
    e += (e << 5) + t.charCodeAt(i);
  return 2147483647 & e
}

/**
 * cookie 解析
 * @param {*} cookieString 
 */
function cookieParser(cookieString) {
  let cookieJson = {}
  let cookieList = cookieString.split(';');

  for (let item of cookieList) {
    let kv = item.trim().split('=');
    cookieJson[kv[0]] = kv[1]
  }
  return cookieJson;
}

/**
 * 轮询二维码扫描状态
 * @param {*} callback 
 */
function pollingLoginState(callback) {
  let interval = 1000;
  let pollingUrl = `https://ssl.ptlogin2.qq.com/ptqrlogin?u1=http%3A%2F%2Fw.qq.com%2Fproxy.html&ptqrtoken=${ hash33(cookies.qrsig) }&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-${new Date().getTime()}&js_ver=10228&js_type=1&login_sig=6aGHIoWaY9ZB38I3uoCgAAmeh9m7Nu*0iWa6H8EIBP2Pu3xzTQk1kvXElCN9LFhS&pt_uistyle=40&aid=501004106&daid=164&mibao_css=m_webqq&`

  function getQrScanStatus() {
    for (let key in cookies) {
      let item = `${key}=${cookies[key]}`;
      j.setCookie(item, pollingUrl);
    }
    return new Promise(function (resolve, reject) {
      request({
        url: pollingUrl,
        jar: j,
      }, function (error, resp, body) {
        if (error) {
          console.log(error)
          return reject(error);
        }
        return resolve(body)
      });
    }).then(function (res) {
      res = res.split(',');
      let scanCode = res[0].slice(8, -1);
      let scanMsg = res[4].slice(1, -1);
      console.log('-->', scanMsg);
      if (scanCode == '0') {
        clearInterval(polling);
        let cookieString = j.getCookieString(pollingUrl);
        cookies = Object.assign(cookies, cookieParser(cookieString));
        return callback(res[2].slice(1, -1))
      }
    })
  }

  let polling = setInterval(getQrScanStatus, interval);

}

/**
 * 调用扫码成功的回调url，更新cookies
 * @param {*} checkSigUrl 
 */
function checkSig(checkSigUrl) {
  return new Promise(function (resolve, reject) {
    request({
      url: checkSigUrl,
      jar: j,
    }, function (error, resp, body) {
      console.log('--> checkSig', resp.statusCode);
      if (error) {
        console.log(error)
        return reject(error);
      }
      let cookieString = j.getCookieString(checkSigUrl);
      cookies = Object.assign(cookies, cookieParser(cookieString));
      for (let key in cookies) {
        let item = `${key}=${cookies[key]}`;
        j.setCookie(item, checkSigUrl);
      }
      return resolve(resp.statusCode)
    });
  })
}

/**
 * 获取vfwebqq,用作后续请求参数
 */
function getvfwebqq() {
  let vfwebqqUrl = `http://s.web2.qq.com/api/getvfwebqq?ptwebqq=&clientid=53999199&psessionid=&t=${new Date().getTime()}`;
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, vfwebqqUrl);
  }
  return new Promise(function (resolve, reject) {
    request({
      url: vfwebqqUrl,
      jar: j,
      headers: {
        'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
      }
    }, function (error, resp, body) {
      console.log('--> getvfwebqq', resp.statusCode);

      if (error) {
        console.log(error)
        return reject(error);
      }
      let respBody = JSON.parse(body);
      if (respBody.retcode != 0) {
        return reject('get vfwebqq error!')
      }
      let vfwebqq = respBody.result.vfwebqq;
      parameters.vfwebqq = vfwebqq;
      return resolve(vfwebqq)
    });
  })
}

/**
 * 二次登陆
 */
function login2() {
  let login2Url = 'http://d1.web2.qq.com/channel/login2';
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, login2Url);
  }
  return new Promise(function (resolve, reject) {
    request.post({
      url: login2Url,
      jar: j,
      headers: {
        'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'd1.web2.qq.com',
        'Origin': 'http://d1.web2.qq.com',
      },
      form: {
        r: JSON.stringify({
          "ptwebqq": "",
          "clientid": 53999199,
          "psessionid": "",
          "status": "online"
        })
      },
    }, function (error, resp, body) {
      console.log('--> login2', resp.statusCode);
      if (error) {
        console.log(error)
        return reject(error);
      }
      let respBody = JSON.parse(body);
      if (respBody.retcode != 0) {
        return reject('post login2 error!')
      }
      parameters.login2 = respBody.result;

      console.log('\n=============== cookies ============\n', JSON.stringify(cookies, null, 2));
      console.log('\n=============== parameters ============\n', JSON.stringify(parameters, null, 2));
      return resolve(respBody)
    });
  })
}

/**
 * 获取好友列表
 */
function getUserFriends() {
  let getUserFriendsUrl = 'http://s.web2.qq.com/api/get_user_friends2';
  return getInfo(getUserFriendsUrl).then(function (respBody) {
    respBody.result.info.map(item => {
      friends[item.uin] = item;
    });
    console.log('=============== friends =============\n', JSON.stringify(friends, null, 2));
  }).catch(function (error) {
    console.log(error)
  })
}

/**
 * 获取群组列表
 */
function getGroups() {
  let getGroupsUrl = 'http://s.web2.qq.com/api/get_group_name_list_mask2';
  return getInfo(getGroupsUrl).then(function (respBody) {
    respBody.result.gnamelist.map(item => {
      groups[item.gid] = item;
    });
    console.log('=============== groups =============\n', JSON.stringify(groups, null, 2));
  }).catch(function (error) {
    console.log(error)
  })
}

/**
 * 获取讨论组列表
 */
function getDiscuss() {
  let getDiscussUrl = `http://s.web2.qq.com/api/get_discus_list?clientid=53999199&psessionid=${parameters.login2.psessionid}&vfwebqq=${parameters.vfwebqq}&t=${new Date().getTime()}`;
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, getDiscussUrl);
  }
  return new Promise(function (resolve, reject) {
    request({
      url: getDiscussUrl,
      jar: j,
      headers: {
        'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Host': 's.web2.qq.com',
        'Origin': 'http://s.web2.qq.com',
      },
    }, function (error, resp, body) {
      console.log('\n--> getDiscuss', resp.statusCode);
      if (error) {
        console.log(error);
        return reject(error);
      }
      let respBody = JSON.parse(body);
      if (respBody.retcode != 0) {
        return reject('get discuss error! retcode:', respBody.retcode);
      }
      respBody.result.dnamelist.map(item => {
        discuss[item.did] = item;
      });
      console.log('=============== discuss =============\n', JSON.stringify(discuss, null, 2));
      return resolve()
    });
  }).catch(function (error) {
    console.log(error);
  })
}

// 获取好友列表，群组
function getInfo(infonUrl) {
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, infonUrl);
  }
  return new Promise(function (resolve, reject) {
    request.post({
      url: infonUrl,
      jar: j,
      headers: {
        'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 's.web2.qq.com',
        'Origin': 'http://s.web2.qq.com',
      },
      form: {
        r: JSON.stringify({
          "vfwebqq": parameters.vfwebqq,
          "hash": hash2(cookies.uin.slice(1), ''),
        })
      },
    }, function (error, resp, body) {
      console.log('\n--> getInfo', resp.statusCode);
      if (error) {
        console.log(error);
        return reject(error);
      }
      let respBody = JSON.parse(body);
      if (respBody.retcode != 0) {
        return reject('get info error! retcode:', respBody.retcode);
      }
      return resolve(respBody)
    });
  }).catch(function (error) {
    console.log(error)
  })
}

/**
 * 获取自己
 */
function getSelfInfo() {
  let getSelfInfoUrl = `http://s.web2.qq.com/api/get_self_info2?t=${new Date().getTime()}`;
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, getSelfInfoUrl);
  }
  return new Promise(function (resolve, reject) {
    request({
      url: getSelfInfoUrl,
      jar: j,
      headers: {
        'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 's.web2.qq.com',
        'Origin': 'http://s.web2.qq.com',
      },
    }, function (error, resp, body) {
      console.log('--> getselfInfo', resp.statusCode);
      if (error) {
        console.log(error);
        return reject(error);
      }
      let respBody = JSON.parse(body);
      if (respBody.retcode != 0) {
        return reject('get selfInfo error! retcode:', respBody.retcode);
      }
      myselfInfo = respBody.result;
      return resolve()
    });
  }).catch(function (error) {
    console.log(error)
  })
}

/**
 * hash 算法
 * @param {*QQ号} uin 
 * @param {* cookie的} ptvfwebqq 
 */
function hash2(uin, ptvfwebqq) {
  uin += "";
  var ptb = [];
  for (var i = 0; i < ptvfwebqq.length; i++) {
    var ptbIndex = i % 4;
    ptb[ptbIndex] ^= ptvfwebqq.charCodeAt(i);
  }
  var salt = ["EC", "OK"];
  var uinByte = [];
  uinByte[0] = (((uin >> 24) & 0xFF) ^ salt[0].charCodeAt(0));
  uinByte[1] = (((uin >> 16) & 0xFF) ^ salt[0].charCodeAt(1));
  uinByte[2] = (((uin >> 8) & 0xFF) ^ salt[1].charCodeAt(0));
  uinByte[3] = ((uin & 0xFF) ^ salt[1].charCodeAt(1));
  var result = [];
  for (var i = 0; i < 8; i++) {
    if (i % 2 == 0)
      result[i] = ptb[i >> 1];
    else
      result[i] = uinByte[i >> 1];
  }
  return byte2hex(result);

};

function byte2hex(bytes) { //bytes array
  var hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
  var buf = "";

  for (var i = 0; i < bytes.length; i++) {
    buf += (hex[(bytes[i] >> 4) & 0xF]);
    buf += (hex[bytes[i] & 0xF]);
  }
  return buf;
}

/**
 * 消息轮询
 */
function poll2() {
  let poll2Url = 'http://d1.web2.qq.com/channel/poll2';
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, poll2Url);
  }
  console.log('--> poll2 waiting...')
  return new Promise(function (resolve, reject) {
    request.post({
      url: poll2Url,
      jar: j,
      headers: {
        'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'd1.web2.qq.com',
        'Origin': 'http://d1.web2.qq.com',
      },
      timeout: 70 * 1000,
      form: {
        r: JSON.stringify({
          "ptwebqq": "",
          "clientid": 53999199,
          "psessionid": parameters.login2.psessionid,
        })
      },
    }, function (error, resp, body) {
      console.log('--> poll2', resp.statusCode);
      if (error) {
        console.log(error)
        // return reject(error);
      }

      let respBody = JSON.parse(body);
      if (!respBody.errmsg) {
        let result = respBody.result;
        handleMsg(result);
      } else {
        console.log(body);
      }
      poll2();
    });
  }).catch(function (error) {
    console.log(error);
  })
}

/**
 * 消息处理
 * @param {*} messages 
 */
function handleMsg(messages) {
  // console.log('messages -->\n', JSON.stringify(messages));
  let replyPromise = [];
  for (let i in messages) {
    let message = messages[i];
    let content = '';
    let uin = '';
    let toMe = false;
    if (message['poll_type'] == 'message' || message.value.content.length > 2 && message.value.content[1] == '@dd528') {
      toMe = true;
    }
    console.log('toMe:', toMe)
    if (toMe) {
      content = message.value.content.length === 2 ? message.value.content[1] : message.value.content[3] || ''
      uin = message['poll_type'] == 'message' ? message.value['from_uin'] : message.value['send_uin'];
    } else {
      continue;
    }
    replyPromise.push(getReply(content, uin));
  }

  if (replyPromise.length > 0) {
    return Promise.all(replyPromise).then(function (replyContent) {
      let sendMsgPromise = [];
      for (let i in replyContent) {
        let reply = replyContent[i];
        let toUin = messages[i]['poll_type'] == 'message' ? messages[i].value['from_uin'] : messages[i].value['send_uin'];
        // console.log('replyContent:', messages[i], reply, toUin);
        switch (messages[i]['poll_type']) {
          case 'message':
            sendMsgPromise.push(sendBuddyMsg(reply, toUin))
            break;
          case 'group_message':
            let toGid = messages[i].value['group_code'];
            sendMsgPromise.push(sendQunMsg(reply, toGid))
            break;
          case 'discu_message':
            let toDid = messages[i].value['did'];
            sendMsgPromise.push(sendDiscuissMsg(reply, toDid))
            break;
          default:
            break;
        }
      }
      return Promise.all(sendMsgPromise);
    }).catch(function (error) {
      console.log(error);
    })
  }
  return true;
}

/**
 * 调用图灵机器人接口，获取回复内容
 * @param {*} text 
 */
function getReply(text, uin) {
  return new Promise(function (resolve, reject) {
    let tulingAPi = 'http://www.tuling123.com/openapi/api'
    request.post({
      url: tulingAPi,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      form: {
        key: tulingKey,
        info: text,
        userid: uin,
      }
    }, function (err, resp, body) {
      if (err) {
        console.log(err);
        return reject(err);
      }
      let respBody = JSON.parse(body);
      return resolve(respBody.text);
    })
  })
}

/**
 * 发送个人消息
 */
function sendBuddyMsg(text, uin) {
  let sendBuddyMsgUrl = 'http://d1.web2.qq.com/channel/send_buddy_msg2';
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, sendBuddyMsgUrl);
  }
  console.log('<-- sendBuddyMsg...')
  return new Promise(function (resolve, reject) {
    let contentStyle = ['font', {
      'name': '宋体',
      'size': 10,
      'style': [0, 0, 0],
      'color': '000000'
    }];
    request.post({
      url: sendBuddyMsgUrl,
      jar: j,
      headers: {
        'Referer': 'http://d1.web2.qq.com/cfproxy.html?v=20151105001&callback=1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'd1.web2.qq.com',
        'Origin': 'http://d1.web2.qq.com',
      },
      form: {
        r: JSON.stringify({
          'to': uin,
          'content': JSON.stringify([text, contentStyle]),
          'face': friends[uin].face,
          'clientid': 53999199,
          'msg_id': getMsgId(),
          'psessionid': parameters.login2.psessionid,
        })
      },
    }, function (error, resp, body) {
      if (error) {
        console.error('<-- sendBuddyMsg error.\n', error)
        // return reject(error);
      }
      let respBody = JSON.parse(body);
      console.log('<-- sendBuddyMsg', respBody.msg)
      return resolve();
    });
  }).catch(function (error) {
    console.log(error)
  })
}

/**
 * 发送群消息
 */
function sendQunMsg(text, gid) {
  let sendQunMsgUrl = 'http://d1.web2.qq.com/channel/send_qun_msg2';
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, sendQunMsgUrl);
  }
  console.log('<-- sendQunMsg...');
  return new Promise(function (resolve, reject) {
    let contentStyle = ['font', {
      'name': '宋体',
      'size': 10,
      'style': [0, 0, 0],
      'color': '000000'
    }];
    request.post({
      url: sendQunMsgUrl,
      jar: j,
      headers: {
        'Referer': 'http://d1.web2.qq.com/cfproxy.html?v=20151105001&callback=1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'd1.web2.qq.com',
        'Origin': 'http://d1.web2.qq.com',
      },
      form: {
        r: JSON.stringify({
          'group_uin': gid,
          'content': JSON.stringify([text, contentStyle]),
          'face': myselfInfo.face,
          'clientid': 53999199,
          'msg_id': getMsgId(),
          'psessionid': parameters.login2.psessionid,
        })
      },
    }, function (error, resp, body) {
      if (error) {
        console.error('<-- sendQunMsg error.\n', error)
        // return reject(error);
      }
      let respBody = JSON.parse(body);
      console.log('<-- sendQunMsg:', respBody.msg || respBody.errmsg)
      return resolve();
    });
  }).catch(function (error) {
    console.log(error)
  })
}

/**
 * 发送讨论组消息
 */
function sendDiscuissMsg(text, did) {
  let sendDiscuissMsgUrl = 'http://d1.web2.qq.com/channel/send_discu_msg2';
  for (let key in cookies) {
    let item = `${key}=${cookies[key]}`;
    j.setCookie(item, sendDiscuissMsgUrl);
  }
  console.log('<-- sendDiscuissMsg...');
  return new Promise(function (resolve, reject) {
    let contentStyle = ['font', {
      'name': '宋体',
      'size': 10,
      'style': [0, 0, 0],
      'color': '000000'
    }];
    request.post({
      url: sendDiscuissMsgUrl,
      jar: j,
      headers: {
        'Referer': 'http://d1.web2.qq.com/cfproxy.html?v=20151105001&callback=1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': 'd1.web2.qq.com',
        'Origin': 'http://d1.web2.qq.com',
      },
      form: {
        r: JSON.stringify({
          'did': did,
          'content': JSON.stringify([text, contentStyle]),
          'face': myselfInfo.face,
          'clientid': 53999199,
          'msg_id': getMsgId(),
          'psessionid': parameters.login2.psessionid,
        })
      },
    }, function (error, resp, body) {
      if (error) {
        console.error('<-- sendDiscuissMsg error.\n', error)
        // return reject(error);
      }
      let respBody = JSON.parse(body);
      console.log('<-- sendDiscuissMsg:', respBody.msg)
      return resolve();
    });
  }).catch(function (error) {
    console.log(error)
  })
}


/**
 * 模块导出
 */
exports.login = function () {
  return setCookies().then(function () {
    return getLoginQr()
  }).catch(function (error) {
    console.log(error)
  })
}
exports.pollingLoginState = pollingLoginState;
exports.checkSig = checkSig;
exports.getvfwebqq = getvfwebqq;
exports.login2 = login2;
exports.getUserFriends = getUserFriends;
exports.getGroups = getGroups;
exports.getDiscuss = getDiscuss;
exports.getSelfInfo = getSelfInfo;
exports.poll2 = poll2;
