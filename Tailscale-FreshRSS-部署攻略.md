# Tailscale + FreshRSS 私人移动阅读服务部署攻略

本文档适合一台新租赁的 Linux 服务器，目标是在手机上安全访问自建 RSS 阅读器 FreshRSS。

推荐架构：

```text
手机 Tailscale App
        |
        | 私有加密 tailnet
        v
服务器 Tailscale
        |
        | Tailscale Serve 反向代理
        v
127.0.0.1:8080 -> FreshRSS Docker 容器
```

这样做的好处是：FreshRSS 不需要开放公网端口，只有登录你 Tailscale 网络的手机、电脑、平板能访问。

参考官方文档：

- Tailscale Linux 安装文档：https://tailscale.com/docs/install/linux
- Tailscale Serve 文档：https://tailscale.com/docs/reference/tailscale-cli/serve
- FreshRSS 安装文档：https://freshrss.github.io/FreshRSS/en/admins/03_Installation.html
- FreshRSS Docker 目录：https://github.com/FreshRSS/FreshRSS/tree/edge/Docker

## 1. 前置条件

假设服务器环境如下：

- 系统：Ubuntu 22.04/24.04 或 Debian 12
- 权限：可以使用 `sudo`
- 手机：iOS 或 Android
- 域名：不需要
- 公网端口：不需要开放 FreshRSS 端口

建议服务器最低配置：

- 1 核 CPU
- 1 GB 内存
- 10 GB 可用磁盘

FreshRSS 本身很轻量，真正占用空间的是 RSS 缓存、图片缓存和数据库。

## 2. 基础系统更新

SSH 登录服务器后执行：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg lsb-release ufw
```

设置时区：

```bash
sudo timedatectl set-timezone Asia/Shanghai
timedatectl
```

## 3. 安装 Tailscale

使用官方安装脚本：

```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

启动并登录：

```bash
sudo tailscale up
```

命令会输出一个登录链接。复制链接到浏览器，使用你的 Tailscale 账号完成授权。

验证服务器已经加入 tailnet：

```bash
tailscale status
tailscale ip
```

你会看到服务器的 Tailscale IP，通常是 `100.x.y.z`。

## 4. 给服务器设置固定名称

进入 Tailscale 管理后台：

```text
https://login.tailscale.com/admin/machines
```

建议做两件事：

1. 把服务器名称改成容易记的名字，例如 `rss-server`。
2. 对这台服务器禁用 key expiry，避免长期运行的服务器过期后需要重新登录。

注意：禁用 key expiry 会降低一点安全性，只建议对你信任且能长期控制的服务器这样做。

## 5. 手机安装 Tailscale

在手机应用商店安装 Tailscale：

- iOS：App Store 搜索 `Tailscale`
- Android：Google Play 搜索 `Tailscale`

登录同一个账号后，确认手机可以看到服务器。

在手机浏览器中测试访问服务器 Tailscale IP：

```text
http://100.x.y.z
```

此时还没有部署服务，打不开是正常的。关键是手机必须已经连接到 Tailscale。

## 6. 安装 Docker 和 Docker Compose

优先使用系统源安装：

```bash
sudo apt install -y docker.io docker-compose-plugin
```

启动 Docker：

```bash
sudo systemctl enable --now docker
sudo systemctl status docker
```

把当前用户加入 `docker` 组：

```bash
sudo usermod -aG docker $USER
```

退出 SSH 后重新登录，让权限生效。

验证：

```bash
docker --version
docker compose version
```

如果 `docker compose version` 不存在，说明系统源版本不完整，可以改用 Docker 官方安装文档：

```text
https://docs.docker.com/engine/install/
```

## 7. 创建 FreshRSS 目录

建议把服务统一放在 `/opt/stacks`：

```bash
sudo mkdir -p /opt/stacks/freshrss
sudo chown -R $USER:$USER /opt/stacks/freshrss
cd /opt/stacks/freshrss
```

创建数据目录：

```bash
mkdir -p data extensions
```

目录结构最终类似：

```text
/opt/stacks/freshrss/
├── compose.yml
├── data/
└── extensions/
```

## 8. 编写 Docker Compose 文件

创建 `/opt/stacks/freshrss/compose.yml`：

```yaml
services:
  freshrss:
    image: freshrss/freshrss:latest
    container_name: freshrss
    hostname: freshrss
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
    environment:
      TZ: Asia/Shanghai
      CRON_MIN: "3,33"
    volumes:
      - ./data:/var/www/FreshRSS/data
      - ./extensions:/var/www/FreshRSS/extensions
    logging:
      options:
        max-size: "10m"
```

关键点：

- `127.0.0.1:8080:80` 表示 FreshRSS 只监听服务器本机，不直接暴露公网。
- `CRON_MIN: "3,33"` 表示每小时第 3 分钟和第 33 分钟自动刷新订阅。
- `data` 是核心数据目录，必须备份。
- `extensions` 是扩展目录，也建议备份。

## 9. 启动 FreshRSS

