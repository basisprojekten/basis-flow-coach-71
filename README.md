# BASIS Training Platform

Advanced conversation technique training with AI-powered agents for feedforward guidance, iterative analysis, and comprehensive review.

## Project Overview

BASIS is a comprehensive training platform designed for conversation technique development, utilizing three specialized AI agents with distinct temporal roles in the learning process. Built on OpenAI's Agents SDK with React/TypeScript frontend.

### Core Concept

The platform implements three AI agents with **strict temporal separation**:

- **Navigator Agent** (Feedforward): Proactive guidance before and during conversations
- **Analyst Agent** (Iterative): Real-time analysis and feedback after each student response  
- **Reviewer Agent** (Holistic): Comprehensive analysis of complete conversation transcripts

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Agents     │
│   (React/TS)    │◄──►│   (Node/TS)     │◄──►│   (OpenAI)      │
│                 │    │                 │    │                 │
│ • Teacher UI    │    │ • REST API      │    │ • Navigator     │
│ • Student UI    │    │ • Session Mgmt  │    │ • Analyst       │
│ • Transcript UI │    │ • Agent Proxy   │    │ • Reviewer      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- **React 18** with TypeScript
- **Tailwind CSS** with custom design system
- **Shadcn/ui** components (heavily customized)
- **React Router** for navigation
- **TanStack Query** for state management

**Backend:**
- **Node.js 20+** with TypeScript  
- **Express** server with REST API
- **OpenAI Agents SDK** for AI integration
- **In-memory** session management (SQLite/Prisma coming soon)
- **Structured outputs** with JSON schema validation

**Database:**
- **SQLite** with Prisma ORM
- **Redis** (optional) for session caching

## Data Models

### Core Entities

```typescript
interface Protocol {
  id: string;
  name: string;
  version: string;
  fields: RubricField[];
}

interface Exercise {
  id: string;
  title: string;
  protocolStack: string[];
  caseId: string;
  toggles: ExerciseToggles;
  focusHint: string;
}

interface Lesson {
  id: string;
  title: string;
  objectives: string[];
  exerciseOrder: string[];
}

interface Session {
  id: string;
  lessonId?: string;
  exerciseId?: string;
  mode: 'exercise' | 'lesson' | 'transcript';
  state: SessionState;
}
```

## Agent Response Schemas

Each agent returns structured JSON responses with strict validation:

### Navigator (Feedforward)
```json
{
  "type": "feedforward",
  "next_focus": "string",
  "micro_objective": "string", 
  "guardrails": ["string"],
  "user_prompt": "string"
}
```

### Analyst (Iterative)
```json
{
  "type": "iterative_feedback",
  "segment_id": "string",
  "rubric": [{"field": "string", "score": 0}],
  "evidence_quotes": ["string"],
  "past_only_feedback": "string"
}
```

### Reviewer (Holistic)
```json
{
  "type": "holistic_feedback",
  "rubric_summary": [{"field": "string", "score": 0}],
  "strengths": ["string"],
  "growth_areas": ["string"],
  "exemplar_quotes": ["string"],
  "summary": "string"
}
```

## API Endpoints

### Exercise Management
- `POST /api/exercises` - Create exercise
- `GET /api/exercises/:id` - Get exercise
- `PUT /api/exercises/:id` - Update exercise
- `DELETE /api/exercises/:id` - Delete exercise

### Lesson Management  
- `POST /api/lessons` - Create lesson
- `GET /api/lessons/:id` - Get lesson
- `PUT /api/lessons/:id` - Update lesson
- `DELETE /api/lessons/:id` - Delete lesson

### Session Flow
- `POST /api/session` - Start session (lesson/exercise code)
- `POST /api/session/:id/input` - Send student input
- `GET /api/session/:id/summary` - Get session summary
- `DELETE /api/session/:id` - End session

### Transcript Analysis
- `POST /api/transcript/review` - Analyze transcript

## Guardrails & Validation

### Temporal Direction Enforcement

**Navigator** - Blocked phrases:
- "du gjorde nyss", "det som hände var", "tidigare svar"
- Any retrospective analysis

**Analyst** - Blocked phrases:  
- "nästa gång", "framöver", "bör du nu", "kommande steg"
- Any forward-looking guidance

### Schema Validation
All agent responses validated against JSON schemas with automatic retry on violations.

### Protocol Adherence
Rubric fields must map to active protocols or response is rejected.

