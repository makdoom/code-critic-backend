# AI Code Reviewer - Detailed Plan of Action

> Automated code review system that analyzes pull requests, identifies bugs, suggests improvements, and provides code quality scores.

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   GitHub/GitLab │────▶│  Express API    │────▶│   AI Service    │
│   Webhooks      │     │  (Node.js)      │     │   (OpenAI/etc)  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │   PostgreSQL    │
                        │   (Reviews DB)  │
                        └─────────────────┘
                                 │
                        ┌────────▼────────┐     ┌─────────────────┐
                        │   BullMQ Queue  │────▶│   Worker        │
                        │   (Future)      │     │   (AI Review)   │
                        └─────────────────┘     └─────────────────┘
```

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Queue** | BullMQ + Redis (Future) |
| **AI Providers** | OpenAI GPT-4 / Claude 3 |
| **Deployment** | Docker |

---

## Project Structure

```
/server
├── src/
│   ├── config/
│   │   ├── index.js          # Environment variables
│   │   ├── database.js       # PostgreSQL connection
│   │   └── ai-providers.js   # AI provider configuration
│   ├── controllers/
│   │   ├── webhook.controller.js
│   │   └── review.controller.js
│   ├── services/
│   │   ├── github.service.js      # GitHub API integration
│   │   ├── ai-review.service.js   # AI code review logic
│   │   ├── scoring.service.js      # Code quality scoring
│   │   └── comment.service.js      # PR comment formatting
│   ├── models/
│   │   └── schema.prisma      # Database schema
│   ├── middleware/
│   │   ├── webhook-auth.js    # HMAC signature verification
│   │   ├── error-handler.js
│   │   └── validate-request.js
│   ├── queues/
│   │   └── review.queue.js    # BullMQ job definitions
│   ├── utils/
│   │   ├── logger.js
│   │   └── helpers.js
│   └── index.js               # Express app entry point
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

---

## Phase 1: Project Setup & Core Infrastructure

### 1.1 Initialize Node.js Project
- Create package.json with dependencies
- Set up TypeScript or JavaScript (recommend TypeScript for type safety)
- Configure ESLint + Prettier

### 1.2 Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.x",
    "dotenv": "^16.x",
    "axios": "^1.x",
    "openai": "^4.x",
    "@anthropic-ai/sdk": "^0.x",
    "@prisma/client": "^5.x",
    "bullmq": "^5.x",
    "ioredis": "^5.x",
    "winston": "^3.x",
    "helmet": "^7.x",
    "express-rate-limit": "^7.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "jest": "^29.x",
    "supertest": "^6.x",
    "prisma": "^5.x"
  }
}
```

### 1.3 Environment Variables
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/codereviewer

# Redis (Future)
REDIS_URL=redis://localhost:6379

# GitHub
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_ACCESS_TOKEN=your_personal_access_token

# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
AI_PROVIDER=openai  # or 'anthropic'
```

---

## Phase 2: GitHub Webhook Integration

### 2.1 Webhook Endpoint
- **Route**: `POST /api/webhooks/github`
- **Event Types Handled**: `pull_request.opened`, `pull_request.synchronize`

### 2.2 Webhook Processing Flow
```
1. Receive webhook POST request
2. Verify X-Hub-Signature-256 header (HMAC SHA-256)
3. Parse webhook payload
4. Extract PR info (number, repo, head SHA, base)
5. Idempotency check (avoid duplicate reviews)
6. Queue review job
7. Return 202 Accepted immediately
```

### 2.3 Security Measures
- [ ] HMAC signature verification for all webhooks
- [ ] IP allowlisting (optional)
- [ ] Rate limiting per repository
- [ ] Request body size limits
- [ ] Idempotency keys based on PR SHA

---

## Phase 3: GitHub API Integration

### 3.1 Required API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /repos/{owner}/{repo}/pulls/{pull_number}` | Get PR details |
| `GET /repos/{owner}/{repo}/pulls/{pull_number}/files` | Get changed files |
| `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews` | Post review comments |

### 3.2 Rate Limiting
- GitHub API: 5,000 requests/hour for authenticated apps
- Implement exponential backoff
- Cache rate limit headers
- Batch file requests when possible

---

## Phase 4: AI Code Review Service

### 4.1 AI Provider Abstraction
```javascript
// Factory pattern for AI providers
class AIReviewService {
  constructor(provider) {
    this.provider = createProvider(provider);
  }

  async analyzeCode(files, language) {
    return this.provider.analyze(files, language);
  }
}
```

### 4.2 Supported Review Types
| Type | Description | Priority |
|------|-------------|----------|
| **Bugs** | Syntax errors, logic flaws, null handling | High |
| **Security** | SQL injection, XSS, exposed secrets | Critical |
| **Performance** | N+1 queries, memory leaks, inefficient loops | Medium |
| **Best Practices** | SOLID principles, DRY, naming conventions | Medium |
| **Refactoring** | Code smell identification, simplification | Low |
| **Optimization** | Algorithm efficiency, caching opportunities | Medium |

