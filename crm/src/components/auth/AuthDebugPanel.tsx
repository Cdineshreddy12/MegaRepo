import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { debugAuth } from '@/utils/debug-auth'; // Temporarily disabled

export const AuthDebugPanel: React.FC = () => {
  const handleTestAPI = async () => {
    try {
      // await debugAuth.testAPICall('/api/opportunities'); // Temporarily disabled
      console.log('API test functionality temporarily disabled');
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  const handleCheckTokens = () => {
    // debugAuth.checkAllTokenSources(); // Temporarily disabled
    console.log('Token check functionality temporarily disabled');
  };

  const handleClearTokens = () => {
    // debugAuth.clearAllTokens(); // Temporarily disabled
    console.log('Token clear functionality temporarily disabled');
    // window.location.reload();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>🔍 Auth Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleCheckTokens} variant="outline" className="w-full">
          Check All Token Sources
        </Button>
        
        <Button onClick={handleTestAPI} variant="outline" className="w-full">
          Test API Call
        </Button>
        
        <Button onClick={handleClearTokens} variant="destructive" className="w-full">
          Clear All Tokens & Reload
        </Button>
        
        <div className="text-sm text-gray-600">
          <p>Use these buttons to debug authentication issues.</p>
          <p>Check the browser console for detailed logs.</p>
          <p className="text-orange-600">⚠️ Debug functions temporarily disabled</p>
        </div>
      </CardContent>
    </Card>
  );
};
