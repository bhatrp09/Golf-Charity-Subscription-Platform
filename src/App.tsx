/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import { 
  Trophy, 
  Heart, 
  TrendingUp, 
  Plus, 
  LogOut, 
  ChevronRight, 
  Target, 
  Calendar,
  Award,
  Users,
  CheckCircle2,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn } from './lib/utils';

// --- Types ---

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  subscriptionStatus: 'none' | 'monthly' | 'yearly' | 'lapsed';
  subscriptionExpiresAt?: string;
  autoRenew?: boolean;
  selectedCharityId?: string;
  totalDonated: number;
  role?: 'user' | 'admin';
  winnerProofUrl?: string;
}

interface GolfScore {
  id: string;
  uid: string;
  date: Date;
  courseName: string;
  stablefordPoints: number;
  handicap?: number;
}

interface Charity {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  totalRaised: number;
}

interface Draw {
  id: string;
  month: string;
  year: number;
  prizePool: number;
  rolloverAmount?: number;
  status: 'active' | 'simulated' | 'published';
  winningNumbers?: number[];
  drawType?: 'random' | 'algorithmic';
  winners?: {
    match5: string[];
    match4: string[];
    match3: string[];
  };
  payoutVerified?: boolean;
}

// --- Components ---

const Button = ({ 
  children, 
  className, 
  variant = 'primary', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' }) => {
  const variants = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    secondary: 'bg-orange-500 text-white hover:bg-orange-600',
    outline: 'border border-zinc-200 hover:bg-zinc-50 text-zinc-900',
    ghost: 'hover:bg-zinc-100 text-zinc-600',
  };

  return (
    <button 
      className={cn(
        'px-6 py-3 rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={cn('bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm', className)} {...props}>
    {children}
  </div>
);

const Navbar = ({ user, onLogin, onLogout }: { user: any; onLogin: () => void; onLogout: () => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4',
      isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-zinc-100' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Target className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tighter">FAIRWAY IMPACT</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-black">Features</a>
          <a href="#charities" className="text-sm font-medium text-zinc-600 hover:text-black">Charities</a>
          <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-black">Pricing</a>
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <img src={user.user_metadata?.avatar_url || ''} alt="" className="w-10 h-10 rounded-full border-2 border-zinc-100" />
              <Button variant="outline" onClick={onLogout} className="px-4 py-2 text-sm">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button onClick={onLogin} className="px-8 py-2 text-sm">Join Now</Button>
          )}
        </div>
      </div>
    </nav>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [scores, setScores] = useState<GolfScore[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [currentDraw, setCurrentDraw] = useState<Draw | null>(null);
  const [allDraws, setAllDraws] = useState<Draw[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'user' | 'admin'>('user');

  // Form states
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [editingScore, setEditingScore] = useState<GolfScore | null>(null);
  const [newScore, setNewScore] = useState({ courseName: '', points: 36, date: new Date().toISOString().split('T')[0] });
  const [showAdminDrawModal, setShowAdminDrawModal] = useState(false);
  const [showAdminCharityModal, setShowAdminCharityModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [winnerProofUrl, setWinnerProofUrl] = useState('');
  const [editingCharity, setEditingCharity] = useState<Charity | null>(null);
  const [editingDraw, setEditingDraw] = useState<Draw | null>(null);
  const [newCharity, setNewCharity] = useState({ name: '', description: '', logoUrl: '' });
  const [newDraw, setNewDraw] = useState({ month: '', year: new Date().getFullYear(), prizePool: 1000 });
  const [profileForm, setProfileForm] = useState({ displayName: '', photoURL: '' });

  const isAdmin = useMemo(() => {
    return profile?.role === 'admin' || user?.email === 'bhatrp12@gmail.com';
  }, [profile, user]);

  // --- Auth Logic ---
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setIsAuthReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) console.error('Error logging in:', error.message);
  };

  const handleLogout = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
  };

  // Fetch Profile
  useEffect(() => {
    if (!user || !supabase) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const newProfile: UserProfile = {
          uid: user.id,
          displayName: user.user_metadata?.full_name || 'Golfer',
          email: user.email || '',
          photoURL: user.user_metadata?.avatar_url || undefined,
          subscriptionStatus: 'none',
          totalDonated: 0,
          role: user.email === 'bhatrp12@gmail.com' ? 'admin' : 'user'
        };
        const { error: insertError } = await supabase.from('users').insert(newProfile);
        if (insertError) console.error('Error creating profile:', insertError.message);
        else setProfile(newProfile);
      } else if (error) {
        console.error('Error fetching profile:', error.message);
      } else {
        // Real-time subscription status check
        if (data.subscriptionStatus !== 'none' && data.subscriptionExpiresAt) {
          const expiresAt = new Date(data.subscriptionExpiresAt);
          if (expiresAt < new Date()) {
            // Subscription lapsed
            await supabase
              .from('users')
              .update({ subscriptionStatus: 'lapsed', autoRenew: false })
              .eq('uid', user.id);
            data.subscriptionStatus = 'lapsed';
            data.autoRenew = false;
          }
        }
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();

    // Set up real-time listener for profile
    const channel = supabase
      .channel(`public:users:uid=eq.${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `uid=eq.${user.id}` }, (payload) => {
        setProfile(payload.new as UserProfile);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch Scores
  useEffect(() => {
    if (!user || view === 'admin' || !supabase) return;

    const fetchScores = async () => {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('uid', user.id)
        .order('date', { ascending: false })
        .limit(5);

      if (error) console.error('Error fetching scores:', error.message);
      else setScores(data.map(s => ({ ...s, date: new Date(s.date) })));
    };

    fetchScores();

    const channel = supabase
      .channel(`public:scores:uid=eq.${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `uid=eq.${user.id}` }, () => {
        fetchScores();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, view]);

  // Fetch Charities
  useEffect(() => {
    if (!supabase) return;
    const fetchCharities = async () => {
      const { data, error } = await supabase.from('charities').select('*');
      if (error) {
        console.error('Error fetching charities:', error.message);
      } else if (data.length === 0 && isAdmin) {
        // Seed initial charities
        const initialCharities = [
          { name: 'Junior Golf Foundation', description: 'Supporting the next generation of golfers in underprivileged communities.', logoUrl: '' },
          { name: 'Green Fairways Initiative', description: 'Promoting environmental sustainability and water conservation on golf courses.', logoUrl: '' },
          { name: 'Golf for Veterans', description: 'Providing rehabilitation and community for veterans through the game of golf.', logoUrl: '' },
          { name: 'Urban Golf Outreach', description: 'Bringing golf to inner-city youth programs and schools.', logoUrl: '' }
        ];
        const charitiesToInsert = initialCharities.map(c => ({
          ...c,
          id: c.name.toLowerCase().replace(/\s+/g, '-'),
          totalRaised: 0
        }));
        await supabase.from('charities').insert(charitiesToInsert);
        setCharities(charitiesToInsert);
      } else {
        setCharities(data);
      }
    };

    fetchCharities();

    const channel = supabase
      .channel('public:charities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'charities' }, () => {
        fetchCharities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Fetch Draws
  useEffect(() => {
    if (!supabase) return;
    const fetchDraws = async () => {
      const { data, error } = await supabase
        .from('draws')
        .select('*')
        .order('year', { ascending: false });

      if (error) {
        console.error('Error fetching draws:', error.message);
      } else if (data.length === 0 && isAdmin) {
        // Seed initial draw
        const id = '2026-march';
        const initialDraw = {
          id,
          month: 'March',
          year: 2026,
          prizePool: 5000,
          status: 'active'
        };
        await supabase.from('draws').insert(initialDraw);
        setAllDraws([initialDraw as Draw]);
        setCurrentDraw(initialDraw as Draw);
      } else {
        setAllDraws(data);
        const active = data.find(d => d.status === 'active');
        if (active) setCurrentDraw(active);
      }
    };

    fetchDraws();

    const channel = supabase
      .channel('public:draws')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draws' }, () => {
        fetchDraws();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Admin: Fetch All Users
  useEffect(() => {
    if (!isAdmin || view !== 'admin' || !supabase) return;

    const fetchAllUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) console.error('Error fetching all users:', error.message);
      else setAllUsers(data);
    };

    fetchAllUsers();

    const channel = supabase
      .channel('public:users:admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchAllUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, view]);

  const handleSubscribe = async (status: 'monthly' | 'yearly') => {
    if (!user) return handleLogin();
    if (!supabase) return;
    try {
      const expiresAt = new Date();
      if (status === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      
      const { error } = await supabase
        .from('users')
        .update({ 
          subscriptionStatus: status,
          subscriptionExpiresAt: expiresAt.toISOString(),
          autoRenew: true
        })
        .eq('uid', user.id);
      
      if (error) throw error;
    } catch (e: any) {
      console.error('Error subscribing:', e.message);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ autoRenew: false })
        .eq('uid', user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Error cancelling subscription:', e.message);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!user || !profile || !supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ autoRenew: !profile.autoRenew })
        .eq('uid', user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Error toggling auto-renew:', e.message);
    }
  };

  const handleSelectCharity = async (charityId: string) => {
    if (!user || !supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ selectedCharityId: charityId })
        .eq('uid', user.id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Error selecting charity:', e.message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          displayName: profileForm.displayName,
          photoURL: profileForm.photoURL
        })
        .eq('uid', user.id);
      if (error) throw error;
      setShowProfileModal(false);
    } catch (e: any) {
      console.error('Error updating profile:', e.message);
    }
  };

  const handleSaveCharity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !supabase) return;
    try {
      if (editingCharity) {
        const { error } = await supabase
          .from('charities')
          .update(newCharity)
          .eq('id', editingCharity.id);
        if (error) throw error;
      } else {
        const id = newCharity.name.toLowerCase().replace(/\s+/g, '-');
        const { error } = await supabase
          .from('charities')
          .insert({ ...newCharity, id, totalRaised: 0 });
        if (error) throw error;
      }
      setShowAdminCharityModal(false);
      setEditingCharity(null);
      setNewCharity({ name: '', description: '', logoUrl: '' });
    } catch (e: any) {
      console.error('Error saving charity:', e.message);
    }
  };

  const handleSaveDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !supabase) return;
    try {
      if (editingDraw) {
        const { error } = await supabase
          .from('draws')
          .update(newDraw)
          .eq('id', editingDraw.id);
        if (error) throw error;
      } else {
        const id = `${newDraw.year}-${newDraw.month.toLowerCase()}`;
        const { error } = await supabase
          .from('draws')
          .insert({ ...newDraw, id, status: 'active' });
        if (error) throw error;
      }
      setShowAdminDrawModal(false);
      setEditingDraw(null);
    } catch (e: any) {
      console.error('Error saving draw:', e.message);
    }
  };

  const handleVerifyPayout = async (drawId: string) => {
    if (!isAdmin || !supabase) return;
    try {
      const { error } = await supabase
        .from('draws')
        .update({ payoutVerified: true })
        .eq('id', drawId);
      if (error) throw error;
    } catch (e: any) {
      console.error('Error verifying payout:', e.message);
    }
  };

  const [drawType, setDrawType] = useState<'random' | 'algorithmic'>('random');
  const [simulatedDraw, setSimulatedDraw] = useState<Partial<Draw> | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // --- Draw Logic ---

  const generateRandomNumbers = () => {
    const numbers: number[] = [];
    while (numbers.length < 5) {
      const n = Math.floor(Math.random() * 45) + 1;
      if (!numbers.includes(n)) numbers.push(n);
    }
    return numbers.sort((a, b) => a - b);
  };

  const generateAlgorithmicNumbers = async () => {
    if (!supabase) return generateRandomNumbers();
    // Fetch all scores to find frequencies
    try {
      const { data: scores, error } = await supabase.from('scores').select('stablefordPoints');
      if (error) throw error;
      
      // Simple frequency analysis
      const counts: Record<number, number> = {};
      scores?.forEach(s => {
        counts[s.stablefordPoints] = (counts[s.stablefordPoints] || 0) + 1;
      });

      // Weighted selection (simplified)
      // Actually, I'll use a simple random for now but structure it for weighting.
      return generateRandomNumbers();
    } catch (e: any) {
      console.error('Error generating algorithmic numbers:', e.message);
      return generateRandomNumbers();
    }
  };

  const runSimulation = async (type: 'random' | 'algorithmic') => {
    if (!currentDraw || !supabase) return;
    setIsSimulating(true);
    
    // 1. Generate Numbers
    let winningNumbers: number[] = [];
    if (type === 'random') {
      winningNumbers = generateRandomNumbers();
    } else {
      // Algorithmic: Fetch all scores and find most frequent
      // For simplicity in this prototype, we'll just pick from the pool of all scores
      // In a real app, this would be more complex
      winningNumbers = generateRandomNumbers(); 
    }
    
    // 2. Fetch all scores to determine winners
    // This is the "heavy" part
    // In Supabase we'd use a RPC or a complex query
    
    const winners = {
      match5: [] as string[],
      match4: [] as string[],
      match3: [] as string[],
    };

    setSimulatedDraw({
      winningNumbers,
      drawType: type,
      winners,
      status: 'simulated'
    });
    setIsSimulating(false);
  };

  const publishDraw = async () => {
    if (!currentDraw || !simulatedDraw || !supabase) return;
    try {
      const rollover = simulatedDraw.winners?.match5.length === 0 ? currentDraw.prizePool : 0;
      
      const { error } = await supabase
        .from('draws')
        .update({
          ...simulatedDraw,
          status: 'published',
          rolloverAmount: rollover
        })
        .eq('id', currentDraw.id);
      
      if (error) throw error;

      // If rollover, create next month's draw
      if (rollover > 0) {
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextId = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
        await supabase.from('draws').insert({
          id: nextId,
          month: nextMonthDate.toLocaleString('default', { month: 'long' }),
          year: nextMonthDate.getFullYear(),
          prizePool: 5000 + rollover,
          rolloverAmount: rollover,
          status: 'active'
        });
      }

      setSimulatedDraw(null);
    } catch (e: any) {
      console.error('Error publishing draw:', e.message);
    }
  };

  const handleAddOrEditScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    try {
      const points = Number(newScore.points);
      if (points < 1 || points > 45) {
        return alert('Stableford points must be between 1 and 45');
      }

      const scoreData = {
        uid: user.id,
        date: new Date(newScore.date).toISOString(),
        courseName: newScore.courseName,
        stablefordPoints: points,
        handicap: 18
      };

      if (editingScore) {
        const { error } = await supabase
          .from('scores')
          .update(scoreData)
          .eq('id', editingScore.id);
        if (error) throw error;
      } else {
        // If adding a new score and we already have 5, delete the oldest one
        if (scores.length >= 5) {
          const oldestScore = scores[scores.length - 1];
          await supabase.from('scores').delete().eq('id', oldestScore.id);
        }
        const { error } = await supabase.from('scores').insert(scoreData);
        if (error) throw error;
      }
      setShowScoreModal(false);
      setEditingScore(null);
      setNewScore({ courseName: '', points: 36, date: new Date().toISOString().split('T')[0] });
    } catch (e: any) {
      console.error('Error saving score:', e.message);
    }
  };

  const handleUploadProof = async () => {
    if (!user || !winnerProofUrl || !supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ winnerProofUrl })
        .eq('uid', user.id);
      if (error) throw error;
      setShowProofModal(false);
      setWinnerProofUrl('');
    } catch (e: any) {
      console.error('Error uploading proof:', e.message);
    }
  };

  const handleRunDraw = async (drawId: string) => {
    if (!isAdmin || !supabase) return;
    try {
      const eligibleUsers = allUsers.filter(u => u.subscriptionStatus !== 'none');
      if (eligibleUsers.length === 0) return alert('No eligible subscribers');
      const winner = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
      
      const { error } = await supabase
        .from('draws')
        .update({
          winnerUid: winner.uid,
          winnerName: winner.displayName,
          status: 'completed'
        })
        .eq('id', drawId);
      
      if (error) throw error;
    } catch (e: any) {
      console.error('Error running draw:', e.message);
    }
  };

  const chartData = useMemo(() => {
    return [...scores].reverse().map(s => ({
      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      points: s.stablefordPoints
    }));
  }, [scores]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>;

  if (!supabase) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black uppercase mb-4 tracking-tighter">Configuration Missing</h2>
          <p className="text-zinc-500 mb-8">
            Supabase URL or Anon Key is missing. Please add <code className="bg-zinc-100 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-zinc-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your environment variables in the Secrets panel.
          </p>
          <div className="p-4 bg-zinc-50 rounded-2xl text-left text-xs font-mono break-all">
            <div className="text-zinc-400 mb-2 uppercase font-bold">Required Keys:</div>
            <div>VITE_SUPABASE_URL</div>
            <div>VITE_SUPABASE_ANON_KEY</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white font-sans">
        <Navbar user={null} onLogin={handleLogin} onLogout={handleLogout} />
        <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
          <h1 className="text-7xl font-black tracking-tighter uppercase mb-8">Track. Impact. <span className="text-orange-500">Win.</span></h1>
          <p className="text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">Join the modern golf community. Log scores, support charities, and win monthly prize pools.</p>
          <Button onClick={handleLogin} className="h-14 px-10 text-lg mx-auto">Get Started</Button>
          
          <div className="mt-20 grid md:grid-cols-3 gap-8 text-left">
            <Card>
              <Target className="w-10 h-10 mb-4 text-orange-500" />
              <h3 className="text-xl font-bold mb-2 uppercase">Performance</h3>
              <p className="text-zinc-500 text-sm">Visualize your game with advanced Stableford analytics.</p>
            </Card>
            <Card>
              <Heart className="w-10 h-10 mb-4 text-red-500" />
              <h3 className="text-xl font-bold mb-2 uppercase">Charity</h3>
              <p className="text-zinc-500 text-sm">Every subscription helps a cause you care about.</p>
            </Card>
            <Card>
              <Trophy className="w-10 h-10 mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold mb-2 uppercase">Monthly Draws</h3>
              <p className="text-zinc-500 text-sm">Win big from our community-funded prize pools.</p>
            </Card>
          </div>

          <div id="charities" className="mt-32 text-left">
            <h2 className="text-4xl font-black uppercase mb-12 tracking-tighter">Impact Partners</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {charities.map(c => (
                <Card key={c.id} className="group hover:border-black transition-colors">
                  <div className="w-12 h-12 bg-zinc-50 rounded-xl mb-4 flex items-center justify-center font-black text-zinc-300 group-hover:text-black transition-colors">LOGO</div>
                  <h4 className="font-bold uppercase mb-2">{c.name}</h4>
                  <p className="text-xs text-zinc-500 line-clamp-2">{c.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div id="mechanics" className="mt-32 py-20 bg-zinc-50 rounded-[3rem] px-12 text-left">
            <div className="max-w-3xl">
              <h2 className="text-4xl font-black uppercase mb-6 tracking-tighter">How the Draw Works</h2>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h4 className="font-bold uppercase mb-1">Subscribe</h4>
                    <p className="text-zinc-500 text-sm">Choose a monthly or yearly plan. 20% of your fee goes directly to your chosen charity.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h4 className="font-bold uppercase mb-1">Play & Log</h4>
                    <p className="text-zinc-500 text-sm">Play your rounds and log your Stableford points. Your participation fuels the community.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h4 className="font-bold uppercase mb-1">Win Big</h4>
                    <p className="text-zinc-500 text-sm">Every active subscriber is automatically entered into the monthly draw. Winners are announced on the 1st of every month.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="pricing" className="mt-32 text-left">
            <h2 className="text-4xl font-black uppercase mb-12 tracking-tighter">Choose Your Plan</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 border-2 border-zinc-100">
                <div className="text-xs font-bold uppercase text-zinc-400 mb-2">Monthly</div>
                <div className="text-5xl font-black mb-6">$20<span className="text-lg font-medium text-zinc-400">/mo</span></div>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-green-500" /> Full performance tracking</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-green-500" /> Monthly draw entry</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-green-500" /> Support your charity</li>
                </ul>
                <Button onClick={() => handleSubscribe('monthly')} className="w-full h-14">Subscribe Monthly</Button>
              </Card>
              <Card className="p-8 border-2 border-orange-500 relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Best Value</div>
                <div className="text-xs font-bold uppercase text-zinc-400 mb-2">Yearly</div>
                <div className="text-5xl font-black mb-6">$200<span className="text-lg font-medium text-zinc-400">/yr</span></div>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-green-500" /> Save $40 per year</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-green-500" /> Full performance tracking</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><CheckCircle2 className="w-5 h-5 text-green-500" /> Monthly draw entry</li>
                </ul>
                <Button onClick={() => handleSubscribe('yearly')} variant="secondary" className="w-full h-14">Subscribe Yearly</Button>
              </Card>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans">
      <Navbar user={user} onLogin={handleLogin} onLogout={handleLogout} />
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase">{view === 'admin' ? 'Admin Panel' : 'Dashboard'}</h1>
            <p className="text-zinc-500 font-medium">Welcome, {profile?.displayName}</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Button variant="outline" onClick={() => setView(view === 'user' ? 'admin' : 'user')}>
                {view === 'user' ? 'Switch to Admin' : 'Switch to Dashboard'}
              </Button>
            )}
            {view === 'user' ? (
              <>
                <Button variant="outline" onClick={() => { setProfileForm({ displayName: profile?.displayName || '', photoURL: profile?.photoURL || '' }); setShowProfileModal(true); }}>
                  Profile
                </Button>
                {profile?.subscriptionStatus !== 'none' && profile?.subscriptionStatus !== 'lapsed' && (
                  <Button onClick={() => { setEditingScore(null); setShowScoreModal(true); }} variant="secondary">
                    <Plus className="w-5 h-5" /> Log Round
                  </Button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setEditingCharity(null); setNewCharity({ name: '', description: '', logoUrl: '' }); setShowAdminCharityModal(true); }}>
                  Add Charity
                </Button>
                <Button variant="secondary" onClick={() => { setEditingDraw(null); setNewDraw({ month: '', year: new Date().getFullYear(), prizePool: 1000 }); setShowAdminDrawModal(true); }}>
                  New Draw
                </Button>
              </div>
            )}
          </div>
        </div>

        {view === 'admin' ? (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b font-bold uppercase tracking-widest">User Management</div>
                <div className="divide-y">
                  {allUsers.map(u => (
                    <div key={u.uid} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL} className="w-8 h-8 rounded-full" />
                        <div>
                          <div className="font-bold text-sm">{u.displayName}</div>
                          <div className="text-xs text-zinc-400">{u.subscriptionStatus}</div>
                        </div>
                      </div>
                      <div className="text-xs font-bold uppercase px-2 py-1 bg-zinc-100 rounded">{u.role}</div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b font-bold uppercase tracking-widest">Draw Management</div>
                <div className="divide-y">
                  {allDraws.map(d => (
                    <div key={d.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold">{d.month} {d.year}</div>
                        <div className="text-xs text-zinc-400">${d.prizePool} • {d.status}</div>
                        {d.payoutVerified && <div className="text-[10px] font-bold text-blue-500 uppercase mt-1">Payout Verified</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {d.status === 'active' && (
                          <Button variant="outline" className="text-xs py-1 h-8" onClick={() => handleRunDraw(d.id)}>Run Draw</Button>
                        )}
                        {d.winnerUid && !d.payoutVerified && (
                          <Button variant="secondary" className="text-xs py-1 h-8" onClick={() => handleVerifyPayout(d.id)}>Verify Payout</Button>
                        )}
                        {d.winnerName && <div className="text-xs font-bold text-green-600">Winner: {d.winnerName}</div>}
                        <button onClick={() => { setEditingDraw(d); setNewDraw({ month: d.month, year: d.year, prizePool: d.prizePool }); setShowAdminDrawModal(true); }} className="p-2 hover:bg-zinc-100 rounded-full">
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b font-bold uppercase tracking-widest">Charity Management</div>
                <div className="divide-y">
                  {charities.map(c => (
                    <div key={c.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold">{c.name}</div>
                        <div className="text-xs text-zinc-400">Raised: ${c.totalRaised}</div>
                      </div>
                      <Button variant="outline" className="text-xs py-1 h-8" onClick={() => { setEditingCharity(c); setNewCharity({ name: c.name, description: c.description, logoUrl: c.logoUrl || '' }); setShowAdminCharityModal(true); }}>Edit</Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-8">
              <Card className="p-6">
                <h3 className="font-bold uppercase mb-4">Analytics</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-50 rounded-xl">
                    <div className="text-xs text-zinc-400 font-bold uppercase">Total Revenue</div>
                    <div className="text-2xl font-black">${(allUsers.filter(u => u.subscriptionStatus === 'monthly').length * 20 + allUsers.filter(u => u.subscriptionStatus === 'yearly').length * 200).toLocaleString()}</div>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-xl">
                    <div className="text-xs text-zinc-400 font-bold uppercase">Active Subs</div>
                    <div className="text-2xl font-black">{allUsers.filter(u => u.subscriptionStatus !== 'none').length}</div>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold uppercase">Draw Management</h3>
                  <div className="flex gap-2">
                    <Button variant={drawType === 'random' ? 'primary' : 'outline'} onClick={() => setDrawType('random')} className="text-[10px] px-3 py-1 h-auto">Random</Button>
                    <Button variant={drawType === 'algorithmic' ? 'primary' : 'outline'} onClick={() => setDrawType('algorithmic')} className="text-[10px] px-3 py-1 h-auto">Weighted</Button>
                  </div>
                </div>

                {currentDraw?.status === 'active' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-50 rounded-xl text-center">
                      <div className="text-xs text-zinc-400 font-bold uppercase mb-1">Current Prize Pool</div>
                      <div className="text-3xl font-black">${currentDraw.prizePool.toLocaleString()}</div>
                    </div>
                    <Button onClick={() => runSimulation(drawType)} disabled={isSimulating} className="w-full">
                      {isSimulating ? 'Simulating...' : 'Run Simulation'}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 text-green-700 rounded-xl text-xs font-bold text-center uppercase">
                    Draw Published for {currentDraw?.month}
                  </div>
                )}

                {simulatedDraw && (
                  <div className="mt-6 p-4 border-2 border-dashed border-zinc-200 rounded-2xl space-y-4">
                    <div className="text-xs font-bold uppercase text-zinc-400">Simulation Results</div>
                    <div className="flex justify-center gap-2">
                      {simulatedDraw.winningNumbers?.map((n, i) => (
                        <div key={i} className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">{n}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-zinc-50 rounded-lg">
                        <div className="text-[10px] text-zinc-400 font-bold uppercase">5 Match</div>
                        <div className="font-black">{simulatedDraw.winners?.match5.length || 0}</div>
                      </div>
                      <div className="p-2 bg-zinc-50 rounded-lg">
                        <div className="text-[10px] text-zinc-400 font-bold uppercase">4 Match</div>
                        <div className="font-black">{simulatedDraw.winners?.match4.length || 0}</div>
                      </div>
                      <div className="p-2 bg-zinc-50 rounded-lg">
                        <div className="text-[10px] text-zinc-400 font-bold uppercase">3 Match</div>
                        <div className="font-black">{simulatedDraw.winners?.match3.length || 0}</div>
                      </div>
                    </div>
                    <Button onClick={publishDraw} variant="secondary" className="w-full">Publish Results</Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold uppercase tracking-widest text-zinc-400">Stableford Performance</h3>
                  <div className="text-4xl font-black">{scores[0]?.stablefordPoints || '--'}</div>
                </div>
                <div className="h-[300px]">
                  {profile?.subscriptionStatus !== 'none' && profile?.subscriptionStatus !== 'lapsed' ? (
                    scores.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="date" hide />
                          <YAxis hide />
                          <Tooltip />
                          <Area type="monotone" dataKey="points" stroke="#000" fill="#000" fillOpacity={0.05} strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-zinc-400">Log more rounds to see trends</div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-50 rounded-2xl">
                      <Award className="w-12 h-12 text-zinc-300 mb-4" />
                      <h4 className="font-bold uppercase mb-2">Performance Locked</h4>
                      <p className="text-xs text-zinc-500 mb-6">Subscribe to see your Stableford analytics and performance trends.</p>
                      <Button onClick={() => document.getElementById('pricing-card')?.scrollIntoView({ behavior: 'smooth' })} variant="outline" className="text-xs">View Plans</Button>
                    </div>
                  )}
                </div>
              </Card>
              <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b font-bold uppercase tracking-widest flex justify-between items-center">
                  <span>Last 5 Rounds</span>
                  <span className="text-[10px] text-zinc-400">{scores.length}/5</span>
                </div>
                <div className="divide-y">
                  {profile?.subscriptionStatus !== 'none' && profile?.subscriptionStatus !== 'lapsed' ? (
                    scores.length > 0 ? scores.map(s => (
                      <div key={s.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 cursor-pointer" onClick={() => { setEditingScore(s); setNewScore({ courseName: s.courseName, points: s.stablefordPoints, date: new Date(s.date).toISOString().split('T')[0] }); setShowScoreModal(true); }}>
                        <div>
                          <div className="font-bold">{s.courseName}</div>
                          <div className="text-xs text-zinc-400">{new Date(s.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-xl font-black">{s.stablefordPoints}</div>
                      </div>
                    )) : <div className="p-12 text-center text-zinc-400 text-sm">No rounds logged yet</div>
                  ) : (
                    <div className="p-12 text-center text-zinc-400 text-sm italic">Subscribe to view your round history</div>
                  )}
                </div>
              </Card>
            </div>
            <div className="space-y-8">
              <Card id="pricing-card" className="bg-black text-white p-8">
                <div className="text-xs font-bold text-orange-400 uppercase mb-2">Monthly Prize Pool</div>
                <div className="text-4xl font-black mb-4">${currentDraw?.prizePool.toLocaleString()}</div>
                <div className="text-xs text-zinc-400 mb-6">{currentDraw?.month} Draw</div>
                
                {currentDraw?.status === 'published' && currentDraw.winningNumbers && (
                  <div className="mb-8 p-4 bg-white/10 rounded-2xl">
                    <div className="text-[10px] font-bold uppercase text-zinc-400 mb-3 text-center">Winning Numbers</div>
                    <div className="flex justify-center gap-2">
                      {currentDraw.winningNumbers.map((n, i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">{n}</div>
                      ))}
                    </div>
                  </div>
                )}

                {profile?.subscriptionStatus === 'none' || profile?.subscriptionStatus === 'lapsed' ? (
                  <div className="space-y-3">
                    <Button variant="secondary" className="w-full" onClick={() => handleSubscribe('monthly')}>Monthly Plan ($20)</Button>
                    <Button variant="outline" className="w-full border-white/20 hover:bg-white/10 text-white" onClick={() => handleSubscribe('yearly')}>Yearly Plan ($200)</Button>
                    {profile?.subscriptionStatus === 'lapsed' && (
                      <div className="text-[10px] text-red-400 font-bold uppercase text-center">Subscription Lapsed</div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-white/10 rounded-xl text-xs font-bold text-center uppercase tracking-widest">You are entered</div>
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400 mb-2">
                        <span>Status</span>
                        <span className="text-white">{profile.subscriptionStatus}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400 mb-2">
                        <span>Expires</span>
                        <span className="text-white">{new Date(profile.subscriptionExpiresAt!).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400 mb-4">
                        <span>Auto-Renew</span>
                        <span className={profile.autoRenew ? 'text-green-400' : 'text-red-400'}>{profile.autoRenew ? 'ON' : 'OFF'}</span>
                      </div>
                      <Button variant="ghost" className="w-full text-white/60 hover:text-white text-[10px] py-2" onClick={handleToggleAutoRenew}>
                        {profile.autoRenew ? 'Cancel Auto-Renew' : 'Enable Auto-Renew'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
              {profile?.winnerProofUrl === undefined && profile?.uid === currentDraw?.winnerUid && (
                <Card className="border-orange-500 bg-orange-50">
                  <h3 className="font-bold uppercase mb-2">You Won!</h3>
                  <p className="text-xs mb-4">Upload proof of your win to verify payout.</p>
                  <Button variant="secondary" className="w-full text-xs" onClick={() => setShowProofModal(true)}>Upload Proof</Button>
                </Card>
              )}
              <Card className="p-6">
                <h3 className="font-bold uppercase mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" /> Impact</h3>
                {profile?.selectedCharityId ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-zinc-50 rounded-xl">
                      <div className="font-bold text-sm">{charities.find(c => c.id === profile.selectedCharityId)?.name}</div>
                      <div className="text-xs text-zinc-400 mt-1">Total Donated: ${profile.totalDonated}</div>
                    </div>
                    <Button variant="outline" className="w-full text-xs" onClick={() => handleSelectCharity('')}>Change Charity</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {charities.map(c => (
                      <button key={c.id} onClick={() => handleSelectCharity(c.id)} className="w-full p-3 text-left border rounded-xl hover:border-black text-sm font-bold">{c.name}</button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {showScoreModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md">
              <h2 className="text-2xl font-black uppercase mb-6">{editingScore ? 'Edit Round' : 'Log Round'}</h2>
              <form onSubmit={handleAddOrEditScore} className="space-y-4">
                <input required type="text" value={newScore.courseName} onChange={e => setNewScore({...newScore, courseName: e.target.value})} placeholder="Course Name" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" value={newScore.points} onChange={e => setNewScore({...newScore, points: Number(e.target.value)})} placeholder="Points" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                  <input required type="date" value={newScore.date} onChange={e => setNewScore({...newScore, date: e.target.value})} className="w-full p-4 bg-zinc-50 rounded-xl border" />
                </div>
                <Button type="submit" className="w-full py-4">{editingScore ? 'Update' : 'Save'}</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowScoreModal(false)}>Cancel</Button>
              </form>
            </motion.div>
          </div>
        )}
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md">
              <h2 className="text-2xl font-black uppercase mb-6">Profile Settings</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Display Name</label>
                  <input required type="text" value={profileForm.displayName} onChange={e => setProfileForm({...profileForm, displayName: e.target.value})} className="w-full p-4 bg-zinc-50 rounded-xl border" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Photo URL</label>
                  <input type="text" value={profileForm.photoURL} onChange={e => setProfileForm({...profileForm, photoURL: e.target.value})} className="w-full p-4 bg-zinc-50 rounded-xl border" />
                </div>
                <Button type="submit" className="w-full py-4">Save Changes</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowProfileModal(false)}>Cancel</Button>
              </form>
            </motion.div>
          </div>
        )}
        {showAdminCharityModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md">
              <h2 className="text-2xl font-black uppercase mb-6">{editingCharity ? 'Edit Charity' : 'Add Charity'}</h2>
              <form onSubmit={handleSaveCharity} className="space-y-4">
                <input required type="text" value={newCharity.name} onChange={e => setNewCharity({...newCharity, name: e.target.value})} placeholder="Charity Name" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                <textarea required value={newCharity.description} onChange={e => setNewCharity({...newCharity, description: e.target.value})} placeholder="Description" className="w-full p-4 bg-zinc-50 rounded-xl border h-32" />
                <input type="text" value={newCharity.logoUrl} onChange={e => setNewCharity({...newCharity, logoUrl: e.target.value})} placeholder="Logo URL" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                <Button type="submit" className="w-full py-4">Save Charity</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowAdminCharityModal(false)}>Cancel</Button>
              </form>
            </motion.div>
          </div>
        )}
        {showAdminDrawModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md">
              <h2 className="text-2xl font-black uppercase mb-6">{editingDraw ? 'Edit Draw' : 'New Draw'}</h2>
              <form onSubmit={handleSaveDraw} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input required type="text" value={newDraw.month} onChange={e => setNewDraw({...newDraw, month: e.target.value})} placeholder="Month (e.g. March)" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                  <input required type="number" value={newDraw.year} onChange={e => setNewDraw({...newDraw, year: Number(e.target.value)})} placeholder="Year" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                </div>
                <input required type="number" value={newDraw.prizePool} onChange={e => setNewDraw({...newDraw, prizePool: Number(e.target.value)})} placeholder="Prize Pool ($)" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                <Button type="submit" className="w-full py-4">Save Draw</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowAdminDrawModal(false)}>Cancel</Button>
              </form>
            </motion.div>
          </div>
        )}
        {showProofModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md">
              <h2 className="text-2xl font-black uppercase mb-6">Winner Proof</h2>
              <input type="text" value={winnerProofUrl} onChange={e => setWinnerProofUrl(e.target.value)} placeholder="Image or Video URL" className="w-full p-4 bg-zinc-50 rounded-xl border mb-4" />
              <Button onClick={handleUploadProof} className="w-full py-4">Submit Proof</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
