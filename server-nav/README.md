# YSSX 服务器控制台

这是一个部署在 `~/server-nav` 的静态服务器入口站，包含：

- 服务器导航首页：`http://yssx.abrdns.com:8088/`
- 小游戏中心：`http://yssx.abrdns.com:8088/games/`

首页服务：

| 名称 | 地址 |
| --- | --- |
| 博客 | `http://yssx.abrdns.com:1234/` |
| 云盘 | `http://yssx.abrdns.com:5244/` |
| 阅读器 | `http://yssx.abrdns.com:5000/` |
| 酒馆项目 | `http://yssx.abrdns.com:8100/` |
| 小游戏中心 | `http://yssx.abrdns.com:8088/games/` |

小游戏中心内置：

- 贪吃蛇
- 俄罗斯方块
- 扫雷
- 记忆翻牌
- 2048
- 打砖块

## 目录结构

```text
~/server-nav/
├── Dockerfile
├── nginx.conf
├── index.html
├── styles.css
├── assets/
│   ├── console-hero.svg
│   ├── game-hero.svg
│   ├── icon-blog.svg
│   ├── icon-cloud.svg
│   ├── icon-reader.svg
│   ├── icon-tavern.svg
│   └── icon-games.svg
└── games/
    ├── index.html
    ├── games.css
    └── games.js
```

## 部署

登录服务器后，把文件放到：

```bash
~/server-nav
```

然后执行：

```bash
cd ~/server-nav
docker rm -f server-nav 2>/dev/null || true
docker build --no-cache -t server-nav .
docker run -d --name server-nav --restart unless-stopped -p 8088:80 server-nav
```

检查：

```bash
docker ps --filter name=server-nav
curl -I http://127.0.0.1:8088
curl -I http://127.0.0.1:8088/games/
```

访问：

```text
http://yssx.abrdns.com:8088
```

## 防火墙

如果启用了 UFW：

```bash
sudo ufw allow 8088/tcp
sudo ufw status
```

如果云服务商有安全组，也要放行 `8088/tcp`。

## 更新

修改文件后重新构建：

```bash
cd ~/server-nav
docker rm -f server-nav 2>/dev/null || true
docker build --no-cache -t server-nav .
docker run -d --name server-nav --restart unless-stopped -p 8088:80 server-nav
```

## 常用命令

查看日志：

```bash
docker logs -f server-nav
```

进入容器检查文件：

```bash
docker exec server-nav ls -lah /usr/share/nginx/html
docker exec server-nav ls -lah /usr/share/nginx/html/games
```

停止：

```bash
docker rm -f server-nav
```
