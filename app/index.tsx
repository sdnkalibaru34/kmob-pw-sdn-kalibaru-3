import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const [destination, setDestination] = useState<'/login' | '/home' | '/change-password' | null>(null);
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => {
    if (!data.session) return setDestination('/login');
    setDestination(data.session.user.user_metadata?.must_change_password === true ? '/change-password' : '/home');
  }); }, []);
  if (!destination) return null;
  return <Redirect href={destination} />;
}
