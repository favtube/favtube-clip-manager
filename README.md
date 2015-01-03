
# favtube-clip-manager （Chrome supported)

This is a juicy clip manager. It allow you split a lengthy video into small clips and manage them.
There are two language versions of documentation - 中文 and English .


##中文文档
###什么是favtube-clip-manager

催生这个项目产生主要两个原因：

1. **大视频化小，方便管理利用：** 许多影视素材通常都很大，作为一个业余的想利用影视素材做一些简单的非盈利的作品（注意版权问题）的童鞋，发现没有比较方便的方法来截取和快速的利用这些素材，所以尝试从程序的角度，自动化的将长视频转码，切割成小段以方便素材的管理和采用。

2. **交互灵活，可编程操控：** 同时，当转码成浏览器认识的小片段之后，可做的事情就精（sang）彩（xin）多（bing）样（kuang）了。你可以通过程序，教ffmpeg如何重新切割或组织作品，你甚至可以利用这些素材制作可交互的电影rpg。

favtube-clip-manager就是这么个项目，它由最简单的功能起步，相信会逐渐增加功能，最后变成一个有意思的视频管理和再创造的工具。

目前有的功能：v0.1

* 利用ffmpeg和ffprobe，将视频转码（h264, aac）切割成小段。
* 用nodejs的express，运行一个简单的webapp来预览分割后的片段。

###安装

####1. 获得favtube的项目代码

` git clone https://github.com/favtube/favtube-clip-manager.git `

如果你不太喜欢命令行，推荐考虑用 [SourceTree](http://www.sourcetreeapp.com/) 这个工具。

####2. 下载node，设置npm

* 如果你没有用过nodejs，那你有些out了，赶紧去 [Nodejs官网](http://nodejs.org/) 下载安装nodejs吧。
* 安装完nodejs，安装npm ( https://www.npmjs.com/ )

####3. 项目初始化
* npm到手之后，进入命令行，然后cd到项目的文件夹，运行 `npm install`
* 然后就是`npm rebuild`
* 运行 `node app.js`，然后用chrome访问 `localhost:3000`。如果你能看到又东西，那么说明安装成功了。

###视频分割
* 将要自动分割的视频复制到favtube下的videos-raw文件夹
* 在命令行下（favtube的文件夹下）运行 `node video-processer.js`
* 过一段时间后，分割成功，你应该能在videos里发现有一个新的文件夹，里面包含了分割后的小段，和一些截图，以及一些相关的属性文件
* 原始视频会被移动到videos-raw-processed这个文件夹里。同时，会有一个新的视频（使用h264,aac的视频编码）被新建，放在了videos-processed里。如果你觉得原始视频没必要，直接可以删除掉保留这个新的视频，或者两个都可以删了节约空间。

###启动web应用
* 在命令行下，继续在favtube的文件夹下，运行`node app.js`
* 使用chrome，注意，目前只能是chrome，访问`localhost:3000`
* v0.1里，你可以将任何视频片段加到你的书签里。
* 你还可以随机播放片段，你也可以使用filter的功能，只播放加入书签的视频。



## English documentation

(under construction)
