# AI 自动切片：成片编辑与词库预设

2026-10-20 发布版本，来源为当前工作副本的 `live-slice-prototype.html`。

- `index.html`：线上发布入口，默认打开「成片编辑」。
- `live-slice-prototype.html`：完整可交互原型，与发布入口内容一致。
- `assets/`：成片字幕编辑、发布页、演示封面与图标资源，打开原型时需要同目录提供。
- `document.md` / `prd.html`：本次发布范围及实际功能说明。
- `源码说明.md`：源码结构、存储与继续修改方式。

本次交付覆盖「成片编辑」全部现有交互，以及「店铺预设 → 词库管理」（用户所称的词库预设）。两个页面共用页面框架、预设状态和业务脚本，因此保留完整可运行源码及关联入口。

这是静态前端原型，无需安装依赖或构建。线上入口默认进入成片编辑；词库入口为「店铺预设 → 词库管理」。本地可直接打开 HTML，或使用静态 HTTP 服务。

页面中的数据为演示数据，字幕、词库和发布草稿在当前浏览器本地保存。真实视频生成、平台发布、剪映草稿导出和 Excel 解析尚未接入；批量上传词库使用固定示例，模板下载显示演示提示。

## 发布位置

- GitHub 仓库：https://github.com/p1466768763-blip/ai-auto-slice-shop-presets-V1.2
- GitHub Pages：https://p1466768763-blip.github.io/ai-auto-slice-shop-presets-V1.2/
- Codeup：企业 `prd` 仓库下的 `ai-auto-slice-shop-presets-V1.2/`。
- 内部预览：https://prd.kmeila.com/ai-auto-slice-shop-presets-V1.2/index.html （需要公司登录态）。

桌面另提供「成片编辑.html」和「词库预设.html」两个自包含导出文件，分别默认进入对应页面，样式、脚本和图片已内嵌。
