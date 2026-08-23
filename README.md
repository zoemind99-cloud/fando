# FANDOR 官網草稿

從 Readdy 預覽站下載的 **WLAND FANDOR MEDIA** 網站草稿。

- 原始預覽：https://readdy.cc/preview/c5846cac-8c0f-4441-afa9-5251c60c1feb/12490536

## 本地預覽

```bash
npm install
npm run dev
```

瀏覽器開啟 http://localhost:5173

## 網站頁面

| 路徑 | 頁面 |
|------|------|
| `/` | 首頁 |
| `/about` | 關於我們 |
| `/articles` | 文章分享 |
| `/creators` | 創作者專區 |
| `/partners` | 廠商合作 |

## 目錄結構

```
├── index.html          # 入口頁
├── assets/             # 編譯後的 JS / CSS
├── public/images/      # 已下載的圖片（35 張）
├── site-info.json      # 網站結構與聯絡資訊
└── image-mapping.json  # 遠端圖片 → 本地路徑對照
```

## 重要說明

此下載包是 **Readdy 編譯後的預覽版本**（壓縮過的 React bundle），可以直接本地預覽，但**不適合深度修改**（例如改 React 元件、Tailwind 樣式等）。

若你要完整編輯原始碼，建議在 Readdy 後台：

1. 進入專案的 **Code Editor**
2. 點右上角 **Download** 按鈕
3. 下載 `.zip` 原始專案（React + TypeScript + Tailwind）
4. 解壓後執行 `npm install` 與 `npm run dev`

## 圖片

- 已下載 35 張圖片至 `public/images/`
