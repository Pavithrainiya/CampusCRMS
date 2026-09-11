import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../services/api';
import { 
  Sparkles, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  HelpCircle, 
  Zap, 
  TrendingDown, 
  Layers, 
  ChevronRight,
  RefreshCw,
  Cpu,
  Plus,
  Minus
} from 'lucide-react';

const AiAssistantDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'recommend' | 'offpeak'
  
  // Chat state
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: "Hello! I am your AI Campus RMS Assistant powered by Retrieval-Augmented Generation (RAG). Ask me anything about room bookings, dress codes, required materials, equipment, or ask me to book a slot for you!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [capacityQuery, setCapacityQuery] = useState(20);
  const [equipmentQuery, setEquipmentQuery] = useState('');

  // Off-Peak state
  const [offPeakSlots, setOffPeakSlots] = useState([]);
  const [offPeakLoading, setOffPeakLoading] = useState(false);

  // Initialize Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      rec.onerror = (err) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Fetch recommendations when switching to recommendations tab
  useEffect(() => {
    if (activeTab === 'recommend' && recommendations.length === 0) {
      fetchRecommendations();
    } else if (activeTab === 'offpeak' && offPeakSlots.length === 0) {
      fetchOffPeak();
    }
  }, [activeTab]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSendMessage = async (textToSend = inputText) => {
    const query = textToSend.trim();
    if (!query || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await API.post('/ai/chat', { message: query, query });
      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: response.data.reply || response.data.answer || "I found relevant campus resources matching your request.",
        sources: response.data.sources || [],
        booking_intent: response.data.booking_intent || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: "I encountered an error retrieving data from the campus knowledge base. Please try again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setRecLoading(true);
    try {
      const res = await API.get('/ai/recommendations', {
        params: {
          min_capacity: capacityQuery,
          equipment: equipmentQuery
        }
      });
      setRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error('Failed to load AI recommendations', err);
    } finally {
      setRecLoading(false);
    }
  };

  const fetchOffPeak = async () => {
    setOffPeakLoading(true);
    try {
      const res = await API.get('/ai/offpeak');
      setOffPeakSlots(res.data.off_peak_slots || []);
    } catch (err) {
      console.error('Failed to load off-peak optimizer', err);
    } finally {
      setOffPeakLoading(false);
    }
  };

  const handleBookNow = (intent) => {
    onClose();
    navigate('/bookings', {
      state: {
        prefillResource: intent.resource_id,
        prefillDate: intent.date,
        prefillSlot: intent.time_slot
      }
    });
  };

  const presetPrompts = [
    "Book a Computer Lab for 30 people tomorrow afternoon",
    "What materials and dress code are required for Lab 1?",
    "Find a quiet conference room with projector for 10 people",
    "Recommend quiet off-peak slots for group study"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-950/95 border-l border-slate-800 shadow-2xl flex flex-col backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-primary-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-primary-500/20">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white tracking-wide">CampusRMS AI Suite</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-500/20 text-primary-300 border border-primary-500/40 uppercase">
                      RAG V2.4
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-300">Natural Language & Off-Peak Intelligence</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800/60 bg-slate-950/50 p-1.5 gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                  activeTab === 'chat'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Bot className="w-4 h-4" />
                RAG Voice Chat
              </button>
              <button
                onClick={() => setActiveTab('recommend')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                  activeTab === 'recommend'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-300" />
                AI Match Engine
              </button>
              <button
                onClick={() => setActiveTab('offpeak')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                  activeTab === 'offpeak'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <TrendingDown className="w-4 h-4 text-emerald-300" />
                Off-Peak Optimizer
              </button>
            </div>

            {/* Tab 1: RAG Voice & Text Chat */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950/30">
                {/* Preset Prompt Badges */}
                <div className="p-3 border-b border-slate-800/40 bg-slate-900/30 overflow-x-auto flex gap-2 scrollbar-none">
                  {presetPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-extrabold bg-slate-900/80 border border-slate-700/80 text-white hover:bg-primary-500/20 hover:border-primary-500/50 hover:text-white shrink-0 transition"
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>

                {/* Messages stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'assistant' && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className={`max-w-[85%] space-y-2`}>
                        <div
                          className={`p-4 rounded-2xl border text-xs leading-relaxed font-extrabold text-white ${
                            msg.sender === 'user'
                              ? 'bg-primary-600 text-white border-primary-500/50 shadow-md rounded-tr-none'
                              : 'bg-slate-900/90 text-white border-slate-800 shadow-xl rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap font-extrabold text-white">{msg.text}</p>

                          {/* Sources citation tag if RAG response */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1">
                              <span className="text-[10px] font-extrabold text-white uppercase tracking-wider block">
                                📚 Knowledge Sources Referenced:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.sources.map((src, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-950 text-white border border-slate-700">
                                    {src.name} ({src.type})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 1-Click Booking Intent Card */}
                          {msg.booking_intent && (
                            <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-primary-950/80 to-slate-900 border border-primary-500/40 text-white space-y-2">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
                                <span className="text-xs font-extrabold text-white uppercase">1-Click Booking Ready</span>
                              </div>
                              <div className="text-xs font-extrabold text-white space-y-1">
                                <p><span className="text-slate-300">Resource:</span> <strong className="text-white">{msg.booking_intent.resource_name}</strong></p>
                                <p><span className="text-slate-300">Date:</span> <strong className="text-white">{msg.booking_intent.date}</strong></p>
                                <p><span className="text-slate-300">Slot:</span> <strong className="text-white">{msg.booking_intent.time_slot}</strong></p>
                              </div>
                              <button
                                onClick={() => handleBookNow(msg.booking_intent)}
                                className="mt-2 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-2 transition"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Confirm & Reserve Now
                              </button>
                            </div>
                          )}
                        </div>

                        <span className={`text-[10px] font-extrabold text-slate-300 block ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                          {msg.timestamp}
                        </span>
                      </div>

                      {msg.sender === 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
                        <Cpu className="w-4 h-4 animate-spin text-white" />
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-extrabold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary-400 animate-ping" />
                        Searching campus RAG database & calculating availability...
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Voice / Text Input Box */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`p-3 rounded-xl border font-extrabold transition-all duration-200 ${
                        isListening
                          ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/30'
                          : 'bg-slate-950 text-white border-slate-800 hover:border-slate-700'
                      }`}
                      title={isListening ? "Listening... Click to stop" : "Voice Input (Speech-to-Text)"}
                    >
                      {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={isListening ? "Listening to your voice..." : "Ask AI or say 'Book Mac lab for 15 people'..."}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-extrabold text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />

                    <button
                      type="submit"
                      disabled={!inputText.trim() || loading}
                      className="p-3 rounded-xl bg-primary-600 border border-primary-500 text-white font-extrabold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-500 transition shadow-lg"
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Tab 2: AI Match & Recommendation Engine */}
            {activeTab === 'recommend' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> Filter Facility Suitability Criteria
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-extrabold text-white block mb-1">Required Capacity Count</label>
                      <select
                        value={capacityQuery}
                        onChange={(e) => setCapacityQuery(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-extrabold text-white focus:outline-none focus:border-primary-500 cursor-pointer"
                      >
                        {[1, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100, 150, 200].map(cnt => (
                          <option key={cnt} value={cnt} className="bg-slate-900 text-white">
                            {cnt} {cnt === 1 ? 'person' : 'people'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-white block mb-1">Required Equipment</label>
                      <input
                        type="text"
                        placeholder="e.g. Projector, Xcode, Mac"
                        value={equipmentQuery}
                        onChange={(e) => setEquipmentQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-extrabold text-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={fetchRecommendations}
                    disabled={recLoading}
                    className="w-full py-2 px-4 rounded-lg bg-primary-600 text-white text-xs font-extrabold flex items-center justify-center gap-2 hover:bg-primary-500 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${recLoading ? 'animate-spin' : ''}`} />
                    Calculate Match Scores
                  </button>
                </div>

                {recLoading ? (
                  <div className="text-center py-12 text-white text-xs font-extrabold">Evaluating room suitability & schedule gaps...</div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-white uppercase">AI Ranked Facilities ({recommendations.length})</h4>
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="p-4 rounded-xl glass-card border border-slate-800 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="text-sm font-extrabold text-white">{rec.resource_name || rec.name}</h5>
                            <span className="text-[10px] font-extrabold text-white">{rec.resource_type || rec.type} • Capacity: {rec.capacity}</span>
                          </div>
                          <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-white font-extrabold text-xs">
                            ⚡ {rec.suitability_score}% Match
                          </div>
                        </div>

                        {rec.equipment_list && rec.equipment_list.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {rec.equipment_list.map((eq, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-900 text-white border border-slate-700">
                                🛠️ {eq}
                              </span>
                            ))}
                          </div>
                        )}

                        {rec.dress_code && (
                          <p className="text-[11px] font-extrabold text-white">
                            👔 Dress Code: <span className="text-white">{rec.dress_code}</span>
                          </p>
                        )}

                        <button
                          onClick={() => {
                            onClose();
                            navigate('/bookings', { state: { prefillResource: rec.id } });
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-extrabold hover:bg-primary-600 hover:border-primary-500 transition flex items-center justify-center gap-1"
                        >
                          Book Facility <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Smart Off-Peak Slot Optimizer */}
            {activeTab === 'offpeak' && (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <h3 className="text-xs font-extrabold text-white uppercase flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-400" /> Historical Congestion Analyzer
                  </h3>
                  <p className="text-xs font-extrabold text-white leading-relaxed">
                    Our AI analyzes historical campus traffic to highlight low-congestion time windows perfect for quiet study, research, and lab work.
                  </p>
                </div>

                {offPeakLoading ? (
                  <div className="text-center py-12 text-white text-xs font-extrabold">Analyzing historical traffic logs...</div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-white uppercase">Optimized Time Windows</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {offPeakSlots.map((slot, idx) => (
                        <div key={idx} className="p-4 rounded-xl glass-card border border-slate-800 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-primary-400" />
                              <span className="text-xs font-extrabold text-white">{slot.slot}</span>
                            </div>
                            <span className="text-[10px] font-extrabold text-white block">
                              Historical Bookings: {slot.booking_count}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              slot.status === 'Low / Quiet'
                                ? 'bg-emerald-500/20 text-white border-emerald-500/40'
                                : slot.status === 'Moderate'
                                ? 'bg-amber-500/20 text-white border-amber-500/40'
                                : 'bg-rose-500/20 text-white border-rose-500/40'
                            }`}>
                              {slot.status}
                            </span>
                            <button
                              onClick={() => {
                                onClose();
                                navigate('/bookings', { state: { prefillSlot: slot.slot } });
                              }}
                              className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-[11px] font-extrabold hover:bg-primary-500 transition"
                            >
                              Reserve Slot
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AiAssistantDrawer;
