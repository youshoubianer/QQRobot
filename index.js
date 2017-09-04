'use strict'

const QQRobot = require('./QQRobot');
const co = require('co');

co(function* () {
  yield QQRobot.login();
  QQRobot.pollingLoginState(function (checkUrl) {
    wakeUp(checkUrl);
  });
})

function wakeUp(checkUrl) {
  co(function* () {
    yield QQRobot.checkSig(checkUrl);
    yield QQRobot.getvfwebqq();
    yield QQRobot.login2();
    yield QQRobot.getUserFriends();
    yield QQRobot.getGroups();
    yield QQRobot.getDiscuss();
    yield QQRobot.getSelfInfo();
    yield QQRobot.poll2();
  })
}
