import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StackedCardsSection, DemoSection, TrustIndicators } from '@/components/landing'
import EcosystemDemo from './EcosystemDemo'
import { VisualHub } from '@/components/landing/VisualHub'
import { DynamicIcon } from '@/components/landing/Icons'
import { ArrowRight, Play } from 'lucide-react'
import api from '@/lib/api'
import { Product } from '@/types'

import { WorkflowVisualizer } from '@/components/landing/WorkflowVisualizer'
import { products } from '@/data/content'

// Import the new resizable navbar components
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar"
import { LandingFooter } from "@/components/layout/LandingFooter"


// Removed local products definition



const Landing: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useKindeAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [activeProduct, setActiveProduct] = useState<Product>(products[0])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Refs for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const productRefs = useRef<Map<string | number, HTMLButtonElement>>(new Map())

  // Check authentication status quietly in background
  useEffect(() => {
    const checkAuthenticatedUser = async () => {
      if (isAuthenticated) {
        try {
          // Quietly check if user is already fully onboarded
          const response = await api.get('/api/admin/auth-status')
          const status = response.data

          if (status.hasUser && status.hasTenant) {
            // User is fully onboarded - redirect to dashboard silently
            console.log('✅ Authenticated user already onboarded, redirecting to dashboard')
            navigate('/dashboard', { replace: true })
          }
        } catch (error) {
          console.log('ℹ️ Could not check auth status, letting user choose path')
        }
      }
    }

    const timer = setTimeout(checkAuthenticatedUser, 100)
    return () => clearTimeout(timer)
  }, [isAuthenticated, navigate])

  // Auto-rotate products every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveProduct((prev) => {
        const currentIndex = products.findIndex((p) => p.id === prev.id);
        const nextIndex = (currentIndex + 1) % products.length;
        return products[nextIndex];
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to active product
  useEffect(() => {
    const activeButton = productRefs.current.get(activeProduct.id);
    const scrollContainer = scrollContainerRef.current;

    if (activeButton && scrollContainer) {
      // Calculate the position to scroll to center the active button
      const containerWidth = scrollContainer.offsetWidth;
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;

      // Center the button in the container
      const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);

      scrollContainer.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [activeProduct]);

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      await login()
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const navItems = [
    { name: "Products", link: "/products/affiliate-connect" },
    { name: "Solutions", link: "#solutions" },
    { name: "Workflows", link: "#workflows" },
    { name: "Pricing", link: "#pricing" },
    { name: "Resources", link: "#resources" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans overflow-x-hidden relative">

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-100" />

        {/* Dynamic Spotlight - Shifted Left to match content */}
        <motion.div
          animate={{
            background: `radial-gradient(circle at 60% 40%, ${activeProduct.color === 'blue' ? '#3b82f6' :
              activeProduct.color === 'green' ? '#10b981' :
                activeProduct.color === 'purple' ? '#a855f7' :
                  activeProduct.color === 'orange' ? '#f97316' :
                    activeProduct.color === 'indigo' ? '#6366f1' : '#14b8a6'
              }15 0%, transparent 60%)`
          }}
          className="absolute top-[-20%] right-[-10%] w-[100vw] h-[100vh] blur-[120px] transition-colors duration-1000 ease-in-out"
        />
      </div>

      {/* Resizable Navbar */}
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-3">
            <NavbarButton
              variant="outline"
              onClick={handleLogin}
              disabled={isLoading}
              as="button"
              className="rounded-xl px-6 py-2.5"
            >
              {isLoading ? 'Loading...' : 'Sign In'}
            </NavbarButton>
            <NavbarButton
              variant="gradient"
              onClick={() => setShowDemo(true)}
              as="button"
              className="rounded-xl px-6 py-2.5"
            >
              Start Free Trial
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-600 dark:text-neutral-300"
              >
                <span className="block">{item.name}</span>
              </a>
            ))}
            <div className="flex w-full flex-col gap-3">
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogin();
                }}
                variant="outline"
                className="w-full rounded-xl"
                as="button"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Sign In'}
              </NavbarButton>
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowDemo(true);
                }}
                variant="gradient"
                className="w-full rounded-xl"
                as="button"
              >
                Start Free Trial
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* Main Content */}
      <main className="relative pt-24 lg:pt-36 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 overflow-visible">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-0 items-center">

          {/* Left Column: Content (Compressed to 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8 lg:pr-6 relative z-20">

            <div className="space-y-6 relative">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 w-fit shadow-sm"
              >
                <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${activeProduct.gradient} animate-pulse`}></span>
                <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Complete Business Operations Suite</span>
              </motion.div>

              <div className="relative h-[160px] lg:h-[200px] w-full z-20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeProduct.id}
                    initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute top-0 left-0 w-full"
                  >
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-5 text-slate-900">
                      <span className={`bg-clip-text text-transparent bg-gradient-to-r ${activeProduct.gradient}`}>
                        {activeProduct.name}
                      </span>
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed max-w-md font-normal border-l-2 border-slate-200 pl-4">
                      {activeProduct.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center mt-24 gap-4 z-20">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogin}
                disabled={isLoading}
                className={`
                    w-full sm:w-auto relative px-8 py-4 rounded-xl font-bold text-white transition-all duration-300
                    bg-gradient-to-r ${activeProduct.gradient} shadow-lg shadow-blue-500/20
                    overflow-hidden group
                  `}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? 'Loading...' : 'Start Free Trial →'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all group shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 group-hover:text-slate-900 transition-colors">
                  <Play className="w-3 h-3 fill-current ml-0.5 text-slate-700" />
                </div>
                <span>Watch 2-Min Demo</span>
              </motion.button>
            </div>

            {/* Product "Launchpad" Selector */}
            <div className="mt-6 pt-8 border-t border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Application</p>
                <span className="text-xs text-slate-400">0{activeProduct.id} / {products.length}</span>
              </div>

              <style>{`
                .gradient-scrollbar::-webkit-scrollbar {
                  height: 6px;
                }
                .gradient-scrollbar::-webkit-scrollbar-track {
                  background: rgba(241, 245, 249, 0.5);
                  border-radius: 4px;
                }
                .gradient-scrollbar::-webkit-scrollbar-thumb {
                  background: linear-gradient(to right, #8bade2ff, #bba0f8ff, #e9a1c5ff);
                  border-radius: 4px;
                }
                .gradient-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: linear-gradient(to right, #9fbdffff, #bc98faff, rgba(236, 160, 194, 1));
                }
              `}</style>

              <div ref={scrollContainerRef} className="flex flex-row gap-3 overflow-x-auto gradient-scrollbar pb-4">
                {products.map((product) => (
                  <button
                    key={product.id}
                    ref={(el) => {
                      if (el) productRefs.current.set(product.id, el);
                    }}
                    onClick={() => setActiveProduct(product)}
                    onDoubleClick={() => navigate(`/products/${product.id}`)}
                    className={`
                        relative group flex flex-col items-start justify-between p-3 rounded-xl border transition-all duration-300 h-28 w-32 min-w-[128px] overflow-hidden text-left shrink-0
                        ${activeProduct.id === product.id
                        ? 'bg-white border-slate-300 ring-2 ring-slate-200 shadow-lg'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'}
                      `}
                    title="Double-click to view details"
                  >
                    {/* Hover Glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                    <div className="flex justify-between w-full items-start">
                      <div className={`
                           p-1.5 rounded-lg transition-colors duration-300
                           ${activeProduct.id === product.id ? `bg-gradient-to-br ${product.gradient} text-white` : 'bg-slate-100 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200'}
                         `}>
                        <DynamicIcon name={product.iconName} className="w-4 h-4" />
                      </div>

                      {activeProduct.id === product.id && (
                        <motion.div layoutId="active-indicator" className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1 mt-auto w-full">
                      <span className={`text-[11px] font-semibold tracking-wide ${activeProduct.id === product.id ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900'}`}>
                        {product.name}
                      </span>
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Double-click for details →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Hub (Expanded to 7 cols and shifted left) */}
          <div className="lg:col-span-7 relative z-10 flex justify-center lg:justify-start items-center h-full min-h-[500px]">
            {/* The w-[90%] constrains the width, and lg:-ml-6 pulls the center point to the left */}
            <div className="w-full lg:w-[100%] flex justify-center lg:-ml-6">
              <VisualHub product={activeProduct} />
            </div>
          </div>
        </div>
      </main>

      {/* Additional sections from original landing page */}
      <StackedCardsSection
        businessApps={products.map(p => ({
          ...p,
          icon: (props: any) => <DynamicIcon name={p.iconName} {...props} />
        }))}
        activeProduct={activeProduct}
        onProductChange={setActiveProduct}
      />
      <div className="py-10 bg-white">
        <WorkflowVisualizer />
      </div>
      <EcosystemDemo />
      <DemoSection
        showDemo={showDemo}
        setShowDemo={setShowDemo}
      />
      <TrustIndicators />

      {/* Demo Modal - Outside Aurora Background */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">📅</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Schedule a Demo</h3>
                      <p className="text-sm text-gray-600">See Zopkit in action with a personalized demo</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowDemo(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="text-gray-500">✕</span>
                  </motion.button>
                </div>
              </div>

              <div className="p-6">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="John Smith"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Acme Corporation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="CEO, CTO, Manager..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Size
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white">
                        <option value="">Select company size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-1000">201-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Demo Time
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white">
                      <option value="">Select preferred time</option>
                      <option value="morning">Morning (9 AM - 12 PM)</option>
                      <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                      <option value="evening">Evening (5 PM - 8 PM)</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Comments
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Tell us about your specific needs or questions..."
                    />
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowDemo(false)}
                      className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Schedule Demo
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    By submitting this form, you agree to receive communication about Zopkit's services.
                    We respect your privacy and will never share your information.
                  </p>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <LandingFooter />
    </div>
  )
}

export default Landing

