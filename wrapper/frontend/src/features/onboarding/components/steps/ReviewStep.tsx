import React, { useEffect, useState } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { motion, Variants } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Building2,
  User,
  FileText,
  CheckCircle,
  Edit2,
  Globe,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  ShieldCheck,
  Rocket,
  Zap,
  Coins
} from 'lucide-react';
import { newBusinessData, existingBusinessData, COUNTRIES, ORGANIZATION_SIZES, COMPANY_TYPES } from '../../schemas';
import { UserClassification } from '../FlowSelector';
import confetti from 'canvas-confetti';

interface ReviewStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  onEditStep?: (stepNumber: number) => void;
  userClassification?: UserClassification;
}

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: React.ComponentType<any> }) => (
  <div className="flex items-start gap-3 group/row p-2 rounded-lg hover:bg-pink-50/50 transition-colors">
    {Icon && <div className="p-1.5 bg-pink-50 text-pink-500 rounded-md group-hover/row:bg-pink-100 group-hover/row:text-pink-600 transition-colors"><Icon className="w-3.5 h-3.5" /></div>}
    <div className="flex-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-slate-800 break-words">{value}</div>
    </div>
  </div>
);

interface SectionCardProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  stepNumber?: number;
  index: number;
  onEditStep?: (stepNumber: number) => void;
}

const SectionCard = ({ title, icon: Icon, children, stepNumber, index, onEditStep }: SectionCardProps) => (
  <motion.div
    custom={index}
    initial="hidden"
    animate="visible"
    variants={fadeIn}
    className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden hover:shadow-[0_8px_30px_rgb(236,72,153,0.1)] hover:-translate-y-1 transition-all duration-300 group"
  >
    <div className="px-6 py-4 border-b border-pink-50/50 flex items-center justify-between bg-white/50">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-500 group-hover:bg-pink-100 group-hover:text-pink-600 transition-colors duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
      </div>
      {stepNumber && onEditStep && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditStep(stepNumber)}
          className="text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
        >
          <Edit2 className="w-4 h-4 mr-2" />
          <span className="text-xs font-semibold">Edit</span>
        </Button>
      )}
    </div>
    <div className="p-6">
      {children}
    </div>
  </motion.div>
);

// Floating particle component removed since unused
// const FloatingParticle = ...

