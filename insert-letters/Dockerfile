##########################################################
#### ビルドステージ
FROM node:18.7.0-alpine3.15 as builder
WORKDIR /work

# ビルド用の依存パッケージをインストール
COPY ./package.json /work/
COPY ./package-lock.json /work/
RUN npm install

# TypeScript コードをコピーしてビルド
COPY ./tsconfig.json /work/
COPY ./src /work/
RUN npm run build

##########################################################
#### 実行用イメージの作成
FROM node:18.7.0-alpine3.15 as runner
WORKDIR /work

ENV NODE_ENV production
ENV PORT 80
EXPOSE 80

# 本番環境用のパッケージをインストール
COPY ./package.json /work/
COPY ./package-lock.json /work/
RUN npm install --omit=dev && npm cache clean --force

# builder からビルド結果だけコピー
COPY --from=builder /work/dist ./dist

# Node.js アプリを起動
CMD ["node", "./dist/index.js"]
