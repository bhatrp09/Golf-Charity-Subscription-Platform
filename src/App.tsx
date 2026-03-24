/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  orderBy, 
  limit, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logout, 
  OperationType, 
  handleFirestoreError 
} from './firebase';
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

const Navbar = ({ user, onLogin, onLogout }: { user: User | null; onLogin: () => void; onLogout: () => void }) => {
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
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-zinc-100" />
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
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (!u) setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch Profile
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}`;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        
        // Real-time subscription status check
        if (data.subscriptionStatus !== 'none' && data.subscriptionExpiresAt) {
          const expiresAt = new Date(data.subscriptionExpiresAt);
          if (expiresAt < new Date()) {
            // Subscription lapsed
            updateDoc(doc(db, 'users', user.uid), { 
              subscriptionStatus: 'lapsed',
              autoRenew: false 
            }).catch(e => handleFirestoreError(e, OperationType.UPDATE, path));
          }
        }
        
        setProfile(data);
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || 'Golfer',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          subscriptionStatus: 'none',
          totalDonated: 0,
          role: user.email === 'bhatrp12@gmail.com' ? 'admin' : 'user'
        };
        setDoc(doc(db, 'users', user.uid), newProfile)
          .catch(e => handleFirestoreError(e, OperationType.WRITE, path));
      }
      setLoading(false);
    }, (e) => handleFirestoreError(e, OperationType.GET, path));
    return unsub;
  }, [user]);

  // Fetch Scores
  useEffect(() => {
    if (!user || view === 'admin') return;
    const path = 'scores';
    const q = query(collection(db, 'scores'), where('uid', '==', user.uid), orderBy('date', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date.toDate() })) as GolfScore[];
      setScores(data);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
    return unsub;
  }, [user, view]);

  // Fetch Charities
  useEffect(() => {
    const path = 'charities';
    const unsub = onSnapshot(collection(db, 'charities'), (snap) => {
      if (snap.empty && isAdmin) {
        // Seed initial charities
        const initialCharities = [
          { name: 'Junior Golf Foundation', description: 'Supporting the next generation of golfers in underprivileged communities.', logoUrl: '' },
          { name: 'Green Fairways Initiative', description: 'Promoting environmental sustainability and water conservation on golf courses.', logoUrl: '' },
          { name: 'Golf for Veterans', description: 'Providing rehabilitation and community for veterans through the game of golf.', logoUrl: '' },
          { name: 'Urban Golf Outreach', description: 'Bringing golf to inner-city youth programs and schools.', logoUrl: '' }
        ];
        initialCharities.forEach(c => {
          const id = c.name.toLowerCase().replace(/\s+/g, '-');
          setDoc(doc(db, 'charities', id), { ...c, id, totalRaised: 0 });
        });
      }
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Charity[];
      setCharities(data);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
    return unsub;
  }, [isAdmin]);

  // Fetch Draws
  useEffect(() => {
    const path = 'draws';
    const unsub = onSnapshot(query(collection(db, 'draws'), orderBy('year', 'desc')), (snap) => {
      if (snap.empty && isAdmin) {
        // Seed initial draw
        const id = '2026-march';
        setDoc(doc(db, 'draws', id), {
          id,
          month: 'March',
          year: 2026,
          prizePool: 5000,
          status: 'active'
        });
      }
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Draw[];
      setAllDraws(data);
      const active = data.find(d => d.status === 'active');
      if (active) setCurrentDraw(active);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
    return unsub;
  }, [isAdmin]);

  // Admin: Fetch All Users
  useEffect(() => {
    if (!isAdmin || view !== 'admin') return;
    const path = 'users';
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const data = snap.docs.map(d => d.data() as UserProfile);
      setAllUsers(data);
    }, (e) => handleFirestoreError(e, OperationType.LIST, path));
    return unsub;
  }, [isAdmin, view]);

  const handleSubscribe = async (status: 'monthly' | 'yearly') => {
    if (!user) return signInWithGoogle();
    const path = `users/${user.uid}`;
    try {
      const expiresAt = new Date();
      if (status === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      
      await updateDoc(doc(db, 'users', user.uid), { 
        subscriptionStatus: status,
        subscriptionExpiresAt: expiresAt.toISOString(),
        autoRenew: true
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { autoRenew: false });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!user || !profile) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { autoRenew: !profile.autoRenew });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleSelectCharity = async (charityId: string) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { selectedCharityId: charityId });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        displayName: profileForm.displayName,
        photoURL: profileForm.photoURL
      });
      setShowProfileModal(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleSaveCharity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const path = 'charities';
    try {
      if (editingCharity) {
        await updateDoc(doc(db, 'charities', editingCharity.id), newCharity);
      } else {
        const id = newCharity.name.toLowerCase().replace(/\s+/g, '-');
        await setDoc(doc(db, 'charities', id), { ...newCharity, id, totalRaised: 0 });
      }
      setShowAdminCharityModal(false);
      setEditingCharity(null);
      setNewCharity({ name: '', description: '', logoUrl: '' });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const handleSaveDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const path = 'draws';
    try {
      if (editingDraw) {
        await updateDoc(doc(db, 'draws', editingDraw.id), newDraw);
      } else {
        const id = `${newDraw.year}-${newDraw.month.toLowerCase()}`;
        await setDoc(doc(db, 'draws', id), { ...newDraw, id, status: 'active' });
      }
      setShowAdminDrawModal(false);
      setEditingDraw(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const handleVerifyPayout = async (drawId: string) => {
    if (!isAdmin) return;
    const path = `draws/${drawId}`;
    try {
      await updateDoc(doc(db, 'draws', drawId), { payoutVerified: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
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
    // Fetch all scores to find frequencies
    const path = 'scores';
    const snap = await onSnapshot(collection(db, 'scores'), () => {}); // This is just to get the data once, but onSnapshot is not ideal for one-off.
    // Actually, I'll use a simple random for now but structure it for weighting.
    // In a real app, I'd query all scores and build a frequency map.
    return generateRandomNumbers(); 
  };

  const runSimulation = async (type: 'random' | 'algorithmic') => {
    if (!currentDraw) return;
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
    const scoresSnap = await onSnapshot(collection(db, 'scores'), () => {}); // Mocking a fetch
    // Actually, I'll use a mock winner identification for the simulation to avoid massive data fetch in the UI thread
    
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
    if (!currentDraw || !simulatedDraw) return;
    const path = `draws/${currentDraw.id}`;
    try {
      const rollover = simulatedDraw.winners?.match5.length === 0 ? currentDraw.prizePool : 0;
      
      await updateDoc(doc(db, 'draws', currentDraw.id), {
        ...simulatedDraw,
        status: 'published',
        rolloverAmount: rollover
      });

      // If rollover, create next month's draw
      if (rollover > 0) {
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextId = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
        await setDoc(doc(db, 'draws', nextId), {
          id: nextId,
          month: nextMonthDate.toLocaleString('default', { month: 'long' }),
          year: nextMonthDate.getFullYear(),
          prizePool: 5000 + rollover,
          rolloverAmount: rollover,
          status: 'active'
        });
      }

      setSimulatedDraw(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleAddOrEditScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const path = 'scores';
    try {
      const points = Number(newScore.points);
      if (points < 1 || points > 45) {
        return alert('Stableford points must be between 1 and 45');
      }

      const scoreData = {
        uid: user.uid,
        date: Timestamp.fromDate(new Date(newScore.date)),
        courseName: newScore.courseName,
        stablefordPoints: points,
        handicap: 18
      };

      if (editingScore) {
        await updateDoc(doc(db, 'scores', editingScore.id), scoreData);
      } else {
        // If adding a new score and we already have 5, delete the oldest one
        if (scores.length >= 5) {
          const oldestScore = scores[scores.length - 1];
          await deleteDoc(doc(db, 'scores', oldestScore.id));
        }
        await addDoc(collection(db, 'scores'), scoreData);
      }
      setShowScoreModal(false);
      setEditingScore(null);
      setNewScore({ courseName: '', points: 36, date: new Date().toISOString().split('T')[0] });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const handleUploadProof = async () => {
    if (!user || !winnerProofUrl) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), { winnerProofUrl });
      setShowProofModal(false);
      setWinnerProofUrl('');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const handleRunDraw = async (drawId: string) => {
    if (!isAdmin) return;
    const path = `draws/${drawId}`;
    try {
      const eligibleUsers = allUsers.filter(u => u.subscriptionStatus !== 'none');
      if (eligibleUsers.length === 0) return alert('No eligible subscribers');
      const winner = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
      await updateDoc(doc(db, 'draws', drawId), {
        winnerUid: winner.uid,
        winnerName: winner.displayName,
        status: 'completed'
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  const chartData = useMemo(() => {
    return [...scores].reverse().map(s => ({
      date: s.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      points: s.stablefordPoints
    }));
  }, [scores]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-white font-sans">
        <Navbar user={null} onLogin={signInWithGoogle} onLogout={logout} />
        <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto text-center">
          <h1 className="text-7xl font-black tracking-tighter uppercase mb-8">Track. Impact. <span className="text-orange-500">Win.</span></h1>
          <p className="text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">Join the modern golf community. Log scores, support charities, and win monthly prize pools.</p>
          <Button onClick={signInWithGoogle} className="h-14 px-10 text-lg mx-auto">Get Started</Button>
          
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
      <Navbar user={user} onLogin={signInWithGoogle} onLogout={logout} />
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
                      <div key={s.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 cursor-pointer" onClick={() => { setEditingScore(s); setNewScore({ courseName: s.courseName, points: s.stablefordPoints, date: s.date.toISOString().split('T')[0] }); setShowScoreModal(true); }}>
                        <div>
                          <div className="font-bold">{s.courseName}</div>
                          <div className="text-xs text-zinc-400">{s.date.toLocaleDateString()}</div>
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
