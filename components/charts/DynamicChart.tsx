'use client'

import dynamic from 'next/dynamic'
import {
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

// Loading skeleton for charts
const ChartSkeleton = () => (
  <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading chart...</p>
    </div>
  </div>
)

// Only dynamically import the heavy chart containers (BarChart, LineChart, PieChart)
// Smaller components are lightweight and can be imported normally
export const DynamicBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

export const DynamicLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

export const DynamicPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

// Export smaller components as regular imports (they're lightweight)
export const DynamicBar = Bar
export const DynamicLine = Line
export const DynamicPie = Pie
export const DynamicCell = Cell
export const DynamicXAxis = XAxis
export const DynamicYAxis = YAxis
export const DynamicCartesianGrid = CartesianGrid
export const DynamicTooltip = Tooltip
export const DynamicResponsiveContainer = ResponsiveContainer
export const DynamicLegend = Legend

