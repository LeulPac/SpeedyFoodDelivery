import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import api, { resolveAssetUrl } from '../api';
import { SignOut, CheckCircle, CookingPot, Package, UserCircle, Phone, User, ForkKnife, Car } from '@phosphor-icons/react';
import { io } from 'socket.io-client';

export default function OwnerDashboard() {
  const { showModal } = useModal();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverForm, setDriverForm] = useState({ name: '', email: '', password: '' });
  const [driverCreatedNotice, setDriverCreatedNotice] = useState(null);
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState({});
  const [socket, setSocket] = useState(null);
  
  // New Item Form State
  const MENU_CATEGORIES = ['Main Dish', 'Drinks', 'Dessert', 'Appetizers', 'Sides', 'Snacks', 'Other'];
  const [newItemParams, setNewItemParams] = useState({ name: '', description: '', price: '', category: 'Main Dish', image_url: '' });
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);

  useEffect(() => {
    fetchOrders();
    fetchMenu();
    fetchDrivers();

    const newSocket = io(import.meta.env.VITE_API_URL || '/');
    setSocket(newSocket);

    newSocket.on('new_order', () => {
        fetchOrders();
        fetchDrivers();
    });
    newSocket.on('order_status_update', () => {
      fetchOrders();
      fetchDrivers();
    });
    newSocket.on('order_location_update', () => fetchOrders());

    return () => newSocket.close();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await api.get('/menu/all');
      setMenu(res.data);
    } catch (err) {
      console.error("Failed to load menu", err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/orders/drivers');
      setDrivers(res.data);
    } catch (err) {
      console.error("Failed to load drivers", err);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
      fetchDrivers();
    } catch (err) {
      showModal({ title: 'Order Update Failed', message: 'Failed to update order', type: 'danger' });
    }
  };

  const assignDriver = async (orderId) => {
    const driverId = selectedDriverByOrder[orderId];
    if (!driverId) {
      showModal({ title: 'Select Driver', message: 'Please select a free driver first', type: 'warning' });
      return;
    }
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'delivering', driver_id: Number(driverId) });
      setSelectedDriverByOrder((prev) => ({ ...prev, [orderId]: '' }));
      fetchOrders();
      fetchDrivers();
    } catch (err) {
      showModal({ title: 'Assignment Failed', message: err.response?.data?.error || 'Failed to assign driver', type: 'danger' });
    }
  };

  const createDriver = async (e) => {
    e.preventDefault();
    const { name, email, password } = driverForm;
    try {
      await api.post('/auth/register-driver', { name, email, password });
      setDriverForm({ name: '', email: '', password: '' });
      fetchDrivers();
      setDriverCreatedNotice({
        name,
        email,
        password,
      });
    } catch (err) {
      showModal({ title: 'Courier Creation Failed', message: err.response?.data?.error || 'Failed to create driver account', type: 'danger' });
    }
  };

  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newItemParams.name);
      formData.append('description', newItemParams.description);
      formData.append('price', newItemParams.price);
      formData.append('category', newItemParams.category);
      if (newItemParams.image_url) {
        formData.append('image_url', newItemParams.image_url);
      }
      Array.from(newImageFiles || []).forEach((file) => formData.append('images', file));

      await api.post('/menu', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewItemParams({ name: '', description: '', price: '', category: 'Main Dish', image_url: '' });
      setNewImageFiles([]);
      fetchMenu();
    } catch(err) {
      showModal({ title: 'Item Creation Failed', message: 'Failed to create menu item', type: 'danger' });
    }
  };

  const startEditItem = (item) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || 'Other',
      is_available: item.is_available,
      image_url: ''
    });
    setEditImageFiles([]);
    setRemoveImages([]);
  };

  const saveEditItem = async () => {
    if (!editingItem) return;
    try {
      const formData = new FormData();
      formData.append('name', editingItem.name);
      formData.append('description', editingItem.description);
      formData.append('price', editingItem.price);
      formData.append('category', editingItem.category);
      formData.append('is_available', editingItem.is_available);
      if (editingItem.image_url) formData.append('image_url', editingItem.image_url);
      removeImages.forEach((img) => formData.append('remove_images', img));
      Array.from(editImageFiles || []).forEach((file) => formData.append('images', file));
      await api.put(`/menu/${editingItem.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEditingItem(null);
      fetchMenu();
    } catch (_err) {
      showModal({ title: 'Item Update Failed', message: 'Failed to update menu item', type: 'danger' });
    }
  };

  const deleteMenuItem = async (id) => {
    const confirmed = await showModal({ title: 'Delete Menu Item', message: 'Are you sure you want to delete this menu item?', type: 'danger', confirmText: 'Delete Item', cancelText: 'Cancel' });
    if (!confirmed) return;
    try {
      await api.delete(`/menu/${id}`);
      if (editingItem?.id === id) setEditingItem(null);
      fetchMenu();
    } catch (_err) {
      showModal({ title: 'Delete Failed', message: 'Failed to delete menu item', type: 'danger' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      preparing: "bg-orange-100 text-orange-800 border-orange-200",
      ready_for_pickup: "bg-blue-100 text-blue-800 border-blue-200",
      delivering: "bg-indigo-100 text-indigo-800 border-indigo-200",
      delivered: "bg-green-100 text-green-800 border-green-200"
    };
    return <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300">
      
      {/* Top Bar */}
      <nav className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="bg-blue-600 p-1.5 rounded-lg"><UserCircle size={24} weight="fill" className="text-white"/></span>
            Owner Console
          </h1>
          <div className="flex items-center space-x-6">
            <span className="font-medium text-slate-400">Admin: {user?.name}</span>
            <button onClick={logout} className="text-slate-400 hover:text-red-400 transition flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-lg" title="Logout">
              <SignOut size={20} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 py-8 grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Orders View */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Package weight="duotone" className="text-blue-400"/> Active Orders
            </h2>
            <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-sm font-medium border border-slate-700">
              {orders.length} processing
            </span>
          </div>

          {orders.length === 0 ? (
             <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
               <Package size={48} className="mx-auto text-slate-600 mb-4" />
               <p className="text-slate-400 text-lg">No active orders right now.</p>
               <p className="text-slate-500 text-sm mt-2">Waiting for customers...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map(order => {
                const hasDriver = !!order.driver_name || !!order.driver_id;
                const itemsList = Array.isArray(order.items) ? order.items : [];
                return (
                  <div key={order.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm hover:border-blue-500/50 transition flex flex-col justify-between">
                    <div>
                      {/* Order header */}
                      <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-700">
                        <div>
                          <p className="text-xs text-slate-500 font-mono mb-1">Order #{order.id}</p>
                          <p className="text-lg font-bold text-white">${Number(order.total_amount).toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {getStatusBadge(order.status)}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            order.payment_status === 'paid'
                              ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-yellow-600/20 text-yellow-300 border-yellow-500/40'
                          }`}>
                            {order.payment_method === 'chapa' ? 'Chapa' : 'Cash'} • {order.payment_status === 'paid' ? 'Paid ✓' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="mb-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1"><User size={12} className="text-blue-400" /> Customer:</span>
                          <strong className="text-slate-200">{order.customer_name || 'Customer'}</strong>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1"><Phone size={12} className="text-blue-400" /> Phone:</span>
                          <span className="font-mono text-slate-300">
                            {order.customer_phone
                              ? <a href={`tel:${order.customer_phone}`} className="text-cyan-400 hover:underline">{order.customer_phone}</a>
                              : <span className="text-slate-500 italic">Not Provided</span>
                            }
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      {itemsList.length > 0 && (
                        <div className="mb-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ForkKnife size={11} className="text-orange-400" /> Items ({itemsList.length}):
                          </p>
                          <ul className="space-y-0.5 text-xs text-slate-300">
                            {itemsList.map((item, idx) => (
                              <li key={item.id || idx} className="flex justify-between">
                                <span className="truncate pr-2">{item.name || 'Dish'}</span>
                                <span className="font-mono font-semibold text-slate-400 shrink-0">×{item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Driver info */}
                      <div className="mb-3 p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Car size={12} className={hasDriver ? 'text-indigo-400' : 'text-slate-500'} /> Driver:
                          </span>
                          <strong className={hasDriver ? 'text-indigo-300' : 'text-slate-400'}>
                            {order.driver_name || (hasDriver ? `Driver #${order.driver_id}` : 'Not Assigned')}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Phone size={12} className={order.driver_phone ? 'text-emerald-400' : 'text-slate-500'} /> Driver Phone:
                          </span>
                          <span className="font-mono">
                            {hasDriver
                              ? order.driver_phone
                                ? <a href={`tel:${order.driver_phone}`} className="text-emerald-400 hover:underline">{order.driver_phone}</a>
                                : <span className="text-slate-500">Not Available</span>
                              : <span className="text-slate-500">Not Available</span>
                            }
                          </span>
                        </div>
                      </div>

                      {/* Location links */}
                      <div className="mb-3 text-xs text-slate-400 space-y-1">
                        {order.customer_latitude && order.customer_longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${order.customer_latitude},${order.customer_longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 hover:underline block"
                          >
                            Open customer location
                          </a>
                        )}
                        {order.driver_latitude && order.driver_longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${order.driver_latitude},${order.driver_longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline block"
                          >
                            Open driver location
                          </a>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons based on state */}
                    <div className="pt-4 border-t border-slate-700 flex gap-2">
                      {order.status === 'pending' && (
                        <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1 bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white border border-orange-600/50 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                          <CookingPot weight="bold" /> Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')} className="flex-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/50 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                          <Package weight="bold" /> Ready for Pickup
                        </button>
                      )}
                      {(order.status === 'ready_for_pickup' || order.status === 'delivering') && (
                        <div className="flex-1 space-y-2">
                          <div className="bg-slate-900/50 text-slate-400 border border-slate-700 py-2 rounded-lg text-sm font-medium text-center">
                            Waiting on Driver
                          </div>
                          {order.status === 'ready_for_pickup' && (
                            <div className="space-y-2">
                              <select
                                value={selectedDriverByOrder[order.id] || ''}
                                onChange={(e) => setSelectedDriverByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                              >
                                <option value="">Select free driver</option>
                                {drivers.filter((d) => d.is_available).map((d) => (
                                  <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ''}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => assignDriver(order.id)}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm"
                              >
                                Assign Driver
                              </button>
                            </div>
                          )}
                          {order.status === 'delivering' && (
                            <div className="text-xs text-slate-400 space-y-1">
                              <p>Driver confirm: {order.driver_confirmed_delivered ? 'Yes' : 'No'}</p>
                              <p>Customer confirm: {order.customer_confirmed_delivered ? 'Yes' : 'No'}</p>
                              {order.customer_latitude && order.customer_longitude && (
                                <a
                                  href={`https://www.google.com/maps?q=${order.customer_latitude},${order.customer_longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-400 hover:underline block"
                                >
                                  Open customer location
                                </a>
                              )}
                              {order.driver_latitude && order.driver_longitude && (
                                <a
                                  href={`https://www.google.com/maps?q=${order.driver_latitude},${order.driver_longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-400 hover:underline block"
                                >
                                  Open driver location
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Menu Management */}
        <div className="space-y-6">
           <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <CookingPot weight="duotone" className="text-green-400"/> Menu System
            </h2>
            
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-medium border-b border-slate-700 pb-3 mb-4">Add Menu Item</h3>
              <form onSubmit={handleCreateMenuItem} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Name</label>
                  <input type="text" required value={newItemParams.name} onChange={e => setNewItemParams({...newItemParams, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Category</label>
                  <select
                    required
                    value={newItemParams.category}
                    onChange={(e) => setNewItemParams({ ...newItemParams, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none transition"
                  >
                    {MENU_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Price ($)</label>
                  <input type="number" step="0.01" required value={newItemParams.price} onChange={e => setNewItemParams({...newItemParams, price: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Description</label>
                  <textarea rows="2" value={newItemParams.description} onChange={e => setNewItemParams({...newItemParams, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"></textarea>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Image URL (Optional)</label>
                  <input type="url" value={newItemParams.image_url} onChange={e => setNewItemParams({...newItemParams, image_url: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Upload Images (Optional)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => setNewImageFiles(e.target.files || [])}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-slate-700 file:text-slate-200"
                  />
                  {(newImageFiles?.length || 0) > 0 && (
                    <p className="text-xs text-slate-400 mt-2">Selected: {newImageFiles.length} files</p>
                  )}
                </div>
                <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition shadow-lg mt-2 flex items-center justify-center gap-2">
                  <CheckCircle weight="bold" /> Save Item
                </button>
              </form>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
               <h3 className="text-white font-medium border-b border-slate-700 pb-3 mb-4">Current Menu ({menu.length})</h3>
               <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                 {menu.map(item => (
                   <div key={item.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                     <div className="flex justify-between items-center gap-2">
                       <div>
                         <p className="text-slate-200 font-medium text-sm">{item.name}</p>
                         <p className="text-slate-500 text-xs">{item.category || 'Other'} · ${Number(item.price).toFixed(2)} · {item.is_available ? 'Available' : 'Hidden'}</p>
                       </div>
                       <div className="flex gap-2">
                         <button className="text-xs px-2 py-1 bg-blue-700 rounded" onClick={() => startEditItem(item)}>Edit</button>
                         <button className="text-xs px-2 py-1 bg-red-700 rounded" onClick={() => deleteMenuItem(item.id)}>Delete</button>
                       </div>
                     </div>
                     {!!(item.image_urls && item.image_urls.length) && (
                       <div className="mt-2 grid grid-cols-4 gap-2">
                         {item.image_urls.slice(0, 4).map((img) => (
                           <img key={img} src={resolveAssetUrl(img)} alt={item.name} className="w-full h-12 object-cover rounded" />
                         ))}
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            </div>
            {editingItem && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-medium border-b border-slate-700 pb-3 mb-4">Edit Menu Item</h3>
                <div className="space-y-3">
                  <input value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  >
                    {MENU_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <textarea rows="2" value={editingItem.description} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"></textarea>
                  <input type="number" step="0.01" value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                  <label className="text-sm text-slate-300 flex items-center gap-2">
                    <input type="checkbox" checked={!!editingItem.is_available} onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })} />
                    Available on main site
                  </label>
                  <input type="url" placeholder="Optional image URL to add" value={editingItem.image_url} onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                  <input type="file" multiple accept="image/*" onChange={(e) => setEditImageFiles(e.target.files || [])} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" />
                  {!!(menu.find((m) => m.id === editingItem.id)?.image_urls || []).length && (
                    <div className="grid grid-cols-3 gap-2">
                      {(menu.find((m) => m.id === editingItem.id)?.image_urls || []).map((img) => (
                        <label key={img} className="text-xs text-slate-300">
                          <img src={resolveAssetUrl(img)} alt="menu" className="w-full h-16 object-cover rounded mb-1" />
                          <input
                            type="checkbox"
                            checked={removeImages.includes(img)}
                            onChange={(e) => setRemoveImages((prev) => e.target.checked ? [...prev, img] : prev.filter((x) => x !== img))}
                          /> Remove
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={saveEditItem} className="flex-1 bg-green-600 py-2 rounded-lg">Save</button>
                    <button onClick={() => setEditingItem(null)} className="flex-1 bg-slate-700 py-2 rounded-lg">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-medium border-b border-slate-700 pb-3 mb-2">Driver Management ({drivers.length})</h3>
              <p className="text-slate-400 text-xs mb-4">
                Create login credentials here. Drivers sign in on the driver app (
                <span className="text-cyan-400">http://localhost:5175</span>
                ) using the <strong className="text-slate-300">email</strong> as username and the password you set.
              </p>
              {driverCreatedNotice && (
                <div className="mb-4 p-4 rounded-lg border border-green-600/50 bg-green-950/40 text-sm">
                  <p className="text-green-300 font-semibold mb-2">Driver account ready — share these credentials:</p>
                  <ul className="text-slate-200 space-y-1 font-mono text-xs">
                    <li><span className="text-slate-400">Name:</span> {driverCreatedNotice.name}</li>
                    <li><span className="text-slate-400">Username (email):</span> {driverCreatedNotice.email}</li>
                    <li><span className="text-slate-400">Password:</span> {driverCreatedNotice.password}</li>
                    <li><span className="text-slate-400">Driver app:</span> http://localhost:5175</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setDriverCreatedNotice(null)}
                    className="mt-3 text-xs text-slate-400 hover:text-white underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mb-4">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-800">
                    <div>
                      <p className="text-sm text-slate-200">{driver.name}</p>
                      <p className="text-xs text-slate-400">{driver.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${driver.is_available ? 'bg-green-700 text-green-100' : 'bg-orange-700 text-orange-100'}`}>
                      {driver.is_available ? 'FREE' : `BUSY #${driver.active_order_id}`}
                    </span>
                  </div>
                ))}
              </div>
              <form onSubmit={createDriver} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Display name</label>
                  <input
                    placeholder="e.g. John Smith"
                    required
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Username (login email)</label>
                  <input
                    type="email"
                    placeholder="e.g. john.driver@restaurant.com"
                    required
                    value={driverForm.email}
                    onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Driver uses this email to sign in on the driver dashboard.</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Password</label>
                  <input
                    type="password"
                    placeholder="Set a password for this driver"
                    required
                    minLength={6}
                    value={driverForm.password}
                    onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Share this password with the driver once — it is not shown again after you create the account.</p>
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-semibold">
                  Create driver login
                </button>
              </form>
            </div>

        </div>

      </div>
    </div>
  );
}