## User Flows

### Teacher Flow
1. **Create Exercise**: Define protocol, case study, agent toggles
2. **Create Lesson**: Organize exercises into sequence  
3. **Generate Codes**: Share exercise/lesson codes with students
4. **Monitor Progress**: View student performance analytics

### Student Flow - Training
1. **Enter Code**: Access exercise (EX-) or lesson (LS-)
2. **Receive Guidance**: Navigator provides pre-conversation briefing
3. **Practice Conversation**: Interactive dialogue with AI role-play
4. **Get Feedback**: Real-time analyst feedback after each response
5. **Complete Session**: Final summary and progress tracking

### Student Flow - Transcript
1. **Upload Transcript**: Paste conversation text
2. **Receive Analysis**: Comprehensive reviewer feedback only
3. **Review Results**: Holistic assessment with growth recommendations

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- OpenAI API key

### Installation & Setup

```bash
# Install dependencies
npm install

# Setup backend environment
cp server/.env.example server/.env
# Edit server/.env and add your OPENAI_API_KEY
```

### Development

```bash
# Start frontend only (http://localhost:5173)
npm run dev

# Start backend only (http://localhost:3001)  
npm run dev:server

# Start both frontend and backend
npm run dev:full
```

### Testing the Integration

1. **Access Student Portal**: Navigate to http://localhost:5173/student
2. **Test with Demo Codes**: Use `EX-DEMO001` or `LS-DEMO001`
3. **Start Session**: Enter code and begin conversation training
4. **View Agent Feedback**: See Navigator (feedforward) and Analyst (iterative) responses
5. **Try Transcript Analysis**: Use "Analyze Transcript" mode for holistic feedback

### Environment Configuration

Backend `.env`:
```
OPENAI_API_KEY=your_key_here
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
```

Frontend (automatic):
```
VITE_API_URL=http://localhost:3001/api (development)
VITE_API_URL=/api (production)
```

## Design System

### Color Palette

**Agent Colors:**
- Navigator: Purple (`hsl(270, 65%, 55%)`) - Forward-looking
- Analyst: Orange (`hsl(30, 85%, 55%)`) - Analysis & reflection  
- Reviewer: Green (`hsl(150, 60%, 45%)`) - Comprehensive review

**Semantic Colors:**
- Primary: Deep blue for authority and trust
- Success: Green for positive outcomes
- Warning: Amber for areas needing attention
- Info: Blue for informational content

### Components

All components use semantic design tokens:
- **Never** use direct colors (e.g., `text-white`, `bg-blue-500`)
- **Always** use semantic tokens (e.g., `text-primary`, `bg-navigator`)
- Custom variants for shadcn components using design system

## Testing Strategy

### Test Categories

1. **Agent Separation**: Validate temporal direction enforcement
2. **Schema Compliance**: Ensure all responses match expected schemas
3. **Guardrail Enforcement**: Test blocked phrase detection
4. **Session Flow**: End-to-end conversation testing
5. **Protocol Mapping**: Verify rubric field alignment

### Test Implementation

```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

## Deployment

### Frontend
- **Vercel/Netlify**: Static hosting with build optimization
- **Environment**: Production API endpoint configuration

### Backend (Planned)
- **Railway/Render**: Node.js hosting with PostgreSQL
- **Docker**: Containerized deployment option
- **Database**: PostgreSQL in production, SQLite for development

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure all guardrail tests pass
4. Submit PR with agent interaction examples
5. Review focuses on temporal separation compliance

### Code Standards
- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Semantic commit messages
- 80%+ test coverage required

### Future Enhancements

### Planned Features
- **SQLite/Prisma Persistence**: Replace in-memory sessions
- **WebSocket Integration**: Real-time communication
- **Voice Integration**: Real-time speech processing with OpenAI Realtime API
- **Advanced Analytics**: Learning progression tracking  
- **Multi-language Support**: Internationalization
- **Mobile App**: React Native implementation
- **LTI Integration**: Learning management system compatibility

### Technical Roadmap
- Database persistence layer
- Authentication & authorization
- Advanced caching strategies
- Performance optimization  
- Security hardening
- Comprehensive test suite

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:
- **Documentation**: See `/docs` folder (when available)
- **Issues**: GitHub Issues tracker
- **Discussions**: GitHub Discussions for feature requests

---

**Built with ❤️ for conversation technique training excellence**