在 `/opt/stacks/freshrss` 执行：

```bash
docker compose up -d
```

检查状态：

```bash
docker compose ps
docker logs --tail=100 freshrss
```

服务器本机测试：

```bash
curl -I http://127.0.0.1:8080
```

正常情况下会看到 HTTP 响应头。

## 10. 用 Tailscale Serve 暴露给 tailnet

FreshRSS 当前只监听 `127.0.0.1:8080`，手机无法直接访问。接下来用 Tailscale Serve 把它安全发布到你的 tailnet。

执行：

```bash
sudo tailscale serve --https=443 http://127.0.0.1:8080
```

查看 Serve 状态：

```bash
tailscale serve status
```

访问地址通常类似：

```text
https://rss-server.your-tailnet.ts.net
```

如果你启用了 MagicDNS，也可以在手机浏览器里尝试：

```text
https://rss-server
```

如果 HTTPS 访问不稳定，可以先用 HTTP 测试：

```bash
sudo tailscale serve --http=80 http://127.0.0.1:8080
```

然后手机访问：

```text
http://rss-server
```

建议最终使用 HTTPS。

## 11. 初始化 FreshRSS

在手机或电脑浏览器中打开 FreshRSS 地址：

```text
https://rss-server.your-tailnet.ts.net
```

初始化建议：

- 语言：简体中文或 English
- 数据库：SQLite
- 管理员账号：不要使用 `admin` 这种弱用户名
- 管理员密码：使用强密码

对于个人使用，SQLite 已经足够。除非后续多人使用或订阅量非常大，否则没必要上 PostgreSQL 或 MariaDB。

## 12. 手机端使用方式

你有三种常见用法。

### 方式 A：直接用手机浏览器

打开：

```text
https://rss-server.your-tailnet.ts.net
```

然后添加到主屏幕：

- iOS Safari：分享按钮 -> 添加到主屏幕
- Android Chrome：菜单 -> 添加到主屏幕

这是最简单的方案。

### 方式 B：使用支持 FreshRSS/Google Reader API 的 RSS 客户端

FreshRSS 支持 Fever API、Google Reader API 等兼容接口。你可以在 FreshRSS 后台启用对应 API，然后在移动端 RSS 客户端中登录。

常见客户端方向：

- iOS：Reeder、NetNewsWire、Lire 等
- Android：FeedMe、Read You、FocusReader 等

不同客户端支持情况会变，配置前先确认它是否支持 FreshRSS、Google Reader API 或 Fever API。

### 方式 C：只在 Tailscale 开启时访问

推荐做法是：

1. 平时手机 Tailscale 可以关闭。
2. 想读 RSS 时打开 Tailscale。
3. 访问 FreshRSS。
4. 读完后可以关闭 Tailscale。

如果你希望随时同步，手机 Tailscale 保持开启也可以。

## 13. 添加 RSS 订阅

进入 FreshRSS 后：

```text
订阅管理 -> 添加订阅
```

可以添加：

- 博客 RSS
- 新闻站 RSS
- GitHub Release Atom
- YouTube 频道 RSS
- 播客 RSS

YouTube 频道 RSS 示例：

```text
https://www.youtube.com/feeds/videos.xml?channel_id=频道ID
```

GitHub Release 示例：

```text
https://github.com/owner/repo/releases.atom
```

## 14. 服务器防火墙建议

如果你的服务器只通过 Tailscale 管理，公网只建议保留 SSH。

启用 UFW：

```bash
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status verbose
```

不要开放 `8080`：

```bash
sudo ufw deny 8080
```

由于 compose 文件已经绑定 `127.0.0.1:8080`，正常情况下公网也访问不到，但防火墙规则可以作为额外保护。

如果你确认以后 SSH 也只走 Tailscale，可以进一步限制公网 SSH，但这一步容易把自己锁在服务器外，建议熟悉后再做。

## 15. 更新 FreshRSS

进入目录：

```bash
cd /opt/stacks/freshrss
```

拉取新镜像并重启：

```bash
docker compose pull
docker compose up -d
docker image prune -f
```

查看日志：

```bash
docker logs --tail=100 freshrss
```

建议更新前先备份。

## 16. 备份 FreshRSS

FreshRSS 的关键数据在：

```text
/opt/stacks/freshrss/data
/opt/stacks/freshrss/extensions
/opt/stacks/freshrss/compose.yml
```

创建备份目录：

```bash
sudo mkdir -p /opt/backups/freshrss
sudo chown -R $USER:$USER /opt/backups/freshrss
```

手动备份：

```bash
cd /opt/stacks
tar -czf /opt/backups/freshrss/freshrss-$(date +%F-%H%M).tar.gz freshrss
```

查看备份：

```bash
ls -lh /opt/backups/freshrss
```

建议再把备份同步到另一台机器、对象存储或本地电脑。只存在同一台服务器上的备份，不能防止服务器磁盘损坏。

## 17. 自动备份

创建脚本：

