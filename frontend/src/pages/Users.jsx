import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import API from '../services/api';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Activity, 
  X,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

const Users = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'Student'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const roles = ['Student', 'Staff', 'Admin'];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await API.get('/users');
      setUsers(response.data);
    } catch (error) {
      showToast('Failed to load user directories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'Student'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (userItem) => {
    setEditingUser(userItem);
    setFormData({
      name: userItem.name,
      email: userItem.email,
      phone: userItem.phone,
      password: '', // blank by default on edit
      role: userItem.role
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      errors.phone = 'Phone must be 10-15 digits';
    }

    // Password validations: required on create only, but must match strength if provided on edit
    if (!editingUser && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password) {
      const isPasswordStrong = 
        formData.password.length >= 8 &&
        /[A-Z]/.test(formData.password) &&
        /[a-z]/.test(formData.password) &&
        /[0-9]/.test(formData.password) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
      if (!isPasswordStrong) {
        errors.password = 'Password must be 8+ chars and contain uppercase, lowercase, digit, and special char';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const dataToSend = { ...formData };
      // if editing and password is blank, remove it
      if (editingUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      if (editingUser) {
        await API.put(`/users/${editingUser.id}`, dataToSend);
        showToast('User profiles updated successfully', 'success');
      } else {
        await API.post('/users', dataToSend);
        showToast('New user account registered successfully', 'success');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      const errs = error.response?.data || {};
      const errorsMapped = {};
      Object.keys(errs).forEach((k) => {
        errorsMapped[k] = Array.isArray(errs[k]) ? errs[k][0] : errs[k];
      });
      setFormErrors(errorsMapped);
      showToast(errorsMapped.email || errorsMapped.phone || errorsMapped.password || 'Failed to save user', 'error');
    }
  };

  const handleDeleteUser = async (id) => {
    if (id === currentUser.id) {
      showToast('You cannot delete your own active administrator account!', 'error');
      return;
    }
    if (window.confirm('Are you sure you want to delete this user? All their bookings will be deleted as well.')) {
      try {
        await API.delete(`/users/${id}`);
        showToast('User profiles removed successfully', 'success');
        fetchUsers();
      } catch (error) {
        showToast('Failed to delete user profile', 'error');
      }
    }
  };

  const filteredUsers = users.filter((u) => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone.includes(searchTerm) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header and User Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">System User Directory</h1>
          <p className="text-xs text-slate-400">View roles, status indicators, and adjust access permissions</p>
        </div>
        
        <button
          onClick={handleOpenAddModal}
          className="btn-primary px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold self-start"
        >
          <Plus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* Search Input */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800/60">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search users by name, email, phone, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm"
          />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800/50 p-12 text-center max-w-md mx-auto">
          <User className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">No users found</h3>
          <p className="text-slate-500 text-sm mt-1">Try expanding your search parameters.</p>
        </div>
      ) : (
        <div className="glass-panel rounded-xl border border-slate-800/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email Address</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">System Role</th>
                  <th className="px-6 py-4">Portal Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm text-slate-300">
                {filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-slate-900/35 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-4 font-bold text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700/50">
                          {userItem.name.charAt(0).toUpperCase()}
                        </div>
                        {userItem.name}
                      </div>
                    </td>
                    
                    {/* Email */}
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{userItem.email}</td>
                    
                    {/* Phone */}
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{userItem.phone}</td>
                    
                    {/* Role */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${
                        userItem.role === 'Admin' 
                          ? 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                          : userItem.role === 'Staff'
                          ? 'bg-sky-500/10 border-sky-500/25 text-sky-400'
                          : 'bg-primary-500/10 border-primary-500/25 text-primary-400'
                      }`}>
                        {userItem.role}
                      </span>
                    </td>
                    
                    {/* Status */}
                    <td className="px-6 py-4">
                      {userItem.status === 'ACTIVE' ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wide">
                          <Activity className="w-3.5 h-3.5 animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Offline
                        </span>
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(userItem)}
                          className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userItem.id)}
                          className="p-1.5 rounded-md bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/30 transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel border-slate-800 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 py-5 border-b border-slate-800/60">
              <h2 className="text-lg font-bold text-slate-100">
                {editingUser ? 'Edit User Details' : 'Create System User'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Configure name, contact, passwords, and authorization role</p>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                      formErrors.name ? 'border-rose-500/50' : ''
                    }`}
                    placeholder="Jane Doe"
                  />
                </div>
                {formErrors.name && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.name}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                        formErrors.email ? 'border-rose-500/50' : ''
                      }`}
                      placeholder="jane@univ.edu"
                    />
                  </div>
                  {formErrors.email && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.email}</span>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                        formErrors.phone ? 'border-rose-500/50' : ''
                      }`}
                      placeholder="9876543210"
                    />
                  </div>
                  {formErrors.phone && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.phone}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    System Role
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Shield className="w-4 h-4" />
                    </span>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r} className="bg-slate-900 text-slate-200">
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Password {editingUser && <span className="text-[10px] text-slate-500 lowercase">(leave empty to keep unchanged)</span>}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full pl-9 pr-10 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                        formErrors.password ? 'border-rose-500/50' : ''
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.password}</span>
                  )}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-4 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