export const ReviewStep: React.FC<ReviewStepProps> = ({ form, onEditStep, userClassification }) => {
  // FIXED: Use useWatch to reactively get form values so data updates when restored
  const values = useWatch({ control: form.control }) || form.getValues();
  const [hasBlastedConfetti, setHasBlastedConfetti] = useState(false);

  // Fire confetti 3 times with different colors when entering the last step
  useEffect(() => {
    const fireConfetti = (colors: string[], delay: number) => {
      setTimeout(() => {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 9999,
          colors: colors
        };

        function fire(particleRatio: number, opts: any) {
          confetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * particleRatio)
          }));
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      }, delay);
    };

    // Blast 1: Pink/Purple theme
    fireConfetti(['#ec4899', '#d946ef', '#a855f7', '#fb7185'], 500);
    
    // Blast 2: Yellow/Gold theme
    fireConfetti(['#FFD700', '#FFA500', '#FFC107', '#FFEB3B'], 1500);
    
    // Blast 3: Blue/Cyan theme
    fireConfetti(['#3b82f6', '#06b6d4', '#8b5cf6', '#6366f1'], 2500);
  }, []);

  // Fire confetti when terms are accepted (only once - single blast)
  useEffect(() => {
    if (values.termsAccepted && !hasBlastedConfetti) {
      const fireConfetti = () => {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 9999,
          colors: ['#ec4899', '#d946ef', '#a855f7', '#fb7185'] // Pink/Purple theme colors
        };

        function fire(particleRatio: number, opts: any) {
          confetti(Object.assign({}, defaults, opts, {
            particleCount: Math.floor(count * particleRatio)
          }));
        }

        // Single blast for terms acceptance
        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      };

      fireConfetti();
      setHasBlastedConfetti(true);
    }
  }, [values.termsAccepted, hasBlastedConfetti]);

  const triggerKeyAnimation = () => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.4 },
      colors: ['#FFD700', '#FFA500', '#ec4899', '#d946ef']
    });
  };

  // Helper functions
  const getCountryName = (code?: string) => COUNTRIES.find(c => c.id === code)?.name || code || 'N/A';
  const getSizeName = (id?: string) => ORGANIZATION_SIZES.find(s => s.id === id)?.name || id || 'N/A';
  const getCompanyTypeName = (id?: string) => COMPANY_TYPES.find(t => t.id === id)?.name || id || 'N/A';

  const getPersonalizedContent = () => {
    switch (userClassification) {
      case 'aspiringFounder':
        return {
          title: 'Startup Profile',
          subtitle: 'Founder Edition',
          description: 'Your startup journey begins here.',
          icon: Rocket
        };
      case 'corporateEmployee':
        return {
          title: 'Corporate Account',
          subtitle: 'Professional',
          description: 'Enterprise setup verified.',
          icon: Building2
        };
      case 'withGST':
        return {
          title: 'GST Business',
          subtitle: 'Tax Compliant',
          description: 'Ready for invoicing & tax.',
          icon: ShieldCheck
        };
      default:
        return {
          title: 'Standard Account',
          subtitle: 'Ready to Launch',
          description: 'Setup complete.',
          icon: Zap
        };
    }
  };

  const content = getPersonalizedContent();

  return (
    <div className="min-h-screen pb-20 relative">
      
      {/* Immersive Header - Clean & Focused */}
      <div className="relative pb-24 pt-8 overflow-hidden mx-auto max-w-lg mb-8">
         {/* Celebration Card - 3D Pop Style */}
         <div className="relative perspective-1000">
            <motion.div 
               initial={{ scale: 0.5, opacity: 0, rotateX: 20 }}
               animate={{ scale: 1, opacity: 1, rotateX: 0 }}
               transition={{ type: "spring", stiffness: 260, damping: 20 }}
               className="bg-[#fffcf5] rounded-[2.5rem] pt-12 pb-10 px-8 text-center shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15),0_10px_20px_-5px_rgba(0,0,0,0.1)] border-b-8 border-r-4 border-pink-100 relative z-10"
            >
               {/* Ribbon Header */}
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[120%] flex justify-center items-center z-20 filter drop-shadow-xl">
                  {/* Left Fold */}
                  <div className="h-10 w-8 bg-[#be185d] transform skew-y-12 translate-y-6 translate-x-2 rounded-l-sm" />
                  
                  {/* Main Ribbon */}
                  <div className="bg-[#db2777] text-white text-2xl font-black py-4 px-12 rounded-lg relative flex items-center justify-center transform hover:scale-105 transition-transform duration-300 cursor-default shadow-lg">
                     <span className="drop-shadow-md">Welcome to Zopkit!</span>
                     {/* Stitching effect */}
                     <div className="absolute top-1 left-2 right-2 bottom-1 border-2 border-dashed border-white/30 rounded-md"></div>
                  </div>
                  
                  {/* Right Fold */}
                  <div className="h-10 w-8 bg-[#be185d] transform -skew-y-12 translate-y-6 -translate-x-2 rounded-r-sm" />
               </div>

               {/* Content */}
               <div className="mt-6 mb-2">
                  <p className="text-orange-400 font-bold text-lg uppercase tracking-wider mb-4 animate-pulse">You've Unlocked 500 Free Credits</p>
                  
                  {/* Icon Container */}
                  <div className="relative w-32 h-32 mx-auto mb-6 cursor-pointer group" onClick={triggerKeyAnimation}>
                     {/* Glow effect */}
                     <div className="absolute inset-0 bg-yellow-100 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
                     <div className="absolute inset-2 bg-gradient-to-tr from-white to-yellow-50 rounded-full shadow-inner border-4 border-white flex items-center justify-center relative overflow-hidden">
                        {/* Shimmer on icon background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full animate-shimmer"></div>
                        <Coins className="w-14 h-14 text-yellow-400 fill-yellow-400 drop-shadow-sm transform group-hover:rotate-12 transition-transform duration-300" />
                     </div>
                     
                     {/* Notification Badge */}
                     <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="absolute bottom-0 right-0 bg-yellow-400 text-white font-black text-lg w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg"
                     >
                        $
                     </motion.div>
                  </div>

                  <h2 className="text-xl font-bold text-slate-800 mb-2 leading-tight">The All-in-One Platform</h2>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto mb-4">
                     Manage your team, finances, and growth in one unified workspace designed for modern businesses.
                  </p>
                  
                  <Badge variant="secondary" className="bg-pink-50 text-pink-600 hover:bg-pink-100 border-pink-100 px-3 py-1 text-xs">
                     {content.subtitle}
                  </Badge>
               </div>
            </motion.div>
            
            {/* Card Reflection/Shadow on background */}
            <div className="absolute -bottom-4 left-4 right-4 h-8 bg-black/10 blur-xl rounded-full"></div>
         </div>
      </div>

      {/* Main Grid Content */}
      <div className="relative z-20 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Step 1: Business Details */}
          <SectionCard 
            title="Business Details" 
            icon={Building2} 
            stepNumber={1} 
            index={1} 
            onEditStep={onEditStep}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                <DetailRow label="Company Name" value={values.businessDetails?.companyName || values.businessName} icon={Briefcase} />
                <DetailRow label="Company Type" value={getCompanyTypeName(values.companyType)} icon={FileText} />
                <DetailRow label="Organization Size" value={getSizeName(values.businessDetails?.organizationSize || values.organizationSize)} icon={User} />
                <DetailRow label="Country" value={getCountryName(values.businessDetails?.country || values.country)} icon={Globe} />
                <div className="sm:col-span-2">
                   <DetailRow label="Industry" value={values.industry || 'Not specified'} icon={Rocket} />
                </div>
              </div>
              
              {values.businessDetails?.description && (
                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Business Description</p>
                  <p className="text-sm text-slate-600 italic leading-relaxed">"{values.businessDetails.description}"</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Step 2: Tax & Compliance */}
          <SectionCard 
            title="Tax & Location" 
            icon={ShieldCheck} 
            stepNumber={2} 
            index={2}
            onEditStep={onEditStep}
          >
             <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                 <DetailRow 
                  label="Tax Status" 
                  value={
                    <span className={`inline-flex items-center gap-1.5 ${values.taxRegistered ? 'text-emerald-600' : 'text-slate-500'}`}>
                       {values.taxRegistered ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                       {values.taxRegistered ? 'Registered' : 'Not Registered'}
                    </span>
                  } 
                  icon={FileText} 
                />
                {values.vatGstRegistered && values.gstin && <DetailRow label="GSTIN" value={values.gstin} icon={CreditCard} />}
                {values.taxRegistered && values.panNumber && <DetailRow label="PAN Number" value={values.panNumber} icon={CreditCard} />}
                {values.vatGstRegistered && !values.gstin && (
                  <DetailRow label="GST Status" value="GST Registered (GSTIN pending)" icon={ShieldCheck} />
                )}
                
                <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-pink-500" />
                    <span className="text-sm font-semibold text-slate-900">Billing Address</span>
                  </div>
                  <p className="text-sm text-slate-600 pl-6 leading-relaxed">
                    {values.billingStreet || values.billingAddress || 'N/A'}
                    <br />
                    {[values.billingCity, values.billingState || values.state, values.billingZip].filter(Boolean).join(', ')}
                    <br />
                    {getCountryName(values.billingCountry || values.businessDetails?.country || values.country)}
                  </p>
                </div>
              </div>
             </div>
          </SectionCard>

          {/* Step 3: Administrator */}
          <SectionCard 
            title="Administrator" 
            icon={User} 
            stepNumber={3} 
            index={3}
            onEditStep={onEditStep}
          >
             <div className="space-y-6">
               <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-50 to-white rounded-2xl border border-pink-50 mb-6">
                  <div className="w-14 h-14 rounded-full bg-white border-4 border-pink-50 flex items-center justify-center text-pink-600 text-xl font-bold shadow-sm">
                    {(values.firstName?.[0] || 'A')}{(values.lastName?.[0] || '')}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">{values.firstName} {values.lastName}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                       <Briefcase className="w-3.5 h-3.5" />
                       {values.contactJobTitle || 'Administrator'}
                    </div>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-4">
                  <DetailRow label="Email" value={values.adminEmail} icon={Mail} />
                  <DetailRow label="Mobile" value={values.adminMobile || values.phone} icon={Phone} />
                  {values.website && <div className="sm:col-span-2"><DetailRow label="Website" value={values.website} icon={Globe} /></div>}
               </div>
             </div>
          </SectionCard>

          {/* Localization (Auto) */}
          <SectionCard 
            title="Settings" 
            icon={Globe} 
            index={4} 
            stepNumber={0}
            onEditStep={onEditStep}
          >
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center hover:bg-slate-100 transition-colors">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Currency</span>
                  <span className="font-bold text-slate-700">{values.defaultCurrency || 'USD'}</span>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center hover:bg-slate-100 transition-colors">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Language</span>
                  <span className="font-bold text-slate-700">{values.defaultLanguage || 'English'}</span>
               </div>
               <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center hover:bg-slate-100 transition-colors">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Timezone</span>
                  <span className="font-bold text-slate-700">{values.defaultTimeZone || 'UTC'}</span>
               </div>
            </div>
          </SectionCard>

        </div>

        {/* Footer / Terms */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12 mb-10"
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-pink-100/50 p-8 border border-white max-w-3xl mx-auto">
            <FormField
              control={form.control}
              name={"termsAccepted" as any}
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                      className="mt-1 w-6 h-6 border-2 border-pink-200 data-[state=checked]:bg-pink-600 data-[state=checked]:border-pink-600 rounded-lg transition-all duration-200"
                    />
                  </FormControl>
                  <div className="space-y-2 leading-none flex-1">
                    <FormLabel className="text-base font-bold text-slate-900 cursor-pointer hover:text-pink-700 transition-colors">
                      I accept the Terms and Conditions
                    </FormLabel>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      By checking this box, you confirm that all provided information is accurate and you agree to our <a href="#" className="text-pink-600 font-semibold hover:underline decoration-2 underline-offset-2 transition-all">Terms of Service</a> and <a href="#" className="text-pink-600 font-semibold hover:underline decoration-2 underline-offset-2 transition-all">Privacy Policy</a>.
                    </p>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Secure 256-bit SSL Encrypted
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};