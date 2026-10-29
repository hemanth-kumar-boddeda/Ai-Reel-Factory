import { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';

/**
 * A video element that can be played behind the API's authentication.
 *
 * The `/video/{id}` route needs a bearer token, and a `<video>` tag cannot
 * send one - the browser blocked the request and the player showed nothing.
 * The file is therefore fetched with the token and handed to the element as
 * an object URL.
 *
 * The fetch only happens when the visitor asks for it, so a grid of a hundred
 * Reels does not download a hundred videos.
 */
export default function AuthenticatedVideo({
  reelId,
  className = '',
  showCover = true,
  autoPlay = false,
  controls = false,
  onActivate,
  onDeactivate,
  ...rest
}) {
  const [src, setSrc] = useState(null);
  const [cover, setCover] = useState(null);
  const [failed, setFailed] = useState(false);
  const objectUrl = useRef(null);
  const coverUrl = useRef(null);
  const videoRef = useRef(null);

  const release = () => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
  };

  // The cover is a small image, so it is fetched straight away: a grid of
  // Reels should look like a library, not like a list of empty boxes.
  useEffect(() => {
    if (!showCover) return undefined;
    let cancelled = false;
    api
      .get(`/cover/${reelId}`, { responseType: 'blob' })
      .then((response) => {
        if (cancelled || !response.data) return;
        const url = URL.createObjectURL(response.data);
        coverUrl.current = url;
        setCover(url);
      })
      .catch(() => {
        /* A Reel without a cover is fine - the box stays empty. */
      });
    return () => {
      cancelled = true;
      if (coverUrl.current) {
        URL.revokeObjectURL(coverUrl.current);
        coverUrl.current = null;
      }
    };
  }, [reelId, showCover]);

  const load = async () => {
    if (src || failed) return;
    try {
      const response = await api.get(`/video/${reelId}`, { responseType: 'blob' });
      if (!response.data) {
        setFailed(true);
        return;
      }
      const url = URL.createObjectURL(response.data);
      objectUrl.current = url;
      setSrc(url);
    } catch {
      setFailed(true);
    }
  };

  useEffect(() => () => release(), []);

  useEffect(() => {
    if (src && videoRef.current) {
      if (autoPlay) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [src, autoPlay]);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src || undefined}
      poster={cover || undefined}
      controls={controls}
      autoPlay={autoPlay}
      muted
      loop
      playsInline
      preload="none"
      onMouseEnter={() => {
        load();
        if (onActivate) onActivate();
      }}
      onMouseLeave={() => {
        if (videoRef.current) videoRef.current.pause();
        if (onDeactivate) onDeactivate();
      }}
      onClick={load}
      {...rest}
    />
  );
}
