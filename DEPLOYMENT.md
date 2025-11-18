# Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Prerequisites
1. GitHub account with your repository
2. Vercel account (sign up at https://vercel.com)
3. MongoDB Atlas account for production database

---

## 📋 Step-by-Step Deployment

### 1. Prepare MongoDB Atlas
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster or use existing
3. Create a database user with password
4. Whitelist all IPs: `0.0.0.0/0` (for Vercel serverless functions)
5. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/mdp_production`)

### 2. Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/new
2. Import your GitHub repository: `pestechnology/PESU_RR_CSE_C_P36_Micro_Donation_Platform_MDP`
3. Configure project:
   - **Framework Preset:** Other
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `cd src/frontend && npm install && npm run build`
   - **Output Directory:** `src/frontend/dist`
   - **Install Command:** `npm install`

4. Add Environment Variables (click "Environment Variables"):
   ```
   NODE_ENV=production
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mdp_production
   JWT_SECRET=your_super_secret_jwt_key_min_32_characters
   JWT_EXPIRE=24h
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@mdp.com
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   FRONTEND_URL=https://your-app.vercel.app
   ```

5. Click **Deploy**

#### Option B: Via Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No
# - Project name? micro-donation-platform
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add MONGO_URI
vercel env add JWT_SECRET
# ... add all other variables

# Deploy to production
vercel --prod
```

---

## ⚙️ Environment Variables Reference

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.net/db` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | `your-super-secret-key-here` |
| `JWT_EXPIRE` | JWT token expiration | `24h` |
| `EMAIL_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP server port | `587` |
| `EMAIL_USER` | Email account username | `your-email@gmail.com` |
| `EMAIL_PASS` | Email account password/app password | `your-app-password` |
| `EMAIL_FROM` | From address for emails | `noreply@mdp.com` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `FRONTEND_URL` | Frontend URL for CORS | Vercel auto-detects |

---

## 🔧 Vercel Configuration

The `vercel.json` file configures:
- **Backend:** Serverless function at `/api/*` routes
- **Frontend:** Static React build served from root
- **Routes:** API requests go to backend, everything else to frontend

### Important Notes
1. **Serverless Functions:** Backend runs as serverless functions (10-second timeout on free tier)
2. **Cold Starts:** First request may be slow (~2-3 seconds) after inactivity
3. **MongoDB Connections:** Use connection pooling (already configured in `db.js`)
4. **File Uploads:** Store in cloud storage (AWS S3, Cloudinary) not filesystem

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain
1. Go to your Vercel project dashboard
2. Click **Settings** → **Domains**
3. Add your domain (e.g., `mdp.yourdomain.com`)
4. Update DNS records as shown by Vercel:
   - Type: `A` or `CNAME`
   - Name: `@` or your subdomain
   - Value: Provided by Vercel

---

## 📊 Monitoring & Logs

### View Deployment Logs
```bash
# Recent deployments
vercel ls

# View logs for latest deployment
vercel logs

# View logs for specific deployment
vercel logs [deployment-url]
```

### Vercel Dashboard
- **Deployments:** View all deployment history
- **Analytics:** Traffic and performance metrics (Pro plan)
- **Logs:** Real-time function logs
- **Insights:** Web vitals and performance

---

## 🔄 Continuous Deployment

Vercel automatically deploys:
- **Production:** Pushes to `main` branch → `your-app.vercel.app`
- **Preview:** Pushes to other branches (like `develop`) → unique preview URLs
- **Pull Requests:** Each PR gets a unique preview deployment

### Deployment Workflow
```
Push to develop → Preview deployment
    ↓
Create PR to main → Preview URL in PR comments
    ↓
Merge to main → Production deployment
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Fails
```bash
# Check build logs in Vercel dashboard
# Ensure package.json scripts are correct
# Verify all dependencies are in package.json
```

#### 2. Environment Variables Not Working
- Redeploy after adding environment variables
- Check variable names match exactly
- Ensure no quotes around values in Vercel dashboard

#### 3. API Routes 404
- Verify `vercel.json` routes configuration
- Check backend server.js exports correctly
- Ensure API endpoints start with `/api/`

#### 4. MongoDB Connection Issues
- Whitelist `0.0.0.0/0` in MongoDB Atlas
- Verify connection string format
- Check database user permissions

#### 5. Frontend Can't Reach Backend
```javascript
// Update src/frontend/src/api.js
const API_URL = process.env.NODE_ENV === 'production' 
  ? '' // Same domain, use relative paths
  : 'http://localhost:3001';
```

---

## 📱 Post-Deployment Checklist

- [ ] Test user registration and email verification
- [ ] Test login and JWT authentication
- [ ] Test donation flow end-to-end
- [ ] Verify admin dashboard access
- [ ] Test 2FA for admin accounts
- [ ] Check audit logs are recording
- [ ] Verify rate limiting is working
- [ ] Test all CRUD operations for causes
- [ ] Check analytics dashboard loads
- [ ] Test CSV export functionality
- [ ] Verify HTTPS is enforced
- [ ] Test password reset flow
- [ ] Check responsive design on mobile
- [ ] Verify CORS settings
- [ ] Monitor error logs for issues

---

## 🔐 Security Recommendations

1. **Secrets Management**
   - Never commit `.env` files
   - Use Vercel environment variables
   - Rotate JWT secrets periodically

2. **MongoDB Security**
   - Use strong database passwords
   - Enable MongoDB authentication
   - Restrict IP whitelist if possible
   - Enable audit logging

3. **Rate Limiting**
   - Already configured for sensitive endpoints
   - Monitor for abuse patterns

4. **HTTPS**
   - Vercel provides free SSL certificates
   - Enforce HTTPS in production

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Node.js on Vercel](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Custom Domains](https://vercel.com/docs/custom-domains)

---

## 💡 Alternative: Deploy Backend Separately

If you prefer to separate backend and frontend:

### Backend on Railway/Render
1. Deploy backend to Railway or Render
2. Get backend URL (e.g., `https://api.mdp.railway.app`)
3. Update frontend `api.js` with backend URL
4. Deploy frontend to Vercel

### Benefits
- Better for long-running processes
- No serverless function timeout
- Dedicated backend resources
- Easier WebSocket support (if needed)

---

**Need help?** Check deployment logs in Vercel dashboard or run `vercel logs` for debugging.
