"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import GoogleGeminiEffectDemo from "@/components/common/google-gemini-effect-demo";
import { CostComparison } from '@/components/ui';
const EcosystemDemo = () => {
  const ref = React.useRef(null);


  return (
    <div ref={ref} className="min-h-[150vh] bg-white">

      {/* Google Gemini Effect Section */}
      <GoogleGeminiEffectDemo />

      <CostComparison />


      {/* Call to Action */}
      <div className="h-96 flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Ready to Experience <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-700">True Integration</span>?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Join thousands of businesses who have transformed their operations with Zopkit's integrated ecosystem.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-700 hover:to-pink-800 text-white px-8 py-4 text-lg"
          >
            Start Free Trial
          </Button>

        </div>
      </div>
    </div>
  );
};

export default EcosystemDemo;

