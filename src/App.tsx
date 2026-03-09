import { useState, useEffect } from 'react';
import { Trophy, User, BookOpen, Settings as SettingsIcon, Wallet, Info, ListChecks, RotateCcw, UserPlus, Trash2, UserCheck, ChevronDown, ChevronUp, Check, X, Sliders, MapPin, Plus, Edit2, Save, UserMinus } from 'lucide-react';
import './App.css';

interface Tee { name: string; rating: number; slope: number; }
interface Hole { number: number; par: number; handicap: number; }
interface Course { id: string; name: string; holes: Hole[]; tees: Tee[]; }
interface Player { id: string; name: string; index: number; indexInput: string; selectedTeeIndex: number; courseHandicap: number; }
interface Partner { name: string; index: number; indexInput: string; selectedTeeIndex: number; }
interface Score { [playerId: string]: { [holeNumber: number]: number }; }
interface Press { id: number; startHole: number; score: number; }
interface MatchSegment { segment: number; team1: string[]; team2: string[]; }
interface IndependentMatch { 
    id: string; 
    p1Id: string; 
    p2Id: string; 
    type: '18-hole' | 'nassau'; 
    stake: number; 
    stake9?: number; 
    stake18?: number; 
    pressStake?: number;
    pressStake9?: number;
    pressStake18?: number;
    useAutoPress: boolean;
    autoPressTrigger?: '2-down' | 'closed-out';
}

interface IndependentManualPresses {
    [matchId: string]: {
        overall: number[];
        front: number[];
        back: number[];
    }
}

interface FourBallStakes {
    type: '18-hole' | 'nassau';
    mainFront: number;
    pressFront: number;
    mainBack: number;
    pressBack: number;
    mainOverall: number;
    pressOverall: number;
}

interface GameSettings {
  strokeAllocation: 'divided' | 'handicap';
  remainderLogic: 'standard' | 'alwaysHalf';
  useSecondBallTieBreaker: boolean;
  useAutoPress: boolean;
  autoPressTrigger: '2-down' | 'closed-out';
}

const DEFAULT_HOLES: Hole[] = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, handicap: i + 1 }));
const MEADOW_CLUB: Course = {
  id: 'meadow-club',
  name: 'Meadow Club',
  holes: [
    { number: 1, par: 5, handicap: 13 }, { number: 2, par: 4, handicap: 9 }, { number: 3, par: 4, handicap: 1 },
    { number: 4, par: 4, handicap: 11 }, { number: 5, par: 3, handicap: 15 }, { number: 6, par: 4, handicap: 7 },
    { number: 7, par: 4, handicap: 5 }, { number: 8, par: 3, handicap: 17 }, { number: 9, par: 4, handicap: 3 },
    { number: 10, par: 4, handicap: 6 }, { number: 11, par: 3, handicap: 18 }, { number: 12, par: 4, handicap: 16 },
    { number: 13, par: 5, handicap: 12 }, { number: 14, par: 3, handicap: 4 }, { number: 15, par: 5, handicap: 10 },
    { number: 16, par: 4, handicap: 14 }, { number: 17, par: 4, handicap: 2 }, { number: 18, par: 4, handicap: 8 }
  ],
  tees: [
    { name: 'Black', rating: 72.8, slope: 136 }, { name: 'Blue', rating: 72.0, slope: 135 },
    { name: 'White', rating: 70.6, slope: 132 }, { name: 'Gold', rating: 69.5, slope: 128 },
  ]
};

const OLYMPIC_LAKE: Course = {
  id: 'olympic-lake',
  name: 'Olympic Club (Lake)',
  holes: [
    { number: 1, par: 5, handicap: 13 }, { number: 2, par: 4, handicap: 5 }, { number: 3, par: 3, handicap: 11 },
    { number: 4, par: 4, handicap: 7 }, { number: 5, par: 4, handicap: 1 }, { number: 6, par: 4, handicap: 3 },
    { number: 7, par: 4, handicap: 17 }, { number: 8, par: 3, handicap: 15 }, { number: 9, par: 4, handicap: 9 },
    { number: 10, par: 4, handicap: 10 }, { number: 11, par: 4, handicap: 4 }, { number: 12, par: 4, handicap: 8 },
    { number: 13, par: 3, handicap: 16 }, { number: 14, par: 4, handicap: 6 }, { number: 15, par: 3, handicap: 18 },
    { number: 16, par: 5, handicap: 2 }, { number: 17, par: 5, handicap: 14 }, { number: 18, par: 4, handicap: 12 }
  ],
  tees: [
    { name: 'Black', rating: 75.0, slope: 138 },
    { name: 'Blue/Black', rating: 74.0, slope: 136 },
    { name: 'Blue', rating: 73.2, slope: 134 },
    { name: 'Blue/White', rating: 72.4, slope: 132 },
    { name: 'White', rating: 71.8, slope: 130 },
  ]
};

const CHAD_COMMENTS = [
  "Classic Chad... somehow that ball found the hole. Pure luck.",
  "Unbelievable. Another birdie for Chad. Does he ever miss a lucky break?",
  "Miracle at Meadow Club! Sarcastic applause ensues for Chad's lucky break.",
  "Did that hit a tree and kick in? Typical Chad luck.",
  "Chad with a birdie. Even Alister MacKenzie is shaking his head at that lucky bounce.",
  "The luckiest golfer in Fairfax strikes again. Unbelievable.",
  "How much did you pay the greenskeeper for that roll, Chad?"
];

const STORAGE_KEYS = {
  GAME_MODE: 'robalter_gameMode',
  PLAYERS: 'robalter_players',
  SCORES: 'robalter_scores',
  MAIN_STAKE: 'robalter_mainStake',
  PRESS_STAKE: 'robalter_pressStake',
  FOUR_BALL_STAKES: 'robalter_fourBallStakes',
  SEGMENTS: 'robalter_segments',
  PARTNERS: 'robalter_partners',
  VISIBILITY: 'robalter_visibility',
  SETTINGS: 'robalter_gameSettings',
  COURSES: 'robalter_courses',
  SELECTED_COURSE: 'robalter_selectedCourseId',
  INDEPENDENT_MATCHES: 'robalter_independentMatches',
  MANUAL_PRESSES: 'robalter_manualPresses_v2',
  IND_MANUAL_PRESSES: 'robalter_indManualPresses'
};

const DEFAULT_PLAYERS: Player[] = [
  { id: '1', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0 },
  { id: '2', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0 },
  { id: '3', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0 },
  { id: '4', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0 },
  { id: '5', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0 },
];

