# 物理实验门户

纯静态站点，无需安装 Node.js 依赖或构建。现有 `index.html` 和 `original/` 中的七个 HTML 保持不变。

## 使用 Caddy

使用你已经安装的 Caddy，先进入本目录，再运行：

```sh
caddy run --config ./Caddyfile --adapter caddyfile
```

浏览器访问 `http://localhost:8080/`；其他设备可访问 `http://服务器IP:8080/`，前提是网络和防火墙允许访问该端口。

- `/`：门户首页，提供八个页面入口。
- `/index.html`：现有磁场实验室。
- `/original/文件名.html`：七个原版演示，门户已配置完整链接。
- 入口在当前标签页打开，使用浏览器后退即可返回门户。

配置使用绝对根目录 `root * /mnt/code/physics`，不依赖启动工作目录。迁移站点时必须将它改为实际目录；确保 Caddy 用户有读取权限。

默认监听 `:8080`。端口已被占用时，修改 `Caddyfile` 第一处站点地址为其他空闲端口。要使用域名与自动 HTTPS，将 `:8080` 替换为实际域名，配置 DNS 指向服务器，并开放 80/443 端口。

## 公开范围与安全边界

配置使用精确路径白名单，只公开门户 HTML/CSS、现有实验室 HTML/CSS 与五个 JS 文件，以及 `original/` 中指定的七个 HTML。`/` 映射到门户；其他路径统一返回 404，包括 `fixed_v1/`、图片、Markdown、`Caddyfile`、`.env` 和 `.git`。没有启用目录列表，也没有使用 `/original/*` 等目录通配规则。以后添加页面或本地资源时，需要显式更新白名单。

Caddy 会处理 URL 路径穿越，但站点根目录不是文件系统沙箱：白名单文件如果被替换成指向外部的符号链接，仍可能暴露链接目标。部署时应保证站点目录及其父目录可信、不允许访客或上传程序修改；不要把白名单文件替换成符号链接。使用非 root 的专用用户运行 Caddy，并限制其敏感文件读取权限。参考 [Caddy 文件服务安全说明](https://caddyserver.com/docs/caddyfile/directives/file_server)。

`.gitignore` 排除本地 `Caddyfile` 及其变体、`fixed_v1/`、`.git1/` 备份、ZIP 和 `.env` 类文件（保留 `.env.example`）。网页及其 CSS/JS 不受影响。忽略规则不影响已跟踪文件，也不是 GitHub Pages 发布白名单；已经提交的敏感内容不会因此从历史记录消失。

## 文件与验证

新增 `portal.html`、`portal.css` 和 `Caddyfile`。首页不依赖外部字体、脚本或 CDN。

已用临时静态 HTTP 服务及真实浏览器验证：八个目标 HTML 均返回 HTTP 200，现有页面本地样式与脚本均可访问，手机宽度 390px 时门户无横向溢出，并验证了门户进入实验室及浏览器后退的路径。

安全收紧后，使用从实际配置提取白名单的临时 HTTP 模型验证：17 个允许请求返回 200，13 个拒绝请求返回 404，覆盖配置、隐藏文件、未列出的原版页面、备份目录、图片及路径穿越形式。核对了门户资源链接均在白名单中，16 个公开文件当前均为普通文件而非符号链接。临时 HTTP 模型不等价于 Caddy 的请求规范化或配置解析，不能作为 Caddy 安全实测证明。

未安装或运行 Caddy，未实测 Caddy 配置。可使用已有 Caddy 执行 `caddy validate --config ./Caddyfile --adapter caddyfile` 校验后再启动。原版回旋加速器页面的 MathJax 脚本、原版有界磁场页面的字体仍依赖外部服务，未改动这些依赖。
