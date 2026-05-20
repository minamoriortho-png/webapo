# のばた矯正歯科 予約サイトMVP

Vite + React + TypeScript + Tailwind CSS のプレビュー実装です。

## ローカル起動

```bash
npm install
npm run dev
```

## Vercel設定

- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install

## 修正済みポイント

- `moduleResolution` は `Bundler`
- Tailwind CSS は v3.4.17 に固定
- PostCSSは `tailwindcss` を直接利用可能な構成
- 患者検索はハイフンなし電話番号に対応
- 患者側は1週間分の空き枠表示と前週/次週切替に対応