### 4.3 AI System Prompt
```
You are an expert code reviewer analyzing a pull request.

Review the following code changes and identify:
1. Bugs and potential errors
2. Security vulnerabilities
3. Performance issues
4. Best practice violations
5. Refactoring opportunities
6. Optimization suggestions

For each issue provide:
- File path and line number
- Severity (critical/high/medium/low)
- Issue type (bug/security/performance/refactor)
- Description of the problem
- Suggested fix

Also provide an overall code quality score (1-100) and ratings for each category.

Respond in structured JSON format.
```

### 4.4 Review Chunking Strategy
- Split large PRs into chunks (max 20 files per request)
- Maintain file context between chunks
- Aggregate results at the end

---

## Phase 5: Code Quality Scoring System

### 5.1 Scoring Algorithm
| Component | Weight | Factors |
|-----------|--------|---------|
| **Bug Risk** | 30% | Error potential, edge cases, exception handling |
| **Security** | 25% | Vulnerabilities, data exposure, auth issues |
| **Performance** | 20% | Efficiency, scalability, resource usage |
| **Maintainability** | 15% | Readability, complexity, documentation |
| **Best Practices** | 10% | Standards compliance, conventions |

### 5.2 Rating Tiers
| Score Range | Rating | Emoji | Color Code |
|-------------|--------|-------|------------|
| 90-100 | Excellent | 🟢 | `#22c55e` |
| 75-89 | Good | 🔵 | `#3b82f6` |
| 60-74 | Average | 🟡 | `#eab308` |
| 40-59 | Needs Work | 🟠 | `#f97316` |
| 0-39 | Poor | 🔴 | `#ef4444` |

### 5.3 Category Ratings
Each category receives a score from 1-100:
- **Bug Risk**: 🟢 Excellent (90+) | 🔵 Good (75-89) | 🟡 Average (60-74) | 🟠 High (40-59) | 🔴 Critical (<40)
- **Security**: 🟢 Excellent (90+) | 🔵 Good (75-89) | 🟡 Average (60-74) | 🟠 Vulnerable (40-59) | 🔴 Critical (<40)
- **Performance**: 🟢 Excellent (90+) | 🔵 Good (75-89) | 🟡 Average (60-74) | 🟠 Slow (40-59) | 🔴 Critical (<40)
- **Maintainability**: 🟢 Excellent (90+) | 🔵 Good (75-89) | 🟡 Average (60-74) | 🟠 Complex (40-59) | 🔴 Unmaintainable (<40)

---

## Phase 6: Database Schema

### 6.1 Prisma Schema
```prisma
model Repository {
  id            String    @id @default(uuid())
  name          String
  owner         String
  webhookSecret String?
  settings      Json      @default("{}")
  reviews       Review[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([owner, name])
}

model Review {
  id           String    @id @default(uuid())
  repositoryId String
  repository   Repository @relation(fields: [repositoryId], references: [id])
  prNumber     Int
  prSha        String
  prTitle      String?
  
  overallScore Int?
  bugRiskScore Int?
  securityScore Int?
  performanceScore Int?
  maintainabilityScore Int?
  
  bugRiskRating String?
  securityRating String?
  performanceRating String?
  maintainabilityRating String?
  
  status       ReviewStatus @default(PENDING)
  summary      String?     @db.Text
  rawResponse  Json?
  
  comments     ReviewComment[]
  createdAt    DateTime  @default(now())
  completedAt  DateTime?
  
  @@unique([repositoryId, prSha])
  @@index([repositoryId, prNumber])
}

model ReviewComment {
  id            String    @id @default(uuid())
  reviewId      String
  review        Review    @relation(fields: [reviewId], references: [id])
  
  filePath      String
  lineNumber    Int?
  diffLine      String?
  
  commentType   CommentType
  severity      Severity
  message       String    @db.Text
  suggestion    String?   @db.Text
  
  createdAt     DateTime  @default(now())
}

enum ReviewStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum CommentType {
  BUG
  SECURITY
  PERFORMANCE
  BEST_PRACTICE
  REFACTOR
  OPTIMIZATION
}

enum Severity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}
```

---

## Phase 7: API Endpoints

### 7.1 Webhook Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/webhooks/github` | Receive GitHub webhook events |
| `GET` | `/api/webhooks/health` | Webhook endpoint health check |

### 7.2 Review Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reviews` | List all reviews (paginated) |
| `GET` | `/api/reviews/:id` | Get review details with comments |
| `GET` | `/api/reviews/pr/:prNumber` | Get reviews for a PR |
| `POST` | `/api/reviews/:id/regenerate` | Re-run AI review |
| `DELETE` | `/api/reviews/:id` | Delete a review |

