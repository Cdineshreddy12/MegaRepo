import React from 'react';
import ZopkitLoader from '@/components/ui/ZopkitLoader';

export function LoaderDefault() {
  return <ZopkitLoader size="sm" />;
}

export function LoaderSmall() {
  return <ZopkitLoader size="sm" />;
}

export function LoaderMedium() {
  return <ZopkitLoader size="md" />;
}

export function LoaderLarge() {
  return <ZopkitLoader size="lg" />;
}

export function LoaderWithMessage({ message }: { message: string }) {
  return <ZopkitLoader message={message} size="md" />;
}

export function LoaderWithProgress({ message }: { message: string }) {
  return <ZopkitLoader message={message} showProgress={true} size="md" />;
}

export const Loader = () => {
  return <ZopkitLoader size="sm" />;
};

export default Loader;
