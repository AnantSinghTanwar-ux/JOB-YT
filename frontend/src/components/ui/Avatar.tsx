import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-lg' };

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

export const Avatar = ({ src, name, size = 'md', className }: AvatarProps) => {
  const sizeClass = sizes[size];
  const [showImage, setShowImage] = useState(Boolean(src));

  useEffect(() => {
    setShowImage(Boolean(src));
  }, [src]);

  if (src && showImage) {
    return (
      <div className={cn('relative overflow-hidden rounded-full bg-gray-200', sizeClass, className)}>
        <img
          src={src}
          alt={name || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setShowImage(false)}
        />
      </div>
    );
  }
  return (
    <div className={cn('flex items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700', sizeClass, className)}>
      {name ? getInitials(name) : '?'}
    </div>
  );
};
