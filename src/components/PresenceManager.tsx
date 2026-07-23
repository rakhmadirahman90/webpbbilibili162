import { useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useLocation } from 'react-router-dom';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function PresenceManager({ session }: { session: any }) {
  const location = useLocation();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase.channel('online-users');
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        window.dispatchEvent(new CustomEvent('presence-sync', { detail: state }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: session.user.id,
            email: session.user.email,
            nama: session.user.user_metadata?.nama || session.user.email,
            role: session.user.user_metadata?.role || 'anggota',
            pathname: location.pathname,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [session]); // Only reconnect on session change

  // Update track when location changes
  useEffect(() => {
    if (!session?.user || !channelRef.current) return;
    
    // Only track if already subscribed (state is usually joined if channel is active)
    channelRef.current.track({
      user_id: session.user.id,
      email: session.user.email,
      nama: session.user.user_metadata?.nama || session.user.email,
      role: session.user.user_metadata?.role || 'anggota',
      pathname: location.pathname,
      online_at: new Date().toISOString(),
    }).catch(() => {}); // ignore if not fully connected yet
  }, [location.pathname, session]);

  return null;
}
