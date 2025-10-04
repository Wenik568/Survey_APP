import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SurveysPage from './pages/SurveysPage';
import CreateSurveyPage from './pages/CreateSurveyPage';
import EditSurveyPage from './pages/EditSurveyPage';
import SurveyPublicPage from './pages/SurveyPublicPage';
import ResultsPage from './pages/ResultsPage';
import ResultsListPage from './pages/ResultsListPage';
import AuthProvider from './components/auth/AuthProvider';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Створюємо QueryClient для TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Public Survey Route */}
            <Route path="/survey/:uniqueLink" element={<SurveyPublicPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/results-list"
              element={
                <ProtectedRoute>
                  <ResultsListPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/results"
              element={
                <ProtectedRoute>
                  <ResultsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/surveys/create"
              element={
                <ProtectedRoute>
                  <CreateSurveyPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/surveys/:id/edit"
              element={
                <ProtectedRoute>
                  <EditSurveyPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/surveys"
              element={
                <ProtectedRoute>
                  <SurveysPage />
                </ProtectedRoute>
              }
            />

            {/* Інші маршрути будуть додані пізніше */}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
