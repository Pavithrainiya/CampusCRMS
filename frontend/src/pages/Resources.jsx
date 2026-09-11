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
  Heart,
  Star,
  Download,
  MessageSquare,
  Shirt,
  Briefcase,
  Wrench,
  PackageCheck,
  Image as ImageIcon
} from 'lucide-react';

const defaultImages = {
  Lab: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80',
  Classroom: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
  'Event Hall': 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  Computer: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'
};

const getResourceId = (res) => {
  if (res === null || res === undefined) return null;
  if (typeof res === 'number') return res;
  if (typeof res === 'string' && !isNaN(Number(res)) && res.trim() !== '') return Number(res);
  if (typeof res === 'object') {
    if (res.id !== undefined && res.id !== null) return getResourceId(res.id);
    if (res.pk !== undefined && res.pk !== null) return Number(res.pk);
    if (res.resource !== undefined && res.resource !== null) return getResourceId(res.resource);
  }
  return null;
};

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

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewResource, setReviewResource] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const [formData, setFormData] = useState({
    resource_name: '',
    resource_type: 'Lab',
    description: '',
    capacity: 10,
    location: '',
    amenities: '',
    hourly_rate: 0,
    availability_status: true,
    image_url: '',
    dress_code: '',
    equipment_needed: '',
    materials_required: ''
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
      hourly_rate: 0,
      availability_status: true,
      image_url: '',
      dress_code: '',
      equipment_needed: '',
      materials_required: ''
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
      hourly_rate: resource.hourly_rate || 0,
      availability_status: resource.availability_status,
      image_url: resource.image_url || '',
      dress_code: resource.dress_code || '',
      equipment_needed: resource.equipment_needed || '',
      materials_required: resource.materials_required || ''
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
          <p className="text-xs text-slate-400">View school assets, equipment requirements, dress code, and booking availabilities</p>
        </div>
        
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={async () => {
              try {
                const response = await API.get('/resources/export_csv', { responseType: 'blob' });
                const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'campus_resources.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                showToast('Exported resource list CSV', 'success');
              } catch (error) {
                console.error("API CSV export error, attempting client export:", error);
                if (resources && resources.length > 0) {
                  try {
                    const headers = ["ID", "Resource Name", "Type", "Capacity", "Location", "Amenities", "Status"];
                    const rows = resources.map(r => [
                      r.id,
                      `"${(r.resource_name || '').replace(/"/g, '""')}"`,
                      `"${(r.resource_type || '').replace(/"/g, '""')}"`,
                      r.capacity || '',
                      `"${(r.location || '').replace(/"/g, '""')}"`,
                      `"${(r.amenities || '').replace(/"/g, '""')}"`,
                      r.availability_status ? "Available" : "Unavailable"
                    ]);
                    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', 'campus_resources.csv');
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    showToast('Exported resource list CSV', 'success');
                  } catch (clientErr) {
                    showToast('Failed to export CSV', 'error');
                  }
                } else {
                  showToast('Failed to export CSV', 'error');
                }
              }
            }}
            className="btn-secondary px-3.5 py-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-primary-400" />
            Export CSV
          </button>

          {isStaffOrAdmin && (
            <button
              onClick={handleOpenAddModal}
              className="btn-primary px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </button>
          )}
        </div>
      </div>

      {/* Interactive Map Layout */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span>🗺️ Interactive Building Floor Plan (Level 1)</span>
          </h2>
          <span className="text-[10px] text-sky-400 font-extrabold uppercase tracking-widest">Click a wing to filter directory</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sector 1: Computer Hub */}
          <div 
            onClick={() => { setSelectedType('Computers'); setSelectedAmenities([]); }}
            className={`relative h-44 rounded-xl overflow-hidden border cursor-pointer group transition-all duration-300 ${
              selectedType === 'Computers'
                ? 'ring-2 ring-sky-400 border-sky-400 shadow-xl shadow-sky-500/20 scale-[1.02]'
                : 'border-slate-800 hover:border-slate-700 hover:scale-[1.01]'
            }`}
          >
            <img 
              src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80" 
              alt="PC Hub Sector"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
            
            <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-lg backdrop-blur-md">
                  💻 PC Hub Sector
                </span>
                {selectedType === 'Computers' && (
                  <span className="text-[9px] font-extrabold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded-full backdrop-blur-md animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-black text-white tracking-tight group-hover:text-sky-300 transition-colors">
                  PC Hub Sector
                </h3>
                <p className="text-xs font-extrabold text-slate-300">Computers & Workstations</p>
              </div>
            </div>
          </div>

          {/* Sector 2: Tech Lab */}
          <div 
            onClick={() => { setSelectedType('Labs'); setSelectedAmenities([]); }}
            className={`relative h-44 rounded-xl overflow-hidden border cursor-pointer group transition-all duration-300 ${
              selectedType === 'Labs'
                ? 'ring-2 ring-sky-400 border-sky-400 shadow-xl shadow-sky-500/20 scale-[1.02]'
                : 'border-slate-800 hover:border-slate-700 hover:scale-[1.01]'
            }`}
          >
            <img 
              src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80" 
              alt="Research Labs"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
            
            <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-lg backdrop-blur-md">
                  🧪 Research Labs
                </span>
                {selectedType === 'Labs' && (
                  <span className="text-[9px] font-extrabold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded-full backdrop-blur-md animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-black text-white tracking-tight group-hover:text-sky-300 transition-colors">
                  Research Labs
                </h3>
                <p className="text-xs font-extrabold text-slate-300">Workstation & Science Labs</p>
              </div>
            </div>
          </div>

          {/* Sector 3: Seminar Halls */}
          <div 
            onClick={() => { setSelectedType('Event Halls'); setSelectedAmenities([]); }}
            className={`relative h-44 rounded-xl overflow-hidden border cursor-pointer group transition-all duration-300 ${
              selectedType === 'Event Halls'
                ? 'ring-2 ring-sky-400 border-sky-400 shadow-xl shadow-sky-500/20 scale-[1.02]'
                : 'border-slate-800 hover:border-slate-700 hover:scale-[1.01]'
            }`}
          >
            <img 
              src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80" 
              alt="Conference Halls"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
            
            <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-lg backdrop-blur-md">
                  🏛️ Conference Halls
                </span>
                {selectedType === 'Event Halls' && (
                  <span className="text-[9px] font-extrabold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded-full backdrop-blur-md animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-black text-white tracking-tight group-hover:text-sky-300 transition-colors">
                  Conference Halls
                </h3>
                <p className="text-xs font-extrabold text-slate-300">Event Spaces & Auditoriums</p>
              </div>
            </div>
          </div>

          {/* Sector 4: Classrooms */}
          <div 
            onClick={() => { setSelectedType('Classrooms'); setSelectedAmenities([]); }}
            className={`relative h-44 rounded-xl overflow-hidden border cursor-pointer group transition-all duration-300 ${
              selectedType === 'Classrooms'
                ? 'ring-2 ring-sky-400 border-sky-400 shadow-xl shadow-sky-500/20 scale-[1.02]'
                : 'border-slate-800 hover:border-slate-700 hover:scale-[1.01]'
            }`}
          >
            <img 
              src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80" 
              alt="Lecture Halls"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
            
            <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-lg backdrop-blur-md">
                  🎓 Lecture Halls
                </span>
                {selectedType === 'Classrooms' && (
                  <span className="text-[9px] font-extrabold text-sky-300 bg-sky-500/20 border border-sky-400/40 px-2 py-0.5 rounded-full backdrop-blur-md animate-pulse">
                    ACTIVE
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-black text-white tracking-tight group-hover:text-sky-300 transition-colors">
                  Lecture Halls
                </h3>
                <p className="text-xs font-extrabold text-slate-300">Classrooms & Seminars</p>
              </div>
            </div>
          </div>
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
                placeholder="Search resources, lab gear, dress code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm"
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
            const coverImage = resource.image_url || defaultImages[resource.resource_type] || defaultImages.Lab;

            return (
              <div 
                key={resource.id} 
                className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between hover:scale-[1.01] hover:shadow-2xl transition-all duration-300 group"
              >
                <div>
                  {/* Resource Image Header Banner */}
                  <div className="h-44 w-full relative overflow-hidden bg-slate-900 border-b border-slate-800">
                    <img 
                      src={coverImage} 
                      alt={resource.resource_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultImages[resource.resource_type] || defaultImages.Lab;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    
                    {/* Top Overlay Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-slate-900/90 text-slate-100 border border-slate-700/80 backdrop-blur-md shadow-lg">
                        {resource.resource_type}
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-extrabold bg-indigo-500/90 text-white border border-indigo-400/30 backdrop-blur-md shadow-lg">
                          {parseFloat(resource.hourly_rate) > 0 ? `$${parseFloat(resource.hourly_rate).toFixed(2)}/hr` : 'Free'}
                        </span>

                        <button
                          onClick={() => toggleFavorite(resource.id)}
                          className={`p-1.5 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md transition-all hover:scale-110 ${
                            isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Overlay Info (Status & Rating) */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                      <button
                        onClick={() => {
                          setReviewResource(resource);
                          setReviewRating(5);
                          setReviewComment('');
                          setReviewModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300 bg-slate-950/80 border border-amber-500/30 hover:bg-amber-500/20 px-2.5 py-1 rounded-full transition-all cursor-pointer backdrop-blur-md"
                        title="Click to inspect ratings & feedback reviews"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{resource.avg_rating > 0 ? resource.avg_rating : '5.0'} ({resource.review_count || 0})</span>
                      </button>

                      {resource.availability_status ? (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-950/90 border border-emerald-500/40 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                          Available
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-rose-400 bg-rose-950/90 border border-rose-500/40 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                          Maintenance
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight leading-tight mb-1">
                        {resource.resource_name}
                      </h3>
                      
                      {/* Location indicator */}
                      {resource.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                          <span className="font-bold text-slate-300">{resource.location}</span>
                        </div>
                      )}
                      
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-3">
                        {resource.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Class Requirements & Materials Box */}
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-primary-400" /> Class Preparation & Required Materials
                      </h4>

                      {/* Dress Code */}
                      <div className="flex items-start gap-2 text-xs">
                        <Shirt className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="leading-tight">
                          <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wide block">Dress Code</span>
                          <span className="text-xs font-extrabold text-white">
                            {resource.dress_code || (resource.resource_type === 'Lab' ? 'White Lab Coat & Closed-Toe Shoes' : 'Standard Campus Casual')}
                          </span>
                        </div>
                      </div>

                      {/* Basic Materials to Carry */}
                      <div className="flex items-start gap-2 text-xs">
                        <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="leading-tight">
                          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wide block">Materials to Carry</span>
                          <span className="text-xs font-extrabold text-white">
                            {resource.materials_required || 'Standard Notebook, Pen & Student ID Card'}
                          </span>
                        </div>
                      </div>

                      {/* Equipments Needed */}
                      <div className="flex items-start gap-2 text-xs">
                        <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="leading-tight">
                          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide block">Equipments / Tools</span>
                          <span className="text-xs font-extrabold text-white">
                            {resource.equipment_needed || 'On-site Facility Workstation'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amenities Tags */}
                    {resource.amenities && (
                      <div className="flex flex-wrap gap-1.5">
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
                </div>

                <div className="px-5 pb-5 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 border-t border-slate-800/60 pt-3">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Capacity: <strong className="text-white font-extrabold">{resource.capacity} people</strong></span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Student Book Button */}
                    <button
                      onClick={() => handleBookNow(resource)}
                      disabled={!resource.availability_status}
                      className="flex-1 btn-primary py-2 px-3 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      Book Now
                    </button>

                    <button
                      onClick={() => {
                        setReviewResource(resource);
                        setReviewRating(5);
                        setReviewComment('');
                        setReviewModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0"
                      title="Inspect Ratings & Feedback Reviews"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Reviews ({resource.review_count || 0})</span>
                    </button>

                    {/* Staff/Admin specific actions */}
                    {isStaffOrAdmin && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(resource)}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all duration-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xl glass-panel border-slate-800 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 py-5 border-b border-slate-800/60">
              <h2 className="text-lg font-bold text-white">
                {editingResource ? 'Edit Resource' : 'Add New Resource'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Specify facility details, equipment, dress code, image URL, and materials</p>
            </div>

            <form onSubmit={handleSaveResource} className="p-6 space-y-4">
              {/* Resource Name */}
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                  Resource Name
                </label>
                <input
                  type="text"
                  value={formData.resource_name}
                  onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700 ${
                    formErrors.resource_name ? 'border-rose-500/50' : ''
                  }`}
                  placeholder="e.g. Computer Science Lab 4"
                />
                {formErrors.resource_name && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.resource_name}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Resource Type */}
                <div>
                  <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                    Resource Type
                  </label>
                  <select
                    value={formData.resource_type}
                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                  >
                    {resourceTypes.map((t) => (
                      <option key={t} value={t} className="bg-slate-900 text-white">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className={`w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700 ${
                      formErrors.capacity ? 'border-rose-500/50' : ''
                    }`}
                    min="1"
                  />
                  {formErrors.capacity && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.capacity}</span>
                  )}
                </div>

                {/* Hourly Rate */}
                <div>
                  <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                    Hourly Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                    placeholder="0.00 for Free"
                  />
                </div>
              </div>

              {/* Resource Image URL */}
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary-400" /> Resource Image URL
                </label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                  placeholder="https://images.unsplash.com/photo-..."
                />
                {formData.image_url && (
                  <div className="mt-2 h-28 w-full rounded-lg overflow-hidden border border-slate-700 relative">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Dress Code Requirement */}
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Shirt className="w-3.5 h-3.5 text-indigo-400" /> Dress Code Requirement
                </label>
                <input
                  type="text"
                  value={formData.dress_code}
                  onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                  placeholder="e.g. White Lab Coat & Closed-Toe Leather Shoes Required"
                />
              </div>

              {/* Basic Materials to Carry */}
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" /> Basic Materials to Carry (Bring to Class)
                </label>
                <input
                  type="text"
                  value={formData.materials_required}
                  onChange={(e) => setFormData({ ...formData, materials_required: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                  placeholder="e.g. Hardbound Lab Journal, Nitrile Gloves, USB Drive (16GB+), Student ID"
                />
              </div>

              {/* Equipments Needed */}
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-400" /> Equipments & Tools Provided / Needed
                </label>
                <input
                  type="text"
                  value={formData.equipment_needed}
                  onChange={(e) => setFormData({ ...formData, equipment_needed: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                  placeholder="e.g. Digital Microscope, Fume Hood, Bunsen Burner, Precision Scale"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                  Location / Building
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                  placeholder="e.g. Engineering Block B, 3rd Floor"
                />
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                  Amenities / Equipment Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.amenities}
                  onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                  placeholder="e.g. Projector, Whiteboard, High-speed GPUs, VR Kits"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-white font-extrabold text-sm bg-slate-950 border border-slate-700"
                  placeholder="Provide details about the facility, operational hours, or software installed."
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
                <label htmlFor="availability_status" className="text-xs font-extrabold text-white">
                  Available for Booking (Check to make active, uncheck for maintenance mode)
                </label>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-extrabold"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Details, Ratings & Feedback Analysis Modal */}
      {reviewModalOpen && reviewResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-slate-800 pb-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase">
                  {reviewResource.resource_type}
                </span>
                <span className="text-[10px] font-extrabold text-white">
                  Capacity: {reviewResource.capacity} people
                </span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">{reviewResource.resource_name}</h3>
              <p className="text-xs text-slate-300 font-bold">{reviewResource.location || 'Campus Main Block'}</p>
            </div>

            {/* Overall Rating Overview Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest block">Average Rating Score</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xl font-black text-amber-400">
                    {reviewResource.avg_rating > 0 ? reviewResource.avg_rating : '5.0'}
                  </span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`w-4 h-4 ${s <= Math.round(reviewResource.avg_rating || 5) ? 'fill-amber-400' : 'text-slate-700'}`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-white block">{reviewResource.review_count || 0} Reviews</span>
                <span className="text-[10px] text-slate-300 font-bold">Based on student feedback</span>
              </div>
            </div>

            {/* Class Preparation & Dress Code Box inside Review Modal */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <h4 className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-primary-400" /> Class Preparation & Gear
              </h4>
              <div className="text-xs space-y-1">
                <p><strong className="text-indigo-400 font-extrabold">👔 Dress Code:</strong> <span className="text-white font-extrabold">{reviewResource.dress_code || 'Standard Campus Casual'}</span></p>
                <p><strong className="text-amber-400 font-extrabold">🎒 Materials to Carry:</strong> <span className="text-white font-extrabold">{reviewResource.materials_required || 'Notebook, Pen & Student ID Card'}</span></p>
                <p><strong className="text-emerald-400 font-extrabold">⚡ Equipments:</strong> <span className="text-white font-extrabold">{reviewResource.equipment_needed || 'On-site Facility Workstation'}</span></p>
              </div>
            </div>

            {/* Student Feedback & Ratings List */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Student Ratings & Feedback
              </h4>

              {(!reviewResource.reviews || reviewResource.reviews.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400 font-bold">
                  No feedback reviews submitted for this resource yet. Be the first to rate it below!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {reviewResource.reviews.map((rev) => (
                    <div key={rev.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-white">{rev.user_name}</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-amber-400" /> {rev.rating}/5
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-bold italic">"{rev.comment || 'No comment provided.'}"</p>
                      <span className="text-[9px] text-slate-400 font-bold block text-right">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Write a Review Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const targetId = getResourceId(reviewResource);
                if (!targetId) {
                  showToast('Invalid resource selected for review.', 'error');
                  return;
                }
                try {
                  await API.post('/reviews', {
                    resource: Number(targetId),
                    rating: Number(reviewRating),
                    comment: reviewComment
                  });
                  showToast('Thank you for rating this resource!', 'success');
                  setReviewModalOpen(false);
                  setReviewComment('');
                  fetchResources();
                } catch (error) {
                  const msg = error.response?.data?.comment?.[0] || 
                              error.response?.data?.resource?.[0] || 
                              error.response?.data?.detail || 
                              'Failed to submit review.';
                  showToast(msg, 'error');
                }
              }}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3"
            >
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Leave Your Rating & Review</h4>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300 font-bold">Your Score:</span>
                <div className="flex gap-1.5 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setReviewRating(star);
                      }}
                      className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                        reviewRating >= star
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400 scale-105 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900/80 border-slate-800 text-slate-600 hover:text-slate-400 hover:border-slate-700'
                      }`}
                      title={`Rate ${star} Star${star > 1 ? 's' : ''}`}
                    >
                      <Star className={`w-5 h-5 ${reviewRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-1">
                    ({reviewRating}/5 Stars)
                  </span>
                </div>
              </div>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows="3"
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-white font-extrabold placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                placeholder="Share your experience (equipment quality, quietness, speed)..."
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setReviewModalOpen(false);
                    handleBookNow(reviewResource);
                  }}
                  className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <BookMarked className="w-3.5 h-3.5" /> Book This Resource
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold transition-all"
                >
                  Submit Feedback
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
