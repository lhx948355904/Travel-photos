# Ubuntu 24.04 LTS 上线流程

当前服务器系统：Ubuntu 24.04 LTS。

推荐部署方式：

```text
公网用户 -> 腾讯云安全组 80/443 -> Ubuntu Docker Compose
                                      |
                                      v
                                frontend/nginx
                                      |
                                      v
                                  backend
                                      |
                                      v
                                PostgreSQL/PostGIS
```

这比 Windows Server + WSL 简单很多：没有 Windows 端口转发，也没有 WSL IP 变化问题。服务器只需要 Git、Docker Engine 和 Docker Compose plugin。

参考官方文档：

- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- 腾讯云 CVM 安全组: https://cloud.tencent.com/document/product/213/12452

## 1. 腾讯云安全组

在腾讯云控制台给这台 CVM 放行：

- TCP `22`：SSH 登录
- TCP `80`：网站 HTTP
- TCP `443`：后续 HTTPS

不要放行：

- TCP `5432`：PostgreSQL
- TCP `8080`：后端 API

项目里的 `docker-compose.yml` 已经把 `5432` 和 `8080` 绑定到 `127.0.0.1`，公网只暴露 `80`。

## 2. 首次登录服务器

从本机 PowerShell 登录：

```powershell
ssh root@49.234.53.105
```

进入服务器后先更新系统：

```bash
apt update
apt upgrade -y
reboot
```

重启后重新登录：

```powershell
ssh root@49.234.53.105
```

## 3. 初始化服务器

如果这是全新系统，先安装基础工具：

```bash
apt update
apt install -y git ca-certificates curl gnupg ufw
```

如果服务器还没有 GitHub SSH key：

```bash
ssh-keygen -t ed25519 -C "tencent-ubuntu-deploy"
cat ~/.ssh/id_ed25519.pub
```

把输出的公钥添加到 GitHub 仓库：

```text
Settings -> Deploy keys -> Add deploy key
```

克隆项目：

```bash
mkdir -p /opt
cd /opt
git clone git@github.com:lhx948355904/Travel-photos.git travel-photo-map
cd /opt/travel-photo-map
```

然后运行项目自带的 Ubuntu 初始化脚本：

```bash
sudo bash scripts/init-ubuntu.sh
```

它会安装 Docker Engine、Docker Compose plugin、启用 Docker 服务，并配置 UFW 防火墙。

如果你是用非 root 用户部署，运行完后需要退出 SSH 再重新登录，让 Docker 用户组权限生效。

## 4. 配置生产环境变量

在服务器项目目录：

```bash
cd /opt/travel-photo-map
cp .env.example .env
nano .env
```

重点填写：

- `DB_PASSWORD`：数据库强密码
- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `COS_CDN_DOMAIN`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`
- `VITE_API_BASE=/api`
- `VITE_AMAP_KEY`
- `VITE_AMAP_SECURITY_CODE`

生成随机 JWT secret：

```bash
openssl rand -base64 48
```

`.env` 已经被 Git 忽略，不要提交。

## 5. 首次启动项目

```bash
cd /opt/travel-photo-map
docker compose up -d --build
docker compose ps
```

访问：

```text
http://49.234.53.105
```

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

## 6. 服务器一键更新

以后代码已经推送到 GitHub 后，服务器执行：

```bash
cd /opt/travel-photo-map
bash scripts/deploy-server.sh
```

它会做这些事：

```text
检查 Docker 和 .env
检查服务器工作区是否干净
git pull --ff-only
如果数据库正在运行，先备份到 backups/
docker compose up -d --build --remove-orphans
清理未使用镜像
展示容器状态
```

## 7. 本机一键提交

在你的 Windows 开发机项目根目录：

```powershell
.\scripts\push.ps1 "提交说明"
```

它会执行：

```text
git add -A
git commit -m "提交说明"
git push
```

## 8. 本机一键远程部署

前提：本机能 SSH 登录服务器。

```powershell
.\scripts\deploy-remote.ps1
```

默认连接：

```text
root@49.234.53.105:/opt/travel-photo-map
```

如果你改了用户或目录：

```powershell
.\scripts\deploy-remote.ps1 -User ubuntu -ProjectPath "/home/ubuntu/travel-photo-map"
```

## 9. 本机一键发布

日常最省事的命令：

```powershell
.\scripts\release.ps1 "更新说明"
```

它会先在本机提交并推送，再 SSH 到服务器执行：

```bash
cd /opt/travel-photo-map && bash scripts/deploy-server.sh
```

如果你不是用 root 登录：

```powershell
.\scripts\release.ps1 "更新说明" -User ubuntu -ProjectPath "/home/ubuntu/travel-photo-map"
```

## 10. 常用运维命令

查看容器：

```bash
cd /opt/travel-photo-map
docker compose ps
```

查看日志：

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

重启服务：

```bash
docker compose restart
```

停止服务：

```bash
docker compose down
```

查看端口：

```bash
ss -tulpn | grep -E ':80|:8080|:5432'
```

查看防火墙：

```bash
ufw status
```

## 11. 数据库备份和恢复

部署脚本会自动把备份写到：

```text
/opt/travel-photo-map/backups/
```

手动备份：

```bash
cd /opt/travel-photo-map
mkdir -p backups
docker compose exec -T db pg_dump -U "${DB_USER:-photomap}" photomap | gzip > "backups/photomap-$(date +%Y%m%d-%H%M%S).sql.gz"
```

如果你在 `.env` 里改过 `DB_USER`，手动备份时把上面的 `photomap` 换成实际用户名。

恢复备份前请谨慎确认目标库可以被覆盖：

```bash
gzip -dc backups/your-backup.sql.gz | docker compose exec -T db psql -U "${DB_USER:-photomap}" photomap
```

## 12. 后续 HTTPS/域名

如果后续绑定域名，推荐再加 HTTPS。最简单路线是：

```bash
apt install -y certbot
```

然后选择一种方案：

- 把证书挂载进前端 Nginx 容器，让容器监听 `443`
- 或者在宿主机装 Nginx/Caddy，做 HTTPS 反向代理到 `127.0.0.1:80`

到这一步时再单独调整 `nginx/default.conf` 和 `docker-compose.yml`，不要急着在没有域名时配置证书。
