import { Navigate, Route, Routes } from 'react-router'
import ProtectedRoute from '../components/common/ProtectedRoute'
import BaseLayout from '../layouts/BaseLayout'
import BankTransactionsPage from '../pages/BankTransactionsPage'
import CalculatorsPage from '../pages/CalculatorsPage'
import CapitalGainsPage from '../pages/CapitalGainsPage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import MarketDataPage from '../pages/MarketDataPage'
import MutualFundPage from '../pages/MutualFundPage'
import PpfPage from '../pages/PpfPage'
import StocksPage from '../pages/StocksPage'

export const routes = (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <ProtectedRoute>
          <BaseLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/overview" replace />} />
      <Route path="overview" element={<DashboardPage />} />
      <Route path="mutual-fund" element={<MutualFundPage />} />
      <Route path="stocks" element={<StocksPage />} />
      <Route path="capital-gains" element={<CapitalGainsPage />} />
      <Route path="ppf" element={<PpfPage />} />
      <Route path="transactions/bank" element={<BankTransactionsPage />} />
      <Route path="calculators" element={<CalculatorsPage />} />
      <Route path="market-data" element={<MarketDataPage />} />
    </Route>
  </Routes>
)
