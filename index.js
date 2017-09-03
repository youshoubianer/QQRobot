'use strict'

const QQRobot = require('./QQRobot');
const co = require('co');
const request = require('request');

co(function* () {
  yield QQRobot.login();
  QQRobot.pollingLoginState(function (checkUrl) {
    console.log('登陆成功')
    wakeUp(checkUrl);
  });
})


function wakeUp(checkUrl) {
  co(function* () {
    yield QQRobot.checkSig(checkUrl);
    console.log('========= cookies =========')
    console.log(QQRobot.cookies)
    yield QQRobot.getvfwebqq();
    yield QQRobot.login2();
    yield QQRobot.getUserFriends();
    yield QQRobot.getGroups();
    yield QQRobot.getDiscuss();
    yield QQRobot.getSelfInfo();
    yield QQRobot.poll2();

  })
}