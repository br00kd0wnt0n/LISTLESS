Listless - AI-Powered Life Management

The intelligent task management app that understands your life through natural conversation

Listless helps busy families balance professional deadlines with household coordination through conversational input and AI-powered organization. Just tell it what you need to do in plain English, and it intelligently breaks down complex requests into actionable, time-estimated tasks.
✨ Features
🧠 AI-Powered Task Processing

Natural Language Input: "Clean the house and prep for Monday's presentation"
Smart Task Extraction: Converts conversations into organized, actionable tasks
Intelligent Categorization: Automatically sorts tasks by work, household, personal, family, etc.
Time Estimation: AI predicts how long each task will take

📋 Smart Task Management

Visual Organization: Color-coded categories and priority indicators
Progress Tracking: Compare estimated vs actual completion time
One-Click Actions: Complete or delete tasks with simple clicks
Family-Ready: Built for household coordination and multi-person scheduling

🎯 Built for Real Life

Mobile Responsive: Works perfectly on phones and tablets
Voice-Ready Architecture: Foundation prepared for hands-free interaction
Household Focused: Understands the complexity of managing both work and home life
Error Resilient: Graceful fallbacks when AI services are unavailable

🚀 Quick Start
Prerequisites

Node.js 18+
MongoDB (local or Docker)
OpenAI API key

Installation

Clone and install dependencies:
bashgit clone <your-repo-url> listless
cd listless

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install

Environment Setup:
bash# Backend (.env)
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=mongodb://admin:password123@localhost:27017/listless?authSource=admin
PORT=3001
FRONTEND_URL=http://localhost:3000

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api

Start Services:
bash# Terminal 1 - Database
docker-compose up mongodb

# Terminal 2 - Backend API
cd backend && npm run dev

# Terminal 3 - Frontend
cd frontend && npm run dev

Open the app:

Frontend: http://localhost:3000
Backend API: http://localhost:3001/health



💡 Usage Examples
Natural Language Task Creation
Try these example inputs:
Family Planning:
"Plan birthday party for Saturday - need decorations, cake, and groceries"
→ Creates 3 separate tasks with appropriate time estimates and categories
Work & Home Balance:
"Finish quarterly report by Friday and schedule dentist appointments for the kids"
→ Separates professional and family tasks with different priorities
Household Management:
"Deep clean before guests arrive Sunday, do laundry, and prep meals for the week"
→ Organizes household tasks with realistic time estimates
Smart Features in Action

🎯 Priority Detection: "urgent presentation" gets high priority
📅 Time-Aware: "by Friday" sets appropriate deadlines
🏠 Category Smart: "kids dentist" → family category
⏱️ Time Estimation: "deep clean" → automatically estimates 2-3 hours

🏗️ Tech Stack
Backend

Node.js/Express with TypeScript
MongoDB with Mongoose ODM
OpenAI GPT-4 for natural language processing
Security: Helmet, CORS, rate limiting

Frontend

Next.js 14 with App Router
TypeScript for type safety
Tailwind CSS for responsive design
Custom React Hooks for state management

📖 API Documentation
Task Management
httpGET    /api/tasks?userId=USER_ID          # Get all tasks
POST   /api/tasks                         # Create task
PUT    /api/tasks/:id                     # Update task
DELETE /api/tasks/:id                     # Delete task
PATCH  /api/tasks/:id/complete            # Mark complete
AI Processing
httpPOST   /api/ai/process-task               # Convert text to tasks
POST   /api/ai/estimate-time              # Get time estimates
🔧 Development
Project Structure
listless/
├── backend/          # Express API server
│   ├── src/
│   │   ├── controllers/    # Route logic
│   │   ├── models/         # MongoDB schemas  
│   │   ├── routes/         # API endpoints
│   │   └── database/       # DB connection
├── frontend/         # Next.js app
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # API client
└── shared/          # Common TypeScript types
Development Commands
bash# Backend
npm run dev          # Start development server
npm run build        # Build for production
npm test             # Run tests

# Frontend  
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run lint         # Lint code
Testing the API
bash# Health check
curl http://localhost:3001/health

# Process natural language
curl -X POST http://localhost:3001/api/ai/process-task \
  -H "Content-Type: application/json" \
  -d '{"input": "clean house and do laundry", "userId": "test-user"}'
🎯 Current Status: Phase 1 (MVP)
✅ Completed Features

Natural language task input with AI processing
Task CRUD operations with MongoDB persistence
Smart categorization and time estimation
Responsive web interface with mobile support
Error handling and validation

🚧 Coming in Phase 2

Voice input and speech recognition
Calendar visualization and time-blocking
Multi-person household coordination
Real-time collaboration features
Advanced AI conversation processing

🔮 Future Phases

Smart home integration
Advanced analytics and insights
Team collaboration features
Mobile app (React Native)

🤝 Contributing
This project is built for real families managing complex, busy lives. When contributing:

Test with realistic scenarios - busy parent with kids, work deadlines, household chaos
Consider mobile users - many interactions happen on phones while multitasking
Think voice-first - architecture should support hands-free interaction
Error resilience - AI and voice services can fail, always have fallbacks

📝 License
MIT License - see LICENSE file for details

🎉 Try It Out!

Start the app following the Quick Start guide
Try the natural language input with your real tasks
Watch as AI intelligently organizes your chaotic day into manageable, time-estimated tasks

Perfect for:

Working parents juggling career and family
Household managers coordinating schedules
Anyone overwhelmed by traditional task apps that ignore life's complexity

Built with ❤️ for busy families who need technology that actually understands their lives.