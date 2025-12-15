"use client";
import React from 'react';
import { Button } from "@/components/ui/button";
import GoogleGeminiEffectDemo from "@/components/common/google-gemini-effect-demo";
import CostComparison from '../common/cost-comparison';
const EcosystemDemo = () => {
  const ref = React.useRef(null);


  return (
    <div ref={ref} className="min-h-[400vh] bg-white">

      {/* Google Gemini Effect Section */}
      <GoogleGeminiEffectDemo />
      
      <CostComparison />
  
      {/* Integration Benefits Section */}
      <div className="min-h-screen  flex flex-col items-center justify-center px-4">
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-12 text-center">
          Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-800">Integrated</span> Solutions?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl">
          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🔄</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Seamless Data Flow</h3>
            <p className="text-gray-600">
              Information flows effortlessly between all your applications, eliminating data silos and ensuring consistency.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-time Sync</h3>
            <p className="text-gray-600">
              Changes in one application instantly reflect across your entire ecosystem, keeping everyone on the same page.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Unified Analytics</h3>
            <p className="text-gray-600">
              Get comprehensive insights from all your applications in one place, enabling better decision-making.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">👥</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Collaborative Work</h3>
            <p className="text-gray-600">
              Teams can work together more effectively with shared access to information across all applications.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🔒</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Centralized Security</h3>
            <p className="text-gray-600">
              Manage permissions and security policies from a single point, ensuring consistent access control.
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white font-bold">🚀</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Scalable Growth</h3>
            <p className="text-gray-600">
              Add new applications and features seamlessly as your business grows, without disrupting existing workflows.
            </p>
          </div>
        </div>
      </div>

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