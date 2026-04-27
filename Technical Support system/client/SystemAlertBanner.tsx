import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const SystemAlertBanner: React.FC = () => {
  const [alert, setAlert] = useState<any>(null);
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCriticalAlert = async () => {
      const { data } = await supabase
        .from('technical_events')
        .select('*')
        .eq('status', 'active')
        .in('severity', ['critical', 'high'])
        .order('severity', { ascending: false }) // Critical first
        .limit(1)
        .single();
      
      if (data) setAlert(data);
    };

    fetchCriticalAlert();

    // Realtime updates
    const ch = supabase.channel('system-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'technical_events' }, () => fetchCriticalAlert())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  if (!alert || !visible) return null;

  const isCritical = alert.severity === 'critical';

  return (
    <div className={`system-alert-banner ${alert.severity}`} style={{
      background: isCritical ? '#ef4444' : '#f97316',
      color: 'white',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      fontSize: '0.9rem',
      fontWeight: 700,
      position: 'relative',
      zIndex: 1001,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {isCritical ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
        <span>{isCritical ? 'CRITICAL SYSTEM ALERT:' : 'SYSTEM NOTICE:'} {alert.title}</span>
      </div>
      
      <button 
        onClick={() => navigate('/dashboard/support')} 
        style={{ 
          background: 'rgba(255,255,255,0.2)', 
          border: 'none', 
          color: 'white', 
          padding: '0.35rem 0.75rem', 
          borderRadius: '99px',
          fontSize: '0.75rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          marginLeft: '1rem'
        }}
      >
        View Details <ArrowRight className="w-3.5 h-3.5" />
      </button>

      <button 
        onClick={() => setVisible(false)}
        style={{ 
          position: 'absolute', 
          right: '1rem', 
          background: 'none', 
          border: 'none', 
          color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer'
        }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SystemAlertBanner;
