# Server Guide

这是 YSSX 服务器部署与导航项目仓库，包含：

- `Tailscale-FreshRSS-部署攻略.md`：Tailscale + FreshRSS 私人移动阅读服务部署攻略。
- `server-nav/`：部署在服务器上的导航站与本地小游戏中心。

## server-nav

导航站默认端口：

```text
http://yssx.abrdns.com:8088
```

小游戏中心：

```text
http://yssx.abrdns.com:8088/games/
```

内置小游戏：

- 贪吃蛇
- 俄罗斯方块
- 扫雷
- 记忆翻牌
- 2048
- 打砖块

部署方式：

```bash
cd ~/server-nav
chmod +x deploy.sh
bash deploy.sh
```
