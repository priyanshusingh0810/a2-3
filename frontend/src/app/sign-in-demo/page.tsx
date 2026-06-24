import type { Metadata } from 'next';
import { Component } from "@/components/ui/sign-in-card-2";

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Interactive glassmorphism sign-in card component with 3D hover effects.',
};

const DemoOne = () => {
  return (
    <div className="flex w-full h-screen justify-center items-center">
      <Component />
    </div>
  );
};

export default DemoOne;
