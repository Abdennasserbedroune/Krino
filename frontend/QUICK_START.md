# AutoJobFlow - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Set Up Environment (Optional for local dev)
```bash
cp .env.example .env
```

No environment variables needed for basic local development!

### 3. Start Development Server
```bash
npm run dev
```

Open http://localhost:3000

### 4. Test the App

**Visit these pages:**
- `/landing` - Marketing landing page
- `/signin` - Sign-in page
- `/jobs` - Main swipe interface (★ Main feature)

**Try swiping:**
1. Click the heart ♥ button to like
2. Click the X ✕ button to dislike
3. Or use keyboard: ← (dislike), → (like)
4. On mobile: swipe left or right

**Check persistence:**
1. Swipe on some jobs
2. Refresh the page
3. Your decisions are saved!

---

## 📁 Key Files to Know

### Main Routes
```
app/
├── (public)/landing/page.tsx    ← Landing page
├── (auth)/signin/page.tsx       ← Sign-in page
└── (dashboard)/jobs/page.tsx    ← Swipe interface ★
```

### Swipe Components
```
components/swipe/
├── job-card.tsx                 ← Individual job card
└── job-swiper.tsx              ← Swiper container
```

### Data & State
```
lib/
├── fixtures/jobs.ts             ← Mock job data (8 jobs)
└── state/swipe-store.ts         ← Zustand store
```

---

## 🎨 Customize the Brand

### Change Colors
Edit `app/globals.css`:
```css
:root {
  --brand: #10b981;  /* Change this! */
}
```

### Change Company Name
Edit `app/layout.tsx`:
```tsx
<a href="/">AutoJobFlow</a>  /* Change this! */
```

### Add More Jobs
Edit `lib/fixtures/jobs.ts` - just add more objects to the array!

---

## 🛠️ Common Tasks

### Add a New Page
```bash
mkdir -p app/my-page
echo 'export default function MyPage() { return <div>Hello!</div> }' > app/my-page/page.tsx
```

### Change Swipe Behavior
Edit `components/swipe/job-swiper.tsx` → `handleSwipe` function

### Access Swipe History
```tsx
import { useSwipeStore } from '@/lib/state/swipe-store';

const { likedJobs, dislikedJobs } = useSwipeStore();
console.log('Liked:', likedJobs);
```

### Clear All Swipes
In browser console:
```javascript
localStorage.removeItem('autojobflow-swipes')
location.reload()
```

---

## 📦 Available Commands

```bash
npm run dev         # Start dev server (port 3000)
npm run build       # Production build
npm run start       # Start production server
npm run lint        # Run ESLint
npm run format      # Check code formatting
npm run format:fix  # Fix formatting
```

---

## 🚀 Deploy to Netlify (1 Minute)

### Option A: Drag & Drop
1. Run `npm run build`
2. Go to https://app.netlify.com/drop
3. Drag the `.next` folder
4. Done!

### Option B: Git Integration
1. Push code to GitHub
2. Go to https://app.netlify.com
3. Click "Add new site" → "Import from Git"
4. Select your repo
5. Netlify auto-detects `netlify.toml` config
6. Click "Deploy"!

---

## 🐛 Troubleshooting

### Build fails?
```bash
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Swiper not showing?
Check browser console for errors. Make sure you're on `/jobs` route.

### Dark mode not working?
Check if localStorage is enabled in your browser.

### State not persisting?
Check browser localStorage: DevTools → Application → Local Storage

---

## 📚 Learn More

- **Full Documentation**: See `README.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Deployment**: See `DEPLOYMENT.md`
- **Swiper.js Docs**: https://swiperjs.com
- **Zustand Docs**: https://github.com/pmndrs/zustand
- **Next.js Docs**: https://nextjs.org/docs

---

## 🎯 What's Built

✅ Landing page with marketing copy
✅ Sign-in page with form
✅ Job swipe interface (Tinder-style)
✅ 8 mock job listings
✅ Like/dislike state management
✅ Dark mode support
✅ Mobile-first responsive design
✅ Keyboard navigation
✅ Persistent storage

## 🔜 Next Steps

1. **Deploy**: Push to Netlify/Vercel
2. **Test**: Try on real mobile devices
3. **Integrate**: Connect to backend API
4. **Extend**: Add more features (filters, profile, etc.)

---

**Need Help?** Check the full README.md or open an issue!

Happy coding! 🎉
