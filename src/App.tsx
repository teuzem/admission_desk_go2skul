import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { lazy, Suspense } from 'react'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import VerifyEmailPage from './pages/auth/VerifyEmailPage'
import EmailVerifiedPage from './pages/auth/EmailVerifiedPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Admin Auth
import AdminLoginPage from './pages/admin/AdminLoginPage'

// Signup Wizard
import SignupWizard from './pages/signup/SignupWizard'

// Dashboard Layout
import DashboardLayout from './components/layout/DashboardLayout'
import DashboardHome from './pages/dashboard/DashboardHome'
import MyApplicationsPage from './pages/dashboard/MyApplicationsPage'
import CreateApplicationPage from './pages/dashboard/CreateApplicationPage'
import CoursesPage from './pages/courses/CoursesPage'
import CourseDetailPage from './pages/courses/CourseDetailPage'
import UniversityDetailPage from './pages/universities/UniversityDetailPage'
import AgentProfilePage from './pages/profile/AgentProfilePage'
import TeamMembersPage from './pages/profile/TeamMembersPage'
import BlogPage from './pages/dashboard/BlogPage'
import BlogArticlePage from './pages/dashboard/BlogArticlePage'
import NewsArticlePage from './pages/dashboard/NewsArticlePage'
import StartNewApplicationPage from './pages/dashboard/StartNewApplicationPage'

// Admin Dashboard
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAddProgram from './pages/admin/AdminAddProgram'
import AdminEditProgram from './pages/admin/AdminEditProgram'
import AdminAddUniversity from './pages/admin/AdminAddUniversity'
import AdminEditUniversity from './pages/admin/AdminEditUniversity'
import AdminStudents from './pages/admin/AdminStudents'
import AdminAgents from './pages/admin/AdminAgents'
import AdminApplicationDetail from './pages/admin/AdminApplicationDetail'
import AdminProfilePage from './pages/admin/AdminProfilePage'
import SupportAdminDashboard from './pages/admin/support/SupportAdminDashboard'
import SupportCenter from './pages/dashboard/support/SupportCenter'
import KnowledgeBaseArticle from './pages/dashboard/support/KnowledgeBaseArticle'

// Admission Manager Dashboard (lazy loaded for code splitting)
const AdmissionManagerDashboard = lazy(() => import('./pages/admin/admissions/AdmissionManagerDashboard'))
const AdmissionApplicationReview = lazy(() => import('./pages/admin/admissions/AdmissionApplicationReview'))

// Program Manager Dashboard
const ProgramManagerDashboard = lazy(() => import('./pages/admin/programs/ProgramManagerDashboard'))

// Contract Management Dashboard
const ContractManagementDashboard = lazy(() => import('./pages/admin/contracts/ContractManagementDashboard'))

// Loading Screen
import LoadingScreen from './components/ui/LoadingScreen'

// Error Pages
import NotFoundPage from './pages/errors/NotFoundPage'
import ForbiddenPage from './pages/errors/ForbiddenPage'
import ServerErrorPage from './pages/errors/ServerErrorPage'
import MaintenancePage from './pages/errors/MaintenancePage'
import NotImplementedPage from './pages/errors/NotImplementedPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !session) return <Navigate to="/login" replace />
  if (profile?.is_active === false) return <ForbiddenPage />

  // Admin-role users should NEVER be on the agent /dashboard — redirect to their specific admin dashboard
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'admission_manager') return <Navigate to="/admin/admissions" replace />
  if (profile?.role === 'program_manager') return <Navigate to="/admin/programs" replace />
  if (profile?.role === 'technical_team' || profile?.is_technical_team) return <Navigate to="/admin/support" replace />
  if (profile?.role === 'contract_manager') return <Navigate to="/admin/contracts" replace />

  // KYC Enforcement — only non-admin users reach here (admin roles are redirected above)
  if (profile && !profile.kyc_status) {
    return <Navigate to="/register/step1" replace />
  }

  return <>{children}</>
}

// Minimal guard for signup wizard (only needs user, no fully built profile required yet)
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user || !session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, session, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !session) return <Navigate to="/admin/login" replace />
  if (profile?.is_active === false) return <ForbiddenPage />
  // Only full admins can access regular admin routes
  if (profile?.role !== 'admin') {
    if (profile?.role === 'admission_manager') return <Navigate to="/admin/admissions" replace />
    if (profile?.role === 'program_manager') return <Navigate to="/admin/programs" replace />
    if (profile?.role === 'technical_team' || profile?.is_technical_team) return <Navigate to="/admin/support" replace />
    if (profile?.role === 'contract_manager') return <Navigate to="/admin/contracts" replace />
    return <ForbiddenPage />
  }
  return <>{children}</>
}

