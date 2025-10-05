FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN if [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile;     elif [ -f package-lock.json ]; then npm ci; else npm i; fi
COPY . .
RUN npm run build || true
ENV PORT=3000
EXPOSE 3000
CMD [ "node", "dist/server.js" ]
