import { useEffect, useRef, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';
import { inviteUrl } from '../lib/mode';
import { Sheet } from './Sheet';
import './Group.css';

export function RoomCode({ room }: { room: string }) {
  const url = inviteUrl(room);
  const [image, setImage] = useState<{ url: string; src: string }>();
  useEffect(() => {
    let active = true;
    void import('qrcode').then(({ toDataURL }) => toDataURL(url, { width: 240, margin: 3 }))
      .then((src) => { if (active) setImage({ url, src }); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [url]);

  return image?.url === url ? <img className="room-code" alt="Scan to join this VYBE room" src={image.src} /> : null;
}

export function InviteSheet({ room, onDismiss }: { room: string | null; onDismiss: () => void }) {
  const [feedback, setFeedback] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const url = room ? inviteUrl(room) : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('Link copied');
    } catch {
      field.current?.select();
      setFeedback('Copy the selected link');
    }
  };

  return <Sheet title="Invite friends" onDismiss={onDismiss}>
    {(close) => <>
      {room ? <div className="invite-content">
        <RoomCode room={room} />
        <input ref={field} className="invite-link" aria-label="Room link" readOnly value={url} onFocus={(e) => e.target.select()} />
        <div className="invite-actions">
          <button type="button" className="pill pill--primary" onClick={() => void copy()}><Copy size={18} /> Copy link</button>
          {typeof navigator.share === 'function' && <button type="button" className="pill" onClick={() => {
            void navigator.share({ title: 'Join my VYBE', url }).catch((error: unknown) => {
              if (!(error instanceof DOMException && error.name === 'AbortError')) void copy();
            });
          }}><Share2 size={18} /> Share</button>}
        </div>
        <p role="status">{feedback}</p>
      </div> : <p>Connecting to your room…</p>}
      <button type="button" className="pill sheet-done" onClick={() => close()}>Done</button>
    </>}
  </Sheet>;
}
