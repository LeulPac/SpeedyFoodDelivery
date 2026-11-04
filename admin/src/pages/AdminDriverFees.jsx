import { useModal } from '../context/ModalContext';
import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Truck,
  CurrencyDollar,
  CheckCircle,
  WarningCircle,
  Gear,
  ArrowsClockwise
} from '@phosphor-icons/react';

export default function AdminDriverFees() {
  const { showModal } = useModal();
  const [fees, setFees] = useState([]);
  const [settings, setSettings] = useState({ driver_fee_per_delivery: '25.00', grace_period_days: 7 });
  const [loading, setLoading] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [settingSuccess, setSettingSuccess] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feeRes, setRes] = await Promise.all([
        api.get('/admin/driver-fees'),
        api.get('/admin/settings'),
      ]);
      setFees(feeRes.data);
      setSettings(setRes.data);
    } catch (err) {
      console.error('Failed to load driver fee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setUpdatingSettings(true);
    setSettingSuccess(false);
    try {
      const res = await api.put('/admin/settings', {
        driver_fee_per_delivery: parseFloat(settings.driver_fee_per_delivery),
        grace_period_days: parseInt(settings.grace_period_days),
      });
      setSettings(res.data);
      setSettingSuccess(true);
      setTimeout(() => setSettingSuccess(false), 3000);
    } catch (err) {
      showModal({ title: 'Update Failed', message: 'Failed to update settings: ' + (err.response?.data?.error || err.message), type: 'danger' });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const totalAccrued = fees.reduce((sum, f) => sum + parseFloat(f.fee_amount), 0);
  const totalCollected = fees.filter((f) => f.status === 'paid').reduce((sum, f) => sum + parseFloat(f.fee_amount), 0);
  const totalOutstanding = totalAccrued - totalCollected;

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
          Driver Platform Fee Management
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Courier driver model: Couriers pay a fixed platform fee for each successfully completed delivery
        </p>
      </div>

      {/* Settings & Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurable Settings Card */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Gear size={20} className="text-[#FF6B00]" weight="bold" />
            <h3 className="font-black text-base text-[var(--text-main)]">Configurable Fee Rules</h3>
          </div>

          {settingSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
              Settings updated successfully!
            </div>
          )}

          <form onSubmit={handleUpdateSettings} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">
                Fixed Fee Per Completed Delivery (ETB)
              </label>
              <input
                type="number"
                step="0.50"
                value={settings.driver_fee_per_delivery}
                onChange={(e) => setSettings({ ...settings, driver_fee_per_delivery: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
              <span className="text-[10px] text-[var(--text-muted)] block">
                Charged only upon verified delivery completion.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">
                Payment Grace Period (Days)
              </label>
              <input
                type="number"
                value={settings.grace_period_days}
                onChange={(e) => setSettings({ ...settings, grace_period_days: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <button
              type="submit"
              disabled={updatingSettings}
              className="w-full py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs shadow transition"
            >
              {updatingSettings ? 'Updating...' : 'Update Platform Settings'}
            </button>
          </form>
        </div>

        {/* Ledger Summary Stats */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-2 flex flex-col justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Total Accrued Fees
            </span>
            <div className="text-2xl font-black text-[var(--text-main)]">
              ETB {totalAccrued.toFixed(2)}
            </div>
            <span className="text-xs text-[var(--text-muted)]">{fees.length} Completed delivery fee events</span>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-2 flex flex-col justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Fees Collected
            </span>
            <div className="text-2xl font-black text-emerald-500">
              ETB {totalCollected.toFixed(2)}
            </div>
            <span className="text-xs text-emerald-500 font-semibold">
              Paid by couriers via Chapa
            </span>
          </div>

          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-2 flex flex-col justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Outstanding Driver Balances
            </span>
            <div className="text-2xl font-black text-amber-500">
              ETB {totalOutstanding.toFixed(2)}
            </div>
            <span className="text-xs text-amber-500 font-semibold">
              Pending courier settlement
            </span>
          </div>
        </div>
      </div>

      {/* Traceable Delivery Fee Ledger */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden shadow-sm space-y-4 p-6">
        <h3 className="font-black text-base text-[var(--text-main)]">Traceable Completed Delivery Fee Ledger</h3>

        {fees.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">No delivery fees recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)] uppercase tracking-wider font-bold">
                  <th className="pb-3">Delivery Order</th>
                  <th className="pb-3">Courier Name</th>
                  <th className="pb-3">Business</th>
                  <th className="pb-3">Fixed Fee</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Completion Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-main)]">
                {fees.map((f) => (
                  <tr key={f.id} className="hover:bg-[var(--bg-page)]/40 transition">
                    <td className="py-3 font-mono font-bold text-[var(--text-main)]">
                      Order #{f.order_id} (ETB {Number(f.order_amount).toFixed(2)})
                    </td>
                    <td className="py-3">
                      <div className="font-semibold">{f.driver_name}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{f.driver_phone}</div>
                    </td>
                    <td className="py-3 font-medium text-[var(--text-muted)]">
                      {f.business_name || 'Speedy Partner'}
                    </td>
                    <td className="py-3 font-black text-[#FF6B00]">
                      ETB {Number(f.fee_amount).toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          f.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(f.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