// Route guard for admission management – allows admission_manager AND admin roles
function AdmissionRoute({ children }: { children: React.ReactNode }) {
  const { user, session, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !session) return <Navigate to="/admin/login" replace />
  if (profile?.is_active === false) return <ForbiddenPage />
  if (profile?.role !== 'admin' && profile?.role !== 'admission_manager') {
    return <ForbiddenPage />
  }
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

// Route guard for program management – allows program_manager AND admin roles
function ProgramRoute({ children }: { children: React.ReactNode }) {
  const { user, session, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !session) return <Navigate to="/admin/login" replace />
  if (profile?.is_active === false) return <ForbiddenPage />
  if (profile?.role !== 'admin' && profile?.role !== 'program_manager') {
    return <ForbiddenPage />
  }
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

// Route guard for any staff member (admin, admission_manager, program_manager)
function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, session, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !session) return <Navigate to="/admin/login" replace />
  if (profile?.is_active === false) return <ForbiddenPage />
  if (profile?.role !== 'admin' && profile?.role !== 'admission_manager' && profile?.role !== 'program_manager' && profile?.role !== 'technical_team' && !profile?.is_technical_team) {
    return <ForbiddenPage />
  }
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

// Route guard for technical team
function TechnicalRoute({ children }: { children: React.ReactNode }) {
  const { user, session, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !session) return <Navigate to="/admin/login" replace />
  if (profile?.is_active === false) return <ForbiddenPage />
  if (profile?.role !== 'admin' && profile?.role !== 'technical_team' && !profile?.is_technical_team) {
    return <ForbiddenPage />
  }
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

// Route guard for contract management – allows contract_manager AND admin roles
function ContractRoute({ children }: { children: React.ReactNode }) {
  const { user, session, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !session) return <Navigate to="/admin/login" replace />
  if (profile?.is_active === false) return <ForbiddenPage />
  if (profile?.role !== 'admin' && profile?.role !== 'contract_manager') {
    return <ForbiddenPage />
  }
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (user) {
    if (profile?.is_active === false) return <ForbiddenPage />
    if (profile?.role === 'admission_manager') return <Navigate to="/admin/admissions" replace />
    if (profile?.role === 'program_manager') return <Navigate to="/admin/programs" replace />
    if (profile?.role === 'technical_team' || profile?.is_technical_team) return <Navigate to="/admin/support" replace />
    if (profile?.role === 'contract_manager') return <Navigate to="/admin/contracts" replace />
    if (profile?.role === 'admin') return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Root redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
      <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
      <Route path="/auth/email-verified" element={<EmailVerifiedPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

      {/* Admin Auth */}
      <Route path="/admin/login" element={<PublicRoute><AdminLoginPage /></PublicRoute>} />

      {/* Signup Wizard (requires authenticated user but no profile yet) */}
      <Route path="/register/*" element={<RequireAuth><SignupWizard /></RequireAuth>} />

      {/* Protected Agent Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardHome />} />
        <Route path="applications" element={<MyApplicationsPage />} />
        <Route path="applications/create" element={<StartNewApplicationPage />} />
        <Route path="applications/new" element={<CreateApplicationPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:slug" element={<CourseDetailPage />} />
        <Route path="university/:slug" element={<UniversityDetailPage />} />
        <Route path="profile" element={<AgentProfilePage />} />
        <Route path="team" element={<TeamMembersPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="blog/:slug" element={<BlogArticlePage />} />
        <Route path="news/:slug" element={<NewsArticlePage />} />
        <Route path="support" element={<SupportCenter />} />
        <Route path="support/kb/:slug" element={<KnowledgeBaseArticle />} />
      </Route>

      {/* Admission Manager Dashboard (secured, scoped access) */}
      <Route path="/admin/admissions" element={<AdmissionRoute><AdmissionManagerDashboard /></AdmissionRoute>} />
      <Route path="/admin/admissions/application/:id" element={<AdmissionRoute><AdmissionApplicationReview /></AdmissionRoute>} />

      {/* Program Manager Dashboard (secured, scoped access) */}
      <Route path="/admin/programs" element={<ProgramRoute><ProgramManagerDashboard /></ProgramRoute>} />


      {/* Admin Dashboard (full admin only) */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/programs/new" element={<ProgramRoute><AdminAddProgram /></ProgramRoute>} />
      <Route path="/admin/programs/edit/:id" element={<ProgramRoute><AdminEditProgram /></ProgramRoute>} />
      <Route path="/admin/programs/review/:submissionId" element={<AdminRoute><AdminAddProgram /></AdminRoute>} />
      <Route path="/admin/universities/new" element={<ProgramRoute><AdminAddUniversity /></ProgramRoute>} />
      <Route path="/admin/universities/edit/:id" element={<ProgramRoute><AdminEditUniversity /></ProgramRoute>} />
      <Route path="/admin/universities/review/:submissionId" element={<AdminRoute><AdminAddUniversity /></AdminRoute>} />
      <Route path="/admin/students" element={<AdminRoute><AdminStudents /></AdminRoute>} />
      <Route path="/admin/agents" element={<AdminRoute><AdminAgents /></AdminRoute>} />
      <Route path="/admin/applications/:id" element={<AdminRoute><AdminApplicationDetail /></AdminRoute>} />
      <Route path="/admin/profile" element={<StaffRoute><AdminProfilePage /></StaffRoute>} />
      <Route path="/admin/support" element={<TechnicalRoute><SupportAdminDashboard /></TechnicalRoute>} />

      {/* Contract Management Dashboard */}
      <Route path="/admin/contracts" element={<ContractRoute><ContractManagementDashboard /></ContractRoute>} />

      {/* Manual Error Routes & Aliases */}
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="/501" element={<NotImplementedPage />} />
      <Route path="/503" element={<MaintenancePage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
