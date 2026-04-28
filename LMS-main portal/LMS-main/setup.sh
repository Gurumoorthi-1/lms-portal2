#!/bin/bash
echo "🚀 Setting up CodePath LMS..."

echo "📦 Installing backend dependencies..."
cd backend && npm install

echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install

echo ""
echo "✅ Done! Now:"
echo ""
echo "1. Configure backend/.env (copy from backend/.env.example)"
echo "2. Make sure MongoDB is running"
echo "3. Run: cd backend && npm run seed"
echo "4. Run backend: cd backend && npm run dev"
echo "5. Run frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Open http://localhost:5173"
