# Listless Development Setup

## Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- Git

## Environment Setup

1. **Clone and install dependencies:**
\`\`\`bash
git clone <your-repo-url> listless
cd listless

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies  
cd ../backend && npm install
\`\`\`

2. **Environment variables:**
\`\`\`bash
# Copy example env files
cp .env.example .env
cd frontend && cp .env.example .env.local
cd ../backend && cp .env.example .env
\`\`\`

3. **Configure your .env files with:**
- OpenAI API key
- ElevenLabs API key (for voice features)
- MongoDB connection string
- JWT secrets

## Development Workflow

**Start development servers:**
\`\`\`bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev

# Terminal 3 - Database (if using Docker)
docker-compose up mongodb
\`\`\`

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

## Key Development Principles

1. **Voice-First Design**: Every feature should work hands-free
2. **Family-Focused**: Consider multi-person households in all features
3. **Error Resilience**: Always have fallbacks when AI/voice fails
4. **Mobile Responsive**: Test on mobile devices frequently
5. **Type Safety**: Use TypeScript strictly throughout