```bash
sudo nano /usr/local/bin/backup-freshrss.sh
```

写入：

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/opt/backups/freshrss"
SOURCE_DIR="/opt/stacks/freshrss"
KEEP_DAYS=14

mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/freshrss-$(date +%F-%H%M).tar.gz" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")"
find "$BACKUP_DIR" -type f -name "freshrss-*.tar.gz" -mtime +"$KEEP_DAYS" -delete
```

授权：

```bash
sudo chmod +x /usr/local/bin/backup-freshrss.sh
```

测试：

```bash
sudo /usr/local/bin/backup-freshrss.sh
```

设置每天凌晨 3:20 自动备份：

```bash
sudo crontab -e
```

加入：

```cron
20 3 * * * /usr/local/bin/backup-freshrss.sh >/var/log/backup-freshrss.log 2>&1
```

## 18. 恢复 FreshRSS

停止服务：

```bash
cd /opt/stacks/freshrss
docker compose down
```

移动旧目录：

```bash
cd /opt/stacks
mv freshrss freshrss.broken.$(date +%F-%H%M)
```

解压备份：

```bash
tar -xzf /opt/backups/freshrss/freshrss-YYYY-MM-DD-HHMM.tar.gz -C /opt/stacks
```

启动：

```bash
cd /opt/stacks/freshrss
docker compose up -d
```

## 19. 常用维护命令

查看容器：

```bash
docker compose ps
```

查看 FreshRSS 日志：

```bash
docker logs -f freshrss
```

重启 FreshRSS：

```bash
cd /opt/stacks/freshrss
docker compose restart
```

停止 FreshRSS：

```bash
cd /opt/stacks/freshrss
docker compose down
```

查看 Tailscale 状态：

```bash
tailscale status
tailscale ip
tailscale serve status
```

取消 Tailscale Serve：

```bash
sudo tailscale serve reset
```

## 20. 排障

### 手机打不开 FreshRSS

先确认手机 Tailscale 已连接。

在服务器执行：

```bash
tailscale status
tailscale serve status
docker compose -f /opt/stacks/freshrss/compose.yml ps
curl -I http://127.0.0.1:8080
```

如果 `curl` 本机都打不开，问题在 FreshRSS 或 Docker。

如果本机能打开，但手机打不开，问题多半在 Tailscale Serve、MagicDNS 或手机 Tailscale 连接。

### HTTPS 地址打不开

检查 MagicDNS 是否开启：

```text
https://login.tailscale.com/admin/dns
```

也可以先用 Tailscale IP 访问：

```text
http://100.x.y.z:8080
```

但如果 compose 绑定的是 `127.0.0.1:8080`，这个地址默认访问不到。要通过 Tailscale IP 直连，需要把端口改成：

```yaml
ports:
  - "8080:80"
```

不推荐长期这样做，除非你清楚防火墙和访问控制。

### FreshRSS 不自动刷新

检查 `CRON_MIN` 是否存在：

```bash
docker inspect freshrss | grep CRON_MIN
```

查看日志：

```bash
docker logs --tail=200 freshrss
```

也可以在 FreshRSS 后台手动刷新订阅，确认源本身是否可用。

### 容器反复重启

查看日志：

```bash
docker logs --tail=200 freshrss
```

检查磁盘：

```bash
df -h
```

检查目录权限：

```bash
ls -lah /opt/stacks/freshrss
ls -lah /opt/stacks/freshrss/data
```

## 21. 推荐的安全基线

建议保留这些原则：

1. FreshRSS 只绑定 `127.0.0.1`，不直接开放公网。
2. 手机和电脑通过 Tailscale 访问。
3. FreshRSS 管理员使用强密码。
4. 定期备份 `/opt/stacks/freshrss`。
5. 服务器只开放必要公网端口。
6. Docker 镜像定期更新。
7. 不要把 Tailscale Funnel 打开给 FreshRSS，除非你明确需要公网访问。

## 22. 后续增强方案

部署稳定后，可以继续加：

- Uptime Kuma：监控 FreshRSS 是否可用。
- Watchtower：自动更新容器，但要谨慎，建议先手动更新。
- Miniflux：如果你更喜欢极简 RSS，也可以替代 FreshRSS。
- Wallabag：稍后阅读服务，可和 RSS 搭配。
- Linkding：自建书签服务，适合手机收藏链接。

## 23. 最终检查清单

部署完成后逐项确认：

- [ ] `tailscale status` 能看到服务器在线
- [ ] 手机 Tailscale 能看到服务器
- [ ] `docker compose ps` 显示 FreshRSS 正常运行
- [ ] `curl -I http://127.0.0.1:8080` 有响应
- [ ] `tailscale serve status` 有 FreshRSS 代理配置
- [ ] 手机能打开 `https://rss-server.your-tailnet.ts.net`
- [ ] FreshRSS 管理员账号已创建
- [ ] 已添加至少一个 RSS 源
- [ ] 已完成一次手动备份
- [ ] 已设置自动备份

