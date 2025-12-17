import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Linkedin, Github, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="bg-slate-50 pt-20 pb-10 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-2 block w-fit">
              <img
                src="https://res.cloudinary.com/dr9vzaa7u/image/upload/v1765126845/Zopkit_Full_Logo_kezq1b.jpg"
                alt="Zopkit"
                className="h-10 rounded-xl w-auto object-contain"
              />
            </Link>
            <p className="text-slate-600 leading-relaxed">
              The complete business operating system for modern companies. Streamline operations, boost productivity, and scale faster.
            </p>
            <div className="flex space-x-4">
              <SocialLink href="#" icon={<Twitter size={20} />} label="Twitter" />
              <SocialLink href="#" icon={<Linkedin size={20} />} label="LinkedIn" />
              <SocialLink href="#" icon={<Instagram size={20} />} label="Instagram" />
              <SocialLink href="#" icon={<Github size={20} />} label="GitHub" />
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-bold text-slate-900 mb-6 text-lg">Product</h3>
            <ul className="space-y-4">
              <FooterLink to="/products/crm">CRM</FooterLink>
              <FooterLink to="/products/hrms">HRMS</FooterLink>
              <FooterLink to="/products/finance">Finance</FooterLink>
              <FooterLink to="/products/project">Project Management</FooterLink>
              <FooterLink to="/pricing">Pricing</FooterLink>
              <FooterLink to="/roadmap">Product Roadmap</FooterLink>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h3 className="font-bold text-slate-900 mb-6 text-lg">Resources</h3>
            <ul className="space-y-4">
              <FooterLink to="/blog">Blog</FooterLink>
              <FooterLink to="/case-studies">Case Studies</FooterLink>
              <FooterLink to="/docs">Documentation</FooterLink>
              <FooterLink to="/help">Help Center</FooterLink>
              <FooterLink to="/community">Community</FooterLink>
              <FooterLink to="/academy">Zopkit Academy</FooterLink>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="font-bold text-slate-900 mb-6 text-lg">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-600">
                <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <span>123 Business Ave, Suite 100<br />San Francisco, CA 94107</span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <Phone className="w-5 h-5 text-blue-600 shrink-0" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3 text-slate-600">
                <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                <span>hello@zopkit.com</span>
              </li>
            </ul>
            
            <div className="mt-8">
              <h4 className="font-semibold text-slate-900 mb-2">Subscribe to our newsletter</h4>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="bg-white border border-slate-300 text-slate-900 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Go
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} Zopkit Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-slate-500">
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms of Service</Link>
            <Link to="/cookies" className="hover:text-blue-600 transition-colors">Cookie Policy</Link>
            <Link to="/security" className="hover:text-blue-600 transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all duration-300 shadow-sm hover:shadow"
      aria-label={label}
    >
      {icon}
    </a>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link 
        to={to} 
        className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1 group"
      >
        <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-blue-600 transition-colors mr-2"></span>
        {children}
      </Link>
    </li>
  );
}