function App() {
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURSES);
      let list = saved ? JSON.parse(saved) : [MEADOW_CLUB, OLYMPIC_LAKE];
      const existingIdx = list.findIndex((c: Course) => c.id === 'olympic-lake');
      if (existingIdx >= 0) list[existingIdx] = OLYMPIC_LAKE;
      else list.push(OLYMPIC_LAKE);
      return list;
    } catch { return [MEADOW_CLUB, OLYMPIC_LAKE]; }
  });
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_COURSE) || MEADOW_CLUB.id;
  });
  
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0] || MEADOW_CLUB;

  const [gameMode, setGameMode] = useState<'sixes' | 'wheel' | 'four-ball'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_MODE);
    return (saved as 'sixes' | 'wheel' | 'four-ball') || 'sixes';
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PLAYERS);
      return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
    } catch { return JSON.parse(JSON.stringify(DEFAULT_PLAYERS)); }
  });

  const [partners, setPartners] = useState<Partner[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PARTNERS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const defaults: GameSettings = {
        strokeAllocation: 'divided',
        remainderLogic: 'standard',
        useSecondBallTieBreaker: true,
        useAutoPress: true,
        autoPressTrigger: '2-down'
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return {
        strokeAllocation: 'divided',
        remainderLogic: 'standard',
        useSecondBallTieBreaker: true,
        useAutoPress: true,
        autoPressTrigger: '2-down'
      }; }
  });

  const [independentMatches, setIndependentMatches] = useState<IndependentMatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INDEPENDENT_MATCHES);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [manualPresses, setManualPresses] = useState<{ [seg: number]: { [matchIdx: number]: number[] } }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MANUAL_PRESSES);
      if (!saved) return { 0: { 0: [] }, 1: { 0: [] }, 2: { 0: [] } };
      return JSON.parse(saved);
    } catch { return { 0: { 0: [] }, 1: { 0: [] }, 2: { 0: [] } }; }
  });

  const [indManualPresses, setIndManualPresses] = useState<IndependentManualPresses>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.IND_MANUAL_PRESSES);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [pressInputs, setPressInputs] = useState<{ [key: string]: string }>({});
  const [visibleSections, setVisibleSections] = useState({ partners: false, summary: true, stakes: true, courses: false, independent: true });
  const [activeTab, setActiveTab] = useState<'setup' | 'scores' | 'results' | 'rules'>('setup');
  
  const [scores, setScores] = useState<Score>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCORES);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [mainStake, setMainStake] = useState<number>(10);
  const [pressStake, setPressStake] = useState<number>(5);

  const [fourBallStakes, setFourBallStakes] = useState<FourBallStakes>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FOUR_BALL_STAKES);
      const defaults: FourBallStakes = {
        type: 'nassau',
        mainFront: 10, pressFront: 5,
        mainBack: 10, pressBack: 5,
        mainOverall: 10, pressOverall: 5
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return {
        type: 'nassau',
        mainFront: 10, pressFront: 5,
        mainBack: 10, pressBack: 5,
        mainOverall: 10, pressOverall: 5
      }; }
  });

  const [segments, setSegments] = useState<MatchSegment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEGMENTS);
      return saved ? JSON.parse(saved) : [
        { segment: 1, team1: [], team2: [] }, { segment: 2, team1: [], team2: [] }, { segment: 3, team1: [], team2: [] },
      ];
    } catch { return [
        { segment: 1, team1: [], team2: [] }, { segment: 2, team1: [], team2: [] }, { segment: 3, team1: [], team2: [] },
      ]; }
  });

  const [easterEgg, setEasterEgg] = useState<string | null>(null);

  // Persistence Effects
  useEffect(() => localStorage.setItem(STORAGE_KEYS.GAME_MODE, gameMode), [gameMode]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players)), [players]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores)), [scores]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SEGMENTS, JSON.stringify(segments)), [segments]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PARTNERS, JSON.stringify(partners)), [partners]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses)), [courses]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SELECTED_COURSE, selectedCourseId), [selectedCourseId]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.INDEPENDENT_MATCHES, JSON.stringify(independentMatches)), [independentMatches]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.MANUAL_PRESSES, JSON.stringify(manualPresses)), [manualPresses]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.IND_MANUAL_PRESSES, JSON.stringify(indManualPresses)), [indManualPresses]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.FOUR_BALL_STAKES, JSON.stringify(fourBallStakes)), [fourBallStakes]);

  const activePlayers = (gameMode === 'sixes' || gameMode === 'four-ball') ? players.slice(0, 4) : players;
  const calculateCH = (idx: number, tee: Tee) => Math.round(idx * (tee.slope / 113) + (tee.rating - 71));

  const updatePlayer = (id: string, field: 'name' | 'index' | 'tee', value: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== id) return p;
      const up = { ...p };
      if (field === 'name') up.name = value;
      if (field === 'index') {
        up.indexInput = value;
        const isPlus = value.startsWith('+');
        const num = parseFloat(value.replace('+', '')) || 0;
        up.index = isPlus ? -num : num;
      }
      if (field === 'tee') up.selectedTeeIndex = parseInt(value);
      const tee = selectedCourse.tees[up.selectedTeeIndex] || selectedCourse.tees[0];
      up.courseHandicap = calculateCH(up.index, tee);
      return up;
    }));
  };

  const clearPlayer = (id: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0 };
    }));
  };

  const toggleSection = (section: keyof typeof visibleSections) => {
    setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const saveCourse = () => {
    if (!editingCourse || !editingCourse.name) return;
    setCourses(prev => {
        const idx = prev.findIndex(c => c.id === editingCourse.id);
        if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = editingCourse;
            return updated;
        }
        return [...prev, editingCourse];
    });
    setIsCourseModalOpen(false);
    setEditingCourse(null);
  };

  const editCourse = (c: Course) => { setEditingCourse(JSON.parse(JSON.stringify(c))); setIsCourseModalOpen(true); };
  const startNewCourse = () => { setEditingCourse({ id: Date.now().toString(), name: '', holes: DEFAULT_HOLES.map(h => ({ ...h })), tees: [{ name: 'Default', rating: 72.0, slope: 113 }] }); setIsCourseModalOpen(true); };

  const deleteCourse = (id: string) => {
    if (id === 'meadow-club' || id === 'olympic-lake') return;
    const courseToDelete = courses.find(c => c.id === id);
    if (courseToDelete && window.confirm(`Are you sure?`)) {
        setCourses(prev => prev.filter(c => c.id !== id));
        if (selectedCourseId === id) setSelectedCourseId(MEADOW_CLUB.id);
    }
  };

  const handleGameModeChange = (newMode: 'sixes' | 'wheel' | 'four-ball') => {
    if (newMode === gameMode) return;
    const confirmed = window.confirm(`Switching to ${newMode === 'four-ball' ? 'Four Ball' : newMode === 'sixes' ? 'Sixes' : 'The Wheel'} will reset all team pairings for this round. Scores and players will be kept. Continue?`);
    if (confirmed) {
        setGameMode(newMode);
        setSegments([
            { segment: 1, team1: [], team2: [] },
            { segment: 2, team1: [], team2: [] },
            { segment: 3, team1: [], team2: [] },
        ]);
        setManualPresses({ 0: { 0: [] }, 1: { 0: [] }, 2: { 0: [] } });
    }
  };

  const addIndependentMatch = () => {
    const pWithNames = activePlayers.filter(p => p.name);
    if (pWithNames.length < 2) return;
    const newMatch: IndependentMatch = { 
        id: Date.now().toString(), 
        p1Id: pWithNames[0].id, 
        p2Id: pWithNames[1].id, 
        type: '18-hole', 
        stake: 10, 
        stake9: 5,
        stake18: 10,
        pressStake: 5,
        pressStake9: 2,
        pressStake18: 5,
        useAutoPress: false,
        autoPressTrigger: '2-down'
    };
    setIndependentMatches([...independentMatches, newMatch]);
    setIndManualPresses(prev => ({ ...prev, [newMatch.id]: { overall: [], front: [], back: [] } }));
  };

  const updateIndependentMatch = (id: string, field: keyof IndependentMatch, value: any) => {
    setIndependentMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const deleteIndependentMatch = (id: string) => {
    setIndependentMatches(prev => prev.filter(m => m.id !== id));
    setIndManualPresses(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
  };

  const updatePartnerIndex = (name: string, value: string) => {
    const isPlus = value.startsWith('+');
    const num = parseFloat(value.replace('+', '')) || 0;
    const newIndex = isPlus ? -num : num;
    setPartners(prev => prev.map(pt => pt.name === name ? { ...pt, indexInput: value, index: newIndex } : pt));
    setPlayers(prev => prev.map(p => {
      if (p.name !== name) return p;
      const tee = selectedCourse.tees[p.selectedTeeIndex] || selectedCourse.tees[0];
      return { ...p, indexInput: value, index: newIndex, courseHandicap: calculateCH(newIndex, tee) };
    }));
  };

  const addPartner = (p: Player) => {
    if (!p.name) return;
    const newPartner: Partner = { name: p.name, index: p.index, indexInput: p.indexInput, selectedTeeIndex: p.selectedTeeIndex };
    if (partners.some(pt => pt.name === p.name)) {
        setPartners(prev => prev.map(pt => pt.name === p.name ? newPartner : pt));
    } else setPartners(prev => [...prev, newPartner]);
  };

  const deletePartner = (name: string) => setPartners(prev => prev.filter(pt => pt.name !== name));

  const loadPartner = (pId: string, partner: Partner) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== pId) return p;
      const teeIdx = partner.selectedTeeIndex < selectedCourse.tees.length ? partner.selectedTeeIndex : 0;
      return { ...p, name: partner.name, index: partner.index, indexInput: partner.indexInput, selectedTeeIndex: teeIdx, courseHandicap: calculateCH(partner.index, selectedCourse.tees[teeIdx]) };
    }));
  };

  const resetData = () => {
    if (window.confirm('WARNING: This will delete ALL scores, players, pairings and independent matches for this round. Continue?')) {
      setScores({});
      setPlayers(JSON.parse(JSON.stringify(DEFAULT_PLAYERS)));
      setIndependentMatches([]);
      setManualPresses({ 0: { 0: [] }, 1: { 0: [] }, 2: { 0: [] } });
      setIndManualPresses({});
      setSegments([{ segment: 1, team1: [], team2: [] }, { segment: 2, team1: [], team2: [] }, { segment: 3, team1: [], team2: [] }]);
    }
  };

  const baselineCH = activePlayers.some(p => p.name) ? Math.min(...activePlayers.filter(p => p.name).map(p => p.courseHandicap)) : 0;

  const getStrokesPerSix = (p: Player) => {
    if (!p.name) return 0;
    const relativeTotal = p.courseHandicap - baselineCH;
    const rawPerSix = relativeTotal / 3;
    const whole = Math.floor(rawPerSix);
    if (settings.remainderLogic === 'standard') return (rawPerSix - whole) >= 0.5 ? whole + 0.5 : whole;
    return (rawPerSix > whole) ? whole + 0.5 : whole;
  };

  const getStrokesForHole = (pId: string, hNum: number) => {
    const p = activePlayers.find(pl => pl.id === pId);
    if (!p || !p.name) return 0;
    const relativeTotal = p.courseHandicap - baselineCH;
    
    // For Four Ball, we use standard handicap ranking for 18 holes
    if (gameMode === 'four-ball' || settings.strokeAllocation === 'handicap') {
      const hole = selectedCourse.holes.find(h => h.number === hNum);
      return (hole && hole.handicap <= relativeTotal) ? 1 : 0;
    } else {
      const strokesPerSix = getStrokesPerSix(p);
      const sIdx = Math.floor((hNum - 1) / 6);
      const sHoles = selectedCourse.holes.slice(sIdx * 6, sIdx * 6 + 6).sort((a, b) => a.handicap - b.handicap);
      const hRank = sHoles.findIndex(h => h.number === hNum);
      if (hRank < Math.floor(strokesPerSix)) return 1;
      if (hRank === Math.floor(strokesPerSix) && strokesPerSix % 1 !== 0) return 0.5;
      return 0;
    }
  };

  const getIndependentStrokesForHole = (p1Id: string, p2Id: string, hNum: number) => {
    const p1 = activePlayers.find(p => p.id === p1Id), p2 = activePlayers.find(p => p.id === p2Id);
    if (!p1 || !p2) return 0;
    const diff = p1.courseHandicap - p2.courseHandicap;
    const hole = selectedCourse.holes.find(h => h.number === hNum);
    if (!hole) return 0;
    if (diff > 0) return hole.handicap <= diff ? 1 : 0;
    if (diff < 0) return hole.handicap <= Math.abs(diff) ? -1 : 0;
    return 0;
  };

  const getNetScore = (pId: string, hNum: number) => {
    const g = scores[pId]?.[hNum];
    return g ? g - getStrokesForHole(pId, hNum) : null;
  };

  const calculateIndependentMatchResult = (m: IndependentMatch) => {
    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    const mManual = indManualPresses[m.id] || { overall: [], front: [], back: [] };
    const calculateSide = (hList: number[], sideMain: number, sidePress: number, manualHoles: number[], triggerOverride?: '2-down' | 'closed-out') => {
        let score = 0;
        let presses: { startHole: number; score: number; payout: number; display: string }[] = [];
        (manualHoles || []).forEach(h => presses.push({ startHole: h, score: 0, payout: 0, display: '' }));
        const trigger = triggerOverride || settings.autoPressTrigger;
        hList.forEach((h, i) => {
            const g1 = scores[m.p1Id]?.[h], g2 = scores[m.p2Id]?.[h];
            if (g1 === undefined || g2 === undefined) return;
            const hs = getIndependentStrokesForHole(m.p1Id, m.p2Id, h);
            const diff = (g1 - (hs > 0 ? hs : 0)) - (g2 - (hs < 0 ? Math.abs(hs) : 0));
            const updateInd = (curr: number) => (diff < 0 ? curr + 1 : diff > 0 ? curr - 1 : curr);
            score = updateInd(score);
            presses = presses.map(p => h >= p.startHole ? { ...p, score: updateInd(p.score) } : p);
            
            const holesLeft = hList.length - (i + 1);
            const lastPressScore = presses.length > 0 ? presses[presses.length-1].score : score;
            const isClosed = Math.abs(lastPressScore) > holesLeft;
            const isTwoDown = Math.abs(lastPressScore) >= 2;
            const autoTriggered = trigger === 'closed-out' ? isClosed : isTwoDown;
            if (m.useAutoPress && autoTriggered && holesLeft > 0) {
                if (trigger === '2-down' || isClosed) {
                    if (!presses.some(p => p.startHole === h + 1)) {
                        presses.push({ startHole: h + 1, score: 0, payout: 0, display: '' });
                    }
                }
            }
        });
        const p1N = activePlayers.find(pl => pl.id === m.p1Id)?.name?.split(' ')[0] || 'P1';
        const p2N = activePlayers.find(pl => pl.id === m.p2Id)?.name?.split(' ')[0] || 'P2';
        presses = presses.map(p => ({ ...p, payout: p.score > 0 ? sidePress : p.score < 0 ? -sidePress : 0, 
            display: p.score === 0 ? "AS" : `${p.score > 0 ? p1N : p2N} ${Math.abs(p.score)} UP` }));
        return { score, payout: (score > 0 ? sideMain : score < 0 ? -sideMain : 0) + presses.reduce((sum, p) => sum + p.payout, 0), presses };
    };
    const p1N = activePlayers.find(pl => pl.id === m.p1Id)?.name?.split(' ')[0] || 'P1';
    const p2N = activePlayers.find(pl => pl.id === m.p2Id)?.name?.split(' ')[0] || 'P2';
    const formatUP = (score: number) => score === 0 ? "AS" : `${score > 0 ? p1N : p2N} ${Math.abs(score)} UP`;
    const trigger = m.autoPressTrigger || settings.autoPressTrigger;
    if (m.type === '18-hole') {
        const resO = calculateSide(holes, m.stake, m.pressStake || 5, mManual.overall, trigger);
        return { payout: resO.payout, overall: resO, display: formatUP(resO.score), pressDetail: resO.presses.map(p => ({...p, label: 'Overall'})) };
    } else {
        const front = calculateSide(holes.slice(0, 9), m.stake9 || 5, m.pressStake9 || 2, mManual.front, trigger);
        const back = calculateSide(holes.slice(9, 18), m.stake9 || 5, m.pressStake9 || 2, mManual.back, trigger);
        const overall = calculateSide(holes, m.stake18 || 10, m.pressStake18 || 5, mManual.overall, trigger);
        return { payout: front.payout + back.payout + overall.payout, front, back, overall, display: `Front 9: ${formatUP(front.score)} | Back 9: ${formatUP(back.score)} | Full 18: ${formatUP(overall.score)}`, 
            pressDetail: [...front.presses.map(p => ({...p, label: 'Front 9'})), ...back.presses.map(p => ({...p, label: 'Back 9'})), ...overall.presses.map(p => ({...p, label: 'Full 18'}))] };
    }
  };

  const addSegmentManualPress = (segId: number, matchIdx: number) => {
    const inputKey = `seg-${segId}-${matchIdx}`;
    const hole = parseInt(pressInputs[inputKey] || '');
    if (!hole) return;
    const start = segId * 6 + 1;
    const end = start + 5;
    if (gameMode !== 'four-ball' && (hole < start || hole > end)) return;
    if (gameMode === 'four-ball') {
        if (matchIdx === 0 && (hole < 1 || hole > 9)) return;
        if (matchIdx === 1 && (hole < 10 || hole > 18)) return;
        if (matchIdx === 2 && (hole < 1 || hole > 18)) return;
    }
    setManualPresses(prev => {
        const seg = prev[segId] || {};
        const match = seg[matchIdx] || [];
        return { ...prev, [segId]: { ...seg, [matchIdx]: [...match, hole].sort() } };
    });
    setPressInputs(prev => ({ ...prev, [inputKey]: '' }));
  };

  const addIndManualPress = (matchId: string, type: 'overall' | 'front' | 'back') => {
    const inputKey = `ind-${matchId}`;
    const hole = parseInt(pressInputs[inputKey] || '');
    if (!hole) return;
    if (type === 'front' && (hole < 1 || hole > 9)) return;
    if (type === 'back' && (hole < 10 || hole > 18)) return;
    if (type === 'overall' && (hole < 1 || hole > 18)) return;
    setIndManualPresses(prev => {
        const match = prev[matchId] || { overall: [], front: [], back: [] };
        return { ...prev, [matchId]: { ...match, [type]: [...match[type], hole].sort() } };
    });
    setPressInputs(prev => ({ ...prev, [inputKey]: '' }));
  };

  const removeManualPress = (type: 'segment' | 'ind', id: string, hNum: number, matchIdxOrType?: any) => {
    if (type === 'segment') {
        const segId = parseInt(id);
        const mi = matchIdxOrType as number;
        setManualPresses(prev => {
            const seg = prev[segId] || {};
            const updatedMatch = (seg[mi] || []).filter(h => h !== hNum);
            return { ...prev, [segId]: { ...seg, [mi]: updatedMatch } };
        });
    } else {
        const matchId = id;
        const typeKey = matchIdxOrType as 'overall' | 'front' | 'back';
        setIndManualPresses(prev => {
            const match = prev[matchId] || { overall: [], front: [], back: [] };
            const updated = (match[typeKey] || []).filter(h => h !== hNum);
            return { ...prev, [matchId]: { ...match, [typeKey]: updated } };
        });
    }
  };

  const setScore = (pId: string, hNum: number, val: string) => {
    const g = parseInt(val) || 0;
    setScores(prev => ({ ...prev, [pId]: { ...prev[pId], [hNum]: g } }));
    const p = activePlayers.find(pl => pl.id === pId);
    if (p?.name.trim().toLowerCase() === 'chad solter' && g > 0 && selectedCourse.holes[hNum-1].par > g) {
      setEasterEgg(CHAD_COMMENTS[Math.floor(Math.random() * CHAD_COMMENTS.length)]);
      setTimeout(() => setEasterEgg(null), 5000);
    }
  };

  const calculateSegmentFull = (sIdx: number) => {
    const seg = segments[sIdx];
    const holes = Array.from({ length: 6 }, (_, i) => sIdx * 6 + 1 + i);
    const win: { [id: string]: number } = {};
    activePlayers.forEach(p => win[p.id] = 0);
    if (seg.team1.length < 2) return { main: 0, presses: [], winnings: win, matches: [] };
    if (gameMode === 'sixes') {
      const match = calculateWheelMatch(seg.team1, seg.team2, holes, sIdx, 0);
      const payout = (match.main > 0 ? mainStake : match.main < 0 ? -mainStake : 0) + match.presses.reduce((sum, p) => sum + (p.score > 0 ? pressStake : p.score < 0 ? -pressStake : 0), 0);
      activePlayers.forEach(p => { if (seg.team1.includes(p.id)) win[p.id] = payout; else if (seg.team2.includes(p.id)) win[p.id] = -payout; });
      return { ...match, winnings: win, matches: [{ opponent: seg.team2, result: match }] };
    } else {
      const ops = seg.team2;
      const opPairs = [[ops[0], ops[1]], [ops[1], ops[2]], [ops[0], ops[2]]];
      const matches = opPairs.map((opT, mi) => ({ opponent: opT, result: calculateWheelMatch(seg.team1, opT, holes, sIdx, mi) }));
      matches.forEach(m => {
        const payout = (m.result.main > 0 ? mainStake : m.result.main < 0 ? -mainStake : 0) + m.result.presses.reduce((sum, p) => sum + (p.score > 0 ? pressStake : p.score < 0 ? -pressStake : 0), 0);
        seg.team1.forEach(id => win[id] += payout);
        m.opponent.forEach(id => win[id] -= payout);
      });
      return { main: 0, presses: [], winnings: win, matches };
    }
  };

  const calculateFourBallFull = () => {
    const team1 = segments[0].team1;
    const team2 = segments[0].team2;
    const win: { [id: string]: number } = {};
    activePlayers.forEach(p => win[p.id] = 0);
    if (team1.length < 2 || team2.length < 2) return { winnings: win, front: null, back: null, overall: null };

    const calculateNassauSide = (hList: number[], sideMain: number, sidePress: number, legIdx: number) => {
        let score = 0;
        let presses: Press[] = [];
        (manualPresses[0]?.[legIdx] || []).forEach(h => presses.push({ id: Date.now() + h, startHole: h, score: 0 }));
        hList.forEach((h, i) => {
            const netScores = activePlayers.map(p => getNetScore(p.id, h));
            const t1Scores = team1.map(id => netScores[activePlayers.findIndex(p => p.id === id)]);
            const t2Scores = team2.map(id => netScores[activePlayers.findIndex(p => p.id === id)]);
            
            if (t1Scores.some(s => s === null) || t2Scores.some(s => s === null)) return;
            
            const t1Best = Math.min(...t1Scores.filter(s => s !== null) as number[]);
            const t2Best = Math.min(...t2Scores.filter(s => s !== null) as number[]);
            
            const update = (curr: number) => (t1Best < t2Best ? curr + 1 : t2Best < t1Best ? curr - 1 : curr);
            score = update(score);
            presses = presses.map(p => h >= p.startHole ? { ...p, score: update(p.score) } : p);
            
            if (i === hList.length - 1 && score === 0 && t1Best === t2Best && settings.useSecondBallTieBreaker) {
                const t1Second = Math.max(...t1Scores.filter(s => s !== null) as number[]);
                const t2Second = Math.max(...t2Scores.filter(s => s !== null) as number[]);
                if (t1Second < t2Second) score++; else if (t2Second < t1Second) score--;
            }

            const holesLeft = hList.length - (i + 1);
            const lastPressScore = presses.length > 0 ? presses[presses.length-1].score : score;
            const isClosed = Math.abs(lastPressScore) > holesLeft;
            const isTwoDown = Math.abs(lastPressScore) >= 2;
            const autoTriggered = settings.autoPressTrigger === 'closed-out' ? isClosed : isTwoDown;

            if (settings.useAutoPress && autoTriggered && holesLeft > 0) {
                if (!presses.some(p => p.startHole === h + 1)) {
                    presses.push({ id: Date.now() + i, startHole: h + 1, score: 0 });
                }
            }
        });
        const payout = (score > 0 ? sideMain : score < 0 ? -sideMain : 0) + presses.reduce((sum, p) => sum + (p.score > 0 ? sidePress : p.score < 0 ? -sidePress : 0), 0);
        return { score, payout, presses };
    };

    if (fourBallStakes.type === '18-hole') {
        const overall = calculateNassauSide(Array.from({length: 18}, (_, i) => i + 1), fourBallStakes.mainOverall, fourBallStakes.pressOverall, 2);
        team1.forEach(id => win[id] = overall.payout);
        team2.forEach(id => win[id] = -overall.payout);
        return { winnings: win, front: null, back: null, overall };
    } else {
        const front = calculateNassauSide(Array.from({length: 9}, (_, i) => i + 1), fourBallStakes.mainFront, fourBallStakes.pressFront, 0);
        const back = calculateNassauSide(Array.from({length: 9}, (_, i) => i + 10), fourBallStakes.mainBack, fourBallStakes.pressBack, 1);
        const overall = calculateNassauSide(Array.from({length: 18}, (_, i) => i + 1), fourBallStakes.mainOverall, fourBallStakes.pressOverall, 2);
        const totalPayout = front.payout + back.payout + overall.payout;
        team1.forEach(id => win[id] = totalPayout);
        team2.forEach(id => win[id] = -totalPayout);
        return { winnings: win, front, back, overall };
    }
  };

  const calculateWheelMatch = (wheelTeam: string[], opponentTeam: string[], holes: number[], sIdx: number, matchIdx: number) => {
    let main = 0;
    let presses: Press[] = [];
    (manualPresses[sIdx]?.[matchIdx] || []).forEach(h => {
        presses.push({ id: Date.now() + h, startHole: h, score: 0 });
    });
    holes.forEach((h, i) => {
      const w1 = getNetScore(wheelTeam[0], h), w2 = getNetScore(wheelTeam[1], h);
      const o1 = getNetScore(opponentTeam[0], h), o2 = getNetScore(opponentTeam[1], h);
      if (w1 === null || o1 === null) return;
      const wb = Math.min(w1, w2 ?? 999), ob = Math.min(o1, o2 ?? 999);
      const update = (curr: number) => (wb < ob ? curr + 1 : ob < wb ? curr - 1 : curr);
      main = update(main);
      presses = presses.map(p => h >= p.startHole ? { ...p, score: update(p.score) } : p);
      const holesLeft = holes.length - (i + 1);
      const lastPressScore = presses.length > 0 ? presses[presses.length-1].score : main;
      const isClosed = Math.abs(lastPressScore) > holesLeft;
      const isTwoDown = Math.abs(lastPressScore) >= 2;
      const autoTriggered = settings.autoPressTrigger === 'closed-out' ? isClosed : isTwoDown;
      if (settings.useAutoPress && autoTriggered && holesLeft > 0) {
        if (settings.autoPressTrigger === '2-down' || isClosed) {
            if (!presses.some(p => p.startHole === h + 1)) {
                presses.push({ id: Date.now() + i, startHole: h + 1, score: 0 });
            }
        }
      }
      if (i === 5 && main === 0 && wb === ob && settings.useSecondBallTieBreaker) {
        const ws = Math.max(w1, w2 ?? 999), os = Math.max(o1, o2 ?? 999);
        if (ws < os) main++; else if (os < ws) main--;
      }
    });
    return { main, presses };
  };

  const getPlayerTotals = () => {
    const totals: { [id: string]: number } = {};
    activePlayers.forEach(p => totals[p.id] = 0);
    
    if (gameMode === 'four-ball') {
        const res = calculateFourBallFull();
        Object.keys(res.winnings).forEach(id => { if (totals[id] !== undefined) totals[id] += res.winnings[id]; });
    } else {
        [0, 1, 2].forEach(i => { const res = calculateSegmentFull(i); Object.keys(res.winnings).forEach(id => { if (totals[id] !== undefined) totals[id] += res.winnings[id]; }); });
    }
    
    independentMatches.forEach(m => { const res = calculateIndependentMatchResult(m); if (totals[m.p1Id] !== undefined) totals[m.p1Id] += res.payout; if (totals[m.p2Id] !== undefined) totals[m.p2Id] -= res.payout; });
    return totals;
  };

  const getTeamNamesByIds = (ids: string[], full: boolean = false) => ids.map(id => { const p = players.find(p => p.id === id); return p ? (full ? p.name : p.name.split(' ')[0]) : '?'; }).join(' & ');
  const getPlayerWheelCount = (pId: string, cIdx: number) => segments.reduce((c, s, i) => i === cIdx ? c : c + (s.team1.includes(pId) ? 1 : 0), 0);
  const isPairDuplicate = (p1: string, p2: string, cIdx: number) => {
    if (!p1 || !p2) return false;
    const key = [p1, p2].sort().join(',');
    return segments.some((s, i) => i !== cIdx && s.team1.length === 2 && [...s.team1].sort().join(',') === key);
  };

  const handleTeamSelection = (sIdx: number, p1: string, p2: string) => {
    setSegments(prev => {
        const next = [...prev];
        next[sIdx] = { ...next[sIdx], team1: [p1, p2].filter(id => id) };
        const others = activePlayers.filter(p => !next[sIdx].team1.includes(p.id)).map(p => p.id);
        next[sIdx].team2 = others;
        return next;
    });
  };
  const getPlayerScoreTotal = (pId: string) => scores[pId] ? Object.values(scores[pId]).reduce((s, v) => s + (v || 0), 0) : 0;
  const getPlayerNineTotal = (pId: string, holes: number[]) => scores[pId] ? holes.reduce((s, h) => s + (scores[pId][h] || 0), 0) : 0;

  const isLakeSelected = selectedCourse.id === 'olympic-lake';

  return (
    <div className={`app-container ${isLakeSelected ? 'lake-theme' : ''}`}>
      {easterEgg && <div className="easter-egg-toast">{easterEgg}</div>}
      {isCourseModalOpen && editingCourse && (
          <div className="modal-overlay"><div className="modal-content course-editor">
                  <header className="modal-header"><h2>{editingCourse.name ? 'Edit Course' : 'Add Course'}</h2><button className="icon-btn" onClick={() => setIsCourseModalOpen(false)}><X size={20}/></button></header>
                  <div className="modal-body"><div className="input-group"><label>Course Name</label><input value={editingCourse.name} onChange={e => setEditingCourse({...editingCourse, name: e.target.value})} placeholder="e.g. Augusta National" /></div>
                      <div className="editor-section"><h3>Tees</h3><div className="tees-editor-grid"><div className="tee-row header"><span>Tee Name</span><span>Rating</span><span>Slope</span><span></span></div>
                              {editingCourse.tees.map((t, i) => (
                                  <div key={i} className="tee-row"><input value={t.name} onChange={e => { const nt = [...editingCourse.tees]; nt[i].name = e.target.value; setEditingCourse({...editingCourse, tees: nt}); }} /><input type="number" step="0.1" value={t.rating || ''} placeholder="0" onChange={e => { const nt = [...editingCourse.tees]; nt[i].rating = e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0); setEditingCourse({...editingCourse, tees: nt}); }} /><input type="number" value={t.slope || ''} placeholder="0" onChange={e => { const nt = [...editingCourse.tees]; nt[i].slope = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0); setEditingCourse({...editingCourse, tees: nt}); }} /><button className="icon-btn delete-btn" onClick={() => { if (editingCourse.tees.length > 1) setEditingCourse({...editingCourse, tees: editingCourse.tees.filter((_, idx) => idx !== i)}); }}><Trash2 size={14}/></button></div>
                              ))}<button className="add-btn" onClick={() => setEditingCourse({...editingCourse, tees: [...editingCourse.tees, {name: 'New Tee', rating: 72.0, slope: 113}]})}><Plus size={14}/> Add Tee</button></div></div>
                      <div className="editor-section"><h3>Holes</h3><div className="holes-editor-grid"><div className="hole-row header"><span>#</span><span>Par</span><span>HDCP</span></div>
                              {editingCourse.holes.map((h, i) => (
                                  <div key={i} className="hole-row"><span className="h-num">{h.number}</span><input type="number" value={h.par || ''} placeholder="0" onChange={e => { const nh = [...editingCourse.holes]; nh[i].par = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0); setEditingCourse({...editingCourse, holes: nh}); }} /><input type="number" value={h.handicap || ''} placeholder="0" onChange={e => { const nh = [...editingCourse.holes]; nh[i].handicap = e.target.value === '' ? 0 : (parseInt(e.target.value) || 0); setEditingCourse({...editingCourse, holes: nh}); }} /></div>
                              ))}</div></div>
                  </div><footer className="modal-footer"><button className="secondary-btn" onClick={() => setIsCourseModalOpen(false)}>Cancel</button><button className="primary-btn" onClick={saveCourse} disabled={!editingCourse.name}><Save size={16}/> Save Course</button></footer>
              </div></div>
      )}
      <header className={`app-header ${isLakeSelected ? 'lake-theme' : ''}`}>
        <div className="game-mode-select-wrapper">
            <span className="select-label">TEAM GAME:</span>
            <select className="game-mode-dropdown" value={gameMode} onChange={e => handleGameModeChange(e.target.value as any)}>
                <option value="four-ball">Four Ball</option>
                <option value="sixes">Sixes</option>
                <option value="wheel">The Wheel</option>
            </select>
        </div>
        <div className="header-text-only"><h1>{selectedCourse.name.toUpperCase()}</h1>{selectedCourse.id === 'meadow-club' && <p>ESTABLISHED 1927</p>}</div>
      </header>
      <main className="app-content">
        {activeTab === 'setup' && (
          <div className="setup-container">
            <div className="card course-card"><h3><MapPin size={14} /> ACTIVE COURSE</h3><div className="course-selector-row"><select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="icon-btn edit-course" onClick={() => editCourse(selectedCourse)} title="Edit Course"><Edit2 size={14}/></button><button className="icon-btn add-course" onClick={startNewCourse} title="Add Course"><Plus size={14}/></button>{(selectedCourseId !== 'meadow-club' && selectedCourseId !== 'olympic-lake') && <button className="icon-btn remove-course" onClick={() => deleteCourse(selectedCourseId)} title="Remove Course"><Trash2 size={14}/></button>}</div></div>
            <div className="card"><h3><User size={14} /> ROUND PLAYERS</h3><div className="player-entry-grid">{activePlayers.map((p, i) => (
                  <div key={p.id} className="player-entry-row-group"><div className="player-entry-row"><input placeholder={`Player ${i + 1}`} value={p.name} onChange={e => updatePlayer(p.id, 'name', e.target.value)} /><input placeholder="Idx" value={p.indexInput} onChange={e => updatePlayer(p.id, 'index', e.target.value)} /><select value={p.selectedTeeIndex} onChange={e => updatePlayer(p.id, 'tee', e.target.value)}>{selectedCourse.tees.map((t, idx) => <option key={idx} value={idx}>{t.name}</option>)}</select><button className="icon-btn clear-player" onClick={() => clearPlayer(p.id)}><UserMinus size={14}/></button><button className="icon-btn save-partner" onClick={() => addPartner(p)}><UserPlus size={14}/></button></div>{partners.length > 0 && !p.name && <div className="partner-quick-load"><select onChange={e => { const pt = partners.find(pt => pt.name === e.target.value); if (pt) loadPartner(p.id, pt); }} defaultValue=""><option value="" disabled>Load Partner...</option>{partners.map(pt => <option key={pt.name} value={pt.name} disabled={activePlayers.some(ap => ap.name === pt.name)}>{pt.name}</option>)}</select></div>}</div>
                ))}</div></div>
            {partners.length > 0 && <div className="card partners-list-card"><div className="collapsible-header" onClick={() => toggleSection('partners')}><h3><UserCheck size={14} /> MANAGE PARTNERS</h3>{visibleSections.partners ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>{visibleSections.partners && <div className="partners-grid">{partners.map(pt => <div key={pt.name} className="partner-item-row"><span className="pt-name">{pt.name}</span><input className="pt-index-input" value={pt.indexInput} onChange={e => updatePartnerIndex(pt.name, e.target.value)} title="Handicap Index"/><button className="icon-btn delete-partner" onClick={() => deletePartner(pt.name)}><Trash2 size={12}/></button></div>)}</div>}</div>}
            {activePlayers.some(p => p.name) && <div className="card stroke-summary-card"><div className="collapsible-header" onClick={() => toggleSection('summary')}><h3><ListChecks size={14} /> STROKE SUMMARY</h3>{visibleSections.summary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>{visibleSections.summary && <div className="summary-grid"><div className="summary-header"><span>Player</span><span>CH</span><span>REL</span><span>{settings.strokeAllocation === 'divided' && gameMode !== 'four-ball' ? 'Per 6' : 'Total'}</span></div>{activePlayers.filter(p => p.name).map(p => <div key={p.id} className="summary-row"><strong>{p.name}</strong><span>{p.courseHandicap}</span><span>{p.courseHandicap - baselineCH}</span><strong>{settings.strokeAllocation === 'divided' && gameMode !== 'four-ball' ? getStrokesPerSix(p) : (p.courseHandicap - baselineCH)}</strong></div>)}</div>}</div>}
            <div className="card"><div className="collapsible-header" onClick={() => toggleSection('stakes')}><h3><Wallet size={14} /> STAKES</h3>{visibleSections.stakes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                {visibleSections.stakes && (
                    <div className="stakes-vertical">
                        {gameMode === 'four-ball' ? (
                            <div className="four-ball-stakes-container">
                                <div className="fb-type-select">
                                    <select value={fourBallStakes.type} onChange={e => setFourBallStakes({...fourBallStakes, type: e.target.value as any})}>
                                        <option value="18-hole">18-Hole Bet</option>
                                        <option value="nassau">Nassau Bet</option>
                                    </select>
                                </div>
                                {fourBallStakes.type === '18-hole' ? (
                                    <div className="im-stake-column">
                                        <div className="im-stake-input"><span>Main $</span><input type="number" value={fourBallStakes.mainOverall || ''} placeholder="0" onChange={e => setFourBallStakes({...fourBallStakes, mainOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})} /></div>
                                        <div className="im-stake-input"><span>Press $</span><input type="number" value={fourBallStakes.pressOverall || ''} placeholder="0" onChange={e => setFourBallStakes({...fourBallStakes, pressOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})} /></div>
                                    </div>
                                ) : (
                                    <div className="nassau-stakes-group-vertical">
                                        <div className="im-stake-row">
                                            <div className="im-stake-input"><span>Front $</span><input type="number" value={fourBallStakes.mainFront || ''} placeholder="0" onChange={e => setFourBallStakes({...fourBallStakes, mainFront: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})} /></div>
                                            <div className="im-stake-input"><span>Press-Front $</span><input type="number" value={fourBallStakes.pressFront || ''} placeholder="0" onChange={e => setFourBallStakes({...fourBallStakes, pressFront: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})} /></div>
                                        </div>
                                        <div className="im-stake-row">
                                            <div className="im-stake-input"><span>Back $</span><input type="number" value={fourBallStakes.mainBack || ''} placeholder="0" onChange={e => setFourBallStakes({...fourBallStakes, mainBack: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})} /></div>
                                            <div className="im-stake-input"><span>Press-Back $</span><input type="number" value={fourBallStakes.pressBack || ''} placeholder="0" onChange={e => setFourBallStakes({...fourBallStakes, pressBack: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})} /></div>
                                        </div>
                                        <div className="im-stake-row">
                                            <div className="im-stake-input"><span>Overall $</span><input type="number" value={fourBallStakes.mainOverall || ''} placeholder="0" onChange={e => setFourBallStakes({...fourBallStakes, mainOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})} /></div>
                                            <div className="im-stake-input"><span>Press-Overall $</span><input type="number" value={fourBallStakes.pressOverall || ''} placeholder="0" onChange={e => setFourBallStakes({...fourBallStakes, pressOverall: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)})} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="stake-item"><span>Main Bet ($)</span><input type="number" value={mainStake || ''} onChange={e => setMainStake(e.target.value === '' ? 0 : parseInt(e.target.value))} /></div>
                                <div className="stake-item"><span>Press Bet ($)</span><input type="number" value={pressStake || ''} onChange={e => setPressStake(e.target.value === '' ? 0 : parseInt(e.target.value))} /></div>
                            </>
                        )}
                    </div>
                )}
            </div>
            {activePlayers.every(p => p.name) && (
                <div className="card"><h3>PAIRINGS</h3>
                    {gameMode === 'four-ball' ? (
                        <div className="seg-card">
                            <h4>Match Pairings</h4>
                            <div className="team-row">
                                <span>Team 1:</span>
                                <div className="team-selects-wrapper">
                                    <select value={segments[0].team1[0]} onChange={e => handleTeamSelection(0, e.target.value, segments[0].team1[1] || '')}><option value="">P1</option>{activePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                    <select value={segments[0].team1[1]} onChange={e => handleTeamSelection(0, segments[0].team1[0] || '', e.target.value)}><option value="">P2</option>{activePlayers.map(p => <option key={p.id} value={p.id} disabled={p.id === (segments[0].team1[0] || '')}>{p.name}</option>)}</select>
                                </div>
                            </div>
                            {segments[0].team2.length > 0 && <div className="team-row opponent-row"><span>Team 2:</span><div className="auto-pair-inline">{getTeamNamesByIds(segments[0].team2, true)}</div></div>}
                        </div>
                    ) : (
                        [{l: "First Six"}, {l: "Second Six"}, {l: "Third Six"}].map((seg, i) => (   
                            <div key={i} className="seg-card"><h4>{seg.l}</h4><div className="team-row"><span>{gameMode === 'wheel' ? 'Wheel:' : 'Team 1:'}</span><div className="team-selects-wrapper"><select value={segments[i].team1[0]} onChange={e => handleTeamSelection(i, e.target.value, segments[i].team1[1] || '')}><option value="">P1</option>{activePlayers.map(p => <option key={p.id} value={p.id} disabled={gameMode === 'wheel' && getPlayerWheelCount(p.id, i) >= 2}>{p.name}</option>)}</select><select value={segments[i].team1[1]} onChange={e => handleTeamSelection(i, segments[i].team1[0] || '', e.target.value)}><option value="">P2</option>{activePlayers.map(p => <option key={p.id} value={p.id} disabled={p.id === (segments[i].team1[0] || '') || (gameMode === 'wheel' && (getPlayerWheelCount(p.id, i) >= 2 || isPairDuplicate(segments[i].team1[0] || '', p.id, i)))}>{p.name}</option>)}</select></div></div>{segments[i].team2.length > 0 && <div className="team-row opponent-row"><span>{gameMode === 'wheel' ? 'Ops:' : 'Team 2:'}</span><div className="auto-pair-inline">{getTeamNamesByIds(segments[i].team2, true)}</div></div>}</div>
                        ))
                    )}
                </div>
            )}
            <div className="card independent-matches-card"><div className="collapsible-header" onClick={() => toggleSection('independent')}><h3>INDEPENDENT MATCHES</h3>{visibleSections.independent ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div> 
                {visibleSections.independent && <div className="independent-matches-grid">{independentMatches.map(m => (
                            <div key={m.id} className="independent-match-row"><div className="im-pair"><select value={m.p1Id} onChange={e => updateIndependentMatch(m.id, 'p1Id', e.target.value)}>{activePlayers.map(p => <option key={p.id} value={p.id}>{p.name || 'P' + p.id}</option>)}</select><span>vs</span><select value={m.p2Id} onChange={e => updateIndependentMatch(m.id, 'p2Id', e.target.value)}>{activePlayers.map(p => <option key={p.id} value={p.id}>{p.name || 'P' + p.id}</option>)}</select></div>
                                <div className="im-settings">
                                    <div className="im-type-select-row">
                                        <select value={m.type} onChange={e => updateIndependentMatch(m.id, 'type', e.target.value)}>
                                            <option value="18-hole">18-Hole Bet</option>
                                            <option value="nassau">Nassau Bet</option>
                                        </select>
                                    </div>
                                    {m.type === '18-hole' ? (
                                        <div className="im-stake-column">
                                            <div className="im-stake-input"><span>Main $</span><input type="number" value={m.stake || ''} placeholder="0" onChange={e => setIndependentMatches(independentMatches.map(im => im.id === m.id ? {...im, stake: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0)} : im))} /></div>
                                            <div className="im-stake-input"><span>Press $</span><input type="number" value={m.pressStake || ''} placeholder="0" onChange={e => updateIndependentMatch(m.id, 'pressStake', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                                        </div>
                                    ) : (
                                        <div className="nassau-stakes-group-vertical">
                                            <div className="im-stake-row">
                                                <div className="im-stake-input"><span>Front $</span><input type="number" value={m.stake9 || ''} placeholder="0" onChange={e => updateIndependentMatch(m.id, 'stake9', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                                                <div className="im-stake-input"><span>Press-Front $</span><input type="number" value={m.pressStake9 || ''} placeholder="0" onChange={e => updateIndependentMatch(m.id, 'pressStake9', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                                            </div>
                                            <div className="im-stake-row">
                                                <div className="im-stake-input"><span>Back $</span><input type="number" value={m.stake9 || ''} placeholder="0" onChange={e => updateIndependentMatch(m.id, 'stake9', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                                                <div className="im-stake-input"><span>Press-Back $</span><input type="number" value={m.pressStake9 || ''} placeholder="0" onChange={e => updateIndependentMatch(m.id, 'pressStake9', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                                            </div>
                                            <div className="im-stake-row">
                                                <div className="im-stake-input"><span>Overall $</span><input type="number" value={m.stake18 || ''} placeholder="0" onChange={e => updateIndependentMatch(m.id, 'stake18', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                                                <div className="im-stake-input"><span>Press-Overall $</span><input type="number" value={m.pressStake18 || ''} placeholder="0" onChange={e => updateIndependentMatch(m.id, 'pressStake18', e.target.value === '' ? 0 : (parseInt(e.target.value) || 0))} /></div>
                                            </div>
                                        </div>
                                    )}
                                    <button className="icon-btn remove-im" onClick={() => deleteIndependentMatch(m.id)}><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}<button className="add-btn" onClick={addIndependentMatch} disabled={activePlayers.filter(p => p.name).length < 2}><Plus size={14}/> Add Match</button></div>}</div>
            <div className="card reset-card"><button className="reset-button" onClick={resetData}><RotateCcw size={16} /> Reset Round Data</button></div>
          </div>
        )}
        {activeTab === 'scores' && (
          <div className="scorecard-view"><div className="scorecard-header-fixed"><div className="h-cell">Hole</div>{activePlayers.map(p => <div key={p.id} className="p-cell"><div className="p-name">{p.name ? p.name.split(' ')[0] : 'P' + p.id}</div><div className="p-strokes">{p.name ? (settings.strokeAllocation === 'divided' && gameMode !== 'four-ball' ? `${getStrokesPerSix(p)}` : `${p.courseHandicap - baselineCH}`) : ''}</div></div>)}</div>
             <div className="scorecard-scroll-area">{selectedCourse.holes.map(h => <div key={h.number} className="score-row"><div className="h-info"><strong>{h.number}</strong><span>P{h.par}/H{h.handicap}</span></div>
                        {activePlayers.map(p => <div key={p.id} className="input-cell"><div className="input-wrapper"><input type="number" inputMode="numeric" value={scores[p.id]?.[h.number] || ''} onChange={e => setScore(p.id, h.number, e.target.value)} disabled={!p.name} />{getStrokesForHole(p.id, h.number) !== 0 && <span className="stroke-marker">{getStrokesForHole(p.id, h.number) === 1 ? '*' : '½'}</span>}</div><span className="net">{getNetScore(p.id, h.number) ?? ''}</span></div>)}</div>
                 )}
                 <div className="score-row total-row-sub"><div className="h-info"><strong>F9</strong></div>{activePlayers.map(p => <div key={p.id} className="input-cell total-cell"><strong>{getPlayerNineTotal(p.id, [1,2,3,4,5,6,7,8,9])}</strong></div>)}</div>
                 <div className="score-row total-row-sub"><div className="h-info"><strong>B9</strong></div>{activePlayers.map(p => <div key={p.id} className="input-cell total-cell"><strong>{getPlayerNineTotal(p.id, [10,11,12,13,14,15,16,17,18])}</strong></div>)}</div>
                 <div className="score-row total-row"><div className="h-info"><strong>TOT</strong></div>{activePlayers.map(p => <div key={p.id} className="input-cell total-cell"><strong>{getPlayerScoreTotal(p.id)}</strong></div>)}</div>
             </div></div>
        )}
        {activeTab === 'results' && (
          <div className="results-view">
            <div className="card winnings-card"><h3>TOTAL WINNINGS</h3>{Object.entries(getPlayerTotals()).map(([id, amt]) => <div key={id} className={`winnings-row ${amt >= 0 ? 'pos' : 'neg'}`}><span>{activePlayers.find(p => p.id === id)?.name || 'Player'}</span><strong>{amt >= 0 ? `+$${amt}` : `-$${Math.abs(amt)}`}</strong></div>)}</div>
            
            {gameMode === 'four-ball' ? (
                <div className="card result-seg-card"><h3>Four Ball Match</h3>
                    {(() => {
                        const res = calculateFourBallFull();
                        const team1 = segments[0].team1;
                        const team2 = segments[0].team2;
                        if (team1.length < 2 || team2.length < 2) return <div className="no-data">Set pairings to see results</div>;
                        
                        const formatNassau = (side: any, label: string, legIdx: number) => {
                            if (!side) return null;
                            const winner = side.score > 0 ? getTeamNamesByIds(team1) : getTeamNamesByIds(team2);
                            const up = side.score === 0 ? "AS" : `${winner} ${Math.abs(side.score)} UP`;
                            
                            const legMainStake = legIdx === 0 ? fourBallStakes.mainFront : legIdx === 1 ? fourBallStakes.mainBack : fourBallStakes.mainOverall;
                            const legPressStake = legIdx === 0 ? fourBallStakes.pressFront : legIdx === 1 ? fourBallStakes.pressBack : fourBallStakes.pressOverall;
                            const mainPayout = side.score === 0 ? 0 : legMainStake;

                            return (
                                <div className="match-detail-group">
                                    <div className="res-row main"><span>{label}</span><strong>{up} {mainPayout > 0 ? `($${mainPayout})` : ''}</strong></div>
                                    {!settings.useAutoPress && <div className="manual-press-entry-group">
                                        <div className="manual-press-input-row">
                                            <input type="number" placeholder="H#" value={pressInputs[`seg-0-${legIdx}`] || ''} onChange={e => setPressInputs({...pressInputs, [`seg-0-${legIdx}`]: e.target.value})}/>
                                            <button className="add-press-btn green sm" onClick={() => addSegmentManualPress(0, legIdx)}>Press</button>
                                        </div>
                                    </div>}
                                    {side.presses.map((p: any, pi: number) => {
                                        const pressPayout = p.score === 0 ? 0 : legPressStake;
                                        return (
                                            <div key={pi} className="res-row press"><span>Press (#{p.startHole}) {manualPresses[0]?.[legIdx]?.includes(p.startHole) && <button className="delete-btn-xs" onClick={() => removeManualPress('segment', '0', p.startHole, legIdx)}><X size={10}/></button>}</span><strong>{p.score === 0 ? "AS" : `${p.score > 0 ? getTeamNamesByIds(team1) : getTeamNamesByIds(team2)} ${Math.abs(p.score)} UP`} {pressPayout > 0 ? `($${pressPayout})` : ''}</strong></div>
                                        );
                                    })}
                                </div>
                            );
                        };
                        return (
                            <>
                                <div className="team-summary-header">{getTeamNamesByIds(team1)} vs {getTeamNamesByIds(team2)}</div>
                                {fourBallStakes.type === 'nassau' ? (
                                    <>
                                        {formatNassau(res.front, 'Front 9', 0)}
                                        {formatNassau(res.back, 'Back 9', 1)}
                                        {formatNassau(res.overall, 'Full 18', 2)}
                                    </>
                                ) : (
                                    formatNassau(res.overall, '18-Hole Match', 2)
                                )}
                            </>
                        );
                    })()}
                </div>
            ) : (
                [{l: "First Six", id: 0}, {l: "Second Six", id: 1}, {l: "Third Six", id: 2}].map((seg) => {
                    const res = calculateSegmentFull(seg.id);
                    const mPrs = manualPresses[seg.id] || { 0: [] };
                    return (
                        <div key={seg.id} className="card result-seg-card"><h3>{seg.l}{gameMode === 'wheel' && segments[seg.id].team1.length === 2 ? ` Wheel - ${getTeamNamesByIds(segments[seg.id].team1, true)}` : ''}</h3>
                        {res.matches.map((m, mi) => {
                            const winN = m.result.main > 0 ? getTeamNamesByIds(segments[seg.id].team1) : getTeamNamesByIds(m.opponent);
                            const mainAmt = m.result.main === 0 ? 0 : mainStake;
                            const matchManual = mPrs[mi] || [];
                            return (<div key={mi} className="match-detail-group"><div className="res-row main">
                                <div className="teams-vs-block">
                                {gameMode === 'sixes' ? (
                                    <>
                                    <div className="team-names">{getTeamNamesByIds(segments[seg.id].team1)} vs</div>
                                    <div className="team-names">{getTeamNamesByIds(m.opponent)}</div>
                                    </>
                                ) : (
                                    <div className="team-names">{getTeamNamesByIds(m.opponent)}</div>
                                )}
                                </div>
                                <strong>{m.result.main === 0 ? "AS" : `${winN} ${Math.abs(m.result.main)} UP`} {mainAmt > 0 ? `($${mainAmt})` : ''}</strong></div>
                                {!settings.useAutoPress && <div className="manual-press-entry-group">
                                    <div className="manual-press-input-row">
                                        <input type="number" placeholder="H#" value={pressInputs[`seg-${seg.id}-${mi}`] || ''} onChange={e => setPressInputs({...pressInputs, [`seg-${seg.id}-${mi}`]: e.target.value})}/>
                                        <button className="add-press-btn green sm" onClick={() => addSegmentManualPress(seg.id, mi)}>Press</button>
                                    </div>
                                </div>}
                                {m.result.presses.map((p, pi) => {
                                    const pAmt = p.score === 0 ? 0 : pressStake;
                                    return (<div key={pi} className="res-row press"><span>Press (#{p.startHole}) {matchManual.includes(p.startHole) && <button className="delete-btn-xs" onClick={() => removeManualPress('segment', seg.id.toString(), p.startHole, mi)}><X size={10}/></button>}</span><strong>{p.score === 0 ? "AS" : `${p.score > 0 ? getTeamNamesByIds(segments[seg.id].team1) : getTeamNamesByIds(m.opponent)} ${Math.abs(p.score)} UP`} {pAmt > 0 ? `($${pAmt})` : ''}</strong></div>);
                                })}</div>);
                        })}
                        </div>
                    );
                })
            )}

            {independentMatches.length > 0 && <div className="card independent-results-card"><h3>INDEPENDENT MATCHES</h3>{independentMatches.map(m => {
                        const res = calculateIndependentMatchResult(m);
                        const mPrs = indManualPresses[m.id] || { overall: [], front: [], back: [] };
                        return (
                            <div key={m.id} className="im-result-group"><div className="im-res-main"><span>{getTeamNamesByIds([m.p1Id])} vs {getTeamNamesByIds([m.p2Id])}</span><strong>{res.payout === 0 ? "AS" : `${res.payout > 0 ? '+' : ''}$${res.payout}`}</strong></div>
                                {m.type === '18-hole' ? (
                                    <div className="im-leg-row"><span>Full 18:</span> <span className="im-leg-status">{res.display} {res.overall && res.overall.score !== 0 ? `($${m.stake})` : ''}</span></div>
                                ) : (
                                    <div className="im-nassau-legs">
                                        <div className="im-leg-row"><span>Front 9:</span> <span className="im-leg-status">{res.front ? (res.front.score === 0 ? "AS" : `${res.front.score > 0 ? getTeamNamesByIds([m.p1Id]) : getTeamNamesByIds([m.p2Id])} ${Math.abs(res.front.score)} UP ($${m.stake9 || 5})`) : ''}</span></div>
                                        <div className="im-leg-row"><span>Back 9:</span> <span className="im-leg-status">{res.back ? (res.back.score === 0 ? "AS" : `${res.back.score > 0 ? getTeamNamesByIds([m.p1Id]) : getTeamNamesByIds([m.p2Id])} ${Math.abs(res.back.score)} UP ($${m.stake9 || 5})`) : ''}</span></div>
                                        <div className="im-leg-row"><span>Full 18:</span> <span className="im-leg-status">{res.overall ? (res.overall.score === 0 ? "AS" : `${res.overall.score > 0 ? getTeamNamesByIds([m.p1Id]) : getTeamNamesByIds([m.p2Id])} ${Math.abs(res.overall.score)} UP ($${m.stake18 || 10})`) : ''}</span></div>
                                    </div>
                                )}
                                {!m.useAutoPress && <div className="manual-press-entry-group">
                                    <div className="manual-press-input-row compact">
                                        <input type="number" placeholder="H#" value={pressInputs[`ind-${m.id}`] || ''} onChange={e => setPressInputs({...pressInputs, [`ind-${m.id}`]: e.target.value})}/>
                                        <div className="compact-btn-column">
                                            {m.type === '18-hole' ? (
                                                <button className="add-press-btn green sm" onClick={() => addIndManualPress(m.id, 'overall')}>Press</button>
                                            ) : (
                                                <>
                                                    <button className="add-press-btn green sm" onClick={() => addIndManualPress(m.id, 'front')}>Front 9</button>
                                                    <button className="add-press-btn green sm" onClick={() => addIndManualPress(m.id, 'back')}>Back 9</button>
                                                    <button className="add-press-btn green sm" onClick={() => addIndManualPress(m.id, 'overall')}>Overall</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>}
                                {res.pressDetail.length > 0 && <div className="im-press-breakdown">{res.pressDetail.map((p, pi) => {
                                    const typeKey = (p as any).label?.toLowerCase()?.includes('front') ? 'front' : (p as any).label?.toLowerCase()?.includes('back') ? 'back' : 'overall';
                                    const isManual = mPrs[typeKey]?.includes(p.startHole);   
                                    return (<div key={pi} className="im-press-row"><span>{p.label ? `${p.label} ` : ''}Press (Hole {p.startHole}): {isManual && <button className="delete-btn-xs" onClick={() => removeManualPress('ind', m.id, p.startHole, typeKey)}><X size={10}/></button>}</span><span className="im-press-status">{p.display} (${Math.abs(p.payout)})</span></div>);
                                })}</div>}
                            </div>
                        );
                    })}</div>}
          </div>
        )}
        {activeTab === 'rules' && (
          <div className="rules-view">
            <div className={`card ${isLakeSelected ? 'lake-theme' : ''}`} style={{border: isLakeSelected ? '2px solid var(--olympic-red)' : '2px solid var(--mackenzie-green)'}}><h3>{gameMode === 'wheel' ? 'The Wheel Rules' : gameMode === 'sixes' ? 'Sixes Rules' : 'Four Ball Rules'}</h3><div className="rules-content">
                {gameMode === 'wheel' ? <><section><h4>The Wheel (5 Players)</h4><p>One pair is "On the Wheel" for 6 holes. They play 3 matches simultaneously against all other 2-player combinations of the remaining 3 players.</p></section><section><h4>Rotation</h4><p>Every player must be on the wheel at least once, and no more than twice during the round.</p></section></> : gameMode === 'sixes' ? <section><h4>Sixes (4 Players)</h4><p>Players compete in three distinct 6-hole matches with rotating partners. Each match is a separate bet.</p></section> : <section><h4>Four Ball (4 Players)</h4><p>Two teams of two players compete in an 18-hole match in which the lowest net score from each team is used to determine the winner of each hole.</p></section>}
                <section><h4>Baseline Strokes</h4><p>The best player in the group establishes the 0-stroke baseline. All other players receive strokes relative to this baseline.</p></section>
                {gameMode !== 'four-ball' && settings.strokeAllocation === 'divided' ? <section><h4>Sixes Allocation (Divided)</h4><p>Total relative strokes are divided by 3 for each six-hole match.</p><ul>{settings.remainderLogic === 'standard' ? <li>If the remainder is less than .5, strokes are rounded down. If .5 or greater, the player receives an extra <strong>half stroke (½)</strong>.</li> : <li>Any remainder (even small) results in an extra <strong>half stroke (½)</strong> for that segment.</li>}</ul></section> : <section><h4>Stroke Allocation (Handicap Ranking)</h4><p>Strokes are applied across all 18 holes based on their handicap ranking (1-18). A player with 4 relative strokes gets them on the 4 hardest holes on the course.</p></section>}
                <section><h4>Betting & Tied Holes</h4><p>A half stroke (1/2) wins a hole if the competitors are otherwise tied on that hole. Otherwise standard better ball scoring applies. {settings.useSecondBallTieBreaker && `If the match is still tied after the ${gameMode === 'four-ball' ? '9th or 18th' : 'final'} hole, the second lowest net score (2nd ball) is used as a tie-breaker.`}</p></section>
                <section><h4>Auto-Presses</h4><p>{settings.useAutoPress ? `A new press bet is automatically created whenever a team goes ${settings.autoPressTrigger === '2-down' ? '2-down' : 'closed out'} on the main bet or any existing press bet.` : 'Automatic presses are disabled. You can manually add a press on the Results tab for any match.'}</p></section>
              </div></div>
            <div className="card settings-card"><h3><Sliders size={14} /> GAME SETTINGS</h3><div className="settings-grid">
                    {gameMode !== 'four-ball' && (
                        <div className="setting-control-row"><div className="setting-info"><strong>Stroke Allocation</strong><p>{settings.strokeAllocation === 'divided' ? 'Spread Evenly' : 'As They Fall'}</p></div><div className="toggle-switch-container"><button className={settings.strokeAllocation === 'divided' ? 'active' : ''} onClick={() => setSettings(s => ({...s, strokeAllocation: 'divided'}))}>Spread Evenly</button><button className={settings.strokeAllocation === 'handicap' ? 'active' : ''} onClick={() => setSettings(s => ({...s, strokeAllocation: 'handicap'}))}>As They Fall</button></div></div>
                    )}
                    {settings.strokeAllocation === 'divided' && gameMode !== 'four-ball' && <div className="setting-control-row"><div className="setting-info"><strong>Half Strokes</strong><p>Only if remainder &gt; .5</p></div><button className={`checkbox-btn ${settings.remainderLogic === 'standard' ? 'checked' : ''}`} onClick={() => setSettings(s => ({...s, remainderLogic: s.remainderLogic === 'standard' ? 'alwaysHalf' : 'standard'}))}>{settings.remainderLogic === 'standard' ? <Check size={16} /> : <X size={16} />}</button></div>}
                    <div className="setting-control-row"><div className="setting-info"><strong>Second Ball Tie-Breaker</strong><p>{gameMode === 'four-ball' ? 'Use 2nd ball on 9th and 18th holes if still tied' : 'Use 2nd ball on 6th hole if still tied'}</p></div><button className={`checkbox-btn ${settings.useSecondBallTieBreaker ? 'checked' : ''}`} onClick={() => setSettings(s => ({...s, useSecondBallTieBreaker: !s.useSecondBallTieBreaker}))}>{settings.useSecondBallTieBreaker ? <Check size={16} /> : <X size={16} />}</button></div>
                    <div className="setting-control-row"><div className="setting-info"><strong>Auto-Press</strong><p>Enable automatic press bets</p></div><button className={`checkbox-btn ${settings.useAutoPress ? 'checked' : ''}`} onClick={() => setSettings(s => ({...s, useAutoPress: !s.useAutoPress}))}>{settings.useAutoPress ? <Check size={16} /> : <X size={16} />}</button></div>
                    {settings.useAutoPress && <div className="setting-control-row"><div className="setting-info"><strong>Auto-Press Trigger</strong><p>Start new press when main bet is {settings.autoPressTrigger === '2-down' ? '2-down' : 'closed out'}</p></div><div className="toggle-switch-container"><button className={settings.autoPressTrigger === '2-down' ? 'active' : ''} onClick={() => setSettings(s => ({...s, autoPressTrigger: '2-down'}))}>2-Down</button><button className={settings.autoPressTrigger === 'closed-out' ? 'active' : ''} onClick={() => setSettings(s => ({...s, autoPressTrigger: 'closed-out'}))}>Closed Out</button></div></div>}   
                    {independentMatches.length > 0 && <div className="independent-match-presses-settings"><h4 className="settings-sub-header">Independent Match Auto-Press</h4>{independentMatches.map(m => (
                        <div key={m.id} className="im-auto-press-settings-group">
                            <div className="setting-control-row nested"><div className="setting-info"><strong>{getTeamNamesByIds([m.p1Id])} vs {getTeamNamesByIds([m.p2Id])}</strong><p>Auto-press enabled</p></div><button className={`checkbox-btn ${m.useAutoPress ? 'checked' : ''}`} onClick={() => updateIndependentMatch(m.id, 'useAutoPress', !m.useAutoPress)}>{m.useAutoPress ? <Check size={16} /> : <X size={16} />}</button></div>
                            {m.useAutoPress && <div className="setting-control-row nested"><div className="setting-info"><p>Trigger: {m.autoPressTrigger === 'closed-out' ? 'Closed Out' : '2-Down'}</p></div><div className="toggle-switch-container"><button className={(m.autoPressTrigger || '2-down') === '2-down' ? 'active' : ''} onClick={() => updateIndependentMatch(m.id, 'autoPressTrigger', '2-down')}>2-Down</button><button className={m.autoPressTrigger === 'closed-out' ? 'active' : ''} onClick={() => updateIndependentMatch(m.id, 'autoPressTrigger', 'closed-out')}>Closed Out</button></div></div>}
                        </div>
                    ))}</div>}
                </div></div>
          </div>
        )}
      </main>
      <nav className={`bottom-nav ${isLakeSelected ? 'lake-theme' : ''}`}><button className={activeTab === 'setup' ? 'active' : ''} onClick={() => setActiveTab('setup')}><SettingsIcon size={18}/><span>Setup</span></button><button className={activeTab === 'scores' ? 'active' : ''} onClick={() => setActiveTab('scores')}><BookOpen size={18}/><span>Scores</span></button><button className={activeTab === 'results' ? 'active' : ''} onClick={() => setActiveTab('results')}><Trophy size={18}/><span>Results</span></button><button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}><Info size={18}/><span>Rules</span></button></nav>
    </div>
  );
}
export default App;
