import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Zap, Users, Globe, Star, Heart } from 'lucide-react'

const TrustIndicators: React.FC = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-5xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Trusted by Teams Worldwide
          </motion.h2>

          <motion.p
            className="text-lg text-gray-600 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Join thousands of companies that rely on Zopkit for their business operations
          </motion.p>

          <motion.div
            className="bg-white/60 backdrop-blur-sm rounded-3xl p-10 border border-white/50 shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <motion.div
              className="flex flex-wrap items-center justify-center gap-12"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.2
                  }
                }
              }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                { icon: Shield, text: "Enterprise Security", color: "text-green-600" },
                { icon: Zap, text: "99.9% Uptime SLA", color: "text-blue-600" },
                { icon: Users, text: "10,000+ Happy Teams", color: "text-purple-600" },
                { icon: Globe, text: "Global Infrastructure", color: "text-orange-600" },
                { icon: Star, text: "4.9/5 User Rating", color: "text-yellow-600" },
                { icon: Heart, text: "24/7 Support", color: "text-red-600" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center space-x-3"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon className={`h-6 w-6 ${item.color}`} />
                  <span className="font-medium text-gray-700">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {[
              { number: "10,000+", label: "Active Users" },
              { number: "500+", label: "Companies" },
              { number: "99.9%", label: "Uptime" },
              { number: "24/7", label: "Support" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
              >
                <motion.div
                  className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.5,
                  }}
                >
                  {stat.number}
                </motion.div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default TrustIndicators
