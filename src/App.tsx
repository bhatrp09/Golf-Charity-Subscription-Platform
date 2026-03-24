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

const Navbar = ({ user, onLogin, onLogout, isAdmin, view, setView, onShowAuth }: { 
  user: any; 
  onLogin: () => void; 
  onLogout: () => void;
  isAdmin: boolean;
  view: 'user' | 'admin';
  setView: (view: 'user' | 'admin') => void;
  onShowAuth: (mode: 'login' | 'signup') => void;
}) => {
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
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <Target className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tighter">FAIRWAY IMPACT</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {!user ? (
            <>
              <a href="#concept" className="text-sm font-medium text-zinc-600 hover:text-black">Concept</a>
              <a href="#features" className="text-sm font-medium text-zinc-600 hover:text-black">Features</a>
              <a href="#charities" className="text-sm font-medium text-zinc-600 hover:text-black">Charities</a>
              <a href="#mechanics" className="text-sm font-medium text-zinc-600 hover:text-black">Mechanics</a>
              <a href="#pricing" className="text-sm font-medium text-zinc-600 hover:text-black">Pricing</a>
            </>
          ) : (
            <>
              <button onClick={() => setView('user')} className={cn("text-sm font-medium", view === 'user' ? "text-black" : "text-zinc-400 hover:text-black")}>Dashboard</button>
              {isAdmin && (
                <button onClick={() => setView('admin')} className={cn("text-sm font-medium", view === 'admin' ? "text-black" : "text-zinc-400 hover:text-black")}>Admin Panel</button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold uppercase">{user.user_metadata?.full_name}</div>
                <div className="text-[10px] text-zinc-400 font-mono">{user.email}</div>
              </div>
              <img src={user.user_metadata?.avatar_url || ''} alt="" className="w-10 h-10 rounded-full border-2 border-zinc-100" />
              <Button variant="outline" onClick={onLogout} className="px-4 py-2 text-sm">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onShowAuth('login')} className="px-4 py-2 text-sm">Log In</Button>
              <Button onClick={() => onShowAuth('signup')} className="px-6 py-2 text-sm">Sign Up</Button>
            </div>
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
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);

  // Form states
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [editingScore, setEditingScore] = useState<GolfScore | null>(null);
  const [newScore, setNewScore] = useState({ courseName: '', points: 36, date: new Date().toISOString().split('T')[0] });
  const [showAdminDrawModal, setShowAdminDrawModal] = useState(false);
  const [showAdminCharityModal, setShowAdminCharityModal] = useState(false);
  const [showCharityModal, setShowCharityModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ displayName: '', photoURL: '' });
  const [showProofModal, setShowProofModal] = useState(false);
  const [winnerProofUrl, setWinnerProofUrl] = useState('');
  const [editingCharity, setEditingCharity] = useState<Charity | null>(null);
  const [editingDraw, setEditingDraw] = useState<Draw | null>(null);
  const [newCharity, setNewCharity] = useState({ name: '', description: '', logoUrl: '' });
  const [newDraw, setNewDraw] = useState({ month: '', year: new Date().getFullYear(), prizePool: 1000 });
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<UserProfile | null>(null);
  const [adminUserScores, setAdminUserScores] = useState<GolfScore[]>([]);
  const [showAdminScoreModal, setShowAdminScoreModal] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'draws' | 'charities' | 'winners' | 'analytics'>('users');

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
    if (error) setAuthError(error.message);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
      options: {
        data: {
          full_name: authForm.name
        }
      }
    });
    if (error) setAuthError(error.message);
    else if (data.user) {
      // Success - profile will be created by useEffect
      setShowAuth(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    });
    if (error) setAuthError(error.message);
    else setShowAuth(false);
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

  const fetchAdminUserScores = async (uid: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('uid', uid)
      .order('date', { ascending: false });
    if (error) console.error('Error fetching admin user scores:', error.message);
    else setAdminUserScores(data.map(s => ({ ...s, date: new Date(s.date) })));
  };

  const handleUpdateUserAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminUser || !supabase) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: selectedAdminUser.role,
          subscriptionStatus: selectedAdminUser.subscriptionStatus,
          subscriptionExpiresAt: selectedAdminUser.subscriptionExpiresAt,
          displayName: selectedAdminUser.displayName
        })
        .eq('uid', selectedAdminUser.uid);
      if (error) throw error;
      setShowAdminUserModal(false);
    } catch (e: any) {
      console.error('Error updating user as admin:', e.message);
    }
  };

  const handleDeleteCharity = async (id: string) => {
    if (!isAdmin || !supabase) return;
    if (!confirm('Are you sure you want to delete this charity?')) return;
    try {
      const { error } = await supabase.from('charities').delete().eq('id', id);
      if (error) throw error;
    } catch (e: any) {
      console.error('Error deleting charity:', e.message);
    }
  };

  const handleAdminSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminUser || !supabase) return;
    try {
      const points = Number(newScore.points);
      const scoreData = {
        uid: selectedAdminUser.uid,
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
        const { error } = await supabase.from('scores').insert(scoreData);
        if (error) throw error;
      }
      setShowAdminScoreModal(false);
      fetchAdminUserScores(selectedAdminUser.uid);
    } catch (e: any) {
      console.error('Error saving admin score:', e.message);
    }
  };

  const handleDeleteScore = async (id: string) => {
    if (!supabase || !selectedAdminUser) return;
    if (!confirm('Delete this score?')) return;
    try {
      const { error } = await supabase.from('scores').delete().eq('id', id);
      if (error) throw error;
      fetchAdminUserScores(selectedAdminUser.uid);
    } catch (e: any) {
      console.error('Error deleting score:', e.message);
    }
  };

  const winnersList = useMemo(() => {
    return allDraws.filter(d => d.winnerName).map(d => ({
      drawId: d.id,
      month: d.month,
      year: d.year,
      winnerName: d.winnerName,
      winnerUid: d.winnerUid,
      prize: d.prizePool,
      verified: d.payoutVerified
    }));
  }, [allDraws]);

  const charityStats = useMemo(() => {
    return charities.map(c => ({
      name: c.name,
      total: c.totalRaised,
      percentage: (c.totalRaised / (charities.reduce((acc, curr) => acc + curr.totalRaised, 0) || 1)) * 100
    }));
  }, [charities]);

  const drawStats = useMemo(() => {
    const published = allDraws.filter(d => d.status === 'published' || d.status === 'completed');
    return {
      totalPrizes: published.reduce((acc, d) => acc + d.prizePool, 0),
      avgPrize: published.length ? published.reduce((acc, d) => acc + d.prizePool, 0) / published.length : 0,
      totalWinners: published.filter(d => d.winnerUid).length
    };
  }, [allDraws]);

  const chartData = useMemo(() => {
    return [...scores].reverse().map(s => ({
      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      points: s.stablefordPoints
    }));
  }, [scores]);

  useEffect(() => {
    if (user) {
      setShowAuth(false);
    }
  }, [user]);

  useEffect(() => {
    if (selectedAdminUser) {
        fetchAdminUserScores(selectedAdminUser.uid);
      }
    }, [selectedAdminUser]);

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
    if (showAuth) {
      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-12 bg-black text-white flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-12">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <Target className="text-black w-6 h-6" />
                  </div>
                  <span className="text-xl font-bold tracking-tighter">FAIRWAY IMPACT</span>
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-8 leading-none">Join the <br/>Community.</h2>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-orange-500" /></div>
                    <div>
                      <div className="text-xs font-bold uppercase mb-1">Subscribe & Win</div>
                      <div className="text-[10px] text-zinc-400">Monthly prize pools funded by the community.</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-orange-500" /></div>
                    <div>
                      <div className="text-xs font-bold uppercase mb-1">Track Performance</div>
                      <div className="text-[10px] text-zinc-400">Advanced Stableford analytics for every round.</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-orange-500" /></div>
                    <div>
                      <div className="text-xs font-bold uppercase mb-1">Support Charity</div>
                      <div className="text-[10px] text-zinc-400">20% of your subscription goes to your chosen cause.</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Est. 2026 • Fairway Impact</div>
            </div>
            <div className="p-12 flex flex-col justify-center">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-black uppercase mb-2 tracking-tighter">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h3>
                <p className="text-sm text-zinc-500">{authMode === 'login' ? 'Sign in to access your dashboard.' : 'Start your journey today.'}</p>
              </div>

              {authError && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100">
                  {authError}
                </div>
              )}

              <form onSubmit={authMode === 'login' ? handleEmailLogin : handleEmailSignUp} className="space-y-4 mb-8">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-4">Full Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full h-12 px-6 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:border-black transition-colors"
                      placeholder="John Doe"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-4">Email Address</label>
                  <input 
                    type="email" 
                    required
                    className="w-full h-12 px-6 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:border-black transition-colors"
                    placeholder="john@example.com"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 ml-4">Password</label>
                  <input 
                    type="password" 
                    required
                    className="w-full h-12 px-6 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:border-black transition-colors"
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full h-14 text-lg uppercase font-black tracking-tighter">
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </Button>
              </form>

              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-zinc-400"><span className="bg-white px-4">Or continue with</span></div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-8">
                <Button onClick={handleLogin} variant="outline" className="w-full h-12 flex items-center justify-center gap-3 text-sm font-bold">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" />
                  Google
                </Button>
              </div>

              <div className="text-center space-y-4">
                <button 
                  onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(null); }}
                  className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black transition-colors"
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
                <div>
                  <Button variant="ghost" onClick={() => setShowAuth(false)} className="text-[10px] uppercase font-bold tracking-widest">
                    Back to Landing Page
                  </Button>
                </div>
              </div>

              <p className="mt-12 text-[10px] text-zinc-400 leading-relaxed text-center">
                By continuing, you agree to Fairway Impact's <br/>
                <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white font-sans">
        <Navbar user={null} onLogin={handleLogin} onLogout={handleLogout} isAdmin={false} view="user" setView={() => {}} onShowAuth={(mode) => { setAuthMode(mode); setShowAuth(true); }} />
        <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
          <h1 className="text-7xl font-black tracking-tighter uppercase mb-8">Track. Impact. <span className="text-orange-500">Win.</span></h1>
          <p className="text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">Join the modern golf community. Log scores, support charities, and win monthly prize pools.</p>
          <Button onClick={() => { setAuthMode('signup'); setShowAuth(true); }} className="h-14 px-10 text-lg mx-auto">Get Started</Button>
          
          <div id="concept" className="mt-32 text-left grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-black uppercase mb-6 tracking-tighter leading-none">The Future of <br/><span className="text-orange-500">Social Golf</span></h2>
              <p className="text-lg text-zinc-600 mb-8">Fairway Impact is more than just a score tracker. We've built a platform where your passion for golf directly fuels positive change in the world.</p>
              <div className="space-y-4">
                <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <h4 className="font-bold uppercase mb-2 flex items-center gap-2"><Target className="w-5 h-5 text-orange-500" /> Transparent Draw Mechanics</h4>
                  <p className="text-sm text-zinc-500">Our draw logic is open and verifiable. Whether it's pure random selection or our performance-weighted algorithm, every subscriber has a fair shot at the prize pool.</p>
                </div>
                <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <h4 className="font-bold uppercase mb-2 flex items-center gap-2"><Heart className="w-5 h-5 text-red-500" /> Direct Charity Impact</h4>
                  <p className="text-sm text-zinc-500">20% of every subscription fee is ring-fenced for charity. You choose where your impact goes, and we provide full transparency on total contributions.</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-zinc-100 rounded-[4rem] overflow-hidden rotate-3">
                <img src="https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&q=80&w=1000" alt="Golf" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-black text-white p-8 rounded-[2rem] shadow-2xl -rotate-3">
                <div className="text-4xl font-black tracking-tighter">$5,000+</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Average Monthly Prize</div>
              </div>
            </div>
          </div>

          <div id="features" className="mt-32 grid md:grid-cols-3 gap-8 text-left">
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
      <Navbar user={user} onLogin={handleLogin} onLogout={handleLogout} isAdmin={isAdmin} view={view} setView={setView} onShowAuth={(mode) => { setAuthMode(mode); setShowAuth(true); }} />
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase">{view === 'admin' ? 'Admin Command' : 'Dashboard'}</h1>
            <p className="text-zinc-500 font-medium">{view === 'admin' ? 'System Overview & Controls' : `Welcome, ${profile?.displayName}`}</p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <Button variant="outline" onClick={() => setView(view === 'user' ? 'admin' : 'user')} className="border-black">
                {view === 'user' ? 'Switch to Admin' : 'Switch to Dashboard'}
              </Button>
            )}
            {view === 'user' ? (
              <>
                <Button variant="outline" onClick={() => { setProfileForm({ displayName: profile?.displayName || '', photoURL: profile?.photoURL || '' }); setShowProfileModal(true); }}>
                  Profile
                </Button>
                <Button onClick={() => { setEditingScore(null); setShowScoreModal(true); }} variant="secondary">
                  <Plus className="w-5 h-5" /> Log Round
                </Button>
              </>
            ) : (
              <div className="flex bg-zinc-100 p-1 rounded-full">
                {(['users', 'draws', 'charities', 'winners', 'analytics'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAdminTab(tab)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                      adminTab === tab ? "bg-black text-white shadow-lg" : "text-zinc-400 hover:text-zinc-600"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {view === 'user' && profile?.subscriptionStatus === 'none' && (
          <div className="mb-12 bg-orange-50 border border-orange-100 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-orange-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">Complete Your Setup</h3>
                <p className="text-sm text-orange-800/60 font-medium">Subscribe and pick a charity to enter the next draw.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleSubscribe('monthly')} variant="secondary" className="px-8 h-12">Subscribe Now</Button>
              <Button variant="outline" onClick={() => setShowCharityModal(true)} className="bg-white border-orange-200 text-orange-900 hover:bg-orange-100 px-8 h-12">Pick Charity</Button>
            </div>
          </div>
        )}

        {view === 'admin' ? (
          <div className="space-y-8">
            {adminTab === 'users' && (
              <Card className="p-0 overflow-hidden border-black/10">
                <div className="p-6 bg-zinc-50 border-b flex justify-between items-center">
                  <h3 className="font-black uppercase tracking-tighter text-xl">User Directory</h3>
                  <div className="text-xs font-mono text-zinc-400">{allUsers.length} TOTAL USERS</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-zinc-50/50">
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">User</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Status</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Role</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Donated</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allUsers.map(u => (
                        <tr key={u.uid} className="hover:bg-zinc-50 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={u.photoURL} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                              <div>
                                <div className="font-bold text-sm">{u.displayName}</div>
                                <div className="text-xs text-zinc-400 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-md",
                              u.subscriptionStatus === 'none' ? "bg-zinc-100 text-zinc-400" :
                              u.subscriptionStatus === 'lapsed' ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
                            )}>
                              {u.subscriptionStatus}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{u.role}</span>
                          </td>
                          <td className="p-4 font-mono text-sm">${u.totalDonated}</td>
                          <td className="p-4 text-right">
                            <Button 
                              variant="ghost" 
                              className="h-8 px-3 text-[10px] uppercase font-bold"
                              onClick={() => { setSelectedAdminUser(u); setShowAdminUserModal(true); }}
                            >
                              Manage
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {adminTab === 'draws' && (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="p-0 overflow-hidden">
                    <div className="p-6 border-b bg-zinc-50 flex justify-between items-center">
                      <h3 className="font-black uppercase tracking-tighter text-xl">Draw History</h3>
                      <Button variant="secondary" className="h-8 text-[10px]" onClick={() => { setEditingDraw(null); setNewDraw({ month: '', year: new Date().getFullYear(), prizePool: 1000 }); setShowAdminDrawModal(true); }}>
                        <Plus className="w-3 h-3" /> Create New
                      </Button>
                    </div>
                    <div className="divide-y">
                      {allDraws.map(d => (
                        <div key={d.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-black text-lg uppercase tracking-tight">{d.month} {d.year}</span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                                d.status === 'active' ? "bg-blue-500 text-white" : "bg-zinc-200 text-zinc-600"
                              )}>{d.status}</span>
                            </div>
                            <div className="text-xs font-mono text-zinc-400 flex gap-4">
                              <span>POOL: ${d.prizePool.toLocaleString()}</span>
                              {d.rolloverAmount ? <span>ROLLOVER: ${d.rolloverAmount}</span> : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {d.status === 'active' && (
                              <Button variant="primary" className="h-8 text-[10px] uppercase" onClick={() => { setCurrentDraw(d); setAdminTab('draws'); }}>
                                Run Logic
                              </Button>
                            )}
                            <button onClick={() => { setEditingDraw(d); setNewDraw({ month: d.month, year: d.year, prizePool: d.prizePool }); setShowAdminDrawModal(true); }} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                              <Plus className="w-4 h-4 rotate-45" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card className="p-6 border-black">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black uppercase tracking-tight">Draw Engine</h3>
                      <div className="flex bg-zinc-100 p-1 rounded-lg">
                        <button onClick={() => setDrawType('random')} className={cn("px-3 py-1 text-[10px] font-bold uppercase rounded", drawType === 'random' ? "bg-white shadow-sm" : "text-zinc-400")}>Random</button>
                        <button onClick={() => setDrawType('algorithmic')} className={cn("px-3 py-1 text-[10px] font-bold uppercase rounded", drawType === 'algorithmic' ? "bg-white shadow-sm" : "text-zinc-400")}>Algo</button>
                      </div>
                    </div>

                    {currentDraw?.status === 'active' ? (
                      <div className="space-y-6">
                        <div className="p-6 bg-zinc-900 text-white rounded-2xl text-center">
                          <div className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Target Prize Pool</div>
                          <div className="text-4xl font-black tracking-tighter">${currentDraw.prizePool.toLocaleString()}</div>
                        </div>
                        <Button onClick={() => runSimulation(drawType)} disabled={isSimulating} className="w-full h-14 uppercase tracking-widest font-black">
                          {isSimulating ? 'Processing...' : 'Run Simulation'}
                        </Button>
                      </div>
                    ) : (
                      <div className="p-8 border-2 border-dashed border-zinc-200 rounded-2xl text-center">
                        <Target className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                        <p className="text-xs font-bold uppercase text-zinc-400">No Active Draw Selected</p>
                      </div>
                    )}

                    {simulatedDraw && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-6 pt-6 border-t">
                        <div className="text-center">
                          <div className="text-[10px] font-bold uppercase text-zinc-400 mb-4">Generated Sequence</div>
                          <div className="flex justify-center gap-2">
                            {simulatedDraw.winningNumbers?.map((n, i) => (
                              <div key={i} className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-black shadow-lg shadow-orange-200">{n}</div>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[5, 4, 3].map(m => (
                            <div key={m} className="p-3 bg-zinc-50 rounded-xl text-center">
                              <div className="text-[8px] font-bold text-zinc-400 uppercase">Match {m}</div>
                              <div className="font-black text-lg">{(simulatedDraw.winners as any)?.[`match${m}`]?.length || 0}</div>
                            </div>
                          ))}
                        </div>
                        <Button onClick={publishDraw} variant="secondary" className="w-full h-12 uppercase font-black">Publish to Public</Button>
                      </motion.div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {adminTab === 'charities' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-200 hover:border-black transition-colors cursor-pointer group" onClick={() => { setEditingCharity(null); setNewCharity({ name: '', description: '', logoUrl: '' }); setShowAdminCharityModal(true); }}>
                  <Plus className="w-12 h-12 text-zinc-300 group-hover:text-black transition-colors mb-4" />
                  <span className="font-black uppercase tracking-widest text-xs">Add New Charity</span>
                </Card>
                {charities.map(c => (
                  <Card key={c.id} className="p-0 overflow-hidden flex flex-col">
                    <div className="h-32 bg-zinc-100 flex items-center justify-center font-black text-zinc-300 text-4xl">
                      {c.logoUrl ? <img src={c.logoUrl} className="w-full h-full object-cover" /> : 'LOGO'}
                    </div>
                    <div className="p-6 flex-1">
                      <h4 className="font-black uppercase text-lg mb-2">{c.name}</h4>
                      <p className="text-xs text-zinc-500 line-clamp-3 mb-6">{c.description}</p>
                      <div className="flex items-center justify-between pt-6 border-t">
                        <div className="font-mono text-sm font-bold">${c.totalRaised.toLocaleString()}</div>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingCharity(c); setNewCharity({ name: c.name, description: c.description, logoUrl: c.logoUrl || '' }); setShowAdminCharityModal(true); }} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-black transition-colors">
                            <Plus className="w-4 h-4 rotate-45" />
                          </button>
                          <button onClick={() => handleDeleteCharity(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {adminTab === 'winners' && (
              <Card className="p-0 overflow-hidden">
                <div className="p-6 bg-zinc-50 border-b flex justify-between items-center">
                  <h3 className="font-black uppercase tracking-tighter text-xl">Winner Verification</h3>
                  <div className="text-xs font-mono text-zinc-400">{winnersList.length} TOTAL WINNERS</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-zinc-50/50">
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Draw</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Winner</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Prize</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400">Status</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-zinc-400 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {winnersList.map(w => (
                        <tr key={w.drawId} className="hover:bg-zinc-50 transition-colors">
                          <td className="p-4 font-bold uppercase text-sm">{w.month} {w.year}</td>
                          <td className="p-4">
                            <div className="font-bold text-sm">{w.winnerName}</div>
                            <div className="text-[10px] font-mono text-zinc-400">{w.winnerUid}</div>
                          </td>
                          <td className="p-4 font-mono font-bold text-orange-600">${w.prize.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded",
                              w.verified ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"
                            )}>
                              {w.verified ? 'Payout Completed' : 'Pending Verification'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {!w.verified && (
                              <Button variant="secondary" className="h-8 text-[10px] uppercase" onClick={() => handleVerifyPayout(w.drawId)}>
                                Mark Paid
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {adminTab === 'analytics' && (
              <div className="space-y-8">
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="p-8 bg-black text-white">
                    <div className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Lifetime Prize Pool</div>
                    <div className="text-5xl font-black tracking-tighter">${drawStats.totalPrizes.toLocaleString()}</div>
                    <div className="mt-4 text-[10px] font-mono text-zinc-400 uppercase">Avg ${drawStats.avgPrize.toLocaleString()} per draw</div>
                  </Card>
                  <Card className="p-8">
                    <div className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Total Subscribers</div>
                    <div className="text-5xl font-black tracking-tighter">{allUsers.filter(u => u.subscriptionStatus !== 'none').length}</div>
                    <div className="mt-4 flex gap-2">
                      <span className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-600 rounded uppercase">Active</span>
                      <span className="text-[10px] font-bold px-2 py-1 bg-red-50 text-red-600 rounded uppercase">{allUsers.filter(u => u.subscriptionStatus === 'lapsed').length} Lapsed</span>
                    </div>
                  </Card>
                  <Card className="p-8">
                    <div className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Charity Impact</div>
                    <div className="text-5xl font-black tracking-tighter">${charities.reduce((acc, c) => acc + c.totalRaised, 0).toLocaleString()}</div>
                    <div className="mt-4 text-[10px] font-mono text-zinc-400 uppercase">Across {charities.length} partners</div>
                  </Card>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <Card className="p-8">
                    <h3 className="font-black uppercase tracking-tight mb-8">Charity Contribution Distribution</h3>
                    <div className="space-y-6">
                      {charityStats.map(c => (
                        <div key={c.name} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase">
                            <span>{c.name}</span>
                            <span>{c.percentage.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${c.percentage}%` }}
                              className="h-full bg-black"
                            />
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">${c.total.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-8">
                    <h3 className="font-black uppercase tracking-tight mb-8">Draw Success Rate</h3>
                    <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-zinc-100 rounded-3xl">
                      <div className="text-center">
                        <TrendingUp className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                        <p className="text-xs font-bold uppercase text-zinc-400">Detailed Draw Analytics Coming Soon</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
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
        {showCharityModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b flex justify-between items-center bg-zinc-50">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Support a Cause</h3>
                <button onClick={() => setShowCharityModal(false)} className="w-10 h-10 rounded-full bg-white border border-zinc-100 flex items-center justify-center hover:bg-zinc-50 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="grid sm:grid-cols-2 gap-4">
                  {charities.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { handleSelectCharity(c.id); setShowCharityModal(false); }}
                      className={cn(
                        "p-6 rounded-3xl border-2 text-left transition-all group",
                        profile?.selectedCharityId === c.id ? "border-black bg-black text-white" : "border-zinc-100 hover:border-black"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl mb-4 flex items-center justify-center font-black",
                        profile?.selectedCharityId === c.id ? "bg-white/20 text-white" : "bg-zinc-50 text-zinc-300 group-hover:text-black"
                      )}>LOGO</div>
                      <h4 className="font-bold uppercase mb-1">{c.name}</h4>
                      <p className={cn(
                        "text-[10px] line-clamp-2",
                        profile?.selectedCharityId === c.id ? "text-zinc-400" : "text-zinc-500"
                      )}>{c.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-8 bg-zinc-50 border-t">
                <p className="text-[10px] text-zinc-400 font-medium text-center uppercase tracking-widest">
                  20% of your subscription will be donated to your selected charity
                </p>
              </div>
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
              <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => setShowProofModal(false)}>Cancel</Button>
            </motion.div>
          </div>
        )}
        {showAdminUserModal && selectedAdminUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter">User Command: {selectedAdminUser.displayName}</h2>
                <button onClick={() => setShowAdminUserModal(false)} className="p-2 hover:bg-zinc-100 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <form onSubmit={handleUpdateUserAdmin} className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Profile Configuration</h3>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Display Name</label>
                      <input required type="text" value={selectedAdminUser.displayName} onChange={e => setSelectedAdminUser({...selectedAdminUser, displayName: e.target.value})} className="w-full p-4 bg-zinc-50 rounded-xl border" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Subscription Status</label>
                      <select value={selectedAdminUser.subscriptionStatus} onChange={e => setSelectedAdminUser({...selectedAdminUser, subscriptionStatus: e.target.value as any})} className="w-full p-4 bg-zinc-50 rounded-xl border">
                        <option value="none">None</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                        <option value="lapsed">Lapsed</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Role</label>
                      <select value={selectedAdminUser.role} onChange={e => setSelectedAdminUser({...selectedAdminUser, role: e.target.value as any})} className="w-full p-4 bg-zinc-50 rounded-xl border">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full py-4 uppercase font-black tracking-widest">Update Profile</Button>
                </form>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Golf Scores</h3>
                    <Button variant="outline" className="h-8 text-[10px]" onClick={() => { setEditingScore(null); setNewScore({ courseName: '', points: 36, date: new Date().toISOString().split('T')[0] }); setShowAdminScoreModal(true); }}>
                      <Plus className="w-3 h-3" /> Add Score
                    </Button>
                  </div>
                  <div className="bg-zinc-50 rounded-2xl p-4 space-y-2">
                    {adminUserScores.length > 0 ? adminUserScores.map(s => (
                      <div key={s.id} className="bg-white p-3 rounded-xl border flex justify-between items-center group">
                        <div>
                          <div className="font-bold text-xs">{s.courseName}</div>
                          <div className="text-[10px] text-zinc-400">{new Date(s.date).toLocaleDateString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-black text-lg">{s.stablefordPoints}</div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingScore(s); setNewScore({ courseName: s.courseName, points: s.stablefordPoints, date: new Date(s.date).toISOString().split('T')[0] }); setShowAdminScoreModal(true); }} className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-black"><Plus className="w-3 h-3 rotate-45" /></button>
                            <button onClick={() => handleDeleteScore(s.id)} className="p-1 hover:bg-red-50 rounded text-zinc-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    )) : <div className="text-center py-8 text-zinc-400 text-xs italic">No scores logged</div>}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {showAdminScoreModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md">
              <h2 className="text-2xl font-black uppercase mb-6">{editingScore ? 'Edit Score' : 'Add Score'}</h2>
              <form onSubmit={handleAdminSaveScore} className="space-y-4">
                <input required type="text" value={newScore.courseName} onChange={e => setNewScore({...newScore, courseName: e.target.value})} placeholder="Course Name" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                <div className="grid grid-cols-2 gap-4">
                  <input required type="number" value={newScore.points} onChange={e => setNewScore({...newScore, points: Number(e.target.value)})} placeholder="Points" className="w-full p-4 bg-zinc-50 rounded-xl border" />
                  <input required type="date" value={newScore.date} onChange={e => setNewScore({...newScore, date: e.target.value})} className="w-full p-4 bg-zinc-50 rounded-xl border" />
                </div>
                <Button type="submit" className="w-full py-4 uppercase font-black tracking-widest">Save Score</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowAdminScoreModal(false)}>Cancel</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
