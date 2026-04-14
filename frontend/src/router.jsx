// src/router.jsx
// Central React Router v7 configuration using createBrowserRouter.
// All authenticated pages are nested inside AppLayout via ProtectedRoute.

import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import AppLayout       from './layouts/AppLayout';
import ProtectedRoute  from './components/ProtectedRoute';
import LoginPage       from './pages/LoginPage';

// Lazy-load page components so each route is a separate code chunk
const DashboardPage   = lazy(() => import('./pages/DashboardPage'));
const TransactionList = lazy(() => import('./components/TransactionList'));
const ImportPage      = lazy(() => import('./pages/ImportPage'));
const CameraCapture   = lazy(() => import('./components/CameraCapture'));
const PropertiesPage  = lazy(() => import('./pages/PropertiesPage'));
const DocumentsPage   = lazy(() => import('./pages/DocumentsPage'));
const ReportsPage     = lazy(() => import('./pages/ReportsPage'));

// Simple loading fallback used by Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[60vh]">
    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Protected routes — require authentication
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Default redirect to /dashboard
          { index: true, element: <Navigate to="/dashboard" replace /> },

          {
            path: 'dashboard',
            element: (
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'transactions',
            element: (
              <Suspense fallback={<PageLoader />}>
                <TransactionList />
              </Suspense>
            ),
          },
          {
            path: 'import',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ImportPage />
              </Suspense>
            ),
          },
          {
            path: 'capture',
            element: (
              <Suspense fallback={<PageLoader />}>
                <CameraCapture />
              </Suspense>
            ),
          },
          {
            path: 'properties',
            element: (
              <Suspense fallback={<PageLoader />}>
                <PropertiesPage />
              </Suspense>
            ),
          },
          {
            path: 'documents',
            element: (
              <Suspense fallback={<PageLoader />}>
                <DocumentsPage />
              </Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ReportsPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },

  // Catch-all — redirect unknown paths to dashboard
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default router;

