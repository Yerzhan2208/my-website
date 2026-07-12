import { Routes, Route } from 'react-router-dom'
import AppShell from './layout/AppShell'
import HomePage from './components/HomePage'
import AppsHub from './components/AppsHub'
import appRegistry from './apps/registry'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="/apps" element={<AppsHub />} />
        {appRegistry.map(app => (
          <Route
            key={app.id}
            path={app.path}
            element={<app.component />}
          />
        ))}
      </Route>
    </Routes>
  )
}
