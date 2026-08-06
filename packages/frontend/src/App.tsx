import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import routes from './config/routes';
import PageSkeleton from './shared/components/PageSkeleton';
import type { RouteConfig } from './config/routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function renderRoute(route: RouteConfig, index?: number): React.ReactElement {
  const key = route.path ?? `route-${index}`;

  if (route.children) {
    return (
      <Route key={key} path={route.path} element={route.element}>
        {route.children.map((child, i) => renderRoute(child, i))}
      </Route>
    );
  }

  if (route.index) {
    return <Route key={key} index element={route.element} />;
  }

  return (
    <Route key={key} path={route.path} element={route.element} />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {routes.map((route: RouteConfig, i: number) => renderRoute(route, i))}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
