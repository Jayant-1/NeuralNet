#!/bin/bash
# ============================================================
# LayerLab — Start both backend and frontend
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting LayerLab..."

# Start backend
echo "📦 Starting backend (FastAPI on :8000)..."
cd backend
source venv/bin/activate 2>/dev/null || true
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start frontend
echo "🎨 Starting frontend (Vite on :5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ LayerLab is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C to kill both processes
trap "echo ''; echo '🛑 Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for both
wait
