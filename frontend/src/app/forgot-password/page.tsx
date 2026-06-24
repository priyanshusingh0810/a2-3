import type { Metadata } from 'next';
import { ForgotPasswordCard } from "@/components/ui/forgot-password-card";

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Interactive glassmorphism forgot-password card component with 3D hover effects.',
};

const ForgotPasswordDemo = () => {
  return (
    <div className="flex w-full h-screen justify-center items-center">
      <ForgotPasswordCard />
    </div>
  );
};

export default ForgotPasswordDemo;
