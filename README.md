# Web Emulator Arcade — Ultimate

✅ 零安装纯前端 | ✅ 游戏库（IndexedDB） | ✅ 手柄支持 | ✅ AudioWorklet（自动降级） | ✅ 多内核（NES + GB/GBC）

## 快速开始
```bash
npm i
npm run dev
# 构建静态站：
npm run build
```

## 使用方法
- **Play**：加载 `.nes/.gb/.gbc` ROM；键盘或手柄可玩；支持拖拽/粘贴。
- **Library**：把 ROM 加入本地库（IndexedDB），网格封面显示；点击 Play 即可运行。
- **Settings**：手柄开关；AudioWorklet 说明。

## 手柄映射（标准 Gamepad）
- D-Pad: 上/下/左/右 → NES D-Pad
- 0/1 按钮 → A/B
- 8 → Select，9 → Start

## 多内核
已集成：
- **NES**：`jsnes`
- **GB/GBC**：`wasmboy`

> 扩展其它机种时，按 `cores/*` 接口（`loadROM`, `frame`, `buttonDown/Up` 等）对齐即可。

## AudioWorklet
开发服务已设置 COOP/COEP 头，Worklet 可用；正式托管请在服务器添加：
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
无法添加时会自动降级到 ScriptProcessorNode。

## 法律声明
仅加载你**合法拥有**或**公共领域/自制**的 ROM。



## GitHub Pages 部署

1. 新建 GitHub 仓库（建议分支名 `main`）。
2. 推送代码：
```bash
git init
git add .
git commit -m "init: arcade ultimate"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```
3. 打开仓库 **Settings → Pages**：
   - Source 选择 **GitHub Actions**。
   - 第一次推送后，Actions 会自动构建并部署到 `gh-pages`。
4. 访问页面：`https://<YOUR_USERNAME>.github.io/<YOUR_REPO>/`

> 如果你启用前端路由，建议在 `dist/` 里放一个 `404.html`（可复制 `index.html`），保证刷新子路由时能回退到 SPA。
