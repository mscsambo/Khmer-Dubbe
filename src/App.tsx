/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Upload, 
  Music, 
  FileText, 
  Download, 
  Trash2, 
  Settings, 
  Moon, 
  User, 
  Mic, 
  Video, 
  Scissors, 
  CheckCircle2, 
  Loader2, 
  Plus,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/src/lib/utils';
import { Subtitle, AppState } from '@/src/types';


export default function App() {
  const [state, setState] = useState<AppState>({
    videoUrl: null,
    bgmUrl: null,
    subtitles: [
      { id: '1', start: 0.62, end: 2.40, khmerText: 'មានសិទ្ធិយល់ត្រូវអ្នកហើយ តើអ្នកដឹងទេ?', voiceProfile: 'Female', status: 'Pending' },
      { id: '2', start: 3.21, end: 4.29, khmerText: 'ខ្ញុំបានសម្រាកកូនប្រុសម្នាក់ឲ្យអ្នកដែរ។', voiceProfile: 'Female', status: 'Pending' },
      { id: '3', start: 7.04, end: 7.72, khmerText: 'ម៉ាក់!', voiceProfile: 'Female', status: 'Pending' },
      { id: '4', start: 8.06, end: 8.57, khmerText: 'ម៉ាក់!', voiceProfile: 'Female', status: 'Pending' },
      { id: '5', start: 9.13, end: 10.88, khmerText: 'សាលីដា អ្នកមកទីនេះធ្វើអ្វី?', voiceProfile: 'Female', status: 'Pending' },
    ],
    currentTime: 0,
    duration: 0,
    isMuted: false,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    const stored = localStorage.getItem('gemini_api_keys');
    return stored ? JSON.parse(stored) : [];
  });
  const [newApiKey, setNewApiKey] = useState('');
  const [columnOrder, setColumnOrder] = useState<string[]>(['start', 'end', 'khmerText', 'voiceProfile', 'status']);
  const [khmerTextWidth, setKhmerTextWidth] = useState(() => {
    const stored = localStorage.getItem('khmerTextWidth');
    return stored ? parseInt(stored, 10) : 300;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgmRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('gemini_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  useEffect(() => {
    localStorage.setItem('khmerTextWidth', khmerTextWidth.toString());
  }, [khmerTextWidth]);

  const handleResize = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = khmerTextWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(150, Math.min(1200, startWidth + (moveEvent.clientX - startX)));
      setKhmerTextWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const addApiKey = () => {
    if (newApiKey.trim() && !apiKeys.includes(newApiKey.trim())) {
      setApiKeys(prev => [...prev, newApiKey.trim()]);
      setNewApiKey('');
    }
  };

  const removeApiKey = (key: string) => {
    setApiKeys(prev => prev.filter(k => k !== key));
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "00:00.00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleFinalRender = async () => {
    if (state.subtitles.length === 0) return;
    
    setIsRendering(true);
    // Simulate a rendering process
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsRendering(false);
    setShowResult(true);
  };

  const handleDownload = () => {
    if (!state.videoUrl) return;
    const link = document.createElement('a');
    link.href = state.videoUrl;
    link.download = 'dubbed_video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setState(prev => ({ ...prev, videoUrl: url }));
  };

  const handleBGMUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setState(prev => ({ ...prev, bgmUrl: url }));
  };

  const transcribeVideo = async () => {
    try {
      setIsGenerating(true);
      
      // Fix for "Cannot set property fetch of #<Window> which has only a getter"
      // This can happen if the library tries to polyfill fetch.
      const { GoogleGenAI } = await import("@google/genai").catch(err => {
        console.error("Failed to load @google/genai:", err);
        throw new Error("AI service is currently unavailable. Please try again later.");
      });

      const apiKey = apiKeys.length > 0 
        ? apiKeys[Math.floor(Math.random() * apiKeys.length)] 
        : process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please add it in settings.");
      }
      const genAI = new GoogleGenAI({ apiKey });
      
      // In a real app, we would send the video/audio to Gemini
      // For this demo, we'll simulate generating Khmer subtitles based on a prompt
      const duration = state.duration || 60;
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `Generate a full set of movie subtitles in Khmer for a drama movie with a duration of ${duration} seconds. 
        Return as a JSON array of objects. Each object MUST have:
        - 'start' (number): start time in seconds
        - 'end' (number): end time in seconds
        - 'khmerText' (string): the dubbed text in Khmer
        - 'voiceProfile' (string): either 'Male' or 'Female' based on the context of the dialogue.
        
        Provide enough subtitles to cover the entire ${duration} seconds of the video naturally.` }] }],
        config: {
          responseMimeType: "application/json",
        }
      });

      const newSubs = JSON.parse(response.text);
      setState(prev => ({
        ...prev,
        subtitles: newSubs.map((s: any, i: number) => ({
          id: Math.random().toString(36).substr(2, 9),
          start: s.start,
          end: s.end,
          khmerText: s.khmerText,
          voiceProfile: s.voiceProfile === 'Male' ? 'Male' : 'Female',
          status: 'Pending'
        }))
      }));
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Transcription Error:', error);
      let message = "Failed to transcribe video. Please try again.";
      if (error.message?.includes("RESOURCE_EXHAUSTED") || error.status === "RESOURCE_EXHAUSTED" || (error.error && error.error.code === 429)) {
        message = "AI Quota exceeded. Please check your Gemini API plan or try again later.";
      }
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportSRT = () => {
    const srtContent = state.subtitles.map((sub, index) => {
      const formatSRTTime = (seconds: number) => {
        const date = new Date(0);
        date.setSeconds(seconds);
        const timeStr = date.toISOString().substr(11, 8);
        const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
        return `${timeStr},${ms}`;
      };
      return `${index + 1}\n${formatSRTTime(sub.start)} --> ${formatSRTTime(sub.end)}\n${sub.khmerText}\n`;
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  const handleSubtitleChange = (id: string, text: string) => {
    setState(prev => ({
      ...prev,
      subtitles: prev.subtitles.map(s => s.id === id ? { ...s, khmerText: text, status: 'Pending' } : s)
    }));
  };

  const handleVoiceProfileChange = (id: string, profile: 'Male' | 'Female') => {
    setState(prev => ({
      ...prev,
      subtitles: prev.subtitles.map(s => s.id === id ? { ...s, voiceProfile: profile, status: 'Pending' } : s)
    }));
  };

  const generateAudio = async (subtitle: Subtitle, retryCount = 0) => {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 2000; // 2 seconds base delay for retry

    try {
      setState(prev => ({
        ...prev,
        subtitles: prev.subtitles.map(s => s.id === subtitle.id ? { ...s, status: 'Generating' } : s)
      }));

      // Fix for "Cannot set property fetch of #<Window> which has only a getter"
      const { GoogleGenAI, Modality } = await import("@google/genai").catch(err => {
        console.error("Failed to load @google/genai:", err);
        throw new Error("AI service is currently unavailable. Please try again later.");
      });

      // Use a random key from the list or the system key
      const apiKey = apiKeys.length > 0 
        ? apiKeys[Math.floor(Math.random() * apiKeys.length)] 
        : process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please add it in settings.");
      }
      const genAI = new GoogleGenAI({ apiKey });

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say in Khmer: ${subtitle.khmerText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: subtitle.voiceProfile === 'Female' ? 'Kore' : 'Fenrir' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Int16Array(binary.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = (binary.charCodeAt(i * 2) & 0xff) | (binary.charCodeAt(i * 2 + 1) << 8);
        }
        
        // Convert to Float32 for AudioBuffer
        const float32Data = new Float32Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
          float32Data[i] = bytes[i] / 32768.0;
        }

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);
        
        // We'll store the buffer instead of a URL for better control
        // But for simplicity in this demo, let's convert it to a WAV blob for the Audio element
        const wavBlob = createWavBlob(float32Data, 24000);
        const audioUrl = URL.createObjectURL(wavBlob);

        setState(prev => ({
          ...prev,
          subtitles: prev.subtitles.map(s => s.id === subtitle.id ? { ...s, status: 'Ready', audioUrl } : s)
        }));
        setErrorMessage(null);
      }
    } catch (error: any) {
      console.error('TTS Error:', error);
      
      // Check for 429 / Quota Exceeded
      const isQuotaError = 
        error.message?.includes("RESOURCE_EXHAUSTED") || 
        error.status === "RESOURCE_EXHAUSTED" || 
        (error.error && error.error.code === 429) ||
        (typeof error === 'string' && error.includes("429"));

      if (isQuotaError && retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        console.log(`Quota exceeded. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Update status to show it's waiting/retrying
        setState(prev => ({
          ...prev,
          subtitles: prev.subtitles.map(s => s.id === subtitle.id ? { ...s, status: 'Generating' } : s)
        }));

        await new Promise(resolve => setTimeout(resolve, delay));
        return generateAudio(subtitle, retryCount + 1);
      }

      let message = "Failed to generate audio. Please try again.";
      if (isQuotaError) {
        message = "AI Quota exceeded. Please check your Gemini API plan or add your own API Key in settings to increase limits.";
      }
      
      setErrorMessage(message);
      setState(prev => ({
        ...prev,
        subtitles: prev.subtitles.map(s => s.id === subtitle.id ? { ...s, status: 'Error' } : s)
      }));
      throw error; // Re-throw to stop generateAllAudio loop
    }
  };

  const generateAllAudio = async () => {
    const pendingSubs = state.subtitles.filter(s => s.status === 'Pending' || s.status === 'Error');
    if (pendingSubs.length === 0) return;

    setIsGeneratingAll(true);
    setErrorMessage(null);
    
    for (const sub of pendingSubs) {
      try {
        await generateAudio(sub);
      } catch (error) {
        console.error("Stopping batch generation due to error");
        break; // Stop the loop on error
      }
      // Increased delay to avoid hitting rate limits too fast
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    setIsGeneratingAll(false);
  };

  // Helper to create a WAV blob from Float32 PCM
  const createWavBlob = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-[#1E293B] dark:text-slate-200 font-sans flex flex-col transition-colors">
      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
            <Mic size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight dark:text-white">AI Dubber Pro</h1>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Khmer Edition Workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Plus className="rotate-45" size={20} />}
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <div className="flex items-center gap-2 pl-2">
            <button 
              onClick={() => setIsUserOpen(true)}
              className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Video & Tools */}
        <div className="w-[420px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto transition-colors">
          {/* Video Player Section */}
          <div className="p-4 flex flex-col gap-4">
            <div className="aspect-[9/16] bg-black rounded-2xl overflow-hidden relative group shadow-2xl max-h-[600px] mx-auto w-full">
              {state.videoUrl ? (
                <>
                  <video 
                    ref={videoRef}
                    src={state.videoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={(e) => {
                      const currentTime = e.currentTarget.currentTime;
                      setState(prev => ({ ...prev, currentTime }));
                      if (bgmRef.current) {
                        // Keep BGM in sync if it's playing
                        if (Math.abs(bgmRef.current.currentTime - currentTime) > 0.5) {
                          bgmRef.current.currentTime = currentTime;
                        }
                      }
                    }}
                    onPlay={() => bgmRef.current?.play()}
                    onPause={() => bgmRef.current?.pause()}
                    onLoadedMetadata={(e) => {
                      const duration = e.currentTarget.duration;
                      setState(prev => ({ ...prev, duration }));
                    }}
                  />
                  {state.bgmUrl && (
                    <audio 
                      ref={bgmRef}
                      src={state.bgmUrl}
                      loop
                      className="hidden"
                    />
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3 border-2 border-dashed border-slate-800 m-2 rounded-xl">
                  <Video size={48} strokeWidth={1.5} />
                  <p className="text-sm font-medium">Load a movie to start</p>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) videoRef.current.pause();
                      else videoRef.current.play();
                      setIsPlaying(!isPlaying);
                    }
                  }}
                  className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
                </button>
              </div>
            </div>

            {/* Video Controls */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 flex flex-col gap-3 transition-colors">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span>{formatTime(state.currentTime)}</span>
                <span>{formatTime(state.duration)}</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-indigo-600 transition-all"
                  style={{ width: `${(state.currentTime / state.duration) * 100 || 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-300"><Play size={18} /></button>
                  <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-300"><Pause size={18} /></button>
                </div>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  <input 
                    type="range" 
                    className="w-24 accent-indigo-600" 
                    min="0" max="1" step="0.1" 
                    onChange={(e) => {
                      if (videoRef.current) videoRef.current.volume = parseFloat(e.target.value);
                    }}
                  />
                  <Volume2 size={18} className="text-slate-600 dark:text-slate-300" />
                </div>
              </div>
            </div>
          </div>

          {/* Workspace Tools */}
          <div className="px-4 pb-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-400 dark:bg-slate-600 rounded-full" />
              </div>
              Workspace Tools
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <ToolButton 
                icon={<Upload size={16} />} 
                label="Load Video" 
                onClick={() => fileInputRef.current?.click()} 
                theme={theme}
              />
              <ToolButton 
                icon={<Music size={16} />} 
                label="Load BGM" 
                onClick={() => bgmInputRef.current?.click()} 
                theme={theme}
              />
              <ToolButton 
                icon={<VolumeX size={16} />} 
                label="Mute Audio" 
                onClick={() => setState(prev => ({ ...prev, isMuted: !prev.isMuted }))} 
                active={state.isMuted} 
                theme={theme}
              />
              <ToolButton 
                icon={<Download size={16} />} 
                label="Export SRT" 
                onClick={exportSRT} 
                theme={theme}
              />
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="video/*" 
              onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])} 
            />
            <input 
              type="file" 
              ref={bgmInputRef} 
              className="hidden" 
              accept="audio/*" 
              onChange={(e) => e.target.files?.[0] && handleBGMUpload(e.target.files[0])} 
            />
            
            <button className="w-full py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
              <FileText size={18} />
              Import Subtitles (SRT)
            </button>

            <button 
              onClick={handleFinalRender}
              disabled={isRendering || state.subtitles.length === 0}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-indigo-200 transition-all mt-2"
            >
              {isRendering ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Rendering Dubbing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Final Render
                </>
              )}
            </button>

            <button 
              onClick={() => setState(prev => ({ ...prev, subtitles: [], videoUrl: null, bgmUrl: null }))}
              className="w-full py-3 text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all border border-transparent hover:border-red-100"
            >
              <Trash2 size={16} />
              Clear All Data
            </button>
          </div>
        </div>

        {/* Right Content - Subtitles & Timeline */}
        <div className="flex-1 flex flex-col bg-[#F1F5F9] dark:bg-slate-950 overflow-hidden transition-colors">
          {/* Subtitle Table Header */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-slate-400 dark:text-slate-500" />
              <h2 className="font-bold text-slate-700 dark:text-slate-200">Subtitle Data</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2 uppercase">Set all voices to:</span>
                <button className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-700 dark:text-slate-200 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Male</button>
                <button className="px-3 py-1 text-xs font-bold bg-white dark:bg-slate-700 dark:text-slate-200 rounded-md shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Female</button>
              </div>
            </div>
          </div>

          {/* Subtitle List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 w-10"><input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800" /></th>
                    {columnOrder.map(col => {
                      if (col === 'start') return <th key={col} className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20">Start</th>;
                      if (col === 'end') return <th key={col} className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20">End</th>;
                      if (col === 'khmerText') return (
                        <th 
                          key={col} 
                          className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider relative group/resize"
                          style={{ width: `${khmerTextWidth}px` }}
                        >
                          <div className="flex items-center gap-2">
                            Khmer Text (Editable)
                          </div>
                          <div 
                            onMouseDown={handleResize}
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize bg-transparent group-hover/resize:bg-indigo-400/50 transition-colors z-10"
                          />
                        </th>
                      );
                      if (col === 'voiceProfile') return <th key={col} className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-32">Voice Profile</th>;
                      if (col === 'status') return <th key={col} className="p-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Audio Status</th>;
                      return null;
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {state.subtitles.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="p-4"><input type="checkbox" className="rounded border-slate-300 dark:border-slate-700 dark:bg-slate-800" /></td>
                      {columnOrder.map(col => {
                        if (col === 'start') return (
                          <td key={col} className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {formatTime(sub.start).split('.')[0]}
                          </td>
                        );
                        if (col === 'end') return (
                          <td key={col} className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                            {formatTime(sub.end).split('.')[0]}
                          </td>
                        );
                        if (col === 'khmerText') return (
                          <td key={col} className="p-4" style={{ width: `${khmerTextWidth}px` }}>
                            <input 
                              type="text" 
                              value={sub.khmerText}
                              onChange={(e) => handleSubtitleChange(sub.id, e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                              placeholder="Enter Khmer translation..."
                            />
                          </td>
                        );
                        if (col === 'voiceProfile') return (
                          <td key={col} className="p-4">
                            <select 
                              value={sub.voiceProfile}
                              onChange={(e) => handleVoiceProfileChange(sub.id, e.target.value as 'Male' | 'Female')}
                              className="text-xs font-bold text-pink-500 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20 border-none rounded-lg px-3 py-1.5 focus:ring-0 cursor-pointer hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
                            >
                              <option value="Female">Female</option>
                              <option value="Male">Male</option>
                            </select>
                          </td>
                        );
                        if (col === 'status') return (
                          <td key={col} className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {sub.status !== 'Ready' && sub.status !== 'Generating' && (
                                <button 
                                  onClick={() => generateAudio(sub)}
                                  className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors"
                                  title="Generate Audio"
                                >
                                  <Volume2 size={14} />
                                </button>
                              )}
                              {sub.audioUrl && (
                                <button 
                                  onClick={() => {
                                    const audio = new Audio(sub.audioUrl);
                                    audio.play();
                                  }}
                                  className="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400 transition-colors"
                                  title="Play Dubbed"
                                >
                                  <Play size={14} fill="currentColor" />
                                </button>
                              )}
                              <StatusBadge status={sub.status} theme={theme} />
                            </div>
                          </td>
                        );
                        return null;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex justify-center">
                <button className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                  <Plus size={16} />
                  Add Subtitle Row
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Actions & Timeline */}
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500">
                  <Scissors size={16} />
                  Timeline Editor
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Zoom:</span>
                  <input type="range" className="w-32 accent-indigo-600" min="50" max="200" defaultValue="100" />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">100%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={transcribeVideo}
                  disabled={isGenerating || !state.videoUrl}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
                  {isGenerating ? 'Transcribing...' : 'AI Auto Dub (Full Video)'}
                </button>
                <button 
                  onClick={generateAllAudio}
                  disabled={isGeneratingAll || state.subtitles.length === 0}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-[0.98]"
                >
                  {isGeneratingAll ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                  {isGeneratingAll ? 'Generating...' : 'Generate All Audio'}
                </button>
              </div>
            </div>

            {/* Timeline Visualization */}
            <div className="h-32 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col transition-colors">
              <div className="h-6 border-b border-slate-200 dark:border-slate-800 flex items-center px-2 gap-20 text-[9px] font-mono text-slate-400 dark:text-slate-500">
                {[...Array(7)].map((_, i) => (
                  <span key={i}>{formatTime((state.duration / 6) * i)}</span>
                ))}
              </div>
              <div className="flex-1 relative p-2 flex flex-col gap-2">
                {/* Track 1: Subtitles */}
                <div className="h-8 flex items-center relative">
                  <div className="absolute left-0 top-0 h-full w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 z-10 border border-indigo-200 dark:border-indigo-800">T1</div>
                  <div className="flex-1 ml-14 relative h-full">
                    {state.subtitles.map(sub => (
                      <div 
                        key={sub.id}
                        className="absolute h-full bg-emerald-500 rounded border border-emerald-600 flex items-center px-2 overflow-hidden"
                        style={{ 
                          left: `${(sub.start / (state.duration || 30)) * 100}%`, 
                          width: `${((sub.end - sub.start) / (state.duration || 30)) * 100}%` 
                        }}
                      >
                        <span className="text-[8px] text-white font-medium truncate">{sub.khmerText}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Track 2: Audio */}
                <div className="h-8 flex items-center relative">
                  <div className="absolute left-0 top-0 h-full w-12 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 z-10 border border-slate-300 dark:border-slate-700">A1 <Volume2 size={10} className="ml-1" /></div>
                  <div className="flex-1 ml-14 relative h-full bg-slate-100 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800 border-dashed" />
                </div>
                
                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
                  style={{ left: `calc(3.5rem + ${(state.currentTime / (state.duration || 30)) * 100}%)` }}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full -ml-[3.5px] -mt-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Error Message Toast */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[110] w-full max-w-md px-4"
          >
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-xl flex items-center gap-3 backdrop-blur-md">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shrink-0">
                <Settings size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900 dark:text-red-200">System Error</p>
                <p className="text-xs text-red-700 dark:text-red-400">{errorMessage}</p>
              </div>
              <button 
                onClick={() => setErrorMessage(null)}
                className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-colors"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Settings size={20} className="text-indigo-600" />
                  Settings
                </h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gemini API Keys Management</label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="Enter new Gemini API Key..."
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
                    />
                    <button 
                      onClick={addApiKey}
                      className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 text-sm"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {apiKeys.length === 0 ? (
                      <p className="text-center py-4 text-slate-400 text-xs italic">No custom API keys added yet.</p>
                    ) : (
                      apiKeys.map((key, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <code className="text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                            {key.substring(0, 8)}••••••••••••{key.substring(key.length - 4)}
                          </code>
                          <button 
                            onClick={() => removeApiKey(key)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Remove Key"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    * Multiple keys will be used in rotation to help mitigate rate limits. Your keys are stored locally.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Column Display Order</label>
                  <div className="flex flex-wrap gap-2">
                    {columnOrder.map((col, index) => (
                      <div key={col} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold border border-indigo-100 dark:border-indigo-800">
                        <span>{col === 'khmerText' ? 'Khmer Text' : col === 'voiceProfile' ? 'Voice Profile' : col === 'status' ? 'Audio Status' : col.charAt(0).toUpperCase() + col.slice(1)}</span>
                        <div className="flex gap-1">
                          {index > 0 && (
                            <button onClick={() => {
                              const newOrder = [...columnOrder];
                              [newOrder[index-1], newOrder[index]] = [newOrder[index], newOrder[index-1]];
                              setColumnOrder(newOrder);
                            }} className="hover:text-indigo-800">←</button>
                          )}
                          {index < columnOrder.length - 1 && (
                            <button onClick={() => {
                              const newOrder = [...columnOrder];
                              [newOrder[index+1], newOrder[index]] = [newOrder[index], newOrder[index+1]];
                              setColumnOrder(newOrder);
                            }} className="hover:text-indigo-800">→</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">* Use arrows to reorder columns in the subtitle table.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Appearance</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                        theme === 'light' 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      <Plus className="rotate-45" size={16} /> Light
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                        theme === 'dark' 
                          ? "bg-indigo-900/30 border-indigo-500 text-indigo-400" 
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                      )}
                    >
                      <Moon size={16} /> Dark
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Modal Placeholder */}
      <AnimatePresence>
        {isUserOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transition-colors"
            >
              <div className="p-8 flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                  <User size={48} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">User Profile</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">Profile management features coming soon!</p>
                </div>
                <button 
                  onClick={() => setIsUserOpen(false)}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transition-colors"
            >
              <div className="p-8 flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={48} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dubbing Complete!</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-2">Your Khmer dubbed video is ready for download.</p>
                </div>
                <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 dark:text-slate-500">Resolution</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">1080p (Full HD)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 dark:text-slate-500">Format</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">MP4 (H.264)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 dark:text-slate-500">Audio</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">Khmer (AI Synthesis)</span>
                  </div>
                </div>
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={handleDownload}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Download size={20} />
                    Download Result
                  </button>
                  <button 
                    onClick={() => setShowResult(false)}
                    className="w-full py-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-bold transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            System Ready
          </div>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
          <div>Project: EP002_part_002.mp4</div>
        </div>
        <div className="flex items-center gap-4">
          <div>Memory Usage: Normal</div>
          <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
          <div>v1.0.4-stable</div>
        </div>
      </footer>
    </div>
  );
}

function ToolButton({ icon, label, onClick, active, theme }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean, theme?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border transition-all group",
        active 
          ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm" 
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800"
      )}
    >
      <div className={cn(
        "transition-transform group-hover:scale-110",
        active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400"
      )}>
        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function StatusBadge({ status, theme }: { status: Subtitle['status'], theme?: string }) {
  const configs = {
    Pending: { color: 'text-slate-400 bg-slate-50 dark:bg-slate-800 dark:text-slate-500', icon: null },
    Generating: { color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400', icon: <Loader2 size={10} className="animate-spin" /> },
    Ready: { color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400', icon: <CheckCircle2 size={10} /> },
    Error: { color: 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400', icon: null },
  };

  const config = configs[status];

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold", config.color)}>
      {config.icon}
      {status}
    </div>
  );
}
