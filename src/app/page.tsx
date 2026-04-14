'use client'

import { useState } from 'react'
import AdminLayout from '@/components/admin/admin-layout'
import DashboardPage from '@/components/admin/dashboard-page'
import UsersPage from '@/components/admin/users-page'
import CardPoolPage from '@/components/admin/card-pool-page'
import HeroesPage from '@/components/admin/heroes-page'
import MapPage from '@/components/admin/map-page'
import GuildsPage from '@/components/admin/guilds-page'
import PaymentPage from '@/components/admin/payment-page'
import AnalyticsPage from '@/components/admin/analytics-page'
import LogsPage from '@/components/admin/logs-page'
import ConfigPage from '@/components/admin/config-page'
import ActivitiesPage from '@/components/admin/activities-page'
import RolesPage from '@/components/admin/roles-page'

const pageComponents: Record<string, React.ComponentType> = {
  'dashboard': DashboardPage,
  'users': UsersPage,
  'card-pool': CardPoolPage,
  'heroes': HeroesPage,
  'map': MapPage,
  'guilds': GuildsPage,
  'payment': PaymentPage,
  'analytics': AnalyticsPage,
  'logs': LogsPage,
  'config': ConfigPage,
  'activities': ActivitiesPage,
  'roles': RolesPage,
}

export default function Home() {
  const [activeMenu, setActiveMenu] = useState('dashboard')

  const ActivePage = pageComponents[activeMenu] || DashboardPage

  return (
    <AdminLayout activeMenu={activeMenu} onMenuChange={setActiveMenu}>
      <ActivePage />
    </AdminLayout>
  )
}
