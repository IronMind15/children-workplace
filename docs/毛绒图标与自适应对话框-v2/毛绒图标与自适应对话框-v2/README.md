# 毛绒图标与自适应对话框

本目录包含：

- 10 个独立功能按钮 PNG；
- 5 个不同尺寸的空白对话框 PNG；
- 1 张 16:10 素材总览板；
- 可直接嵌入网页的 `plush-dialog.js`；
- 可交互预览页 `demo.html`。
- 已打包到 `fonts/` 的本地中文字体与授权文件。

## 使用对话框

```html
<script src="./plush-dialog.js"></script>

<plush-dialog
  placeholder="输入对话"
  min-width="180"
  max-width="560"
  font-size="26px"
  tone="cream"
  tail="left">
</plush-dialog>
```

对话框会先随文字横向增长，达到 `max-width` 后自动换行并增加高度。

可用属性：

- `tone="cream|blue|green|pink|purple"`
- `tail="left|center|right|none"`
- `min-width="180"`
- `max-width="560"`
- `font-size="26px"`
- `placeholder="输入内容"`

JavaScript 接口：

```js
const dialog = document.querySelector("plush-dialog");
dialog.value = "新的对话内容";
dialog.addEventListener("plush-input", (event) => {
  console.log(event.detail.value);
});
```

## 字体建议

首选组合：

- 标题、按钮短词：得意黑 Smiley Sans；
- 正文和较长说明：Noto Sans SC；
- 伙伴对话、故事文字备选：霞鹜文楷 LXGW WenKai。

字体已经打包进 `fonts/`，`plush-dialog.js` 会自动加载 `fonts/fonts.css`，无需依赖在线字体服务：

- `fonts/SmileySans-Oblique.woff2`
- `fonts/NotoSansSC-Variable.ttf`
- `fonts/LXGWWenKaiLite-Regular.ttf`

授权文件也保存在同一目录。复制或发布组件时，请将整个 `fonts/` 目录一起保留。

可直接使用以下 CSS 变量：

```css
font-family: var(--knowledge-display-font); /* 标题和短按钮 */
font-family: var(--knowledge-body-font);    /* 正文 */
font-family: var(--knowledge-dialog-font);  /* 伙伴对话 */
```

## 素材说明

图标素材由内置 ImageGen 根据原始按钮样例生成，提示词重点为：纯图形表达、毛绒皮革、海军蓝软包边、金色铆钉、功能分区配色、无文字与水印。
