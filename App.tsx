
import React, { useState, useRef, useEffect } from 'react';
import { BACKDROP_PRESETS } from './constants';
import { AppStatus, Preset } from './types';
import { generateBackdrop } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState<string>('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset>(BACKDROP_PRESETS[0]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for API key selection on mount for Gemini 3 compliance
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setNeedsApiKey(!hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success as per guidelines to avoid race condition
      setNeedsApiKey(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalImage(event.target?.result as string);
        setOriginalMimeType(file.type);
        setResultImage(null);
        setStatus(AppStatus.IDLE);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartOver = () => {
    setOriginalImage(null);
    setResultImage(null);
    setOriginalMimeType('');
    setStatus(AppStatus.IDLE);
    setError(null);
    setCustomPrompt('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    setStatus(AppStatus.GENERATING);
    setError(null);

    const prompt = customPrompt || selectedPreset.description;

    try {
      const result = await generateBackdrop(originalImage, originalMimeType, prompt);
      setResultImage(result);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setStatus(AppStatus.ERROR);
      
      // If the error suggests a missing project/key, prompt for re-selection
      if (err.message?.includes("API Key configuration")) {
        setNeedsApiKey(true);
      }
    }
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `styleswap-gemini3-${Date.now()}.png`;
    link.click();
  };

  // Onboarding screen for API Key Selection
  if (needsApiKey) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl text-center border border-orange-100">
          <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-lg animate-bounce">
            <i className="fas fa-key"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Unlock Gemini 3</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            StyleSwap now uses the cutting-edge <strong>Gemini 3 Pro Image</strong> model. To proceed, please connect your Google Cloud project.
          </p>
          <div className="space-y-4">
            <button 
              onClick={handleSelectKey}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-3"
            >
              <i className="fas fa-plug"></i>
              Connect API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-sm text-orange-600 hover:underline font-medium"
            >
              Learn about paid project keys
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 py-4 px-4 md:px-8 mb-8 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xl shadow-md">
              <i className="fas fa-magic"></i>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800 leading-none">StyleSwap</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 shadow-sm">PRO EDIT</span>
                <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                  Gemini 3 API Active
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 shadow-sm">US-EAST</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {originalImage && (
              <button 
                onClick={handleStartOver}
                className="hidden md:flex items-center gap-2 text-gray-500 hover:text-orange-600 px-4 py-2 font-semibold transition-all"
              >
                <i className="fas fa-arrow-rotate-left text-sm"></i>
                Start Over
              </button>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="hidden md:flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-full font-semibold transition-all shadow-md active:scale-95"
            >
              <i className="fas fa-upload"></i>
              {originalImage ? 'New Photo' : 'Upload Photo'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Editor Controls */}
          <div className="lg:col-span-1 space-y-8">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-orange-50">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i className="fas fa-sliders text-orange-500"></i>
                AI Style Designer
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Atmosphere Presets</label>
                  <div className="grid grid-cols-2 gap-3">
                    {BACKDROP_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setSelectedPreset(preset);
                          setCustomPrompt('');
                        }}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-center ${
                          selectedPreset.id === preset.id && !customPrompt
                          ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' 
                          : 'border-gray-100 hover:border-orange-200 text-gray-600'
                        }`}
                      >
                        <i className={`fas ${preset.icon} text-lg`}></i>
                        <span className="text-xs font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Setting</label>
                  <textarea
                    placeholder="Describe your perfect background..."
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm h-24 transition-all"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                  />
                </div>

                {/* Fix: Added correct enum comparison and completed truncated button logic */}
                <button
                  onClick={handleGenerate}
                  disabled={!originalImage || status === AppStatus.GENERATING}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                    !originalImage || status === AppStatus.GENERATING
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {status === AppStatus.GENERATING ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin"></i>
                      Reimagining...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-wand-sparkles"></i>
                      Generate Backdrop
                    </>
                  )}
                </button>
              </div>
            </section>

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm flex gap-3">
                <i className="fas fa-exclamation-circle mt-0.5"></i>
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Image Workspace */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-orange-50 overflow-hidden min-h-[500px] flex flex-col">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {status === AppStatus.IDLE ? 'Waiting for upload' : 'Studio Canvas'}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 relative">
                {!originalImage ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-md aspect-square border-4 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition-all group"
                  >
                    <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-3xl group-hover:bg-orange-100 group-hover:text-orange-500 transition-all">
                      <i className="fas fa-cloud-arrow-up"></i>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-700">Click to upload product photo</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col md:flex-row gap-6 items-center justify-center">
                    <div className="flex-1 space-y-2 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Original</p>
                      <div className="relative aspect-square bg-white rounded-2xl shadow-inner overflow-hidden border border-gray-100">
                        <img src={originalImage} alt="Original" className="w-full h-full object-contain p-4" />
                      </div>
                    </div>
                    
                    <div className="hidden md:flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <i className="fas fa-chevron-right"></i>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Result</p>
                      <div className="relative aspect-square bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200 group">
                        {status === AppStatus.GENERATING ? (
                          <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                            <div className="relative w-16 h-16 mb-4">
                              <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
                              <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                            </div>
                            <h3 className="font-bold text-gray-800 text-sm">Processing with Gemini 3</h3>
                            <p className="text-[10px] text-gray-500 mt-2 max-w-[180px]">Generating 1K High-Quality Studio Environment...</p>
                          </div>
                        ) : resultImage ? (
                          <>
                            <img src={resultImage} alt="Result" className="w-full h-full object-cover" />
                            <div className="absolute bottom-4 right-4 flex gap-2 translate-y-12 group-hover:translate-y-0 transition-all">
                              <button 
                                onClick={downloadImage}
                                className="bg-white/90 backdrop-blur text-gray-800 p-2.5 rounded-lg shadow-lg hover:bg-orange-500 hover:text-white transition-all"
                              >
                                <i className="fas fa-download"></i>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-300">
                            <i className="fas fa-image text-4xl mb-2"></i>
                            <p className="text-xs font-medium">Ready to transform</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {resultImage && (
                <div className="p-4 bg-orange-50 border-t border-orange-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-orange-700">
                    <i className="fas fa-check-circle"></i>
                    <span className="text-sm font-semibold">Perfect! Image ready for your shop.</span>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleStartOver}
                      className="px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-100 rounded-lg transition-all"
                    >
                      Reset
                    </button>
                    <button 
                      onClick={downloadImage}
                      className="px-6 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-orange-700 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <i className="fas fa-download"></i>
                      Download 1K PNG
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Footer / Mobile Nav */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 p-3 md:hidden z-20">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-500"
          >
            <i className="fas fa-plus-circle text-xl"></i>
            <span className="text-[10px] font-bold">UPLOAD</span>
          </button>
          <button 
            onClick={handleGenerate}
            disabled={!originalImage || status === AppStatus.GENERATING}
            className={`flex flex-col items-center gap-1 ${
              !originalImage || status === AppStatus.GENERATING ? 'text-gray-200' : 'text-orange-600'
            }`}
          >
            <i className="fas fa-wand-magic-sparkles text-xl"></i>
            <span className="text-[10px] font-bold">GENERATE</span>
          </button>
          <button 
            onClick={handleStartOver}
            className="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-500"
          >
            <i className="fas fa-arrow-rotate-left text-xl"></i>
            <span className="text-[10px] font-bold">RESET</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

// Fix: Added missing default export
export default App;
