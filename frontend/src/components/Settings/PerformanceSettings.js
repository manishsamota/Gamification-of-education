import React, { useState, useEffect } from 'react';
import { Settings, Zap, Clock, Wifi, BarChart3 } from 'lucide-react';

const PerformanceSettings = () => {
  const [settings, setSettings] = useState({
    updateFrequency: 'optimized', 
    autoRefresh: true,
    autoRefreshInterval: 300, // seconds
    enableAnimations: true,
    enableDebugLogs: false,
    batchUpdates: true
  });

  const [applied, setApplied] = useState(false);

  // it will load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('edugame_performance_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to parse performance settings:', error);
      }
    }
  }, []);

  // Apply settings
  const applySettings = () => {
    // Save to localStorage
    localStorage.setItem('edugame_performance_settings', JSON.stringify(settings));
    
    // Apply settings globally
    window.EDUGAME_PERFORMANCE_SETTINGS = settings;
    
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('edugame_performance_settings_changed', {
      detail: settings
    }));
    
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefault = () => {
    const defaultSettings = {
      updateFrequency: 'optimized',
      autoRefresh: true,
      autoRefreshInterval: 300,
      enableAnimations: true,
      enableDebugLogs: false,
      batchUpdates: true
    };
    setSettings(defaultSettings);
  };

  const getFrequencyDescription = (frequency) => {
    switch (frequency) {
      case 'realtime':
        return 'Updates immediately when data changes (may impact performance)';
      case 'optimized':
        return 'Updates every 5 minutes with intelligent batching (recommended)';
      case 'minimal':
        return 'Updates only when manually refreshed (best performance)';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-black">Performance Settings</h2>
          <p className="text-gray-600 text-sm">Optimize your EduGame experience</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Update Frequency */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-black">Update Frequency</h3>
          </div>
          
          <div className="space-y-2">
            {['realtime', 'optimized', 'minimal'].map(frequency => (
              <label key={frequency} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="updateFrequency"
                  value={frequency}
                  checked={settings.updateFrequency === frequency}
                  onChange={(e) => updateSetting('updateFrequency', e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-black capitalize">
                    {frequency}
                    {frequency === 'optimized' && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getFrequencyDescription(frequency)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Auto Refresh */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-black">Auto Refresh</h3>
          </div>
          
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.autoRefresh}
              onChange={(e) => updateSetting('autoRefresh', e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">Enable automatic data refresh</span>
          </label>
          
          {settings.autoRefresh && (
            <div className="ml-6 space-y-2">
              <label className="block text-sm text-gray-600">
                Refresh interval: {settings.autoRefreshInterval} seconds
              </label>
              <input
                type="range"
                min="60"
                max="600"
                step="60"
                value={settings.autoRefreshInterval}
                onChange={(e) => updateSetting('autoRefreshInterval', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 min</span>
                <span>5 min</span>
                <span>10 min</span>
              </div>
            </div>
          )}
        </div>

        {/* Performance Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-black">Performance Options</h3>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.enableAnimations}
                onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="text-gray-700">Enable animations</span>
                <p className="text-sm text-gray-500">Smooth transitions and effects</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.batchUpdates}
                onChange={(e) => updateSetting('batchUpdates', e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="text-gray-700">Batch updates</span>
                <p className="text-sm text-gray-500">Group multiple updates together for better performance</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.enableDebugLogs}
                onChange={(e) => updateSetting('enableDebugLogs', e.target.checked)}
                className="rounded"
              />
              <div>
                <span className="text-gray-700">Enable debug logs</span>
                <p className="text-sm text-gray-500">Show detailed console logs for troubleshooting</p>
              </div>
            </label>
          </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-black mb-2">Current Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Update Mode:</span>
              <span className="ml-2 font-medium capitalize">{settings.updateFrequency}</span>
            </div>
            <div>
              <span className="text-gray-600">Auto Refresh:</span>
              <span className="ml-2 font-medium">{settings.autoRefresh ? 'On' : 'Off'}</span>
            </div>
            <div>
              <span className="text-gray-600">Animations:</span>
              <span className="ml-2 font-medium">{settings.enableAnimations ? 'On' : 'Off'}</span>
            </div>
            <div>
              <span className="text-gray-600">Debug Logs:</span>
              <span className="ml-2 font-medium">{settings.enableDebugLogs ? 'On' : 'Off'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={applySettings}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
              applied 
                ? 'bg-green-500 text-white' 
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg'
            }`}
          >
            {applied ? '✅ Applied!' : 'Apply Settings'}
          </button>
          
          <button
            onClick={resetToDefault}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset to Default
          </button>
        </div>

        {/* Performance Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Performance Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use "Optimized" mode for the best balance of performance and real-time updates</li>
            <li>• Disable animations on slower devices</li>
            <li>• "Minimal" mode is best for mobile devices or slow connections</li>
            <li>• Enable debug logs only when troubleshooting issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PerformanceSettings;