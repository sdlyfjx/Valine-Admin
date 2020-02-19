'use strict';
const request = require('request');
const crypto = require('crypto');
const dayjs = require('dayjs');
const html2md = require('markdownparser');

const WXWorkKEY = process.env.WXWORK_WEBHOOK_KEY,
    WechatURL = process.env.WECHAT_URL,
    WechatID = process.env.WECHAT_APPID,
    WechatKey = process.env.WECHAT_SECRET;

exports.notice = (comment) => {
    let SITE_NAME = process.env.SITE_NAME;
    let TIME = dayjs(comment.get('updatedAt')).format('YY-M-D HH:mm:ss');
    let NICK = comment.get('nick');
    let COMMENT = html2md.parse(comment.get('comment'));
    let POST_URL = process.env.SITE_URL + comment.get('url') + '#' + comment.get('objectId');

    let markdownContent = `## ${SITE_NAME}收到<font color=\"info\">新评论：</font>\n> 评论时间：<font color=\"comment\">${TIME}</font>\n> 评论人：${NICK}说\n\n${COMMENT}\n\n\n点击[【原文链接】](${POST_URL})查看完整內容`;

    var options = {
        'method': 'POST',
        'url': `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${WXWorkKEY}`,
        'headers': {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "msgtype": "markdown",
            "markdown": {
                "content": markdownContent
            }
        })
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response) {
            if (error) {
                console.log(error);
                reject(error);
            }
            console.log('站长通知成功发送: %s', response.body);
            comment.set('isNotified', true);
            comment.save();
            resolve(response.body);
        });
    })
}

exports.send = (currentComment, parentComment) => {
    let PARENT_UNIONID = parentComment.get('mail');
    if (/o[0-9a-zA-Z]{27,30}/.test(PARENT_UNIONID) == false) {
        return console.log('非正规UnionID')
    }

    let PARENT_NICK = parentComment.get('nick');
    let PARENT_COMMENT = parentComment.get('comment');
    let PARENT_DATE = dayjs(parentComment.get('updatedAt')).format('YYYY-MM-DD HH:mm:ss');

    let NICK = currentComment.get('nick');
    let COMMENT = currentComment.get('comment');
    let DATE = dayjs(currentComment.get('updatedAt')).format('YYYY-MM-DD HH:mm:ss');

    let POST_URL = process.env.SITE_URL + currentComment.get('url') + '#' + currentComment.get('objectId');

    let options = {
        'method': 'POST',
        'url': WechatURL,
        'headers': getAPIHeader(),
        'body': JSON.stringify([{
            "topic": "评论回复",
            "unionId": PARENT_UNIONID,
            "headText": `您好【${PARENT_NICK}】：\n您在【${PARENT_DATE}】的留言有了新的回复！`,
            "replyer": NICK,
            "replyDate": DATE,
            "replyInfo": COMMENT,
            "footText": `您的评论内容为：${PARENT_COMMENT}`,
            "url": POST_URL
        }])
    };

    return new Promise((resolve, reject) => {
        request(options, function (error, response) {
            if (error) {
                console.log(error);
                reject(error);
            }
            console.log('AT通知成功发送: %s', response.body);
            currentComment.set('isNotified', true);
            currentComment.save();
            resolve(response.body);
        });
    });
};

function getAPIHeader() {
    var dateTime = new Date().toGMTString();
    const SecretId = WechatID;
    const SecretKey = WechatKey;
    const source = 'LeanCloud';
    const ContentType = 'application/json'
    var signStr = `date:${dateTime}\nsource:${source}\ncontent-type:${ContentType}`;
    // console.log(signStr);
    let hmac = crypto.createHmac('sha1', SecretKey);
    let sign = hmac.update(signStr).digest('base64');
    // console.log(sign.toString())
    var auth = `hmac id="${SecretId}", algorithm="hmac-sha1", headers="date source content-type", signature="${sign}"`;
    console.log(auth);
    return {
        'Source': source,
        'Date': dateTime,
        'Authorization': auth,
        'Content-Type': ContentType
    }
}