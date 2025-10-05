.PHONY: dev build start clean-output

dev:
	pnpm dev || npm run dev

build:
	npm run build

start:
	npm start

clean-output:
	npm run clean-output
