import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface YouTubePlayerModalProps {
  isOpen: boolean;
  videoUrl: string | null;
  title?: string | null;
  onClose: () => void;
}

export const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  isOpen,
  videoUrl,
  title,
  onClose,
}) => {
  // Regex to extract the 11-digit YouTube video ID
  const getEmbedUrl = (url: string | null): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : null;
  };

  const embedUrl = getEmbedUrl(videoUrl);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md transition-all duration-300">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl mx-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10 transform scale-100 transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex flex-col">
            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">YouTube Solution Player</span>
            <h3 className="text-sm md:text-base font-semibold text-slate-100 truncate max-w-[250px] sm:max-w-md md:max-w-xl">
              {title || 'DSA Coding Solution'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all border border-slate-700/50"
            title="Close video"
          >
            <X size={16} />
          </button>
        </div>

        {/* Video Body */}
        <div className="p-4 bg-slate-950">
          {embedUrl ? (
            <div className="relative pb-[56.25%] h-0 w-full rounded-lg overflow-hidden border border-slate-800 bg-black">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={embedUrl}
                title={title || 'YouTube video player'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <p className="text-slate-400 text-sm mb-4">
                Invalid or un-embeddable YouTube URL was provided.
              </p>
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-slate-100 text-xs font-semibold rounded-lg shadow transition-all"
                >
                  Open on YouTube Instead
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
