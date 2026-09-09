import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import API from '../services/api';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  BookMarked,
  Info,
  CheckCircle,
  XCircle,
  X,
  SlidersHorizontal,
  MapPin,
  Tag,
  Heart
} from 'lucide-react';

const Resources = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  
  // Amenities Filtering State
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // Favorites state
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('crms_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    resource_name: '',
    resource_type: 'Lab',
    description: '',
    capacity: 10,
    location: '',
    amenities: '',
    availability_status: true
  });
  const [formErrors, setFormErrors] = useState({});

  const resourceTypes = ['Lab', 'Classroom', 'Event Hall', 'Computer'];
  const filterOptions = ['All', 'Labs', 'Classrooms', 'Event Halls', 'Computers'];

  const isStaffOrAdmin = user?.role === 'Staff' || user?.role === 'Admin';

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await API.get('/resources', {
        params: {
          search: searchTerm,
          type: selectedType
        }
      });
      setResources(response.data);
    } catch (error) {
      showToast('Failed to load resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedType, searchTerm]);

  // Save favorites to local storage on change
  useEffect(() => {
    localStorage.setItem('crms_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(prev => prev.filter(fid => fid !== id));
      showToast('Removed from favorites', 'info');
    } else {
      setFavorites(prev => [...prev, id]);
      showToast('Added to favorites', 'success');
    }
  };

  // Extract all unique amenities from resources list to display as filter badges
  const allAmenities = Array.from(
    new Set(
      resources
        .flatMap(r => r.amenities ? r.amenities.split(',').map(a => a.trim()) : [])
        .filter(Boolean)
    )
  );

  const handleToggleAmenityFilter = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(prev => prev.filter(a => a !== amenity));
    } else {
      setSelectedAmenities(prev => [...prev, amenity]);
    }
  };

  const handleOpenAddModal = () => {
    setEditingResource(null);
    setFormData({
      resource_name: '',
      resource_type: 'Lab',
      description: '',
      capacity: 10,
      location: '',
      amenities: '',
      availability_status: true
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (resource) => {
    setEditingResource(resource);
    setFormData({
      resource_name: resource.resource_name,
      resource_type: resource.resource_type,
      description: resource.description || '',
      capacity: resource.capacity,
      location: resource.location || '',
      amenities: resource.amenities || '',
      availability_status: resource.availability_status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.resource_name.trim()) errors.resource_name = 'Resource Name is required';
    if (!formData.capacity || formData.capacity < 1) errors.capacity = 'Capacity must be at least 1';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveResource = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingResource) {
        // Edit Resource
        await API.put(`/resources/${editingResource.id}`, formData);
        showToast('Resource updated successfully', 'success');
      } else {
        // Add Resource
        await API.post('/resources', formData);
        showToast('Resource created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchResources();
    } catch (error) {
      const message = error.response?.data?.resource_name?.[0] || 'Failed to save resource';
      showToast(message, 'error');
    }
  };

  const handleDeleteResource = async (id) => {
    if (window.confirm('Are you sure you want to delete this resource? This will delete all its bookings too.')) {
      try {
        await API.delete(`/resources/${id}`);
        showToast('Resource deleted successfully', 'success');
        fetchResources();
      } catch (error) {
        showToast('Failed to delete resource', 'error');
      }
    }
  };

  const handleBookNow = (resource) => {
    navigate('/bookings', { state: { preselectedResourceId: resource.id, preselectedResourceName: resource.resource_name } });
  };

  // Perform client-side filter based on selected amenities and favorites
  const filteredResources = resources.filter(res => {
    // Starred filter
    if (showFavoritesOnly && !favorites.includes(res.id)) return false;

    // Amenities filter
    if (selectedAmenities.length > 0) {
      const resTags = res.amenities ? res.amenities.split(',').map(a => a.trim().toLowerCase()) : [];
      if (!selectedAmenities.every(tag => resTags.includes(tag.toLowerCase()))) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Search Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Resources Directory</h1>
          <p className="text-xs text-slate-400">View and manage school assets and booking availabilities</p>
        </div>
        
        {isStaffOrAdmin && (
          <button
            onClick={handleOpenAddModal}
            className="btn-primary px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold self-start"
          >
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        )}
      </div>

      {/* Interactive Map Layout */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">🗺️ Interactive Building Floor Plan (Level 1)</h2>
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Click a wing to filter directory</span>
        </div>
        
        <div className="w-full">
          <svg viewBox="0 0 800 200" className="w-full h-auto rounded-lg overflow-hidden border border-slate-800/50 bg-slate-950/20">
            {/* Sector 1: Computer Hub */}
            <g 
              className="cursor-pointer group"
              onClick={() => { setSelectedType('Computers'); setSelectedAmenities([]); }}
            >
              <rect 
                x="10" y="10" width="180" height="180" rx="8" 
                className={`transition-all duration-300 ${selectedType === 'Computers' ? 'fill-primary-500/20 stroke-primary-500 stroke-2' : 'fill-slate-900/30 stroke-slate-800/80 hover:fill-slate-800/30 hover:stroke-slate-700'}`} 
              />
              <text x="100" y="90" textAnchor="middle" className="fill-slate-200 font-bold text-xs group-hover:fill-primary-400 transition-colors">PC Hub Sector</text>
              <text x="100" y="110" textAnchor="middle" className="fill-slate-500 text-[10px] group-hover:fill-slate-400">Computers</text>
            </g>
            
            {/* Sector 2: Tech Lab */}
            <g 
              className="cursor-pointer group"
              onClick={() => { setSelectedType('Labs'); setSelectedAmenities([]); }}
            >
              <rect 
                x="200" y="10" width="180" height="180" rx="8" 
                className={`transition-all duration-300 ${selectedType === 'Labs' ? 'fill-primary-500/20 stroke-primary-500 stroke-2' : 'fill-slate-900/30 stroke-slate-800/80 hover:fill-slate-800/30 hover:stroke-slate-700'}`} 
              />
              <text x="290" y="90" textAnchor="middle" className="fill-slate-200 font-bold text-xs group-hover:fill-primary-400 transition-colors">Research Labs</text>
              <text x="290" y="110" textAnchor="middle" className="fill-slate-500 text-[10px] group-hover:fill-slate-400">Workstation Labs</text>
            </g>

            {/* Sector 3: Seminar Halls */}
            <g 
              className="cursor-pointer group"
              onClick={() => { setSelectedType('Event Halls'); setSelectedAmenities([]); }}
            >
              <rect 
                x="390" y="10" width="190" height="180" rx="8" 
                className={`transition-all duration-300 ${selectedType === 'Event Halls' ? 'fill-primary-500/20 stroke-primary-500 stroke-2' : 'fill-slate-900/30 stroke-slate-800/80 hover:fill-slate-800/30 hover:stroke-slate-700'}`} 
              />
              <text x="485" y="90" textAnchor="middle" className="fill-slate-200 font-bold text-xs group-hover:fill-primary-400 transition-colors">Conference Halls</text>
              <text x="485" y="110" textAnchor="middle" className="fill-slate-500 text-[10px] group-hover:fill-slate-400">Event Spaces</text>
            </g>

            {/* Sector 4: Classrooms */}
            <g 
              className="cursor-pointer group"
              onClick={() => { setSelectedType('Classrooms'); setSelectedAmenities([]); }}
            >
              <rect 
                x="590" y="10" width="200" height="180" rx="8" 
                className={`transition-all duration-300 ${selectedType === 'Classrooms' ? 'fill-primary-500/20 stroke-primary-500 stroke-2' : 'fill-slate-900/30 stroke-slate-800/80 hover:fill-slate-800/30 hover:stroke-slate-700'}`} 
              />
              <text x="690" y="90" textAnchor="middle" className="fill-slate-200 font-bold text-xs group-hover:fill-primary-400 transition-colors">Lecture Halls</text>
              <text x="690" y="110" textAnchor="middle" className="fill-slate-500 text-[10px] group-hover:fill-slate-400">Classrooms</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Filters & Search Panel */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800/60 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search & Stars */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
            <div className="relative flex-1 sm:w-80">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm"
              />
            </div>

            {/* Favorites filter toggle */}
            <button
              onClick={() => setShowFavoritesOnly(prev => !prev)}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-2 ${
                showFavoritesOnly
                  ? 'bg-rose-500/15 border-rose-500 text-rose-400'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-rose-500' : ''}`} />
              Starred Only ({favorites.length})
            </button>
          </div>

          {/* Filter Badges */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto overflow-x-auto py-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline-block">
              Type:
            </span>
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedType(opt)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all duration-200 ${
                  selectedType === opt
                    ? 'bg-primary-500/15 border-primary-500 text-primary-400'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Amenities filter pills */}
        {allAmenities.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/40">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-2">
              Filter by Equipment:
            </span>
            {allAmenities.map((amenity) => {
              const isSelected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  onClick={() => handleToggleAmenityFilter(amenity)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                    isSelected 
                      ? 'bg-primary-500 text-white border-primary-500 shadow-md' 
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {amenity}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="glass-panel rounded-xl border border-slate-800/50 p-12 text-center max-w-md mx-auto">
          <Info className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">No resources matched</h3>
          <p className="text-slate-500 text-sm mt-1">Try resetting the filters or modifying your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const isFavorite = favorites.includes(resource.id);
            return (
              <div 
                key={resource.id} 
                className="glass-card rounded-xl border p-6 flex flex-col justify-between hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 relative"
              >
                <div>
                  {/* Header info */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/60">
                      {resource.resource_type}
                    </span>
                    
                    <div className="flex items-center gap-3">
                      {/* Favorite button */}
                      <button
                        onClick={() => toggleFavorite(resource.id)}
                        className={`p-1 rounded-md transition-all hover:bg-slate-800 ${
                          isFavorite ? 'text-rose-500' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
                      </button>

                      {resource.availability_status ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Available
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                          Maintenance
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-200 tracking-tight leading-tight mb-1">
                    {resource.resource_name}
                  </h3>
                  
                  {/* Location indicator */}
                  {resource.location && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-primary-400" />
                      <span>{resource.location}</span>
                    </div>
                  )}
                  
                  <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed mb-4">
                    {resource.description || 'No description provided.'}
                  </p>

                  {/* Amenities Tags */}
                  {resource.amenities && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {resource.amenities.split(',').map((tag, idx) => (
                        tag.trim() && (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[9px] font-bold uppercase tracking-wider"
                          >
                            <Tag className="w-2 h-2" />
                            {tag.trim()}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-5 border-t border-slate-800/40 pt-4">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Capacity: <strong className="text-slate-300">{resource.capacity} people</strong></span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Student Book Button */}
                    <button
                      onClick={() => handleBookNow(resource)}
                      disabled={!resource.availability_status}
                      className="flex-1 btn-primary py-2 px-3 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      Book Now
                    </button>

                    {/* Staff/Admin specific actions */}
                    {isStaffOrAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEditModal(resource)}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all duration-200"
                          title="Edit Resource"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/30 transition-all duration-200"
                          title="Delete Resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Resource Modal */}
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
                {editingResource ? 'Edit Resource' : 'Add New Resource'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Specify facility details, equipment amenities, and layout limits</p>
            </div>

            <form onSubmit={handleSaveResource} className="p-6 space-y-4">
              {/* Resource Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Resource Name
                </label>
                <input
                  type="text"
                  value={formData.resource_name}
                  onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                    formErrors.resource_name ? 'border-rose-500/50' : ''
                  }`}
                  placeholder="e.g. Computer Science Lab 4"
                />
                {formErrors.resource_name && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.resource_name}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Resource Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Resource Type
                  </label>
                  <select
                    value={formData.resource_type}
                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm"
                  >
                    {resourceTypes.map((t) => (
                      <option key={t} value={t} className="bg-slate-900 text-slate-200">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Capacity (People)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                      formErrors.capacity ? 'border-rose-500/50' : ''
                    }`}
                    min="1"
                  />
                  {formErrors.capacity && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.capacity}</span>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Location / Building
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm"
                  placeholder="e.g. Engineering Block B, 3rd Floor"
                />
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Amenities / Equipment (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm"
                  placeholder="e.g. Projector, Whiteboard, High-speed GPUs, VR Kits"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm"
                  placeholder="Provide details about the equipment, software installed, or operational hours."
                />
              </div>

              {/* Availability Status Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="availability_status"
                  checked={formData.availability_status}
                  onChange={(e) => setFormData({ ...formData, availability_status: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-950"
                />
                <label htmlFor="availability_status" className="text-xs font-semibold text-slate-300">
                  Available for Booking (Check to make active, uncheck for maintenance mode)
                </label>
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
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;
