#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/server-nav"

docker rm -f server-nav 2>/dev/null || true
docker build --no-cache -t server-nav .
docker run -d --name server-nav --restart unless-stopped -p 8088:80 server-nav

echo
echo "容器状态："
docker ps --filter name=server-nav
echo
echo "首页检查："
curl -I http://127.0.0.1:8088 || true
echo
echo "小游戏中心检查："
curl -I http://127.0.0.1:8088/games/ || true
echo
echo "完成：http://yssx.abrdns.com:8088"
