// src/router.jsx
// Central React Router v7 configuration using createBrowserRouter.
// All authenticated pages are nested inside AppLayout via ProtectedRoute.

import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import AppLayout       from './layouts/AppLayout';
import ProtectedRoute  from './components/ProtectedRoute';
import LoginPage       from './pages/LoginPage';

// Lazy-load page components so each route is a separate code chunk
const TransactionList = lazy(() => import('./components/TransactionList'));
const BankImport      = lazy(() => import('./components/BankImport'));
const CameraCapture   = lazy(() => import('./components/CameraCapture'));

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
          // Default redirect to /transactions
          { index: true, element: <Navigate to="/transactions" replace /> },

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
                <BankImport />
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
        ],
      },
    ],
  },

  // Catch-all — redirect unknown paths to transactions
  { path: '*', element: <Navigate to="/transactions" replace /> },
]);

export default router;