### 7.3 Repository Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repositories` | List configured repositories |
| `POST` | `/api/repositories` | Add a new repository |
| `GET` | `/api/repositories/:id` | Get repository details |
| `PUT` | `/api/repositories/:id` | Update repository settings |
| `DELETE` | `/api/repositories/:id` | Remove a repository |

### 7.4 Health & Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | API health check |
| `GET` | `/api/health/ready` | Readiness probe |
| `GET` | `/api/stats` | Review statistics |

---

## Phase 8: BullMQ Queue Integration (Future)

### 8.1 Queue Architecture
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Webhook    │────▶│   Review     │────▶│   Worker     │
│   Controller │     │   Queue      │     │   Process    │
└──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │   GitHub     │
                                        │   API        │
                                        └──────────────┘
```

### 8.2 Job Types
```javascript
// Review job
{
  name: 'review-pr',
  data: {
    repositoryId: string,
    prNumber: number,
    prSha: string,
    action: 'opened' | 'synchronize'
  },
  opts: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
}
```

### 8.3 Worker Process
- Fetch PR diff from GitHub
- Send to AI service
- Parse AI response
- Store results in database
- Post comments to GitHub PR

---

## Phase 9: PR Comment Formatting

### 9.1 Review Summary Comment
```
## AI Code Review Summary

### Overall Quality: 🟢 Excellent (92/100)

### Category Ratings
| Category | Score | Rating |
|----------|-------|--------|
| Bug Risk | 95 | 🟢 Excellent |
| Security | 90 | 🟢 Excellent |
| Performance | 92 | 🟢 Excellent |
| Maintainability | 88 | 🔵 Good |

### Summary
Found 3 issues requiring attention:
- 1 Security consideration
- 2 Best practice improvements

### Files Changed
- `src/api/users.ts` (2 suggestions)
- `src/utils/validator.ts` (1 suggestion)

---
*Reviewed by AI Code Reviewer* | [View Full Report](#)
```

### 9.2 Inline Comment Format
```
**[{severity.toUpperCase()}]** {message}

{suggestion ? `**Suggestion:**\n\`\`\`\n${suggestion}\n\`\`\`` : ''}

---
*Type: {commentType} | File: {filePath}:{lineNumber}*
```

---

## Phase 10: Frontend Dashboard (Future)

### 10.1 Pages
- [ ] Dashboard Home - Overview statistics
- [ ] Reviews List - Filterable review history
- [ ] Review Detail - Full review with comments
- [ ] Repository Settings - Configure repositories
- [ ] Settings - API keys, preferences

### 10.2 Features
- Review status tracking
- Filter by repository, status, score
- Export reviews as CSV/JSON
- Notification preferences

---

## Implementation Roadmap

### Phase 1: Core MVP (Week 1-2)
- [ ] Project setup with Express
- [ ] GitHub webhook endpoint
- [ ] Database schema with Prisma
- [ ] Basic AI integration (single provider)
- [ ] Simple scoring system
- [ ] Post comments to PR

### Phase 2: Enhanced Features (Week 3-4)
- [ ] Multiple AI provider support
- [ ] Detailed review categories
- [ ] Rate limiting and error handling
- [ ] Logging and monitoring
- [ ] Basic API endpoints

### Phase 3: Queue System (Week 5-6)
- [ ] BullMQ integration
- [ ] Background job processing
- [ ] Retry logic
- [ ] Job status tracking

### Phase 4: Polish (Week 7-8)
- [ ] Frontend dashboard
- [ ] Advanced filtering
- [ ] Analytics and trends
- [ ] Documentation

---

## Security Considerations

1. **Webhook Security**
   - Always verify HMAC signatures
   - Validate webhook source IP (GitHub ranges)
   - Implement request size limits

2. **API Security**
   - Rate limiting on all endpoints
   - Input validation and sanitization
   - SQL injection prevention (via ORM)

3. **Secret Management**
   - Store API keys in environment variables
   - Never log sensitive information
   - Use secrets manager in production

---

## Deployment

### Docker Setup
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Docker Compose
```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: codereviewer
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Future Enhancements

- [ ] GitLab and Bitbucket webhook support
- [ ] Support for additional AI models
- [ ] Custom rule definitions
- [ ] Team collaboration features
- [ ] Integration with Slack/Discord
- [ ] Code coverage analysis
- [ ] Dependency vulnerability scanning
- [ ] Historical trend analysis
- [ ] Custom scoring weights per repository

---

## Questions to Answer

Before implementation, clarify:

1. **AI Provider**: OpenAI (GPT-4) or Anthropic (Claude 3)?
2. **Database**: PostgreSQL confirmed?
3. **Git Providers**: GitHub only, or GitLab/Bitbucket too?
4. **Authentication**: Dashboard auth needed, or webhook-only?
5. **Deployment**: Docker, Vercel, Railway, or bare server?
