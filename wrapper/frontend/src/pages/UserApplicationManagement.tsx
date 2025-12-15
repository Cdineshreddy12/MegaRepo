/**
 * 🔐 **USER APPLICATION MANAGEMENT PAGE**
 * Main page for comprehensive user-application access management
 */

import React from 'react';
import ComprehensiveUserApplicationManager from '../components/users/ComprehensiveUserApplicationManager';

export default function UserApplicationManagement() {
  console.log('🎯 UserApplicationManagement page rendered!');
  
  return (
    <div className="container mx-auto px-4 py-6">
      <ComprehensiveUserApplicationManager />
    </div>
  );
}
