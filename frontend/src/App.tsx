import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DriveLayout } from '@/layouts/DriveLayout'
import { UploadProvider } from '@/context/UploadContext'

const AllFilesPage = lazy(() => import('@/pages/AllFilesPage').then(m => ({ default: m.AllFilesPage })))
const ArchivedPage = lazy(() => import('@/pages/ArchivedPage').then(m => ({ default: m.ArchivedPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const GoogleAuthPage = lazy(() => import('@/pages/GoogleAuthPage').then(m => ({ default: m.GoogleAuthPage })))
const GoogleConnectedPage = lazy(() => import('@/pages/GoogleConnectedPage').then(m => ({ default: m.GoogleConnectedPage })))
const QuotaTrackerPage = lazy(() => import('@/pages/QuotaTrackerPage').then(m => ({ default: m.QuotaTrackerPage })))
const RecentPage = lazy(() => import('@/pages/RecentPage').then(m => ({ default: m.RecentPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const SharedPage = lazy(() => import('@/pages/SharedPage').then(m => ({ default: m.SharedPage })))
const StarredPage = lazy(() => import('@/pages/StarredPage').then(m => ({ default: m.StarredPage })))
const PublicFilePage = lazy(() => import('@/pages/PublicFilePage').then(m => ({ default: m.PublicFilePage })))
const ApiManagementPage = lazy(() => import('@/pages/ApiManagementPage').then(m => ({ default: m.ApiManagementPage })))
const TrashPage = lazy(() => import('@/pages/TrashPage').then(m => ({ default: m.TrashPage })))
const ActivityLogPage = lazy(() => import('@/pages/ActivityLogPage').then(m => ({ default: m.ActivityLogPage })))

function App() {
  return <UploadProvider>
    <Suspense fallback={<div style={{ minHeight:'65vh',display:'flex',alignItems:'center',justifyContent:'center' }} role="status"><Spin size="large" tip="Loading workspace"><div style={{width:150,height:75}} /></Spin></div>}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="google-auth" element={<GoogleAuthPage />} />
        <Route path="google-connected" element={<GoogleConnectedPage />} />
        <Route path="public/files/:token" element={<PublicFilePage />} />
        <Route path="public/files/:token/embed" element={<PublicFilePage embed />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<DriveLayout />}>
            <Route index element={<Navigate to="/all-files" replace />} />
            <Route path="all-files" element={<AllFilesPage />} />
            <Route path="quota" element={<QuotaTrackerPage />} />
            <Route path="shared" element={<SharedPage />} />
            <Route path="recent" element={<RecentPage />} />
            <Route path="starred" element={<StarredPage />} />
            <Route path="archived" element={<ArchivedPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="activity" element={<ActivityLogPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="api" element={<ApiManagementPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/all-files" replace />} />
      </Routes>
    </Suspense>
  </UploadProvider>
}
export default App
