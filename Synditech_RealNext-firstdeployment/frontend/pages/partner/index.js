import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { 
  BuildingStorefrontIcon, 
  UsersIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';

function StatCard({ title, value, icon: Icon, color, trend }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-gray-500 ml-2">from last month</span>
        </div>
      )}
    </div>
  );
}

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    // Force recompile
    setTimeout(() => setLoading(false), 1000);
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Partner Dashboard</h1>
          <p className="text-gray-400">Welcome back, {user?.name}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Tenants"
            value="12"
            icon={BuildingStorefrontIcon}
            color="bg-blue-500"
            trend={8.2}
          />
          <StatCard
            title="Active Users"
            value="245"
            icon={UsersIcon}
            color="bg-purple-500"
            trend={12.5}
          />
          <StatCard
            title="Monthly Revenue"
            value="$4,250"
            icon={CurrencyDollarIcon}
            color="bg-green-500"
            trend={5.3}
          />
          <StatCard
            title="Avg. Usage"
            value="78%"
            icon={ChartBarIcon}
            color="bg-orange-500"
            trend={-2.1}
          />
        </div>

        {/* Recent Activity / Tenants List could go here */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Your Recent Tenants</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs uppercase bg-white/5 text-gray-300">
                <tr>
                  <th className="px-6 py-3">Tenant Name</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">Test Company Ltd</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">Active</span></td>
                  <td className="px-6 py-4">Pro Plan</td>
                  <td className="px-6 py-4">Feb 4, 2026</td>
                </tr>
                {/* Placeholders */}
                <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">Acme Corp</td>
                  <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500">Trial</span></td>
                  <td className="px-6 py-4">Starter</td>
                  <td className="px-6 py-4">Jan 28, 2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
