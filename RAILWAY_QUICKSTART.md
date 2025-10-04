# 🚂 Railway Deployment - Швидкий старт

## 1️⃣ Backend Deploy (5 хвилин)

### Крок 1: Створити проєкт на Railway
1. Перейти на https://railway.app
2. Sign up через GitHub
3. New Project → Deploy from GitHub repo
4. Вибрати ваш репозиторій

### Крок 2: Додати змінні оточення
В Railway Dashboard → Variables:

```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/survey-app
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
SESSION_SECRET=your-session-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-secret
GOOGLE_CALLBACK_URL=https://your-app.railway.app/auth/google/callback
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=production
```

### Крок 3: Deploy
Railway автоматично:
- Знайде Dockerfile
- Збілдить образ
- Задеплоїть застосунок
- Створить публічний URL

**Готово!** Backend доступний на: `https://your-app.railway.app`

---

## 2️⃣ Frontend Deploy

### Варіант A: На Railway (окремий сервіс)

1. В Railway проєкті: **Add Service** → **GitHub Repo**
2. Settings → **Root Directory**: `/client`
3. Variables:
   ```env
   VITE_API_URL=https://your-backend.railway.app
   ```
4. Deploy автоматично

### Варіант B: На Vercel (рекомендовано для frontend)

```bash
cd client
npm install -g vercel
vercel
```

Environment variables:
```
VITE_API_URL=https://your-backend.railway.app
```

### Варіант C: На Netlify

1. Drag & drop папку `client/dist/` на netlify.com
2. Або підключити GitHub repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Environment: `VITE_API_URL=https://your-backend.railway.app`

---

## 3️⃣ Оновити CORS

В `app.js` змінити:

```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://your-frontend.railway.app',
        'https://your-vercel-app.vercel.app',
        'https://your-custom-domain.com'
      ]
    : ['http://localhost:5173'],
  credentials: true
}));
```

---

## 4️⃣ MongoDB Atlas

1. Network Access → Add IP: `0.0.0.0/0` (всі IP)
2. Database Access → Create user
3. Connection string в `MONGO_URI`

---

## 5️⃣ Перевірка

### Backend:
```bash
curl https://your-app.railway.app/api/health
# Відповідь: {"status":"OK", ...}
```

### Frontend:
Відкрити в браузері та перевірити Network tab

---

## 🎯 Готово!

✅ Backend на Railway
✅ Frontend на Vercel/Netlify/Railway
✅ MongoDB на Atlas
✅ Повністю онлайн система опитувань

**Час деплою: 10-15 хвилин**

---

## 💡 Поради

1. **Логи**: Railway Dashboard → Deployments → View Logs
2. **Rollback**: Deployments → Previous deploy → Redeploy
3. **Custom domain**: Settings → Networking → Custom Domain
4. **Metrics**: Railway показує CPU, RAM, Network usage
5. **Автодеплой**: Push до GitHub = автоматичний редеплой

## 🆓 Free Tier

Railway: $5/місяць безкоштовно
Vercel: Unlimited для hobby projects
Netlify: 100GB bandwidth безкоштовно
MongoDB Atlas: 512MB безкоштовно

**Достатньо для магістерської та демонстрації! 🎓**
