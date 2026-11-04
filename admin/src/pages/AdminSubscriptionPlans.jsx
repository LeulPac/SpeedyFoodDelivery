import { useModal } from '../context/ModalContext';
import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Receipt,
  CheckCircle,
  PencilSimple,
  Check,
  X,
  ArrowsClockwise
} from '@phosphor-icons/react';

export default function AdminSubscriptionPlans() {
  const { showModal } = useModal();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ price: '', max_menu_items: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/plans');
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const startEdit = (plan) => {
    setEditingId(plan.id);
    setEditForm({
      price: plan.price,
      max_menu_items: plan.max_menu_items,
      description: plan.description || '',
    });
  };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      await api.put(`/admin/plans/${id}`, {
        price: parseFloat(editForm.price),
        max_menu_items: parseInt(editForm.max_menu_items),
        description: editForm.description,
      });
      setEditingId(null);
      await fetchPlans();
    } catch (err) {
      showModal({ title: 'Update Failed', message: 'Failed to update plan pricing: ' + (err.response?.data?.error || err.message), type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
          Subscription Plans & Pricing
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Configure monthly fees charged to restaurants, cafes, and hotels (0% food commission model)
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-[var(--text-muted)]">
          <ArrowsClockwise size={28} className="animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isEditing = editingId === p.id;

            return (
              <div
                key={p.id}
                className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-lg text-[var(--text-main)]">{p.name} Tier</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FF6B00]/10 text-[#FF6B00]">
                      {p.billing_period}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Monthly Price (ETB)</label>
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Max Menu Items</label>
                        <input
                          type="number"
                          value={editForm.max_menu_items}
                          onChange={(e) => setEditForm({ ...editForm, max_menu_items: e.target.value })}
                          className="w-full px-3 py-1.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Description</label>
                        <textarea
                          rows={2}
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-black text-[#FF6B00]">
                        ETB {Number(p.price).toFixed(0)}
                        <span className="text-xs text-[var(--text-muted)] font-normal"> /mo</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{p.description}</p>
                      <div className="p-3 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] text-xs space-y-1">
                        <span className="font-bold text-[var(--text-main)] block">
                          Menu Item Limit: {p.max_menu_items} items
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] block">
                          0% food order commission
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-[var(--border-light)] flex justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-xl border border-[var(--border-light)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(p.id)}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#E05E00]"
                      >
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(p)}
                      className="px-4 py-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] hover:border-[#FF6B00] text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5 transition"
                    >
                      <PencilSimple size={14} />
                      <span>Edit Pricing & Quota</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

