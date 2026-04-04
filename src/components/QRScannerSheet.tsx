import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface QRScannerSheetProps {
  onClose: () => void;
}

export function QRScannerSheet({ onClose }: QRScannerSheetProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  function handleClose() {
    setIsOpen(false);
    readerRef.current?.reset();
    setTimeout(onClose, 300);
  }

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setIsOpen(true)));

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    if (!videoRef.current) return;

    reader
      .decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, err) => {
          if (!result || scanned) return;
          void err;

          const text = result.getText();
          // Accept any URL containing /join/
          const match = text.match(/\/join\/([a-f0-9]+)/);
          if (match) {
            setScanned(true);
            reader.reset();
            setIsOpen(false);
            setTimeout(() => {
              onClose();
              navigate(`/join/${match[1]}`);
            }, 200);
          }
        },
      )
      .catch(() => {
        setError('לא ניתן לגשת למצלמה. אשר הרשאה ונסה שוב.');
      });

    return () => {
      reader.reset();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <>
      <div
        className={`fixed inset-0 z-[70] transition-colors duration-300 ${isOpen ? 'bg-black/80' : 'bg-black/0'}`}
        onClick={handleClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-[71] bg-black rounded-t-3xl overflow-hidden"
        style={{
          height: '75vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 absolute top-0 inset-x-0 z-10">
          <div className="w-9 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Title */}
        <div className="absolute top-8 inset-x-0 z-10 text-center">
          <p className="text-white font-semibold text-[15px]">סרוק QR להצטרפות</p>
        </div>

        {/* Camera feed */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative"
            style={{ width: 220, height: 220 }}
          >
            {/* Corner brackets */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
              <div
                key={corner}
                className="absolute w-10 h-10"
                style={{
                  top: corner.startsWith('t') ? 0 : 'auto',
                  bottom: corner.startsWith('b') ? 0 : 'auto',
                  left: corner.endsWith('l') ? 0 : 'auto',
                  right: corner.endsWith('r') ? 0 : 'auto',
                  borderTop: corner.startsWith('t') ? '3px solid white' : 'none',
                  borderBottom: corner.startsWith('b') ? '3px solid white' : 'none',
                  borderLeft: corner.endsWith('l') ? '3px solid white' : 'none',
                  borderRight: corner.endsWith('r') ? '3px solid white' : 'none',
                  borderRadius:
                    corner === 'tl' ? '8px 0 0 0' :
                    corner === 'tr' ? '0 8px 0 0' :
                    corner === 'bl' ? '0 0 0 8px' : '0 0 8px 0',
                }}
              />
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="absolute inset-x-0 bottom-16 flex justify-center px-6">
            <p className="text-white text-sm text-center bg-black/60 rounded-xl px-4 py-3">
              {error}
            </p>
          </div>
        )}

        {/* Close button */}
        <div className="absolute inset-x-0 bottom-0 pb-8 flex justify-center"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={handleClose}
            className="px-8 py-3 rounded-full text-white text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            ביטול
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
