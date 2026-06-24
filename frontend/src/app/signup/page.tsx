import type { Metadata } from 'next';
import { SignUpCard } from "@/components/ui/sign-up-card";

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Interactive glassmorphism sign-up card component with 3D hover effects.',
};

const SignUpDemo = () => {
  return (
    <div className="flex w-full h-screen justify-center items-center">
      <SignUpCard />
    </div>
  );
};

export default SignUpDemo;
