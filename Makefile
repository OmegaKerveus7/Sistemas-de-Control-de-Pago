.PHONY: dev dev-backend dev-frontend build build-backend build-frontend install clean stop stop-backend stop-frontend

# === DEVELOPMENT ===
# Backend  -> http://localhost:4000
# Frontend -> http://localhost:5173

dev:
	@echo "=============================================="
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend : http://localhost:4000/api"
	@echo "  Health  : http://localhost:4000/api/health"
	@echo "=============================================="
	cd backend && bun run dev & cd frontend && bun run dev & wait

dev-backend:
	cd backend && bun run dev

dev-frontend:
	cd frontend && bun run dev

# === BUILD ===

build: build-backend build-frontend

build-backend:
	cd backend && bun run build

build-frontend:
	cd frontend && bun run build

# === INSTALL ===

install:
	cd backend && bun install
	cd frontend && bun install

# === STOP ===
# Mata lo que escuche en el puerto. Compatible con Mac/Linux (lsof)
# y Windows (PowerShell).

stop: stop-backend stop-frontend

stop-backend:
	@if command -v lsof >/dev/null 2>&1; then lsof -ti :4000 | xargs kill; else powershell.exe -NoProfile -Command 'Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }'; fi; true

stop-frontend:
	@if command -v lsof >/dev/null 2>&1; then lsof -ti :5173 | xargs kill; else powershell.exe -NoProfile -Command 'Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }'; fi; true

# === CLEAN ===

clean:
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/dist
