import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, LogIn } from 'lucide-react'
import { MacbookScroll } from '@/components/ui/macbook-scroll'
import { TypewriterEffectSmooth } from '@/components/ui/typewriter-effect'
import { Button as MovingBorderButton } from '@/components/ui/moving-border'
import { TextGenerateEffect } from '@/components/common/TextGenerateEffect'

interface HeroSectionProps {
  isAuthenticated: boolean | null
  isLoading: boolean
  onLogin: () => void
}

const HeroSection: React.FC<HeroSectionProps> = ({ isAuthenticated, isLoading, onLogin }) => {
  return (
    <section className="relative overflow-hidden min-h-screen pb-[80%] z-20">
      {/* MacbookScroll Hero Background */}
      <div className="absolute inset-0 z-30">
        <MacbookScroll
          title={
            <div className="text-center space-y-6">
              <div className="flex flex-col items-center justify-center">
                <TypewriterEffectSmooth
                  words={[
                    {
                      text: "The",
                    },
                    {
                      text: "Complete",
                      className: "text-blue-400 dark:text-blue-400",
                    },
                    {
                      text: "Business",
                      className: "text-purple-400 dark:text-purple-400",
                    },
                    {
                      text: "SaaS",
                      className: "text-indigo-400 dark:text-indigo-400",
                    },
                    {
                      text: "Suite",
                      className: "text-cyan-400 dark:text-cyan-400",
                    },
                  ]}
                  className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl"
                  cursorClassName="bg-gradient-to-r from-blue-600 to-purple-600"
                />
              </div>
   {/* text effect */}
                <TextGenerateEffect words="Enterprise-grade business management platform designed for modern teams.
                Seamlessly integrate CRM, HRMS, project management, and finance operations
                into a unified, scalable solution that grows with your business." />
                
            </div>
          }
          badge={
            <motion.div
              className="flex flex-col items-center  space-y-4 z-20 relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative"
              >
                <div className="absolute pb-96 inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300" />
                <MovingBorderButton
                  onClick={onLogin}
                  borderRadius="1.75rem"
                  containerClassName="relative z-30"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 h-16 px-12 text-xl font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-3 h-6 w-6" />
                      {isAuthenticated ? 'Continue to Dashboard' : 'Get Started Free'}
                      <ArrowRight className="ml-3 h-6 w-6" />
                    </>
                  )}
                </MovingBorderButton>
              </motion.div>

              {!isAuthenticated && (
                <motion.p
                  className="text-sm text-gray-500 z-30 relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  14-day free trial • No credit card required • Setup in 3 minutes
                </motion.p>
              )}
            </motion.div>
          }
          showGradient={true}
        />
      </div>

      {/* Spacer to ensure proper section height */}
      <div className="relative w-full  z-5 h-screen"></div>
    </section>
  )
}

export default HeroSection