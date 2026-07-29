# Blinkit AI

Production-grade AI-assisted grocery shopping experience for India, built with Next.js 15, App Router, TypeScript, TailwindCSS, shadcn-style components, Framer Motion, TanStack Query, Zustand, React Hook Form, Zod, Firebase, and OpenRouter.

## Features

- **AI-Powered Shopping**: Intelligent basket insights, product recommendations, and search powered by OpenRouter
- **Complete Shopping Flow**: Browse products, search, view details, manage cart, checkout, and order confirmation
- **India-First Design**: Rupee pricing, Indian cities, phone validation, addresses, and grocery brands
- **Real-time Cart Management**: Persistent cart with Zustand and Firebase sync
- **Order Management**: Complete order lifecycle with Firestore backend
- **Product Reviews**: Customer review system with ratings
- **Wishlist**: Save favorite products for later
- **Responsive UI**: Mobile-first design with smooth animations using Framer Motion

## Tech Stack

### Core
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS with shadcn-style components
- **Animations**: Framer Motion

### State & Data
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Backend**: Firebase (Firestore, Auth)

### AI & Intelligence
- **AI Provider**: OpenRouter
- **Features**: Smart search, recommendations, basket insights, recipe suggestions

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Firebase project (optional, for full functionality)
- OpenRouter API key (optional, for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Blinkit_ai_feature
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure `.env.local` with your credentials:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# OpenRouter AI (Optional)
OPENROUTER_API_KEY=your_openrouter_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Available Scripts

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run typecheck` - Run TypeScript compiler to check types

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── ai/            # AI-powered endpoints
│   │   ├── categories/    # Category management
│   │   ├── checkout/      # Checkout processing
│   │   ├── products/      # Product CRUD
│   │   └── reviews/       # Review management
│   ├── checkout/          # Checkout page
│   ├── orders/            # Order history and details
│   ├── product/           # Product detail pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── shop/              # Shop-specific components
│   │   ├── ai-basket-panel.tsx
│   │   ├── cart-drawer.tsx
│   │   ├── header.tsx
│   │   ├── product-card.tsx
│   │   └── ...
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
│   ├── use-cart.ts
│   ├── use-debounce.ts
│   └── use-wishlist.ts
├── lib/                   # Utility libraries and services
│   ├── ai-*.ts           # AI integration modules
│   ├── firebase-*.ts     # Firebase service modules
│   ├── catalog.ts        # Product catalog
│   ├── data-service.ts   # Data fetching service
│   └── types.ts          # TypeScript type definitions
└── store/                # Zustand state stores
    └── cart-store.ts
```

## Key Features Explained

### AI Capabilities
- **Smart Search**: AI-enhanced product search with natural language understanding
- **Basket Insights**: Intelligent suggestions based on cart contents
- **Recommendations**: Personalized product recommendations
- **Recipe Suggestions**: AI-generated recipe ideas based on cart items

### Firebase Integration
- **Authentication**: User authentication and authorization
- **Firestore**: Real-time database for products, orders, reviews, and user data
- **Cart Persistence**: Cart data synced across sessions

### State Management
- **Zustand**: Lightweight state management for cart, wishlist, and UI state
- **TanStack Query**: Server state management with caching and background updates

## Environment Variables

### Required for Full Functionality
- `NEXT_PUBLIC_FIREBASE_*` - Firebase configuration for backend services
- `OPENROUTER_API_KEY` - OpenRouter API key for AI features

### Demo Mode
The application runs in demo mode without credentials. In demo mode:
- Products are loaded from local seed data
- Cart operations work locally
- AI features are disabled
- Orders and reviews are not persisted

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

### Other Platforms

The application can be deployed to any platform supporting Next.js:
- Netlify
- AWS Amplify
- Google Cloud Run
- Docker container

## Development

### Code Quality
```bash
# Run linting
npm run lint

# Check TypeScript types
npm run typecheck
```

### Adding New Features
1. Create API routes in `src/app/api/`
2. Add components in `src/components/`
3. Update state management in `src/store/`
4. Add utility functions in `src/lib/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.

---

Built with ❤️ for the Indian grocery shopping experience