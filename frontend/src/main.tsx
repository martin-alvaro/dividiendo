/* eslint-disable react-refresh/only-export-components */

import { StrictMode } from 'react'
import {
  createRoot,
} from 'react-dom/client'

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import App from './App'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Groups from './pages/Groups'
import ExpenseForm from './pages/ExpenseForm'
import GroupDetail from './pages/GroupDetail'
import Payments from './pages/Payments'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'

import {
  StoreProvider,
  useStore,
} from './lib/store'

import './index.css'

function Protected({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    authenticated,
  } = useStore()

  return authenticated ? (
    <>{children}</>
  ) : (
    <Navigate
      to="/login"
      replace
    />
  )
}

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<App />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/home"
            element={
              <Protected>
                <Home />
              </Protected>
            }
          />

          <Route
            path="/groups"
            element={
              <Protected>
                <Groups />
              </Protected>
            }
          />

          <Route
            path="/groups/:groupId"
            element={
              <Protected>
                <GroupDetail />
              </Protected>
            }
          />

          <Route
            path="/expenses/new"
            element={
              <Protected>
                <ExpenseForm />
              </Protected>
            }
          />

          <Route
            path="/payments"
            element={
              <Protected>
                <Payments />
              </Protected>
            }
          />

          <Route
            path="/profile"
            element={
              <Protected>
                <Profile />
              </Protected>
            }
          />

          <Route
            path="/notifications"
            element={
              <Protected>
                <Notifications />
              </Protected>
            }
          />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
)