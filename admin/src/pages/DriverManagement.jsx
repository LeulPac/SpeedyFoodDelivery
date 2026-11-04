import { useModal } from '../context/ModalContext';
import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Users,
  CheckCircle,
  Copy,
  Pencil,
  Trash,
  X,
  Key,
  Phone,
  Truck,
  ArrowsClockwise
} from '@phosphor-icons/react';

export default function DriverManagement() {
  const { showModal } = useModal();
  const [drivers, setDrivers] = useState([]);
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverNotice, setDriverNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = async () => {
    try {
      setFetching(true);
      const res = await api.get('/orders/drivers');
      setDrivers(res.data);
    } catch (err) {
      console.error('Failed to load drivers', err);
    } finally {
      setFetching(false);
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
        title: 'New Courier Account Created!',
        name,
        email,
        password,
        phone: phone || 'Not Provided',
      });
    } catch (err) {
      showModal({ title: 'Account Creation Failed', message: err.response?.data?.error || err.message || 'Failed to create driver account', type: 'danger' });
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
      setEditingDriver(null);
      fetchDrivers();
    } catch (err) {
      showModal({ title: 'Update Failed', message: err.response?.data?.error || 'Failed to update driver', type: 'danger' });
    } finally {
      setEditLoading(false);
    }
  };

  const deleteDriver = async (driver) => {
    const confirmed = await showModal({ title: 'Delete Courier', message: `Are you sure you want to delete courier "${driver.name}"?`, type: 'danger', confirmText: 'Delete Courier', cancelText: 'Cancel' });
    if (!confirmed) return;
    try {
      await api.delete(`/auth/drivers/${driver.id}`);
      fetchDrivers();
    } catch (err) {
      showModal({ title: 'Delete Failed', message: err.response?.data?.error || 'Failed to delete driver', type: 'danger' });
    }
  };

  const copyCredentials = () => {
    if (!driverNotice) return;
    const text = `SpeedyDelivery Courier App (port 5175)\nUsername: ${driverNotice.email}\nPassword: ${driverNotice.password}`;
    navigator.clipboard.writeText(text);
    showModal({ title: 'Copied', message: 'Courier login credentials copied to clipboard!', type: 'success' });
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
          <Truck weight="fill" className="text-[#FF6B00]" size={28} />
          Delivery Courier Team
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Create & manage your business's dedicated delivery drivers
        </p>
      </div>

      {/* Creation Notice Banner */}
      {driverNotice && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm flex items-center gap-2">
              <CheckCircle size={20} weight="fill" />
              {driverNotice.title}
            </span>
            <button
              onClick={() => setDriverNotice(null)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-[var(--bg-card)] p-3 rounded-xl border border-emerald-500/20 text-[var(--text-main)]">
            <div>Username: <strong>{driverNotice.email}</strong></div>
            <div>Password: <strong>{driverNotice.password}</strong></div>
            <div>Phone: <strong>{driverNotice.phone}</strong></div>
          </div>
          <button
            onClick={copyCredentials}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <Copy size={14} />
            <span>Copy Login Credentials</span>
          </button>
        </div>
      )}

      {/* Form: Add Driver */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-8 shadow-sm space-y-4">
        <h3 className="font-black text-lg text-[var(--text-main)]">Add New Delivery Courier</h3>
        <form onSubmit={createDriver} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Courier Name *</label>
            <input
              type="text"
              placeholder="Full Name"
              value={driverForm.name}
              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
              required
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Login Email *</label>
            <input
              type="email"
              placeholder="driver@yourbusiness.com"
              value={driverForm.email}
              onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
              required
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Password (min 6) *</label>
            <input
              type="text"
              placeholder="Temporary password"
              value={driverForm.password}
              onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
              required
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Phone Number</label>
            <input
              type="tel"
              placeholder="0911223344"
              value={driverForm.phone}
              onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold transition shadow"
            >
              {loading ? 'Creating...' : 'Register Courier'}
            </button>
          </div>
        </form>
      </div>

      {/* Edit Driver Modal */}
      {editingDriver && (
        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border-light)] pb-3">
            <h3 className="font-black text-base text-[var(--text-main)]">Edit Courier: {editingDriver.name}</h3>
            <button onClick={() => setEditingDriver(null)}>
              <X size={20} />
            </button>
          </div>
          <form onSubmit={saveEditDriver} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">Name</label>
              <input
                type="text"
                value={editingDriver.name}
                onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">Email</label>
              <input
                type="email"
                value={editingDriver.email}
                onChange={(e) => setEditingDriver({ ...editingDriver, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">Phone</label>
              <input
                type="tel"
                value={editingDriver.phone}
                onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="px-4 py-1.5 rounded-xl border border-[var(--border-light)] text-xs font-bold text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-5 py-1.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Drivers List */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[var(--border-light)] flex justify-between items-center">
          <h3 className="font-black text-base text-[var(--text-main)]">Active Delivery Team ({drivers.length})</h3>
        </div>

        {fetching ? (
          <div className="p-12 text-center text-[var(--text-muted)]">
            <ArrowsClockwise size={28} className="animate-spin mx-auto" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] space-y-1">
            <p className="font-bold text-[var(--text-main)]">No couriers registered yet</p>
            <p className="text-xs">Add your delivery drivers using the form above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-light)]">
            {drivers.map((d) => (
              <div key={d.id} className="p-5 flex items-center justify-between gap-4 hover:bg-[var(--bg-page)]/40 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[var(--text-main)]">{d.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        d.is_available
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {d.is_available ? 'Available' : 'Delivering Order'}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] flex items-center gap-3">
                    <span>{d.email}</span>
                    {d.phone && <span>• {d.phone}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditDriver(d)}
                    className="p-2 rounded-xl border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#FF6B00] transition"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteDriver(d)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
