"use client";
import { motion } from 'framer-motion';
import { CheckCircle, X, Star, DollarSign, TrendingDown, Calculator } from 'lucide-react';
import { Compare } from '@/components/ui/compare';

const CostSavingsSection = () => {
  return (
    <section className="relative py-20 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Calculator className="w-4 h-4" />
            Cost Comparison
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Save <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">67%</span> on Business Software
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get all your business tools in one unified platform for a fraction of the cost of multiple subscriptions
          </p>
        </motion.div>

        {/* Main Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Pricing Comparison */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {/* Zopkit Pricing Card */}
            <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white p-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300">
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold">
                Best Value
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Zopkit</h3>
                  <p className="text-blue-100">All-in-One Platform</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-5xl font-bold mb-2">$99</div>
                <div className="text-blue-100 text-lg">per month</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>CRM + HRMS + Project Management</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>Operations + Finance Management</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>Unlimited Users & Features</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-300" />
                  <span>24/7 Premium Support</span>
                </div>
              </div>
            </div>

            {/* Competitors Pricing Card */}
            <div className="bg-gradient-to-br from-gray-600 to-gray-800 text-white p-8 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <X className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Competitors</h3>
                  <p className="text-gray-300">Multiple Separate Tools</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-5xl font-bold mb-2">$297</div>
                <div className="text-gray-300 text-lg">per month</div>
              </div>

              <div className="space-y-3 text-gray-300">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <span>Basic CRM (limited features)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <span>Separate HRMS subscription</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <span>Project management tool</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <span>Operations software</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Interactive Comparison */}
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Compare
              firstImage="/zopkit-logo-comparison.svg"
              secondImage="/competitor-logos-comparison.svg"
              firstImageClassName="object-contain object-center p-8"
              secondImageClassname="object-contain object-center p-8"
              className="h-[300px] w-[300px] rounded-2xl shadow-xl mb-6 bg-white"
              slideMode="hover"
              showHandlebar={true}
            />

            <div className="text-center">
              <p className="text-gray-600 mb-4 text-lg">
                <strong>Slide to compare:</strong> Zopkit unified platform vs multiple competitor subscriptions
              </p>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-green-600 rounded"></div>
                  <span>Zopkit ($99/month)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-gray-500 to-gray-700 rounded"></div>
                  <span>Competitors ($297/month)</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Savings Breakdown */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
        >
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-lg">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-green-900 mb-3">Monthly Savings</h4>
            <p className="text-3xl font-bold text-green-600 mb-2">$198</p>
            <p className="text-green-700">Per month with Zopkit</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-lg">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-blue-900 mb-3">Annual Savings</h4>
            <p className="text-3xl font-bold text-blue-600 mb-2">$2,376</p>
            <p className="text-blue-700">Per year, per user</p>
          </div>

          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 shadow-lg">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-bold text-purple-900 mb-3">ROI Timeline</h4>
            <p className="text-3xl font-bold text-purple-600 mb-2">3 Months</p>
            <p className="text-purple-700">To break even on setup</p>
          </div>
        </motion.div>

        {/* Feature Comparison Table */}
        <motion.div
          className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 text-center">Feature Comparison</h3>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">Feature</th>
                    <th className="text-center py-4 px-4 font-semibold text-blue-600">Zopkit</th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-600">Competitors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { feature: 'CRM Integration', zopkit: true, competitors: true },
                    { feature: 'HRMS Module', zopkit: true, competitors: true },
                    { feature: 'Project Management', zopkit: true, competitors: true },
                    { feature: 'Operations Management', zopkit: true, competitors: true },
                    { feature: 'Finance Management', zopkit: true, competitors: true },
                    { feature: 'Unified Dashboard', zopkit: true, competitors: false },
                    { feature: 'Real-time Sync', zopkit: true, competitors: false },
                    { feature: 'Mobile App', zopkit: true, competitors: false },
                    { feature: 'AI Assistant', zopkit: true, competitors: false },
                    { feature: '24/7 Support', zopkit: true, competitors: false }
                  ].map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-4 px-4 font-medium text-gray-900">{item.feature}</td>
                      <td className="py-4 px-4 text-center">
                        <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        {item.competitors ? (
                          <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-6 h-6 text-red-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-8 rounded-2xl shadow-2xl">
            <h3 className="text-3xl font-bold mb-4">Ready to Start Saving?</h3>
            <p className="text-xl mb-6 opacity-90">
              Join thousands of businesses who have switched to Zopkit and dramatically reduced their software costs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
                Start Free Trial
              </button>
              <button className="bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-lg">
                Schedule Demo
              </button>
            </div>
            <p className="text-sm mt-4 opacity-75">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};



export default CostSavingsSection;
