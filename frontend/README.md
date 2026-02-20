# AutoJobFlow Frontend

A modern, mobile-first job browsing application built with Next.js 14 and Swiper.js. Features an intuitive Tinder-style swipe interface for discovering job opportunities.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4 with custom design tokens
- **State Management**: Zustand (with persist middleware)
- **Swipe Gestures**: Swiper.js (Card Effect)
- **Authentication**: NextAuth.js
- **Database ORM**: Prisma
- **Code Quality**: ESLint, Prettier

## Features

- 🎯 **Swipe-based Job Discovery**: Intuitive Tinder-style interface for browsing jobs
- 📱 **Mobile-First Design**: Optimized for touch gestures and small screens
- 🌓 **Dark Mode**: Full dark mode support with theme toggle
- 💾 **Persistent State**: Swipe decisions saved locally using Zustand persist
- ⌨️ **Keyboard Navigation**: Arrow key support for desktop users
- 🎨 **Custom Design System**: Semantic design tokens for consistent theming
- 📊 **Swipe Statistics**: Track liked and disliked jobs

## Project Structure

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── (public)/                 # Public routes (no auth required)
│   │   └── landing/              # Landing page
│   ├── (auth)/                   # Authentication routes
│   │   └── signin/               # Sign-in page
│   ├── (dashboard)/              # Protected dashboard routes
│   │   └── jobs/                 # Job swipe interface
│   ├── layout.tsx                # Root layout with navigation
│   └── globals.css               # Global styles and design tokens
├── components/
│   ├── swipe/                    # Swipe-related components
│   │   ├── job-card.tsx          # Individual job card
│   │   ├── job-swiper.tsx        # Main swiper container
│   │   └── job-details-drawer.tsx (future)
│   ├── navigation/               # Navigation components
│   └── providers/                # Context providers
├── lib/
│   ├── fixtures/                 # Mock data
│   │   └── jobs.ts               # Sample job listings
│   ├── state/                    # State management
│   │   └── swipe-store.ts        # Zustand store for swipes
│   └── auth/                     # Auth configuration
├── tailwind.config.ts            # Tailwind configuration
├── package.json                  # Dependencies
└── README.md                     # This file
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   DATABASE_URL=postgresql://user:password@localhost:5432/autojobflow
   ```

3. **Run database migrations**:
   ```bash
   npx prisma migrate dev
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run format` | Check code formatting |
| `npm run format:fix` | Fix formatting issues |

## Design System

The app uses a custom design system with CSS custom properties for theming:

### Color Tokens

```css
--background       /* Main background color */
--foreground       /* Primary text color */
--muted            /* Muted text color */
--border           /* Border color */
--card             /* Card background */
--brand            /* Primary brand color (green) */
--brand-hover      /* Brand hover state */
--destructive      /* Error/delete actions (red) */
--success          /* Success states */
--warning          /* Warning states */
```

### Usage in Tailwind

```tsx
<div className="bg-[var(--background)] text-[var(--foreground)]">
  <button className="bg-[var(--brand)] hover:bg-[var(--brand-hover)]">
    Like Job
  </button>
</div>
```

## Deployment to Netlify

### Automatic Deployment via Git

1. **Connect your repository**:
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider (GitHub, GitLab, Bitbucket)
   - Select your repository

2. **Configure build settings**:
   ```
   Base directory: frontend/
   Build command: npm run build
   Publish directory: frontend/.next
   ```

3. **Add environment variables**:
   Go to Site settings → Environment variables and add:
   ```
   NEXTAUTH_URL=https://your-site-name.netlify.app
   NEXTAUTH_SECRET=<generate-secure-secret>
   DATABASE_URL=<your-production-database-url>
   ```

4. **Deploy**:
   - Click "Deploy site"
   - Netlify will automatically build and deploy your app

### Manual Deployment via CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

   Follow the prompts to authorize and select your site.

### Environment Variables for Production

Required environment variables for production deployment:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_URL` | Production URL of your app | `https://autojobflow.netlify.app` |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js (generate with `openssl rand -base64 32`) | `your-secret-key` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXT_PUBLIC_API_URL` | Backend API URL (optional) | `https://api.autojobflow.com` |

### Post-Deployment Checklist

- [ ] Verify environment variables are set
- [ ] Test authentication flow
- [ ] Test swipe functionality on mobile devices
- [ ] Check dark mode toggle
- [ ] Verify database connection
- [ ] Test all routes (landing, signin, jobs)
- [ ] Check browser console for errors
- [ ] Test responsive design on various screen sizes

## Swiper.js Integration

The app uses Swiper.js for the card-swipe interface:

```tsx
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-cards';
```

### Key Features:
- **Card Effect**: Stack of cards that animate on swipe
- **Touch Gestures**: Native mobile swipe support
- **Keyboard Control**: Arrow keys for desktop navigation
- **Custom Callbacks**: `onSlideNextTransitionEnd` for swipe handling

## State Management

Zustand store manages swipe decisions with local persistence:

```tsx
import { useSwipeStore } from '@/lib/state/swipe-store';

const { addSwipe, likedJobs, hasSwipedOn } = useSwipeStore();

// Add a swipe decision
addSwipe(jobId, 'like');

// Check if user has swiped on a job
const swiped = hasSwipedOn(jobId);
```

### Store Features:
- Persistent state (survives page refresh)
- Separate arrays for liked/disliked jobs
- Helper methods for decision tracking
- Ready for backend sync integration

## Future Enhancements

- [ ] Backend API integration for real job data
- [ ] User authentication with profile management
- [ ] Job details drawer with more information
- [ ] Match notifications when employers like you back
- [ ] Advanced filtering (location, salary, type)
- [ ] Application tracking dashboard
- [ ] Push notifications for new matches
- [ ] Resume upload and parsing
- [ ] AI-powered job recommendations

## Troubleshooting

### Common Issues

**Swiper not rendering**:
- Ensure you've imported the CSS: `import 'swiper/css'`
- Check that the parent container has a defined height

**Dark mode not persisting**:
- Check localStorage permissions in browser
- Verify the theme toggle script in `app/layout.tsx`

**Zustand store not persisting**:
- Clear browser storage and try again
- Check for localStorage quota issues

**Build errors**:
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm run format:fix`
4. Submit a pull request

## License

MIT

---

Built with ❤️ using Next.js and Swiper.js
