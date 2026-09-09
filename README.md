# HOLO CARD

互动 2.5D 全息卡牌展馆。每张卡牌是一条独立、稳定的链接，用鼠标或手指拖动可以看到浮雕、箔膜和高光随视角变化，轻点翻到背面。

- 展馆：<https://mccrree.github.io/holo-card/>
- 卡牌：<https://mccrree.github.io/holo-card/asuka/>

## 仓库结构

```text
collection.json          卡牌总目录，决定展馆里的顺序与文案
cards/<slug>/card.json   单张卡牌的配置：正面图层、背面文字、景深参数
cards/<slug>/assets/     该卡牌的图层素材与浮雕数据
dist/                    构建产物，GitHub Pages 直接发布这一层
.github/workflows/       推送到 main 后自动部署
```

`dist/` 是提交进仓库的构建结果，不是临时目录——工作流上传的就是它。改完源文件后必须重新构建再提交。

## 新增一张卡牌

卡牌由 `holo-card-publisher` 技能生成。`<slug>` 一旦发布就不要再改，它就是那张卡的永久地址。

```bash
python scripts/add_card.py --collection . --slug <slug> --title <标题>
```

然后把图层素材放进 `cards/<slug>/assets/`（不透明背景、透明主体、可选线稿与文字框），依次执行：

```bash
python scripts/decontaminate_cutout.py cards/<slug>/assets/subject.png
python scripts/build_relief.py cards/<slug>/assets/subject.png --output-dir cards/<slug>/assets
python scripts/build_collection.py --collection . --base-url https://mccrree.github.io/holo-card/
python scripts/validate_collection.py .
```

已发布卡牌的地址不受新增影响。

## 本地预览

`dist/` 是纯静态站点，任意静态服务器都能跑。`file://` 打开会因为跨域限制读不到 `card.json`。

```bash
python -m http.server 4190 --bind 127.0.0.1 --directory dist
```

## 素材归属

卡面素材为本项目自行准备，用于个人收藏展示；相关角色的版权归其原始权利人所有。
