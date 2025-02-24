'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const router = useRouter();
  const [showAnimation, setShowAnimation] = useState(true);

  useEffect(() => {
    // Check if token exists
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Redirect to profile after animation
    const timer = setTimeout(() => {
      setShowAnimation(false);
      router.push('/profile');
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [router]);

  if (!showAnimation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white overflow-hidden relative">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff,#f3e8ff,#e9d5ff,#ffffff)] opacity-30" />
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff,#f3e8ff,#e9d5ff,#ffffff)]"
          animate={{
            x: ["0%", "-100%"],
            transition: { repeat: Number.POSITIVE_INFINITY, duration: 20, ease: "linear" },
          }}
        />
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff,#fdf4ff,#fae8ff,#ffffff)]"
          animate={{
            x: ["100%", "0%"],
            transition: { repeat: Number.POSITIVE_INFINITY, duration: 15, ease: "linear" },
          }}
        />
        <div className="absolute inset-0 backdrop-blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-2xl mx-auto px-8 py-12 bg-white bg-opacity-80 rounded-3xl shadow-2xl backdrop-blur-sm border border-white/20"
      >
        <div className="space-y-6">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-500 tracking-tight leading-tight">
              Welcome Back!
            </div>
            <div className="text-xl md:text-2xl text-gray-500 font-light tracking-wide">
              Preparing your personalized experience...
            </div>
          </motion.div>

          {/* Progress bar */}
          <div className="mt-16">
            <div className="h-1.5 w-72 mx-auto bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-purple-400 to-fuchsia-400 rounded-full animate-progress"></div>
            </div>
            <div className="mt-6 text-gray-400 text-base font-medium animate-pulse tracking-wide">
              Loading your profile
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes progress {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-progress {
          animation: progress 2s ease-in-out;
        }
      `}</style>
    </div>
  );
}
