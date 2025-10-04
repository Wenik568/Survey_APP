# 🚂 Деплой на Railway

## Підготовка

### 1. Створіть акаунт на Railway
- Перейдіть на https://railway.app
- Зареєструйтеся через GitHub (рекомендовано)

### 2. Встановіть Railway CLI (опціонально)
```bash
npm install -g @railway/cli
railway login
```

## 📦 Деплой Backend

### Через Railway Dashboard:

1. **Створіть новий проєкт**
   - New Project → Deploy from GitHub repo
   - Виберіть ваш репозиторій

2. **Налаштуйте змінні оточення**
   ```
   MONGO_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_secret_key
   JWT_REFRESH_SECRET=your_refresh_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=https://your-app.railway.app/auth/google/callback
   GEMINI_API_KEY=your_gemini_api_key
   NODE_ENV=production
   ```

3. **Налаштуйте домен**
   - Settings → Networking → Generate Domain
   - Або додайте власний домен

### Через Railway CLI:

```bash
# В кореневій папці проєкту
railway init
railway up

# Додайте змінні оточення
railway variables set MONGO_URI="your_connection_string"
railway variables set JWT_SECRET="your_secret"
# ... інші змінні
```

## 🎨 Деплой Frontend

### Варіант 1: Окремий Railway Service

1. **Додайте новий сервіс в проєкт**
   - Add Service → GitHub Repo
   - Root Directory: `/client`

2. **Налаштуйте змінні оточення**
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```

3. **Railway автоматично**
   - Знайде `client/Dockerfile`
   - Збілдить та задеплоїть
   - Створить публічний URL

### Варіант 2: Netlify/Vercel для Frontend

**Netlify:**
```bash
cd client
npm run build
# Deploy dist/ folder через Netlify UI
```

**Environment variables на Netlify:**
```
VITE_API_URL=https://your-backend.railway.app
```

## 🔧 Налаштування CORS

Оновіть `server.js` для production URL:

```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend.railway.app', 'https://your-custom-domain.com']
    : 'http://localhost:5173',
  credentials: true
};

app.use(cors(corsOptions));
```

## 📊 MongoDB Atlas Setup

1. **Whitelist Railway IP**
   - MongoDB Atlas → Network Access
   - Add IP Address → `0.0.0.0/0` (all IPs)
   - Або додайте конкретні Railway IPs

2. **Connection String**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/survey-app?retryWrites=true&w=majority
   ```

## ✅ Перевірка деплою

### Backend health check:
```bash
curl https://your-backend.railway.app/api/health
```

### Frontend:
Відкрийте `https://your-frontend.railway.app` у браузері

## 🚨 Troubleshooting

### Backend не запускається:
1. Перевірте логи: Railway Dashboard → Deployments → View Logs
2. Перевірте змінні оточення
3. Перевірте MongoDB connection string

### Frontend не може з'єднатися з Backend:
1. Перевірте VITE_API_URL
2. Перевірте CORS налаштування на backend
3. Перевірте network calls в Browser DevTools

### 502 Bad Gateway:
1. Перевірте що PORT використовується з environment variable:
   ```javascript
   const PORT = process.env.PORT || 3000;
   ```
2. Railway автоматично встановлює PORT

## 🔄 Continuous Deployment

Railway автоматично редеплоїть при push до main branch:
1. Push код на GitHub
2. Railway автоматично детектує зміни
3. Збілдить та задеплоїть нову версію

## 💰 Pricing

Railway Free Tier:
- $5 вартості ресурсів безкоштовно щомісяця
- Достатньо для розробки та невеликих проєктів
- Без кредитної картки для початку

## 📝 Checklist перед деплоєм

- [ ] MongoDB Atlas налаштовано та доступно
- [ ] Всі змінні оточення додані
- [ ] CORS налаштовано для production URL
- [ ] Google OAuth callback URL оновлено
- [ ] Frontend VITE_API_URL вказує на backend
- [ ] .env файли додані в .gitignore
- [ ] Dockerfile та .dockerignore створені
- [ ] Health check endpoints працюють

## 🎉 Готово!

Ваш застосунок тепер доступний онлайн:
- Backend: `https://your-backend.railway.app`
- Frontend: `https://your-frontend.railway.app`

Поділіться посиланням та отримуйте відгуки! 🚀
