Valine Admin 是 [Valine 评论系统](https://deserts.io/diy-a-comment-system/)的扩展和增强，主要实现评论邮件通知、评论管理、垃圾评论过滤等功能。支持完全自定义的邮件通知模板。基于Akismet API实现准确的垃圾评论过滤。此外，使用云函数等技术解决了免费版云引擎休眠问题，支持云引擎自动唤醒，漏发邮件自动补发。兼容云淡风轻及Deserts维护的多版本Valine。

> NOTE: **该项目基于LeanCloud云引擎示例代码实现，您可以自由地复制和修改。包含了一些 trick 实现资源的最大化利用 ，但请勿滥用免费资源。引用本说明文档及Deserts博客上的相关文章务必注明来源。**

[评论在线演示及相关功能测试](https://panjunwen.github.io/Valine/)

安装教程请以[博客最新版](https://deserts.io/valine-admin-document/)为准。

## 快速部署

 1. 在[Leancloud](https://leancloud.cn/dashboard/#/apps)云引擎设置界面，填写代码库并保存：https://github.com/DesertsP/Valine-Admin.git

![设置仓库](https://cloud.panjunwen.com/2018/09/ping-mu-kuai-zhao-2018-09-15-xia-wu-12-56-04.png)

 2. 在设置页面，设置环境变量以及 Web 二级域名。

![环境变量](https://cloud.panjunwen.com/2018/09/ping-mu-kuai-zhao-2018-09-15-xia-wu-3-40-48.png)

<div class="table-wrap">

变量 | 示例 | 说明
--- | ------ | ------
SITE_NAME | Deserts | [必填]博客名称
SITE_URL  | https://deserts.io | [必填]首页地址 
ADMIN_URL | https://xxx.leanapp.cn/ | [建议]Web主机二级域名，用于自动唤醒或评论管理后台的访问链接
BLOGGER_EMAIL | XXXXXXXXXXXX | [必填]管理员email，用于管理后台登录
AKISMET_KEY | xxxxxxxxxxxx | [可选]Akismet Key 用于垃圾评论检测，设为MANUAL_REVIEW开启人工审核，留空不使用反垃圾
BAIDU_APPID | xxxxxxxxxxxx | [可选]百度云内容审核引擎APPID（用于垃圾评论检测，设为MANUAL_REVIEW开启人工审核，优先级高于AKISMET_KEY，若配置则优先使用Baidu内容审核）
BAIDU_APIKEY | xxxxxxxxxxxx | [可选]若启用百度内容审核则必填，可前往https://ai.baidu.com/censoring 配置审核策略和申请应用AK SK
BAIDU_SECRET | xxxxxxxxxxxx | [可选]若启用百度内容审核则必填
WXWORK_WEBHOOK_KEY | xxxxxxxxxxxx | [必填]企业微信群机器人的WebHook地址中的key
WECHAT_URL | xxxxxxxxxxx | [必填]公众号推送服务地址（用户自主搭建的服务）
WECHAT_APPID | xxxxxxxxxxxx | [必填]公众号推送服务的APPID（不是公众号接口的APPID，是上面这个服务的鉴权）
WECHAT_SECRET | xxxxxxxxxxxx | [必填]公众号推送服务的SECRET（同上）

</div>
    
**以上必填参数请务必正确设置。**

二级域名用于评论后台管理，如[https://deserts.leanapp.cn](https://deserts.leanapp.cn) 。

![二级域名](https://cloud.panjunwen.com/2018/09/ping-mu-kuai-zhao-2018-09-15-xia-wu-1-06-41.png)

 3. 切换到部署标签页，分支使用master，点击部署即可

![一键部署](https://cloud.panjunwen.com/2018/09/ping-mu-kuai-zhao-2018-09-15-xia-wu-12-56-50.png)

第一次部署需要花点时间。

![部署过程](https://cloud.panjunwen.com/2018/09/ping-mu-kuai-zhao-2018-09-15-xia-wu-1-00-45.png)

 4. 评论管理。访问设置的二级域名`https://二级域名.leanapp.cn/sign-up`，注册管理员登录信息，如：[https://deserts.leanapp.cn/sign-up](https://deserts.leanapp.cn/sign-up) 
    <img src="https://cloud.panjunwen.com/2018/10/ping-mu-kuai-zhao-2018-10-22-xia-wu-9-35-51.png" alt="管理员注册" style="
    width: 600px;">

    >注：使用原版Valine如果遇到注册页面不显示直接跳转至登录页的情况，请手动删除_User表中的全部数据。

   此后，可以通过`https://二级域名.leanapp.cn/`管理评论。
    
 5. 定时任务设置

目前实现了两种云函数定时任务：(1)自动唤醒，定时访问Web APP二级域名防止云引擎休眠；(2)每天定时检查24小时内漏发的邮件通知。

进入云引擎-定时任务中，创建定时器，创建两个定时任务。

选择self-wake云函数，Cron表达式为`0 0/30 7-23 * * ?`，表示每天早6点到晚23点每隔30分钟访问云引擎，`ADMIN_URL`环境变量务必设置正确：


<img src="https://cloud.panjunwen.com/2018/09/ping-mu-kuai-zhao-2018-09-18-xia-wu-2-57-43.png" alt="唤醒云引擎">

选择resend-mails云函数，Cron表达式为`0 0 8 * * ?`，表示每天早8点检查过去24小时内漏发的通知邮件并补发：

<img src="https://cloud.panjunwen.com/2018/09/ping-mu-kuai-zhao-2018-09-18-xia-wu-2-57-53.png" alt="通知检查" >


**添加定时器后记得点击启动方可生效。**

**至此，Valine Admin 已经可以正常工作，更多以下是可选的进阶配置。**
-----------------

## 垃圾评论检测

> Akismet (Automattic Kismet)是应用广泛的一个垃圾留言过滤系统，其作者是大名鼎鼎的WordPress 创始人 Matt Mullenweg，Akismet也是WordPress默认安装的插件，其使用非常广泛，设计目标便是帮助博客网站来过滤留言Spam。有了Akismet之后，基本上不用担心垃圾留言的烦恼了。
> 启用Akismet后，当博客再收到留言会自动将其提交到Akismet并与Akismet上的黑名单进行比对，如果名列该黑名单中，则该条留言会被标记为垃圾评论且不会发布。

如果还没有Akismet Key，你可以去 [AKISMET FOR DEVELOPERS 免费申请一个](https://akismet.com/development/)；
**当AKISMET_KEY设为MANUAL_REVIEW时，开启人工审核模式；**
如果你不需要反垃圾评论，Akismet Key 环境变量可以忽略。

**为了实现较为精准的垃圾评论识别，采集的判据除了评论内容、邮件地址和网站地址外，还包括评论者的IP地址、浏览器信息等，但仅在云引擎后台使用这些数据，确保隐私和安全。**

**如果使用了本站最新的Valine和Valine Admin，并设置了Akismet Key，可以有效地拦截垃圾评论。被标为垃圾的评论可以在管理页面取消标注。**

环境变量 | 示例 | 说明
--- | ------ | ------
AKISMET_KEY | xxxxxxxxxxxx | [可选]Akismet Key 用于垃圾评论检测

## 百度AI垃圾评论检测

> 使用百度内容审核平台替代Akismet的审核功能，白名单和黑名单的提交功能由于百度没有开放接口所以只能在百度后台进行配置。
> 相比于Akismet，百度内容审核平台属于付费产品，但个人有一定免费额度（文本接口实名认证后累计50万次调用，还有图像接口，详见[计费规则](https://ai.baidu.com/ai-doc/ANTIPORN/lk3h6x7if)）
> 百度审核只审核评论的内容，不需要任何用户信息，相比Akismet来说更加简单直接。同时支持配置[自定义审核策略](https://ai.baidu.com/censoring)，可对色情、暴恐、政治敏感、恶意推广、低俗辱骂、低质灌水等内容进行阈值自定义调整，使用上更加灵活方便。
> 同时由于百度没有提供黑白名单的API接口（通过配置策略自主上传），所以如果选择了百度审核，则本管理后台的黑白名单的功能将不会生效，请前往百度后台自主配置。

如果还没有百度云账号，你可以去百度大脑的 [AI开放平台](https://ai.baidu.com/tech/textcensoring) 免费申请一个；

**当BAIDU_APPID设为MANUAL_REVIEW时，开启人工审核模式；**
如果你不需要反垃圾评论，BAIDU_APPID环境变量可以忽略。

~~**为了实现较为精准的垃圾评论识别，采集的判据除了评论内容、邮件地址和网站地址外，还包括评论者的IP地址、浏览器信息等，但仅在云引擎后台使用这些数据，确保隐私和安全。**~~
百度审核不需要这些内容

环境变量 | 示例 | 说明
--- | ------ | ------
BAIDU_APPID | xxxxxxxxxxxx | [可选]百度云内容审核引擎APPID（用于垃圾评论检测，设为MANUAL_REVIEW开启人工审核，优先级高于AKISMET_KEY，若配置则优先使用Baidu内容审核）
BAIDU_APIKEY | xxxxxxxxxxxx | [可选]若启用百度内容审核则必填，可前往https://ai.baidu.com/censoring 配置审核策略和申请应用AK SK
BAIDU_SECRET | xxxxxxxxxxxx | [可选]若启用百度内容审核则必填

## 防止云引擎休眠

关于自动休眠的官方说法：[点击查看](https://leancloud.cn/docs/leanengine_plan.html#hash633315134)

目前最新版的 Valine Admin 已经可以实现自唤醒，即在 LeanCloud 云引擎中定时请求 Web 应用地址防止休眠。对于夜间休眠期漏发的邮件通知，自动在次日早上补发。**务必确保配置中设置了ADMIN_URL环境变量，并在第5步添加了两个云函数定时任务。**

## Troubleshooting

- 部署失败，请在评论中附图，或去Github发起Issue
- 邮件发送失败，确保环境变量都没问题后，重启云引擎
  
    ![重启云引擎](https://cloud.panjunwen.com/2018/09/ping-mu-kuai-zhao-2018-09-15-xia-wu-5-22-56.png)
    
- 博主通知模板中不要出现`PARENT*`相关参数（请勿混用模板）

-  点击邮件中的链接跳转至相应评论，这一细节实现需要一点额外的代码：

``` javascript
<script>
    if(window.location.hash){
        var checkExist = setInterval(function() {
           if ($(window.location.hash).length) {
              $('html, body').animate({scrollTop: $(window.location.hash).offset().top-90}, 1000);
              clearInterval(checkExist);
           }
        }, 100);
    }
</script>
```

## 相关项目

评论框前端：[Valine on Github](https://github.com/panjunwen/Valine)

[Disqus2LeanCloud数据迁移](http://disqus.panjunwen.com/)

------------------

## 开发者文档

**以下内容仅用于 LeanEngine 开发，普通用户无需理会**

首先确认本机已经安装 [Node.js](http://nodejs.org/) 运行环境和 [LeanCloud 命令行工具](https://leancloud.cn/docs/leanengine_cli.html)，然后执行下列指令：

```
$ git clone https://github.com/DesertsP/ValineAdmin.git
$ cd ValineAdmin
```

安装依赖：

```
npm install
```

登录并关联应用：

```
lean login
lean switch
```

启动项目：

```
lean up
```

之后你就可以在 [localhost:3000](http://localhost:3000) 访问到你的应用了。

部署到预备环境（若无预备环境则直接部署到生产环境）：
```
lean deploy
```

## License

[MIT License](https://github.com/panjunwen/LeanComment/blob/master/LICENSE)
