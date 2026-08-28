import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => { void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session)); }, []);
  if (signedIn === null) return null;
  return <Redirect href={signedIn ? '/home' : '/login'} />;
}
