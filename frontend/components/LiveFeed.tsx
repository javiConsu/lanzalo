'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Activity {
  id: string;
  company_name: string;
  activity_type: string;
  message: string;
  created_at: string;
}

export default function LiveFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const websocket = new WebSocket('ws://localhost:3001');
    
    websocket.onopen = () => {
      console.log('Connected to live feed');
    };
    
    websocket.onmessage = (event) => {
      const activity = JSON.parse(event.data);
      setActivities((prev) => [activity, ...prev].slice(0, 20)); // Keep last 20
    };
    
    websocket.onclose = () => {
      console.log('Disconnected from live feed');
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_start': return '▶️';
      case 'task_complete': return '✅';
      case 'task_error': return '❌';
      case 'deploy': return '🚀';
      case 'email_sent': return '📧';
      case 'tweet_posted': return '🐦';
      default: return '📊';
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {activities.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              Esperando actividad...
            </div>
          ) : (
            activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-blue-500 transition"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {getActivityIcon(activity.activity_type)}
                  </span>
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {activity.company_name}
                    </div>
                    <div className="text-slate-400 text-sm mt-1">
                      {activity.message}
                    </div>
                    <div className="text-slate-600 text-xs mt-2">
                      {new Date(activity.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
