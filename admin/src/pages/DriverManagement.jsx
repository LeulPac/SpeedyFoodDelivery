import React, { useState, useEffect } from 'react';
import api from '../api';
import { Users, CheckCircle, Copy, Pencil, Trash, X, Key, Phone } from '@phosphor-icons/react';

const inputClass =
  'w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition text-sm';
const labelClass = 'block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold';

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverNotice, setDriverNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/orders/drivers');
      setDrivers(res.data);
    } catch (err) {
      console.error('Failed to load drivers', err);
    }
  };

  const createDriver = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { name, email, password, phone } = driverForm;
    try {
      await api.post('/auth/register-driver', { name, email, password, phone });
      setDriverForm({ name: '', email: '', password: '', phone: '' });
      fetchDrivers();
      setDriverNotice({
        title: 'New Driver Account Created!',
        name,
        email,
        password,
        phone: phone || 'Not Provided',
      });
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create driver account');
    } finally {
      setLoading(false);
    }
  };

  const startEditDriver = (driver) => {
    setEditingDriver({
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone || '',
      password: '',
    });
  };

  const saveEditDriver = async (e) => {
    e.preventDefault();
    if (!editingDriver) return;
    setEditLoading(true);
    try {
      const payload = {
        name: editingDriver.name,
        email: editingDriver.email,
        phone: editingDriver.phone,
      };
      if (editingDriver.password && editingDriver.password.trim().length > 0) {
        payload.password = editingDriver.password.trim();
      }

      await api.put(`/auth/drivers/${editingDriver.id}`, payload);
      
      if (payload.password) {
        setDriverNotice({
          title: 'Driver Updated & Password Reset!',
          name: editingDriver.name,
          email: editingDriver.email,
          phone: editingDriver.phone || 'Not Provided',
          password: payload.password,
        });
      }

      setEditingDriver(null);
      fetchDrivers();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to update driver');
    } finally {
      setEditLoading(false);
    }
  };

  const deleteDriver = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove driver "${name}"?`)) return;
    try {
      await api.delete(`/auth/drivers/${id}`);
      if (editingDriver?.id === id) setEditingDriver(null);
      fetchDrivers();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to delete driver');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const freeDrivers = drivers.filter((d) => d.is_available);
  const busyDrivers = drivers.filter((d) => !d.is_available);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users weight="fill" className="text-purple-400" size={28} />
            Driver Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage driver accounts, phone numbers, reset passwords, and monitor status</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-green-600/20 text-green-300 border border-green-500/40 px-3 py-1.5 rounded-full text-xs font-semibold">
            {freeDrivers.length} free
          </span>
          <span className="bg-orange-600/20 text-orange-300 border border-orange-500/40 px-3 py-1.5 rounded-full text-xs font-semibold">
            {busyDrivers.length} busy
          </span>
        </div>
      </div>

      {/* Credentials Banner */}
      {driverNotice && (
        <div className="mb-6 p-5 rounded-2xl border border-green-600/50 bg-green-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} weight="fill" className="text-green-400" />
              <p className="text-green-300 font-semibold text-sm">{driverNotice.title}</p>
            </div>
            <button
              onClick={() => setDriverNotice(null)}
              className="text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-slate-400 text-xs mb-3">Share these updated credentials with the driver:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { label: 'Name', value: driverNotice.name },
              { label: 'Phone', value: driverNotice.phone },
              { label: 'Login Email', value: driverNotice.email },
              { label: 'Password', value: driverNotice.password },
              { label: 'Driver App URL', value: 'http://localhost:5175' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between bg-slate-900/70 px-3.5 py-2.5 rounded-xl border border-slate-800">
                <div className="min-w-0 pr-2">
                  <span className="text-slate-500 text-xs">{label}: </span>
                  <span className="text-slate-200 text-xs font-mono font-medium">{value}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(value)}
                  className="text-slate-400 hover:text-white p-1 transition"
                  title="Copy"
                >
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Driver Panel */}
      {editingDriver && (
        <div className="mb-6 bg-slate-800 border border-purple-500/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <Pencil size={18} className="text-purple-400" />
              Edit Driver: {editingDriver.name}
            </h2>
            <button
              onClick={() => setEditingDriver(null)}
              className="text-slate-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={saveEditDriver} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Display Name</label>
                <input
                  required
                  value={editingDriver.name}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Login Email</label>
                <input
                  type="email"
                  required
                  value={editingDriver.email}
                  onChange={(e) => setEditingDriver({ ...editingDriver, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0911223344"
                  value={editingDriver.phone}
                  onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5 text-purple-300">
                  <Key size={14} />
                  Reset Password (Optional)
                </span>
              </label>
              <input
                type="password"
                placeholder="Leave blank to keep existing password, or enter new password (6+ chars)"
                minLength={6}
                value={editingDriver.password}
                onChange={(e) => setEditingDriver({ ...editingDriver, password: e.target.value })}
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1">
                If the driver forgot their password, type a new password here to reset their access.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={editLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
              >
                {editLoading ? 'Saving...' : 'Save Driver Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Driver list */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-white font-bold mb-4 text-base">All Drivers ({drivers.length})</h2>
          {drivers.length === 0 ? (
            <div className="text-center py-10">
              <Users size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No drivers yet — create one below</p>
            </div>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/60 p-4 rounded-xl border transition
                    ${editingDriver?.id === driver.id ? 'border-purple-500' : 'border-slate-700 hover:border-slate-600'}`}
                >
                  <div className="min-w-0 mb-3 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm truncate">{driver.name}</p>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          driver.is_available
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                            : 'bg-orange-600/20 text-orange-400 border border-orange-500/30'
                        }`}
                      >
                        {driver.is_available ? 'FREE' : `BUSY #${driver.active_order_id}`}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs truncate mt-0.5">{driver.email}</p>
                    <p className="text-purple-400 text-xs font-mono mt-0.5 flex items-center gap-1">
                      <Phone size={12} /> {driver.phone || 'Phone Not Set'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => startEditDriver(driver)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white rounded-lg border border-purple-600/40 transition font-semibold"
                      title="Edit name, email, phone or reset password"
                    >
                      <Pencil size={13} /> Edit / Reset PW
                    </button>
                    <button
                      onClick={() => deleteDriver(driver.id, driver.name)}
                      className="p-1.5 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white rounded-lg border border-red-600/40 transition"
                      title="Delete driver"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create driver form */}
        <div>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-1 text-base">Create Driver Account</h2>
            <p className="text-slate-400 text-xs mb-5">
              Drivers sign in at{' '}
              <span className="text-cyan-400 font-mono">localhost:5175</span> using the email and password you set.
            </p>

            <form onSubmit={createDriver} className="space-y-4">
              <div>
                <label className={labelClass}>Display Name</label>
                <input
                  placeholder="e.g. John Smith"
                  required
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0911223344"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  className={inputClass}
                />
                <p className="text-xs text-slate-500 mt-1.5">Displayed to admin on active order delivery cards</p>
              </div>
              <div>
                <label className={labelClass}>Username (Login Email)</label>
                <input
                  type="email"
                  placeholder="e.g. john@delivery.com"
                  required
                  value={driverForm.email}
                  onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                  className={inputClass}
                />
                <p className="text-xs text-slate-500 mt-1.5">This is what the driver types to sign in</p>
              </div>
              <div>
                <label className={labelClass}>Password</label>
                <input
                  type="password"
                  placeholder="Set a secure password (6+ chars)"
                  required
                  minLength={6}
                  value={driverForm.password}
                  onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                  className={inputClass}
                />
                <p className="text-xs text-slate-500 mt-1.5">You can always reset or edit this later if forgotten.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-purple-600 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users weight="bold" /> Create Driver Login
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

