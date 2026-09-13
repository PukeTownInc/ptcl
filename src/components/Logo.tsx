import { useState } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  rounded?: boolean;
  large?: boolean;
}

export function Logo({ size = 36, className = '', rounded = true, large = false }: LogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{
          width: large ? 160 : size,
          height: large ? 80 : size,
          margin: large ? '0 auto 10px' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: large ? 40 : size * 0.6,
        }}
      >
        🤮
      </div>
    );
  }

  if (large) {
    return (
      <video
        src="/PTCLlogo.mp4"
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        preload="auto"
        onError={() => setFailed(true)}
        style={{
          width: 160,
          maxWidth: '80%',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto 10px auto',
          position: 'relative',
          zIndex: 999,
          opacity: 1,
          visibility: 'visible',
          pointerEvents: 'none',
        }}
      />
    );
  }

  return (
    <video
      src="/PTCLlogo.mp4"
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      preload="auto"
      onError={() => setFailed(true)}
      width={size}
      height={size}
      className={`object-cover ${rounded ? 'rounded-lg' : ''} ${className}`}
    />
  );
}
