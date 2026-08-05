.PHONY: dev dev-backend dev-frontend build build-backend build-frontend install

# === DEVELOPMENT ===

dev: dev-backend dev-frontend

dev-backend:
	cd API && bun run dev

dev-frontend:
	cd App_Web && bun run dev

# === BUILD ===

build: build-backend build-frontend

build-backend:
	cd API && bun run build

build-frontend:
	cd App_Web && bun run build

# === INSTALL ===

install:
	cd API && bun install
	cd App_Web && bun install

# === CLEAN ===

clean:
	rm -rf API/node_modules API/dist
	rm -rf App_Web/node_modules App_Web/dist
