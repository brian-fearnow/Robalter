/**
 * ROBALTER: GOLF SCORING AND MATCH TRACKING APPLICATION
 * 
 * A comprehensive tool for tracking golf scores, handicaps, and various betting formats
 * including Sixes, The Wheel, Four Ball, Baseball (9-point), and Independent Matches.
 */

import { useState, useEffect } from 'react';
import { Trophy, User, BookOpen, Settings as SettingsIcon, Wallet, Info, ListChecks, RotateCcw, UserPlus, Trash2, UserCheck, ChevronDown, ChevronUp, Check, X, Sliders, MapPin, Plus, Edit2, Save, UserMinus } from 'lucide-react';
import './App.css';

// --- Types & Interfaces ---

/** Represents a tee box at a golf course */
interface Tee { 
    name: string; 
    rating: number; 
    slope: number; 
}

/** Represents a single hole on a golf course */
interface Hole { 
    number: number; 
    par: number; 
    handicap: number; 
}

/** Represents a full golf course configuration */
interface Course { 
    id: string; 
    name: string; 
    holes: Hole[]; 
    tees: Tee[]; 
}

/** Represents a player in the current round */
interface Player { 
    id: string; 
    name: string; 
    index: number; 
    indexInput: string; 
    selectedTeeIndex: number; 
    courseHandicap: number; 
    manualRelativeStrokes: number; // User-adjusted strokes when manual override is enabled
}

/** Represents a saved partner for quick loading */
interface Partner { 
    name: string; 
    index: number; 
    indexInput: string; 
    selectedTeeIndex: number; 
}

/** Stores scores indexed by player ID and hole number */
interface Score { 
    [playerId: string]: { [holeNumber: number]: number }; 
}

/** Represents a "press" bet (a secondary bet started mid-match) */
interface Press { 
    id: number; 
    startHole: number; 
    score: number; 
    holeByHole?: any[]; // Detailed breakdown for the press audit
}

/** Represents a pairing or match segment (e.g. one of the three 6-hole rotations) */
interface MatchSegment { 
    segment: number; 
    team1: string[]; 
    team2: string[]; 
}

/** Configuration for an independent head-to-head match between two players */
interface IndependentMatch { 
    id: string; 
    player1Id: string; 
    player2Id: string; 
    type: '18-hole' | 'nassau'; 
    stake: number; 
    stake9?: number; 
    stake18?: number; 
    pressStake?: number;
    pressStake9?: number;
    pressStake18?: number;
    useAutoPress: boolean;
    autoPressTrigger?: '2-down' | 'closed-out';
    manualStrokes?: number; // User-defined strokes for this specific match
}

/** Tracks manual press starts for independent matches */
interface IndependentManualPresses {
    [matchId: string]: {
        overall: number[];
        front: number[];
        back: number[];
    }
}

/** Stake configuration for Four Ball (Better Ball) matches */
interface FourBallStakes {
    type: '18-hole' | 'nassau';
    mainFront: number;
    pressFront: number;
    mainBack: number;
    pressBack: number;
    mainOverall: number;
    pressOverall: number;
}

/** Global settings for game logic and scoring variants */
interface GameSettings {
  strokeAllocation: 'divided' | 'handicap'; // 'divided' = spread per 6 holes, 'handicap' = based on hole rank
  remainderLogic: 'standard' | 'alwaysHalf'; // Logic for rounding fractional strokes in Sixes/Baseball
  useSecondBallTieBreaker: boolean; // Use 2nd best team ball as tie-breaker on final holes
  useAutoPress: boolean;
  autoPressTrigger: '2-down' | 'closed-out';
  useBaseballBirdieRule: boolean; // Special 9-point sweep if winner has birdie and others have bogeys
  baseballBirdieRuleType: 'gross' | 'net';
  useBaseballDoubleBackNine: boolean; // Option to double point values on the back 9
  useManualStrokes: boolean; // Enables manual override sliders for strokes
}

// --- Constants & Defaults ---

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

const MEADOW_CLUB_NEW: Course = {
  id: 'meadow-club-new',
  name: 'Meadow Club (new scorecard)',
  holes: [
    { number: 1, par: 5, handicap: 15 }, { number: 2, par: 4, handicap: 7 }, { number: 3, par: 4, handicap: 5 },
    { number: 4, par: 4, handicap: 11 }, { number: 5, par: 3, handicap: 13 }, { number: 6, par: 4, handicap: 3 },
    { number: 7, par: 4, handicap: 1 }, { number: 8, par: 3, handicap: 17 }, { number: 9, par: 4, handicap: 9 },
    { number: 10, par: 4, handicap: 6 }, { number: 11, par: 3, handicap: 18 }, { number: 12, par: 4, handicap: 14 },
    { number: 13, par: 5, handicap: 12 }, { number: 14, par: 3, handicap: 8 }, { number: 15, par: 5, handicap: 4 },
    { number: 16, par: 4, handicap: 16 }, { number: 17, par: 4, handicap: 2 }, { number: 18, par: 4, handicap: 10 }
  ],
  tees: [
    { name: 'Black', rating: 72.3, slope: 132 },
    { name: 'Blue', rating: 71.6, slope: 129 },
    { name: 'Blue/White', rating: 70.8, slope: 127 },
    { name: 'White', rating: 70.2, slope: 125 },
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
  BASEBALL_STAKE: 'robalter_baseballStake',
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
  { id: '1', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
  { id: '2', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
  { id: '3', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
  { id: '4', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
  { id: '5', name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0, manualRelativeStrokes: 0 },
];

function App() {
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURSES);
      let list = saved ? JSON.parse(saved) : [MEADOW_CLUB, MEADOW_CLUB_NEW, OLYMPIC_LAKE];
      
      // Ensure permanent courses are present and up to date
      const upsert = (c: Course, index: number) => {
        const idx = list.findIndex((x: Course) => x.id === c.id);
        if (idx >= 0) list[idx] = c;
        else list.splice(index, 0, c);
      };
      
      upsert(MEADOW_CLUB, 0);
      upsert(MEADOW_CLUB_NEW, 1);
      upsert(OLYMPIC_LAKE, 2);
      
      return list;
    } catch { return [MEADOW_CLUB, MEADOW_CLUB_NEW, OLYMPIC_LAKE]; }
  });
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_COURSE) || MEADOW_CLUB.id;
  });
  
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0] || MEADOW_CLUB;

  const [gameMode, setGameMode] = useState<'sixes' | 'wheel' | 'four-ball' | 'baseball' | 'independent'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_MODE);
    return (saved as 'sixes' | 'wheel' | 'four-ball' | 'baseball' | 'independent') || 'sixes';
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
        autoPressTrigger: '2-down',
        useBaseballBirdieRule: false,
        baseballBirdieRuleType: 'gross',
        useBaseballDoubleBackNine: false,
        useManualStrokes: false
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return {
        strokeAllocation: 'divided',
        remainderLogic: 'standard',
        useSecondBallTieBreaker: true,
        useAutoPress: true,
        autoPressTrigger: '2-down',
        useBaseballBirdieRule: false,
        baseballBirdieRuleType: 'gross',
        useBaseballDoubleBackNine: false,
        useManualStrokes: false
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
  const [showMatchDetails, setShowMatchDetails] = useState<{ [key: string]: boolean }>({});
  const toggleMatchDetail = (id: string) => setShowMatchDetails(prev => ({ ...prev, [id]: !prev[id] }));
  
  const [imStrokeInputs, setImStrokeInputs] = useState<{ [matchId: string]: string }>({});
  
  const handleImStrokeChange = (id: string, value: string) => {
    setImStrokeInputs(prev => ({ ...prev, [id]: value }));
    
    if (value === '' || value === '-' || value === '.' || value === '-.' || value.endsWith('.')) {
        updateIndependentMatch(id, 'manualStrokes', 0);
        return;
    }
    
    let num = parseFloat(value);
    if (!isNaN(num)) {
        updateIndependentMatch(id, 'manualStrokes', num);
    }
  };

  const [strokeSummaryInputs, setStrokeSummaryInputs] = useState<{ [playerId: string]: string }>({});
  
  const handleStrokeSummaryInputChange = (pId: string, value: string) => {
    setStrokeSummaryInputs(prev => ({ ...prev, [pId]: value }));
    
    if (value === '' || value === '-' || value === '.' || value === '-.') {
        setPlayers(prev => prev.map(p => p.id === pId ? { ...p, manualRelativeStrokes: 0 } : p));
        return;
    }
    
    let num = parseFloat(value);
    if (!isNaN(num)) {
        setPlayers(prev => prev.map(p => p.id === pId ? { ...p, manualRelativeStrokes: num } : p));
    }
  };

  const finalizeDecimalEntry = (id: string, isSummary: boolean = false) => {
    const inputs = isSummary ? strokeSummaryInputs : imStrokeInputs;
    const value = inputs[id];
    
    if (value === '' || value === '-' || value === '.' || value === '-.' || value === undefined) {
        if (isSummary) {
            setStrokeSummaryInputs(prev => { const next = { ...prev }; delete next[id]; return next; });
            setPlayers(prev => prev.map(p => p.id === id ? { ...p, manualRelativeStrokes: 0 } : p));
        } else {
            setImStrokeInputs(prev => { const next = { ...prev }; delete next[id]; return next; });
            updateIndependentMatch(id, 'manualStrokes', 0);
        }
        return;
    }

    let num = parseFloat(value);
    if (isNaN(num)) return;
    
    // If there's a decimal, treat it as .5 for the numeric state
    if (value.includes('.')) {
        const isNegative = num < 0 || value.startsWith('-');
        const absNum = Math.abs(num);
        const decimalPart = absNum % 1;
        
        let targetNum = Math.floor(absNum);
        if (decimalPart > 0) {
            targetNum += 0.5;
        }
        
        if (isNegative) targetNum = -targetNum;
        
        if (isSummary) {
            setPlayers(prev => prev.map(p => p.id === id ? { ...p, manualRelativeStrokes: targetNum } : p));
        } else {
            updateIndependentMatch(id, 'manualStrokes', targetNum);
        }
    }
  };

  const [scores, setScores] = useState<Score>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCORES);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [mainStake, setMainStake] = useState<number>(10);
  const [pressStake, setPressStake] = useState<number>(5);
  const [baseballStake, setBaseballStake] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BASEBALL_STAKE);
      return saved ? parseInt(saved) : 5;
    } catch { return 5; }
  });

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
  useEffect(() => localStorage.setItem(STORAGE_KEYS.BASEBALL_STAKE, baseballStake.toString()), [baseballStake]);

  const activePlayers = players.filter(player => player.name || (gameMode === 'sixes' && players.indexOf(player) < 4) || (gameMode === 'four-ball' && players.indexOf(player) < 4) || (gameMode === 'baseball' && players.indexOf(player) < 3) || (gameMode === 'independent') || (gameMode === 'wheel'));
  const scorecardPlayers = activePlayers.filter(player => player.name);

  /** Calculates the Course Handicap based on Handicap Index, Tee Slope, and Tee Rating */
  const calculateCourseHandicap = (handicapIndex: number, tee: Tee) => 
    Math.round(handicapIndex * (tee.slope / 113) + (tee.rating - 71));

  /** Updates a specific player's data and recalculates their course handicap */
  const updatePlayer = (id: string, field: 'name' | 'index' | 'tee', value: string) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== id) return player;
      const updatedPlayer = { ...player };
      if (field === 'name') updatedPlayer.name = value;
      if (field === 'index') {
        updatedPlayer.indexInput = value;
        const isPlusHandicap = value.startsWith('+');
        const numValue = parseFloat(value.replace('+', '')) || 0;
        // Plus handicaps are stored as negative numbers for calculation
        updatedPlayer.index = isPlusHandicap ? -numValue : numValue;
      }
      if (field === 'tee') updatedPlayer.selectedTeeIndex = parseInt(value);
      
      const selectedTee = selectedCourse.tees[updatedPlayer.selectedTeeIndex] || selectedCourse.tees[0];
      updatedPlayer.courseHandicap = calculateCourseHandicap(updatedPlayer.index, selectedTee);
      return updatedPlayer;
    }));
  };

  /** Resets a player's data to default values */
  const clearPlayer = (id: string) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== id) return player;
      return { ...player, name: '', index: 0, indexInput: '', selectedTeeIndex: 1, courseHandicap: 0 };
    }));
  };

  /** Toggles the visibility of UI sections in the setup tab */
  const toggleSection = (section: keyof typeof visibleSections) => {
    setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  /** Persists course changes or additions to local state and storage */
  const saveCourse = () => {
    if (!editingCourse || !editingCourse.name) return;
    setCourses(prev => {
        const index = prev.findIndex(course => course.id === editingCourse.id);
        if (index >= 0) {
            const updatedList = [...prev];
            updated)updatedList[index] = editingCourse;
            return updatedList;
        }
        return [...prev, editingCourse];
    });
    setIsCourseModalOpen(false);
    setEditingCourse(null);
  };

  const editCourse = (course: Course) => { 
    setEditingCourse(JSON.parse(JSON.stringify(course))); 
    setIsCourseModalOpen(true); 
  };
  
  const startNewCourse = () => { 
    setEditingCourse({ 
        id: Date.now().toString(), 
        name: '', 
        holes: DEFAULT_HOLES.map(h => ({ ...h })), 
        tees: [{ name: 'Default', rating: 72.0, slope: 113 }] 
    }); 
    setIsCourseModalOpen(true); 
  };

  const deleteCourse = (id: string) => {
    if (id === 'meadow-club' || id === 'meadow-club-new' || id === 'olympic-lake') return;
    const courseToDelete = courses.find(course => course.id === id);
    if (courseToDelete && window.confirm(`Are you sure you want to delete ${courseToDelete.name}?`)) {
        setCourses(prev => prev.filter(course => course.id !== id));
        if (selectedCourseId === id) setSelectedCourseId(MEADOW_CLUB.id);
    }
  };

  /** Handles changing the game mode and resetting team pairings/player counts */
  const handleGameModeChange = (newMode: 'sixes' | 'wheel' | 'four-ball' | 'baseball') => {
    if (newMode === gameMode) return;
    const modeLabel = newMode === 'four-ball' ? 'Four Ball' : newMode === 'sixes' ? 'Sixes' : newMode === 'baseball' ? 'Baseball' : 'The Wheel';
    const confirmed = window.confirm(`Switching to ${modeLabel} will reset all team pairings for this round. Scores and players will be kept. Continue?`);
    if (confirmed) {
        setGameMode(newMode);
        
        // If switching to Baseball, clear any names from players 4 and 5 as it is a 3-player game
        if (newMode === 'baseball') {
            setPlayers(prev => prev.map((player, index) => index >= 3 ? { ...player, name: '', index: 0, indexInput: '', courseHandicap: 0 } : player));
        }

        setSegments([
            { segment: 1, team1: [], team2: [] },
            { segment: 2, team1: [], team2: [] },
            { segment: 3, team1: [], team2: [] },
        ]);
        setManualPresses({ 0: { 0: [] }, 1: { 0: [] }, 2: { 0: [] } });
    }
  };

  /** Adds a new independent head-to-head match */
  const addIndependentMatch = () => {
    const playersWithNames = activePlayers.filter(player => player.name);
    if (playersWithNames.length < 2) return;
    const newMatch: IndependentMatch = { 
        id: Date.now().toString(), 
        player1Id: playersWithNames[0].id, 
        player2Id: playersWithNames[1].id, 
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
    setIndependentMatches(prev => prev.map(match => match.id === id ? { ...match, [field]: value } : match));
  };

  const deleteIndependentMatch = (id: string) => {
    setIndependentMatches(prev => prev.filter(match => match.id !== id));
    setIndManualPresses(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
  };

  const updatePartnerIndex = (name: string, value: string) => {
    const isPlusHandicap = value.startsWith('+');
    const numValue = parseFloat(value.replace('+', '')) || 0;
    const newIndex = isPlusHandicap ? -numValue : numValue;
    setPartners(prev => prev.map(partner => partner.name === name ? { ...partner, indexInput: value, index: newIndex } : partner));
    setPlayers(prev => prev.map(player => {
      if (player.name !== name) return player;
      const selectedTee = selectedCourse.tees[player.selectedTeeIndex] || selectedCourse.tees[0];
      return { ...player, indexInput: value, index: newIndex, courseHandicap: calculateCourseHandicap(newIndex, selectedTee) };
    }));
  };

  const addPartner = (player: Player) => {
    if (!player.name) return;
    const newPartner: Partner = { name: player.name, index: player.index, indexInput: player.indexInput, selectedTeeIndex: player.selectedTeeIndex };
    if (partners.some(partner => partner.name === player.name)) {
        setPartners(prev => prev.map(partner => partner.name === player.name ? newPartner : partner));
    } else setPartners(prev => [...prev, newPartner]);
  };

  const deletePartner = (name: string) => setPartners(prev => prev.filter(partner => partner.name !== name));

  const loadPartner = (playerId: string, partner: Partner) => {
    setPlayers(prev => prev.map(player => {
      if (player.id !== playerId) return player;
      const teeIndex = partner.selectedTeeIndex < selectedCourse.tees.length ? partner.selectedTeeIndex : 0;
      return { ...player, name: partner.name, index: partner.index, indexInput: partner.indexInput, selectedTeeIndex: teeIndex, courseHandicap: calculateCourseHandicap(partner.index, selectedCourse.tees[teeIndex]) };
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

  const baselineCH = activePlayers.some(player => player.name) ? Math.min(...activePlayers.filter(player => player.name).map(player => player.courseHandicap)) : 0;

  /** 
   * Calculates how many handicap strokes a player gets in a 6-hole segment.
   * Total relative strokes (Course Handicap - Best Player CH) are divided by 3.
   */
  const getStrokesPerSixHoles = (player: Player) => {
    if (!player.name) return 0;
    
    // Manual strokes enabled AND Sixes/Wheel AND Divided allocation: use manual entry directly
    if (settings.useManualStrokes && (gameMode === 'sixes' || gameMode === 'wheel') && settings.strokeAllocation === 'divided') {
        return player.manualRelativeStrokes;
    }
    
    const relativeTotal = player.courseHandicap - baselineCH;
    const rawPerSix = relativeTotal / 3;
    const wholeStrokes = Math.floor(rawPerSix);
    
    // Logic for rounding fractional strokes based on settings
    if (settings.remainderLogic === 'standard') {
        return (rawPerSix - wholeStrokes) >= 0.5 ? wholeStrokes + 0.5 : wholeStrokes;
    }
    return (rawPerSix > wholeStrokes) ? wholeStrokes + 0.5 : wholeStrokes;
  };

  /** 
   * Determines how many handicap strokes (full or half) a player gets on a specific hole.
   * Logic varies based on game mode and allocation settings (Handicap Rank vs Divided).
   */
  const getStrokesForHole = (playerId: string, holeNumber: number) => {
    const player = activePlayers.find(p => p.id === playerId);
    if (!player || !player.name) return 0;
    
    const useManualOverride = settings.useManualStrokes;
    const isDividedAllocation = settings.strokeAllocation === 'divided';
    const isTeamMode = gameMode === 'sixes' || gameMode === 'wheel';

    // Base total relative strokes used for allocation logic
    const relativeTotal = (useManualOverride && (!isTeamMode || !isDividedAllocation)) 
        ? player.manualRelativeStrokes 
        : player.courseHandicap - baselineCH;
    
    if (gameMode === 'four-ball' || gameMode === 'baseball' || !isDividedAllocation) {
      // Option A: Standard Handicap Ranking (strokes applied to hardest holes)
      const hole = selectedCourse.holes.find(h => h.number === holeNumber);
      if (!hole) return 0;
      
      const absoluteTotal = Math.abs(relativeTotal);
      const baseStrokesPerHole = Math.floor(absoluteTotal / 18);
      const remainderStrokes = absoluteTotal % 18;
      
      let strokes = baseStrokesPerHole;
      if (hole.handicap <= Math.floor(remainderStrokes)) {
          strokes += 1;
      } else if (hole.handicap === Math.floor(remainderStrokes) + 1 && (remainderStrokes % 1 !== 0)) {
          strokes += 0.5;
      }
      
      return relativeTotal >= 0 ? strokes : -strokes;
    } else {
      // Option B: Spread Evenly (divided per 6 holes)
      const strokesPerSix = getStrokesPerSixHoles(player);
      const segmentIndex = Math.floor((holeNumber - 1) / 6);
      const segmentHoles = selectedCourse.holes.slice(segmentIndex * 6, segmentIndex * 6 + 6).sort((a, b) => a.handicap - b.handicap);
      const holeRankInSegment = segmentHoles.findIndex(h => h.number === holeNumber);
      
      const absoluteS6 = Math.abs(strokesPerSix);
      const baseStrokesPerHole = Math.floor(absoluteS6 / 6);
      const remainderStrokes = absoluteS6 % 6;
      
      let strokes = baseStrokesPerHole;
      if (holeRankInSegment < Math.floor(remainderStrokes)) {
          strokes += 1;
      } else if (holeRankInSegment === Math.floor(remainderStrokes) && remainderStrokes % 1 !== 0) {
          strokes += 0.5;
      }
      
      return strokesPerSix >= 0 ? strokes : -strokes;
    }
  };

  /** 
   * Calculates handicap strokes given to Player 1 relative to Player 2 for a specific hole.
   * Positive = P1 receives strokes, Negative = P2 receives strokes.
   */
  const getIndependentStrokesForHole = (player1Id: string, player2Id: string, holeNumber: number, match?: IndependentMatch) => {
    const player1 = activePlayers.find(p => p.id === player1Id);
    const player2 = activePlayers.find(p => p.id === player2Id);
    if (!player1 || !player2) return 0;
    
    const p1CH = player1.courseHandicap;
    const p2CH = player2.courseHandicap;
    const isP1HigherHandicap = p1CH > p2CH;
    const isEvenCH = p1CH === p2CH;

    let totalDifference = 0;
    let manualReverseRecipient = false;
    if (match && match.manualStrokes !== undefined) {
        totalDifference = Math.abs(match.manualStrokes);
        // Negative manual input indicates reversing the recipient (higher handicap giving strokes)
        if (match.manualStrokes < 0) manualReverseRecipient = true;
    } else {
        totalDifference = Math.abs(p1CH - p2CH);
    }
        
    const hole = selectedCourse.holes.find(h => h.number === holeNumber);
    if (!hole) return 0;
    
    const basePerHole = Math.floor(totalDifference / 18);
    const remainderCount = totalDifference % 18;
    
    let strokes = basePerHole;
    if (hole.handicap <= Math.floor(remainderCount)) {
        strokes += 1;
    } else if (hole.handicap === Math.floor(remainderCount) + 1 && (remainderCount % 1 !== 0)) {
        strokes += 0.5;
    }
    
    let p1Receives = false;
    if (isEvenCH) {
        p1Receives = !(match && match.manualStrokes && match.manualStrokes < 0);
    } else {
        p1Receives = manualReverseRecipient ? !isP1HigherHandicap : isP1HigherHandicap;
    }
    
    return p1Receives ? strokes : -strokes;
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
        let presses: { startHole: number; score: number; payout: number; display: string; holeByHole?: any[] }[] = [];
        let holeByHole: { hole: number; p1Net: number; p2Net: number; p1Gross?: number; p2Gross?: number; running: number }[] = [];
        (manualHoles || []).forEach(h => presses.push({ startHole: h, score: 0, payout: 0, display: '', holeByHole: [] }));
        const trigger = triggerOverride || settings.autoPressTrigger;
        hList.forEach((h, i) => {
            const g1 = scores[m.p1Id]?.[h], g2 = scores[m.p2Id]?.[h];
            if (g1 === undefined || g2 === undefined) return;
            const hs = getIndependentStrokesForHole(m.p1Id, m.p2Id, h, m);
            const n1 = g1 - (hs > 0 ? hs : 0);
            const n2 = g2 - (hs < 0 ? Math.abs(hs) : 0);
            const diff = n1 - n2;
            const updateInd = (curr: number) => (diff < 0 ? curr + 1 : diff > 0 ? curr - 1 : curr);
            score = updateInd(score);
            presses = presses.map(p => {
                if (h < p.startHole) return p;
                const newScore = updateInd(p.score);
                const hbh = [...(p.holeByHole || []), { hole: h, p1Net: n1, p2Net: n2, p1Gross: g1, p2Gross: g2, running: newScore }];
                return { ...p, score: newScore, holeByHole: hbh };
            });
            holeByHole.push({ 
                hole: h, 
                p1Net: n1, 
                p2Net: n2, 
                p1Gross: g1,
                p2Gross: g2, 
                running: score
            });
            
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
        return { score, payout: (score > 0 ? sideMain : score < 0 ? -sideMain : 0) + presses.reduce((sum, p) => sum + p.payout, 0), presses, holeByHole };
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
        const next = { ...prev };
        const seg = next[segId] || {};
        const match = [...(seg[matchIdx] || [])];
        if (!match.includes(hole)) {
            match.push(hole);
            match.sort((a, b) => a - b);
        }
        next[segId] = { ...seg, [matchIdx]: match };
        return next;
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

  /** 
   * Calculates all matches and payouts for a 6-hole segment in Sixes or The Wheel.
   */
  const calculateSegmentFull = (segmentIndex: number) => {
    const segment = segments[segmentIndex];
    const holesInSegment = Array.from({ length: 6 }, (_, i) => segmentIndex * 6 + 1 + i);
    const segmentWinnings: { [id: string]: number } = {};
    activePlayers.forEach(player => segmentWinnings[player.id] = 0);
    
    if (segment.team1.length < 2) return { main: 0, presses: [], winnings: segmentWinnings, matches: [] };
    
    if (gameMode === 'sixes') {
      const matchResults = calculateWheelMatch(segment.team1, segment.team2, holesInSegment, segmentIndex, 0);
      const totalPayout = (matchResults.main > 0 ? mainStake : matchResults.main < 0 ? -mainStake : 0) + 
                         matchResults.presses.reduce((sum, press) => sum + (press.score > 0 ? pressStake : press.score < 0 ? -pressStake : 0), 0);
      
      activePlayers.forEach(player => { 
        if (segment.team1.includes(player.id)) segmentWinnings[player.id] = totalPayout; 
        else if (segment.team2.includes(player.id)) segmentWinnings[player.id] = -totalPayout; 
      });
      return { ...matchResults, winnings: segmentWinnings, matches: [{ opponent: segment.team2, result: matchResults }] };
    } else {
      // The Wheel: 2 vs 3. The 2-man team plays three separate matches against pairs from the 3-man pool.
      const wheelOpponents = segment.team2;
      const opponentPairings = [
          [wheelOpponents[0], wheelOpponents[1]], 
          [wheelOpponents[1], wheelOpponents[2]], 
          [wheelOpponents[0], wheelOpponents[2]]
      ];
      
      const matchResultsList = opponentPairings.map((oppTeam, matchIdx) => ({ 
          opponent: oppTeam, 
          result: calculateWheelMatch(segment.team1, oppTeam, holesInSegment, segmentIndex, matchIdx) 
      }));
      
      matchResultsList.forEach(matchData => {
        const payout = (matchData.result.main > 0 ? mainStake : matchData.result.main < 0 ? -mainStake : 0) + 
                      matchData.result.presses.reduce((sum, press) => sum + (press.score > 0 ? pressStake : press.score < 0 ? -pressStake : 0), 0);
        
        segment.team1.forEach(id => segmentWinnings[id] += payout);
        matchData.opponent.forEach(id => segmentWinnings[id] -= payout);
      });
      return { main: 0, presses: [], winnings: segmentWinnings, matches: matchResultsList };
    }
  };

  /** 
   * Calculates the results for a Four Ball (Better Ball) match.
   * Supports Nassau (Front/Back/Overall) or single 18-hole formats.
   */
  const calculateFourBallFull = () => {
    const team1Ids = segments[0].team1;
    const team2Ids = segments[0].team2;
    const roundWinnings: { [id: string]: number } = {};
    activePlayers.forEach(player => roundWinnings[player.id] = 0);
    
    if (team1Ids.length < 2 || team2Ids.length < 2) return { winnings: roundWinnings, front: null, back: null, overall: null };

    /** Internal helper to calculate a Nassau side for Four Ball */
    const calculateNassauSide = (holeList: number[], sideMainStake: number, sidePressStake: number, legIndex: number) => {
        let matchScore = 0; // Team 1 vs Team 2
        let presses: Press[] = [];
        let holeByHoleAudit: any[] = [];
        
        // Initialize with manual presses
        (manualPresses[0]?.[legIndex] || []).forEach(h => presses.push({ id: Date.now() + h, startHole: h, score: 0, holeByHole: [] }));
        
        holeList.forEach((holeNumber, indexInList) => {
            const playerNetScores = activePlayers.map(p => getNetScore(p.id, holeNumber));
            const team1NetScores = team1Ids.map(id => playerNetScores[activePlayers.findIndex(p => p.id === id)]);
            const team2NetScores = team2Ids.map(id => playerNetScores[activePlayers.findIndex(p => p.id === id)]);
            
            if (team1NetScores.some(score => score === null) || team2NetScores.some(score => score === null)) return;
            
            const team1BestBall = Math.min(...team1NetScores.filter(s => s !== null) as number[]);
            const team2BestBall = Math.min(...team2NetScores.filter(s => s !== null) as number[]);
            
            // Find which specific players provided the best net score to track their gross
            const team1BestIdx = team1NetScores.indexOf(team1BestBall);
            const team2BestIdx = team2NetScores.indexOf(team2BestBall);
            const team1Gross = scores[team1Ids[team1BestIdx]]?.[holeNumber];
            const team2Gross = scores[team2Ids[team2BestIdx]]?.[holeNumber];

            const updateScore = (current: number) => (team1BestBall < team2BestBall ? current + 1 : team2BestBall < team1BestBall ? current - 1 : current);
            matchScore = updateScore(matchScore);
            
            presses = presses.map(press => {
                if (holeNumber < press.startHole) return press;
                const newPressScore = updateScore(press.score);
                const pressAudit = [...(press.holeByHole || []), { hole: holeNumber, t1Net: team1BestBall, t2Net: team2BestBall, t1Gross: team1Gross, t2Gross: team2Gross, running: newPressScore }];
                return { ...press, score: newPressScore, holeByHole: pressAudit };
            });
            
            holeByHoleAudit.push({ 
                hole: holeNumber, 
                t1Net: team1BestBall, t2Net: team2BestBall, 
                t1Gross: team1Gross, t2Gross: team2Gross, 
                running: matchScore 
            });
            
            // Tie-breaker on the final hole of the leg if still tied
            if (indexInList === holeList.length - 1 && matchScore === 0 && team1BestBall === team2BestBall && settings.useSecondBallTieBreaker) {
                const team1SecondBall = Math.max(...team1NetScores.filter(s => s !== null) as number[]);
                const team2SecondBall = Math.max(...team2NetScores.filter(s => s !== null) as number[]);
                if (team1SecondBall < team2SecondBall) matchScore++; 
                else if (team2SecondBall < team1SecondBall) matchScore--;
                
                if (holeByHoleAudit.length > 0) {
                    holeByHoleAudit[holeByHoleAudit.length-1].running = matchScore;
                    holeByHoleAudit[holeByHoleAudit.length-1].isTieBreaker = true;
                }
            }

            // Auto-press logic
            const holesRemaining = holeList.length - (indexInList + 1);
            const lastPressScore = presses.length > 0 ? presses[presses.length - 1].score : matchScore;
            const isClosedOut = Math.abs(lastPressScore) > holesRemaining;
            const isTwoDown = Math.abs(lastPressScore) >= 2;
            const shouldAutoPress = settings.autoPressTrigger === 'closed-out' ? isClosedOut : isTwoDown;

            if (settings.useAutoPress && shouldAutoPress && holesRemaining > 0) {
                if (!presses.some(p => p.startHole === holeNumber + 1)) {
                    presses.push({ id: Date.now() + indexInList, startHole: holeNumber + 1, score: 0, holeByHole: [] });
                }
            }
        });
        
        const sidePayout = (matchScore > 0 ? sideMainStake : matchScore < 0 ? -sideMainStake : 0) + 
                          presses.reduce((sum, press) => sum + (press.score > 0 ? sidePressStake : press.score < 0 ? -sidePressStake : 0), 0);
        
        return { score: matchScore, payout: sidePayout, presses, holeByHole: holeByHoleAudit };
    };

    if (fourBallStakes.type === '18-hole') {
        const overall = calculateNassauSide(Array.from({length: 18}, (_, i) => i + 1), fourBallStakes.mainOverall, fourBallStakes.pressOverall, 2);
        team1Ids.forEach(id => roundWinnings[id] = overall.payout);
        team2Ids.forEach(id => roundWinnings[id] = -overall.payout);
        return { winnings: roundWinnings, front: null, back: null, overall };
    } else {
        const front = calculateNassauSide(Array.from({length: 9}, (_, i) => i + 1), fourBallStakes.mainFront, fourBallStakes.pressFront, 0);
        const back = calculateNassauSide(Array.from({length: 9}, (_, i) => i + 10), fourBallStakes.mainBack, fourBallStakes.pressBack, 1);
        const overall = calculateNassauSide(Array.from({length: 18}, (_, i) => i + 1), fourBallStakes.mainOverall, fourBallStakes.pressOverall, 2);
        
        const totalWinnings = front.payout + back.payout + overall.payout;
        team1Ids.forEach(id => roundWinnings[id] = totalWinnings);
        team2Ids.forEach(id => roundWinnings[id] = -totalWinnings);
        
        return { winnings: roundWinnings, front, back, overall };
    }
  };

  /** Calculates a single 2-on-2 match (used for Sixes and The Wheel) */
  const calculateWheelMatch = (wheelTeamIds: string[], opponentTeamIds: string[], holeList: number[], segmentIndex: number, matchIdx: number) => {
    let matchScore = 0;
    let presses: Press[] = [];
    let holeByHoleAudit: any[] = [];
    
    // Initialize with manual presses
    (manualPresses[segmentIndex]?.[matchIdx] || []).forEach(h => {
        presses.push({ id: Date.now() + h, startHole: h, score: 0, holeByHole: [] });
    });

    holeList.forEach((holeNumber, indexInList) => {
      const teamNet1 = getNetScore(wheelTeamIds[0], holeNumber);
      const teamNet2 = getNetScore(wheelTeamIds[1], holeNumber);
      const oppNet1 = getNetScore(opponentTeamIds[0], holeNumber);
      const oppNet2 = getNetScore(opponentTeamIds[1], holeNumber);
      
      if (teamNet1 === null || oppNet1 === null) return;
      
      const wheelBestBall = Math.min(teamNet1, teamNet2 ?? 999);
      const opponentBestBall = Math.min(oppNet1, oppNet2 ?? 999);
      
      const teamGross1 = scores[wheelTeamIds[0]]?.[holeNumber], teamGross2 = scores[wheelTeamIds[1]]?.[holeNumber];
      const oppGross1 = scores[opponentTeamIds[0]]?.[holeNumber], oppGross2 = scores[opponentTeamIds[1]]?.[holeNumber];
      const wheelBestGross = teamNet1 === wheelBestBall ? teamGross1 : teamGross2;
      const opponentBestGross = oppNet1 === opponentBestBall ? oppGross1 : oppGross2;

      const updateScore = (current: number) => (wheelBestBall < opponentBestBall ? current + 1 : opponentBestBall < wheelBestBall ? current - 1 : current);
      matchScore = updateScore(matchScore);
      
      presses = presses.map(press => {
          if (holeNumber < press.startHole) return press;
          const newPressScore = updateScore(press.score);
          const pressAudit = [...(press.holeByHole || []), { hole: holeNumber, t1Net: wheelBestBall, t2Net: opponentBestBall, t1Gross: wheelBestGross, t2Gross: opponentBestGross, running: newPressScore }];
          return { ...press, score: newPressScore, holeByHole: pressAudit };
      });

      holeByHoleAudit.push({ 
          hole: holeNumber, t1Net: wheelBestBall, t2Net: opponentBestBall, t1Gross: wheelBestGross, t2Gross: opponentBestGross, 
          running: matchScore
      });

      const holesRemaining = holeList.length - (indexInList + 1);
      const lastPressScore = presses.length > 0 ? presses[presses.length - 1].score : matchScore;
      const isClosedOut = Math.abs(lastPressScore) > holesRemaining;
      const isTwoDown = Math.abs(lastPressScore) >= 2;
      const autoTriggered = settings.autoPressTrigger === 'closed-out' ? isClosedOut : isTwoDown;

      if (settings.useAutoPress && autoTriggered && holesRemaining > 0) {
        if (!presses.some(p => p.startHole === holeNumber + 1)) {
            presses.push({ id: Date.now() + indexInList, startHole: holeNumber + 1, score: 0, holeByHole: [] });
        }
      }

      // Tie-breaker on the final hole of the segment
      if (indexInList === 5 && matchScore === 0 && wheelBestBall === opponentBestBall && settings.useSecondBallTieBreaker) {
        const teamSecondBall = Math.max(teamNet1, teamNet2 ?? 999);
        const opponentSecondBall = Math.max(oppNet1, oppNet2 ?? 999);
        if (teamSecondBall < opponentSecondBall) matchScore++; 
        else if (opponentSecondBall < teamSecondBall) matchScore--;
        
        if (holeByHoleAudit.length > 0) {
            holeByHoleAudit[holeByHoleAudit.length-1].running = matchScore;
            holeByHoleAudit[holeByHoleAudit.length-1].isTieBreaker = true;
        }
      }
    });
    return { main: matchScore, presses, holeByHole: holeByHoleAudit };
  };

  /** 
   * Calculates point distribution for a 3-player Baseball (9-point) hole.
   */
  const calculateBaseballPoints = (holeNumber: number) => {
    const hole = selectedCourse.holes.find(h => h.number === holeNumber);
    if (!hole) return [0, 0, 0];
    
    const activePlayerIds = activePlayers.map(player => player.id);
    const playerGrossScores = activePlayerIds.map(id => scores[id]?.[holeNumber]);
    const playerNetScores = activePlayerIds.map(id => getNetScore(id, holeNumber));
    
    if (playerNetScores.some(score => score === null)) return [0, 0, 0];
    
    // Birdie Rule: One player wins all 9 points if they birdie and others bogey
    if (settings.useBaseballBirdieRule) {
        const scoresToEvaluate = settings.baseballBirdieRuleType === 'gross' ? playerGrossScores : playerNetScores;
        const winnerIndex = scoresToEvaluate.findIndex((score, playerIdx) => {
            if (score! > (hole.par - 1)) return false; // Winner must be Birdie or better (gross or net)
            // Check if all OTHER players are Net Bogey or worse
            return playerNetScores.every((netScore, otherIdx) => playerIdx === otherIdx || netScore! >= (hole.par + 1));
        });
        if (winnerIndex !== -1) {
            const pointsDistribution = [0, 0, 0];
            pointsDistribution[winnerIndex] = 9;
            return pointsDistribution;
        }
    }

    const sortedNetScores = [...playerNetScores].sort((a, b) => a! - b!);
    const [bestNet, middleNet, worstNet] = sortedNetScores;
    
    // Point Distribution Logic based on score tiers
    if (bestNet === middleNet && middleNet === worstNet) return [3, 3, 3]; // Three-way tie
    
    if (bestNet === middleNet) { // Tie for 1st
        return playerNetScores.map(score => score === bestNet ? 4 : 1);
    }
    
    if (middleNet === worstNet) { // Tie for 2nd
        return playerNetScores.map(score => score === middleNet ? 2 : 5);
    }
    
    // Distinct scores (5-3-1)
    return playerNetScores.map(score => score === bestNet ? 5 : score === middleNet ? 3 : 1);
  };

  /** 
   * Aggregates points and calculates payouts for the Baseball game mode.
   */
  const getBaseballTotals = () => {
    const totalPoints = [0, 0, 0];
    const frontNinePoints = [0, 0, 0];
    const backNinePoints = [0, 0, 0];
    
    for (let holeNum = 1; holeNum <= 18; holeNum++) {
        let holePoints = calculateBaseballPoints(holeNum);
        
        if (holeNum <= 9) {
            holePoints.forEach((pts, idx) => frontNinePoints[idx] += pts);
        }
        
        // Apply double points setting for back 9 if enabled
        if (holeNum >= 10 && settings.useBaseballDoubleBackNine) {
            holePoints = holePoints.map(pts => pts * 2);
        }

        if (holeNum >= 10) {
            holePoints.forEach((pts, idx) => backNinePoints[idx] += pts);
        }
        holePoints.forEach((pts, idx) => totalPoints[idx] += pts);
    }
    
    // Payouts are based on the point difference between every pair of players
    const [pts1, pts2, pts3] = totalPoints;
    const player1Payout = (pts1 - pts2) * baseballStake + (pts1 - pts3) * baseballStake;
    const player2Payout = (pts2 - pts1) * baseballStake + (pts2 - pts3) * baseballStake;
    const player3Payout = (pts3 - pts1) * baseballStake + (pts3 - pts2) * baseballStake;
    
    return { 
        points: totalPoints, 
        frontPoints: frontNinePoints,
        backPoints: backNinePoints,
        payouts: [player1Payout, player2Payout, player3Payout] 
    };
  };

  /** 
   * Aggregates total winnings for all players across all active game formats and matches.
   */
  const getPlayerTotals = () => {
    const totals: { [id: string]: number } = {};
    activePlayers.forEach(player => totals[player.id] = 0);
    
    if (gameMode === 'four-ball') {
        const results = calculateFourBallFull();
        Object.keys(results.winnings).forEach(id => { 
            if (totals[id] !== undefined) totals[id] += results.winnings[id]; 
        });
    } else if (gameMode === 'baseball') {
        const results = getBaseballTotals();
        // Only first 3 players get Baseball team winnings
        players.slice(0, 3).forEach((player, idx) => {
            if (totals[player.id] !== undefined) totals[player.id] = results.payouts[idx];
        });
    } else if (gameMode === 'wheel' || gameMode === 'sixes') {
        [0, 1, 2].forEach(segmentIdx => { 
            const results = calculateSegmentFull(segmentIdx); 
            Object.keys(results.winnings).forEach(id => { 
                if (totals[id] !== undefined) totals[id] += results.winnings[id]; 
            }); 
        });
    }
    
    // Add Independent Match results
    independentMatches.forEach(match => { 
        const results = calculateIndependentMatchResult(match); 
        if (totals[match.player1Id] !== undefined) totals[match.player1Id] += results.payout; 
        if (totals[match.player2Id] !== undefined) totals[match.player2Id] -= results.payout; 
    });
    
    return totals;
  };

  /** Returns formatted team names (e.g. "Brian & John") */
  const getTeamNamesByIds = (playerIds: string[], isFullName: boolean = false) => playerIds.map(id => { 
    const player = players.find(p => p.id === id); 
    return player ? (isFullName ? player.name : player.name.split(' ')[0]) : '?'; 
  }).join(' & ');

  /** Returns how many times a player has been the "Wheel" in the current round */
  const getPlayerWheelCount = (playerId: string, currentSegmentIndex: number) => 
    segments.reduce((count, segment, index) => index === currentSegmentIndex ? count : count + (segment.team1.includes(playerId) ? 1 : 0), 0);

  /** Checks if a pairing has already been used in another segment to ensure variety in rotations */
  const isPairingDuplicate = (player1Id: string, player2Id: string, currentSegmentIndex: number) => {
    if (!player1Id || !player2Id) return false;
    const pairingKey = [player1Id, player2Id].sort().join(',');
    return segments.some((segment, index) => 
        index !== currentSegmentIndex && 
        segment.team1.length === 2 && 
        [...segment.team1].sort().join(',') === pairingKey
    );
  };

  /** Handles team selection and automatically assigns remaining players to the opposing team */
  const handleTeamSelection = (segmentIndex: number, player1Id: string, player2Id: string) => {
    setSegments(prev => {
        const next = [...prev];
        next[segmentIndex] = { ...next[segmentIndex], team1: [player1Id, player2Id].filter(id => id) };
        const others = activePlayers.filter(p => !next[segmentIndex].team1.includes(p.id)).map(p => p.id);
        next[segmentIndex].team2 = others;
        return next;
    });
  };

  /** Returns the total gross score for a player across all 18 holes */
  const getPlayerScoreTotal = (playerId: string) => 
    scores[playerId] ? Object.values(scores[playerId]).reduce((sum, score) => sum + (score || 0), 0) : 0;

  /** Returns the total gross score for a player for a specific set of holes (e.g. F9 or B9) */
  const getPlayerHoleListTotal = (playerId: string, holeNumbers: number[]) => 
    scores[playerId] ? holeNumbers.reduce((sum, holeNum) => sum + (scores[playerId][holeNum] || 0), 0) : 0;

  /** Initializes manual relative stroke overrides with current calculated values */
  const handleManualStrokesToggle = () => {
    const isEnabling = !settings.useManualStrokes;
    if (isEnabling) {
        // Clear temporary string inputs
        setStrokeSummaryInputs({});
        // Set current calculated stroke values as the manual baseline
        setPlayers(prev => prev.map(player => ({
            ...player,
            manualRelativeStrokes: ((gameMode === 'sixes' || gameMode === 'wheel') && settings.strokeAllocation === 'divided')
                ? getStrokesPerSixHoles(player) 
                : (player.courseHandicap - baselineCH)
        })));
    }
    setSettings(prev => ({ ...prev, useManualStrokes: isEnabling }));
  };

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
                <option value="baseball">Baseball</option>
                <option value="independent">Independent Matches Only</option>
            </select>
        </div>
        <div className="header-text-only"><h1>{selectedCourse.name.toUpperCase()}</h1>{(selectedCourse.id === 'meadow-club' || selectedCourse.id === 'meadow-club-new') && <p>ESTABLISHED 1927</p>}</div>
      </header>
      <main className="app-content">
        {activeTab === 'setup' && (
          <div className="setup-container">
            <div className="card course-card"><h3><MapPin size={14} /> ACTIVE COURSE</h3><div className="course-selector-row"><select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="icon-btn edit-course" onClick={() => editCourse(selectedCourse)} title="Edit Course"><Edit2 size={14}/></button><button className="icon-btn add-course" onClick={startNewCourse} title="Add Course"><Plus size={14}/></button>{(selectedCourseId !== 'meadow-club' && selectedCourseId !== 'olympic-lake') && <button className="icon-btn remove-course" onClick={() => deleteCourse(selectedCourseId)} title="Remove Course"><Trash2 size={14}/></button>}</div></div>
            <div className="card"><h3><User size={14} /> ROUND PLAYERS</h3><div className="player-entry-grid">{activePlayers.map((p, i) => (
                  <div key={p.id} className="player-entry-row-group"><div className="player-entry-row"><input placeholder={`Player ${i + 1}`} value={p.name} onChange={e => updatePlayer(p.id, 'name', e.target.value)} /><input placeholder="Idx" value={p.indexInput} onChange={e => updatePlayer(p.id, 'index', e.target.value)} /><select value={p.selectedTeeIndex} onChange={e => updatePlayer(p.id, 'tee', e.target.value)}>{selectedCourse.tees.map((t, idx) => <option key={idx} value={idx}>{t.name}</option>)}</select><button className="icon-btn clear-player" onClick={() => clearPlayer(p.id)}><UserMinus size={14}/></button><button className="icon-btn save-partner" onClick={() => addPartner(p)}><UserPlus size={14}/></button></div>{partners.length > 0 && !p.name && <div className="partner-quick-load"><select onChange={e => { const pt = partners.find(pt => pt.name === e.target.value); if (pt) loadPartner(p.id, pt); }} defaultValue=""><option value="" disabled>Load Partner...</option>{partners.map(pt => <option key={pt.name} value={pt.name} disabled={activePlayers.some(ap => ap.name === pt.name)}>{pt.name}</option>)}</select></div>}</div>
                ))}</div></div>
            {partners.length > 0 && <div className="card partners-list-card"><div className="collapsible-header" onClick={() => toggleSection('partners')}><h3><UserCheck size={14} /> MANAGE PARTNERS</h3>{visibleSections.partners ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>{visibleSections.partners && <div className="partners-grid">{partners.map(pt => <div key={pt.name} className="partner-item-row"><span className="pt-name">{pt.name}</span><input className="pt-index-input" value={pt.indexInput} onChange={e => updatePartnerIndex(pt.name, e.target.value)} title="Handicap Index"/><button className="icon-btn delete-partner" onClick={() => deletePartner(pt.name)}><Trash2 size={12}/></button></div>)}</div>}</div>}
            {activePlayers.some(p => p.name) && (
                <div className="card stroke-summary-card">
                    <div className="collapsible-header" onClick={() => toggleSection('summary')}>
                        <h3><ListChecks size={14} /> STROKE SUMMARY</h3>
                        <div className="slider-toggle-container" onClick={e => { e.stopPropagation(); handleManualStrokesToggle(); }}>
                            <span>Adjust Strokes</span>
                            <div className={`slider-track ${settings.useManualStrokes ? 'active' : ''}`}>
                                <div className="slider-thumb" />
                            </div>
                        </div>
                        {visibleSections.summary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {visibleSections.summary && (
                        <div className="summary-grid">
                            <div className="summary-header">
                                <span>Player</span>
                                <span>CH</span>
                                {/* Column 3 Header */}
                                <span>{((gameMode === 'sixes' || gameMode === 'wheel') && settings.strokeAllocation === 'divided') ? 'Rel' : 'Strokes'}</span>
                                {/* Column 4 Header: ONLY if Sixes/Wheel AND Divided allocation */}
                                {((gameMode === 'sixes' || gameMode === 'wheel') && settings.strokeAllocation === 'divided') && <span>Per 6</span>}
                            </div>
                            {activePlayers.filter(p => p.name).map(p => (
                                <div key={p.id} className="summary-row">
                                    <strong>{p.name}</strong>
                                    <span>{p.courseHandicap}</span>
                                    
                                    {/* Column 3 Data: Adjust Total Relative Strokes or Reference */}
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                        {(settings.useManualStrokes && (gameMode !== 'sixes' && gameMode !== 'wheel' || settings.strokeAllocation === 'handicap')) ? (
                                            <input 
                                                type="text" 
                                                inputMode="decimal"
                                                className="manual-stroke-input" 
                                                value={strokeSummaryInputs[p.id] !== undefined ? strokeSummaryInputs[p.id] : p.manualRelativeStrokes.toString()} 
                                                onChange={e => handleStrokeSummaryInputChange(p.id, e.target.value)}
                                                onBlur={() => finalizeDecimalEntry(p.id, true)}
                                                onKeyDown={e => e.key === 'Enter' && finalizeDecimalEntry(p.id, true)}
                                            />
                                        ) : (
                                            <span>{p.courseHandicap - baselineCH}</span>
                                        )}
                                    </div>

                                    {/* Column 4 Data: ADJUST PER 6 (ONLY if Sixes/Wheel AND Divided allocation) */}
                                    {((gameMode === 'sixes' || gameMode === 'wheel') && settings.strokeAllocation === 'divided') && (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {settings.useManualStrokes ? (
                                                <input 
                                                    type="text" 
                                                    inputMode="decimal"
                                                    className="manual-stroke-input" 
                                                    value={strokeSummaryInputs[p.id] !== undefined ? strokeSummaryInputs[p.id] : p.manualRelativeStrokes.toString()} 
                                                    onChange={e => handleStrokeSummaryInputChange(p.id, e.target.value)}
                                                    onBlur={() => finalizeDecimalEntry(p.id, true)}
                                                    onKeyDown={e => e.key === 'Enter' && finalizeDecimalEntry(p.id, true)}
                                                />
                                            ) : (
                                                <strong>{getStrokesPerSix(p)}</strong>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {gameMode !== 'independent' && (
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
                                ) : gameMode === 'baseball' ? (
                                    <div className="stake-item"><span>Price Per Point ($)</span><input type="number" value={baseballStake || ''} onChange={e => setBaseballStake(e.target.value === '' ? 0 : parseInt(e.target.value))} /></div>
                                ) : (
                                    <>
                                        <div className="stake-item"><span>Main Bet ($)</span><input type="number" value={mainStake || ''} onChange={e => setMainStake(e.target.value === '' ? 0 : parseInt(e.target.value))} /></div>
                                        <div className="stake-item"><span>Press Bet ($)</span><input type="number" value={pressStake || ''} onChange={e => setPressStake(e.target.value === '' ? 0 : parseInt(e.target.value))} /></div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            {gameMode !== 'baseball' && gameMode !== 'independent' && activePlayers.every(p => p.name) && (
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
                            <div key={m.id} className="independent-match-row">
                                <div className="im-header-row">
                                    <div className="im-pair">
                                        <select value={m.p1Id} onChange={e => updateIndependentMatch(m.id, 'p1Id', e.target.value)}>{activePlayers.map(p => <option key={p.id} value={p.id}>{p.name || 'P' + p.id}</option>)}</select>
                                        <span>vs</span>
                                        <select value={m.p2Id} onChange={e => updateIndependentMatch(m.id, 'p2Id', e.target.value)}>{activePlayers.map(p => <option key={p.id} value={p.id}>{p.name || 'P' + p.id}</option>)}</select>
                                    </div>
                                </div>
                                
                                <div className="im-stroke-adjustment-row">
                                    <div className="im-calc-strokes">
                                        {(() => {
                                            const p1 = players.find(p => p.id === m.p1Id);
                                            const p2 = players.find(p => p.id === m.p2Id);
                                            if (!p1 || !p2) return <span>...</span>;
                                            const diff = p1.courseHandicap - p2.courseHandicap;
                                            
                                            // Higher CH receives strokes. 
                                            const recipient = diff >= 0 ? p1.name.split(' ')[0] : p2.name.split(' ')[0];
                                            
                                            if (diff === 0 && m.manualStrokes === undefined) return <span>Even match</span>;

                                            return (
                                                <div className="im-stroke-editor">
                                                    <span>{recipient} receives</span>
                                                    <input 
                                                        type="text" 
                                                        inputMode="decimal"
                                                        className="im-stroke-input-compact" 
                                                        value={imStrokeInputs[m.id] !== undefined ? imStrokeInputs[m.id] : (m.manualStrokes ?? Math.abs(diff)).toString()} 
                                                        onChange={e => handleImStrokeChange(m.id, e.target.value)}
                                                        onBlur={() => {
                                                            // Cleanup temporary strings on blur
                                                            const val = imStrokeInputs[m.id];
                                                            if (val === '' || val === '-' || val === '.') {
                                                                setImStrokeInputs(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[m.id];
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                    />
                                                    <span>strokes</span>
                                                    {m.manualStrokes !== undefined && (
                                                        <button className="reset-strokes-btn sm" onClick={() => {
                                                            updateIndependentMatch(m.id, 'manualStrokes', undefined);
                                                            setImStrokeInputs(prev => {
                                                                const next = { ...prev };
                                                                delete next[m.id];
                                                                return next;
                                                            });
                                                        }} title="Reset to calculated">
                                                            <RotateCcw size={10}/>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

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
          <div className="scorecard-view" style={{ '--player-count': scorecardPlayers.length || 1 } as any}>
            <div className="scorecard-header-fixed"><div className="h-cell">Hole</div>{scorecardPlayers.map(p => {
                const displayStrokes = (gameMode === 'sixes' || gameMode === 'wheel') 
                    ? getStrokesPerSix(p) 
                    : (settings.useManualStrokes ? p.manualRelativeStrokes : p.courseHandicap - baselineCH);
                return (
                    <div key={p.id} className="p-cell">
                        <div className="p-name">{p.name.split(' ')[0]}</div>
                        <div className="p-strokes">{displayStrokes}</div>
                    </div>
                );
            })}{gameMode === 'baseball' && <div className="p-cell bb-pts-header">Pts</div>}</div>
             <div className="scorecard-scroll-area">{selectedCourse.holes.map(h => (
                 <div key={h.number} className="score-row"><div className="h-info"><strong>{h.number}</strong><span>P{h.par}/H{h.handicap}</span></div>
                        {scorecardPlayers.map(p => {
                            const strokes = getStrokesForHole(p.id, h.number);
                            const renderStrokes = () => {
                                if (strokes === 0) return null;
                                const isPlus = strokes < 0; // Negative return in logic means player GIVES strokes (net > gross)
                                const absStrokes = Math.abs(strokes);
                                
                                if (isPlus) {
                                    if (absStrokes === 0.5) return <span className="stroke-marker plus">+½</span>;
                                    if (absStrokes === 1) return <span className="stroke-marker plus">+1</span>;
                                    if (absStrokes === 1.5) return <span className="stroke-marker plus">+1½</span>;
                                    if (absStrokes === 2) return <span className="stroke-marker plus">+2</span>;
                                    return <span className="stroke-marker plus">+{Math.floor(absStrokes)}{absStrokes % 1 !== 0 ? '½' : ''}</span>;
                                } else {
                                    if (absStrokes === 0.5) return <span className="stroke-marker">½</span>;
                                    if (absStrokes === 1) return <span className="stroke-marker">*</span>;
                                    if (absStrokes === 1.5) return <span className="stroke-marker">*½</span>;
                                    if (absStrokes === 2) return <span className="stroke-marker">**</span>;
                                    return <span className="stroke-marker">{Array.from({length: Math.floor(absStrokes)}, () => '*').join('')}{absStrokes % 1 !== 0 ? '½' : ''}</span>;
                                }
                            };
                            return (
                                <div key={p.id} className="input-cell">
                                    <div className="input-wrapper">
                                        <input type="number" inputMode="numeric" value={scores[p.id]?.[h.number] || ''} onChange={e => setScore(p.id, h.number, e.target.value)} disabled={!p.name} />
                                        {renderStrokes()}
                                    </div>
                                    <span className="net">{getNetScore(p.id, h.number) ?? ''}</span>
                                </div>
                            );
                        })}
                        {gameMode === 'baseball' && (
                            <div className="bb-pts-cell">
                                {(() => {
                                    let pts = calculateBaseballPoints(h.number);
                                    if (pts.every(p => p === 0)) return null;
                                    if (h.number >= 10 && settings.useBaseballDoubleBackNine) {
                                        pts = pts.map(p => p * 2);
                                    }
                                    return <div className="bb-pts-stack">{pts.map((p, i) => <span key={i}>{p}</span>)}</div>
                                })()}
                            </div>
                        )}
                 </div>
                 ))}
                 <div className="score-row total-row-sub"><div className="h-info"><strong>F9</strong></div>{scorecardPlayers.map(p => <div key={p.id} className="input-cell total-cell"><strong>{getPlayerNineTotal(p.id, [1,2,3,4,5,6,7,8,9])}</strong></div>)}{gameMode === 'baseball' && <div className="bb-pts-cell total"><strong>{(() => { let sum=0; for(let h=1;h<=9;h++) calculateBaseballPoints(h).forEach(p=>sum+=p); return sum; })()}</strong></div>}</div>
                 <div className="score-row total-row-sub"><div className="h-info"><strong>B9</strong></div>{scorecardPlayers.map(p => <div key={p.id} className="input-cell total-cell"><strong>{getPlayerNineTotal(p.id, [10,11,12,13,14,15,16,17,18])}</strong></div>)}{gameMode === 'baseball' && <div className="bb-pts-cell total"><strong>{(() => { let sum=0; for(let h=10;h<=18;h++) { let pts = calculateBaseballPoints(h); if (settings.useBaseballDoubleBackNine) pts = pts.map(p => p * 2); pts.forEach(p=>sum+=p); } return sum; })()}</strong></div>}</div>
                 <div className="score-row total-row"><div className="h-info"><strong>TOT</strong></div>{scorecardPlayers.map(p => <div key={p.id} className="input-cell total-cell"><strong>{getPlayerScoreTotal(p.id)}</strong></div>)}{gameMode === 'baseball' && <div className="bb-pts-cell total"><strong>{(() => { let sum=0; for(let h=1;h<=18;h++) { let pts = calculateBaseballPoints(h); if (h >= 10 && settings.useBaseballDoubleBackNine) pts = pts.map(p => p * 2); pts.forEach(p=>sum+=p); } return sum; })()}</strong></div>}</div>
                 <div className="score-row net-total-row"><div className="h-info"><strong>NET</strong></div>{scorecardPlayers.map(p => {
                     const gross = getPlayerScoreTotal(p.id);
                     const net = gross > 0 ? gross - p.courseHandicap : 0;
                     return <div key={p.id} className="input-cell total-cell"><strong style={{color: 'var(--mackenzie-green)'}}>{gross > 0 ? net : ''}</strong></div>
                 })}{gameMode === 'baseball' && <div className="bb-pts-cell"></div>}</div>
             </div></div>
        )}
        {activeTab === 'results' && (
          <div className="results-view">
            <div className="card winnings-card"><h3>TOTAL WINNINGS</h3>{Object.entries(getPlayerTotals()).filter(([id]) => players.find(p => p.id === id)?.name).map(([id, amt]) => <div key={id} className={`winnings-row ${amt >= 0 ? 'pos' : 'neg'}`}><span>{activePlayers.find(p => p.id === id)?.name || 'Player'}</span><strong>{amt >= 0 ? `+$${amt}` : `-$${Math.abs(amt)}`}</strong></div>)}</div>
            
            {gameMode === 'baseball' && (
                <div className="card result-seg-card"><h3>Baseball Points</h3>
                    {(() => {
                        const res = getBaseballTotals();
                        return (
                            <div className="baseball-results-grid">
                                <div className="bb-res-header"><span>Player</span><span>F9 / B9</span><span>Total</span><span>Payout</span></div>
                                {activePlayers.slice(0, 3).map((p, i) => (
                                    <div key={p.id} className="bb-res-row">
                                        <strong>{p.name || `Player ${i+1}`}</strong>
                                        <span className="bb-res-split">{res.frontPoints[i]} / {res.backPoints[i]}</span>
                                        <span className="bb-res-total">{res.points[i]}</span>
                                        <strong className={res.payouts[i] >= 0 ? 'pos' : 'neg'}>
                                            {res.payouts[i] >= 0 ? `+$${res.payouts[i]}` : `-$${Math.abs(res.payouts[i])}`}
                                        </strong>
                                    </div>
                                ))}
                                <div className="bb-explanation">
                                    <p>Payouts: Differences in total points between each player pair x ${baseballStake}/pt.</p>
                                    {settings.useBaseballDoubleBackNine && <p style={{marginTop: '4px', color: 'var(--mackenzie-green)', fontWeight: '600'}}>* Back nine point totals are doubled in the final calculation.</p>}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

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
                            const detailId = `fourball-${legIdx}`;
                            
                            const legMainStake = legIdx === 0 ? fourBallStakes.mainFront : legIdx === 1 ? fourBallStakes.mainBack : fourBallStakes.mainOverall;
                            const mainPayout = side.score === 0 ? 0 : legMainStake;

                            return (
                                <div className="match-detail-group">
                                    <div className="res-row main" onClick={() => toggleMatchDetail(detailId)}>
                                        <div className="res-main-label">
                                            <span>{label}</span>
                                            {showMatchDetails[detailId] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                        </div>
                                        <strong>{up} {mainPayout > 0 ? `($${mainPayout})` : ''}</strong>
                                    </div>
                                    {showMatchDetails[detailId] && (
                                        <div className="audit-table">
                                            <div className="audit-header"><span>H</span><span>{getTeamNamesByIds(team1)}</span><span>{getTeamNamesByIds(team2)}</span><span>+/-</span></div>
                                            {side.holeByHole.map((h: any) => (
                                                <div key={h.hole} className="audit-row">
                                                    <span>{h.hole}</span>
                                                    <span>{h.t1Gross === h.t1Net ? h.t1Net : `${h.t1Gross}/${h.t1Net}`}</span>
                                                    <span>{h.t2Gross === h.t2Net ? h.t2Net : `${h.t2Gross}/${h.t2Net}`}</span>
                                                    <strong>{h.running === 0 ? 'AS' : h.running > 0 ? `+${h.running}` : h.running}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!settings.useAutoPress && <div className="manual-press-entry-group">
                                        <div className="manual-press-input-row">
                                            <input type="number" placeholder="H#" value={pressInputs[`seg-0-${legIdx}`] || ''} onChange={e => setPressInputs({...pressInputs, [`seg-0-${legIdx}`]: e.target.value})}/>
                                            <button className="add-press-btn green sm" onClick={() => addSegmentManualPress(0, legIdx)}>Press</button>
                                        </div>
                                    </div>}
                                    {side.presses.map((p: any, pi: number) => {
                                        const legPressStake = legIdx === 0 ? fourBallStakes.pressFront : legIdx === 1 ? fourBallStakes.pressBack : fourBallStakes.pressOverall;
                                        const pressPayout = p.score === 0 ? 0 : legPressStake;
                                        const isManual = manualPresses[0]?.[legIdx]?.includes(p.startHole);
                                        const pressDetailId = `fourball-${legIdx}-p-${p.startHole}`;
                                        
                                        return (
                                            <div key={pi} className="press-audit-group">
                                                <div className="res-row press" onClick={() => toggleMatchDetail(pressDetailId)}>
                                                    <div className="res-main-label">
                                                        <span>
                                                            Press (#{p.startHole}) 
                                                            {isManual && <button className="delete-btn-xs" onClick={e => { e.stopPropagation(); removeManualPress('segment', '0', p.startHole, legIdx); }}><X size={10}/></button>}
                                                        </span>
                                                        {showMatchDetails[pressDetailId] ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                    </div>
                                                    <strong>{p.score === 0 ? "AS" : `${p.score > 0 ? getTeamNamesByIds(team1) : getTeamNamesByIds(team2)} ${Math.abs(p.score)} UP`} {pressPayout > 0 ? `($${pressPayout})` : ''}</strong>
                                                </div>
                                                {showMatchDetails[pressDetailId] && p.holeByHole && (
                                                    <div className="audit-table press-audit">
                                                        <div className="audit-header"><span>H</span><span>{getTeamNamesByIds(team1)}</span><span>{getTeamNamesByIds(team2)}</span><span>+/-</span></div>
                                                        {p.holeByHole.map((h: any) => (
                                                            <div key={h.hole} className="audit-row">
                                                                <span>{h.hole}</span>
                                                                <span>{h.t1Gross === h.t1Net ? h.t1Net : `${h.t1Gross}/${h.t1Net}`}</span>
                                                                <span>{h.t2Gross === h.t2Net ? h.t2Net : `${h.t2Gross}/${h.t2Net}`}</span>
                                                                <strong>{h.running === 0 ? 'AS' : h.running > 0 ? `+${h.running}` : h.running}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
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
            ) : (gameMode !== 'baseball' && gameMode !== 'independent') ? (
                [{l: "First Six", id: 0}, {l: "Second Six", id: 1}, {l: "Third Six", id: 2}].map((seg) => {
                    const res = calculateSegmentFull(seg.id);
                    const mPrs = manualPresses[seg.id] || { 0: [] };
                    return (
                        <div key={seg.id} className="card result-seg-card"><h3>{seg.l}{gameMode === 'wheel' && segments[seg.id].team1.length === 2 ? ` Wheel - ${getTeamNamesByIds(segments[seg.id].team1, true)}` : ''}</h3>
                        {res.matches.map((m, mi) => {
                            const winN = m.result.main > 0 ? getTeamNamesByIds(segments[seg.id].team1) : getTeamNamesByIds(m.opponent);
                            const detailId = `sixes-${seg.id}-${mi}`;
                            const mainAmt = m.result.main === 0 ? 0 : mainStake;
                            const matchManual = mPrs[mi] || [];
                            
                            return (
                                <div key={mi} className="match-detail-group">
                                    <div className="res-row main" onClick={() => toggleMatchDetail(detailId)}>
                                        <div className="res-main-label">
                                            <div className="teams-vs-block">
                                                {gameMode === 'sixes' ? (
                                                    <><div className="team-names">{getTeamNamesByIds(segments[seg.id].team1)} vs</div><div className="team-names">{getTeamNamesByIds(m.opponent)}</div></>
                                                ) : (
                                                    <div className="team-names">{getTeamNamesByIds(m.opponent)}</div>
                                                )}
                                            </div>
                                            {showMatchDetails[detailId] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                        </div>
                                        <strong>{m.result.main === 0 ? "AS" : `${winN} ${Math.abs(m.result.main)} UP`} {mainAmt > 0 ? `($${mainAmt})` : ''}</strong>
                                    </div>
                                    {showMatchDetails[detailId] && (
                                        <div className="audit-table">
                                            <div className="audit-header"><span>H</span><span>{getTeamNamesByIds(segments[seg.id].team1)}</span><span>{getTeamNamesByIds(m.opponent)}</span><span>+/-</span></div>
                                            {m.result.holeByHole.map((h: any) => (
                                                <div key={h.hole} className="audit-row">
                                                    <span>{h.hole}</span>
                                                    <span>{h.t1Gross === h.t1Net ? h.t1Net : `${h.t1Gross}/${h.t1Net}`}</span>
                                                    <span>{h.t2Gross === h.t2Net ? h.t2Net : `${h.t2Gross}/${h.t2Net}`}</span>
                                                    <strong>{h.running === 0 ? 'AS' : h.running > 0 ? `+${h.running}` : h.running}{h.isTieBreaker ? ' (TB)' : ''}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!settings.useAutoPress && <div className="manual-press-entry-group">
                                    <div className="manual-press-input-row">
                                        <input type="number" placeholder="H#" value={pressInputs[`seg-${seg.id}-${mi}`] || ''} onChange={e => setPressInputs({...pressInputs, [`seg-${seg.id}-${mi}`]: e.target.value})}/>
                                        <button className="add-press-btn green sm" onClick={() => addSegmentManualPress(seg.id, mi)}>Press</button>
                                    </div>
                                </div>}
                                {m.result.presses.map((p, pi) => {
                                    const pAmt = p.score === 0 ? 0 : pressStake;
                                    const pressDetailId = `sixes-${seg.id}-${mi}-p-${p.startHole}`;
                                    return (
                                        <div key={pi} className="press-audit-group">
                                            <div className="res-row press" onClick={() => toggleMatchDetail(pressDetailId)}>
                                                <div className="res-main-label">
                                                    <span>Press (#{p.startHole}) {matchManual.includes(p.startHole) && <button className="delete-btn-xs" onClick={e => { e.stopPropagation(); removeManualPress('segment', seg.id.toString(), p.startHole, mi); }}><X size={10}/></button>}</span>
                                                    {showMatchDetails[pressDetailId] ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                </div>
                                                <strong>{p.score === 0 ? "AS" : `${p.score > 0 ? getTeamNamesByIds(segments[seg.id].team1) : getTeamNamesByIds(m.opponent)} ${Math.abs(p.score)} UP`} {pAmt > 0 ? `($${pAmt})` : ''}</strong>
                                            </div>
                                            {showMatchDetails[pressDetailId] && p.holeByHole && (
                                                <div className="audit-table press-audit">
                                                    <div className="audit-header"><span>H</span><span>{getTeamNamesByIds(segments[seg.id].team1)}</span><span>{getTeamNamesByIds(m.opponent)}</span><span>+/-</span></div>
                                                    {p.holeByHole.map((h: any) => (
                                                        <div key={h.hole} className="audit-row">
                                                            <span>{h.hole}</span>
                                                            <span>{h.t1Gross === h.t1Net ? h.t1Net : `${h.t1Gross}/${h.t1Net}`}</span>
                                                            <span>{h.t2Gross === h.t2Net ? h.t2Net : `${h.t2Gross}/${h.t2Net}`}</span>
                                                            <strong>{h.running === 0 ? 'AS' : h.running > 0 ? `+${h.running}` : h.running}</strong>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}</div>);
                        })}
                        </div>
                    );
                })
            ) : null}

            {independentMatches.length > 0 && <div className="card independent-results-card"><h3>INDEPENDENT MATCHES</h3>{independentMatches.map(m => {
                        const res = calculateIndependentMatchResult(m);
                        const mPrs = indManualPresses[m.id] || { overall: [], front: [], back: [] };
                        return (
                            <div key={m.id} className="im-result-group">
                                <div className="im-res-main" onClick={() => toggleMatchDetail(m.id)}>
                                    <span>{getTeamNamesByIds([m.p1Id])} vs {getTeamNamesByIds([m.p2Id])}</span>
                                    <div className="im-res-summary-group">
                                        <strong>{res.payout === 0 ? "AS" : `${res.payout > 0 ? '+' : ''}$${res.payout}`}</strong>
                                        {showMatchDetails[m.id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                    </div>
                                </div>
                                {showMatchDetails[m.id] && (
                                    <div className="im-audit-container">
                                        {m.type === '18-hole' ? (
                                            <div className="audit-table">
                                                <div className="audit-header"><span>H</span><span>{getTeamNamesByIds([m.p1Id])}</span><span>{getTeamNamesByIds([m.p2Id])}</span><span>+/-</span></div>
                                                {res.overall.holeByHole.map((h: any) => (
                                                    <div key={h.hole} className="audit-row">
                                                        <span>{h.hole}</span>
                                                        <span>{h.p1Gross === h.p1Net ? h.p1Net : `${h.p1Gross}/${h.p1Net}`}</span>
                                                        <span>{h.p2Gross === h.p2Net ? h.p2Net : `${h.p2Gross}/${h.p2Net}`}</span>
                                                        <strong>{h.running === 0 ? 'AS' : h.running > 0 ? `+${h.running}` : h.running}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="im-nassau-audit">
                                                <div className="audit-table-group">
                                                    <div className="audit-label">Front 9</div>
                                                    <div className="audit-table">
                                                        <div className="audit-header"><span>H</span><span>{getTeamNamesByIds([m.p1Id])}</span><span>{getTeamNamesByIds([m.p2Id])}</span><span>+/-</span></div>
                                                        {res.front?.holeByHole.map((h: any) => (
                                                            <div key={h.hole} className="audit-row"><span>{h.hole}</span><span>{h.p1Net}</span><span>{h.p2Net}</span><strong>{h.running === 0 ? 'AS' : h.running > 0 ? `+${h.running}` : h.running}</strong></div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="audit-table-group">
                                                    <div className="audit-label">Back 9</div>
                                                    <div className="audit-table">
                                                        <div className="audit-header"><span>H</span><span>{getTeamNamesByIds([m.p1Id])}</span><span>{getTeamNamesByIds([m.p2Id])}</span><span>+/-</span></div>
                                                        {res.back?.holeByHole.map((h: any) => (
                                                            <div key={h.hole} className="audit-row"><span>{h.hole}</span><span>{h.p1Net}</span><span>{h.p2Net}</span><strong>{h.running === 0 ? 'AS' : h.running > 0 ? `+${h.running}` : h.running}</strong></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                {res.pressDetail.length > 0 && (
                                    <div className="im-press-breakdown">
                                        {res.pressDetail.map((p, pi) => {
                                            const typeKey = (p as any).label?.toLowerCase()?.includes('front') ? 'front' : (p as any).label?.toLowerCase()?.includes('back') ? 'back' : 'overall';
                                            const isManual = mPrs[typeKey]?.includes(p.startHole);
                                            const pressDetailId = `ind-${m.id}-p-${p.startHole}-${typeKey}`;
                                            
                                            return (
                                                <div key={pi} className="press-audit-group">
                                                    <div className="im-press-row clickable" onClick={() => toggleMatchDetail(pressDetailId)}>
                                                        <span>
                                                            {p.label ? `${p.label} ` : ''}Press (Hole {p.startHole})
                                                            {isManual && <button className="delete-btn-xs" onClick={e => { e.stopPropagation(); removeManualPress('ind', m.id, p.startHole, typeKey); }}><X size={10}/></button>}
                                                        </span>
                                                        <div className="im-press-status-group">
                                                            <span className="im-press-status">{p.display} (${Math.abs(p.payout)})</span>
                                                            {showMatchDetails[pressDetailId] ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                        </div>
                                                    </div>
                                                    {showMatchDetails[pressDetailId] && p.holeByHole && (
                                                        <div className="audit-table press-audit">
                                                            <div className="audit-header"><span>H</span><span>{getTeamNamesByIds([m.p1Id])}</span><span>{getTeamNamesByIds([m.p2Id])}</span><span>+/-</span></div>
                                                            {p.holeByHole.map((h: any) => (
                                                                <div key={h.hole} className="audit-row">
                                                                    <span>{h.hole}</span>
                                                                    <span>{h.p1Gross === h.p1Net ? h.p1Net : `${h.p1Gross}/${h.p1Net}`}</span>
                                                                    <span>{h.p2Gross === h.p2Net ? h.p2Net : `${h.p2Gross}/${h.p2Net}`}</span>
                                                                    <strong>{h.running === 0 ? 'AS' : h.running > 0 ? `+${h.running}` : h.running}</strong>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}</div>}
          </div>
        )}
        {activeTab === 'rules' && (
          <div className="rules-view">
            <div className={`card ${isLakeSelected ? 'lake-theme' : ''}`} style={{border: isLakeSelected ? '2px solid var(--olympic-red)' : '2px solid var(--mackenzie-green)'}}><h3>{gameMode === 'wheel' ? 'The Wheel Rules' : gameMode === 'sixes' ? 'Sixes Rules' : gameMode === 'four-ball' ? 'Four Ball Rules' : gameMode === 'baseball' ? 'Baseball Rules' : 'Independent Match Rules'}</h3><div className="rules-content">
                {gameMode === 'independent' ? (
                    <section><h4>Independent Matches Only</h4><p>In this mode, there is no main team game. Players compete only in the independent matches you set up on the Setup tab.</p></section>
                ) : gameMode === 'baseball' ? (
                    <section><h4>Baseball (3 Players)</h4><p>On each hole, 9 points are distributed among 3 players based on net scores:</p><ul><li><strong>Distinct scores:</strong> 5, 3, 1 points</li><li><strong>One winner, two tie for 2nd:</strong> 5, 2, 2 points</li><li><strong>Two winners tie, one 3rd:</strong> 4, 4, 1 points</li><li><strong>Three-way tie:</strong> 3, 3, 3 points</li></ul>
                    {settings.useBaseballBirdieRule && <p style={{marginTop: '8px', color: 'var(--mackenzie-green)', fontWeight: '600'}}>Birdie Rule: If winner is {settings.baseballBirdieRuleType === 'gross' ? 'Gross Birdie or better' : 'Net Birdie or better'} and both others are Net Bogey or worse, winner receives all 9 points.</p>}</section>
                ) : gameMode === 'wheel' ? <><section><h4>The Wheel (5 Players)</h4><p>One pair is "On the Wheel" for 6 holes. They play 3 matches simultaneously against all other 2-player combinations of the remaining 3 players.</p></section><section><h4>Rotation</h4><p>Every player must be on the wheel at least once, and no more than twice during the round.</p></section></> : gameMode === 'sixes' ? <section><h4>Sixes (4 Players)</h4><p>Players compete in three distinct 6-hole matches with rotating partners. Each match is a separate bet.</p></section> : <section><h4>Four Ball (4 Players)</h4><p>Two teams of two players compete in an 18-hole match in which the lowest net score from each team is used to determine the winner of each hole.</p></section>}
                <section><h4>Baseline Strokes</h4><p>The best player in the group establishes the 0-stroke baseline. All other players receive strokes relative to this baseline.</p></section>
                {gameMode === 'baseball' && <section><h4>Baseball Allocation</h4><p>Total relative strokes are divided by 3 for each six-hole segment (similar to Sixes). A half stroke wins a point if net scores are otherwise tied.</p></section>}
                {gameMode !== 'four-ball' && gameMode !== 'baseball' && settings.strokeAllocation === 'divided' ? <section><h4>Sixes Allocation (Divided)</h4><p>Total relative strokes are divided by 3 for each six-hole match.</p><ul>{settings.remainderLogic === 'standard' ? <li>If the remainder is less than .5, strokes are rounded down. If .5 or greater, the player receives an extra <strong>half stroke (½)</strong>.</li> : <li>Any remainder (even small) results in an extra <strong>half stroke (½)</strong> for that segment.</li>}</ul></section> : (gameMode !== 'four-ball' && gameMode !== 'baseball' && <section><h4>Stroke Allocation (Handicap Ranking)</h4><p>Strokes are applied across all 18 holes based on their handicap ranking (1-18).</p></section>)}
                <section><h4>Betting & Tied Holes</h4><p>{gameMode === 'baseball' ? 'Payouts are calculated based on the difference in total points between each pair of players.' : `A half stroke (1/2) wins a hole if the competitors are otherwise tied on that hole. Otherwise standard better ball scoring applies. ${settings.useSecondBallTieBreaker ? `If the match is still tied after the ${gameMode === 'four-ball' ? '9th or 18th' : 'final'} hole, the second lowest net score (2nd ball) is used as a tie-breaker.` : ''}`}</p></section>
                {gameMode !== 'baseball' && <section><h4>Auto-Presses</h4><p>{settings.useAutoPress ? `A new press bet is automatically created whenever a team goes ${settings.autoPressTrigger === '2-down' ? '2-down' : 'closed out'} on the main bet or any existing press bet.` : 'Automatic presses are disabled. You can manually add a press on the Results tab for any match.'}</p></section>}
              </div></div>
            <div className="card settings-card"><h3><Sliders size={14} /> GAME SETTINGS</h3><div className="settings-grid">
                    {gameMode === 'baseball' && (
                        <>
                            <div className="setting-control-row"><div className="setting-info"><strong>Birdie Rule</strong><p>Winner gets 9 pts if winner is Birdie or better and others are Bogey or worse</p></div><button className={`checkbox-btn ${settings.useBaseballBirdieRule ? 'checked' : ''}`} onClick={() => setSettings(s => ({...s, useBaseballBirdieRule: !s.useBaseballBirdieRule}))}>{settings.useBaseballBirdieRule ? <Check size={16} /> : <X size={16} />}</button></div>
                            {settings.useBaseballBirdieRule && <div className="setting-control-row"><div className="setting-info"><strong>Birdie Rule Type</strong><p>Rule enforced based on {settings.baseballBirdieRuleType} winning score</p></div><div className="toggle-switch-container"><button className={settings.baseballBirdieRuleType === 'gross' ? 'active' : ''} onClick={() => setSettings(s => ({...s, baseballBirdieRuleType: 'gross'}))}>Gross</button><button className={settings.baseballBirdieRuleType === 'net' ? 'active' : ''} onClick={() => setSettings(s => ({...s, baseballBirdieRuleType: 'net'}))}>Net</button></div></div>}
                            <div className="setting-control-row"><div className="setting-info"><strong>Double Back Nine</strong><p>Points on holes 10-18 are worth double</p></div><button className={`checkbox-btn ${settings.useBaseballDoubleBackNine ? 'checked' : ''}`} onClick={() => setSettings(s => ({...s, useBaseballDoubleBackNine: !s.useBaseballDoubleBackNine}))}>{settings.useBaseballDoubleBackNine ? <Check size={16} /> : <X size={16} />}</button></div>
                        </>
                    )}
                    {gameMode !== 'four-ball' && gameMode !== 'baseball' && (
                        <div className="setting-control-row"><div className="setting-info"><strong>Stroke Allocation</strong><p>{settings.strokeAllocation === 'divided' ? 'Spread Evenly' : 'As They Fall'}</p></div><div className="toggle-switch-container"><button className={settings.strokeAllocation === 'divided' ? 'active' : ''} onClick={() => setSettings(s => ({...s, strokeAllocation: 'divided'}))}>Spread Evenly</button><button className={settings.strokeAllocation === 'handicap' ? 'active' : ''} onClick={() => setSettings(s => ({...s, strokeAllocation: 'handicap'}))}>As They Fall</button></div></div>
                    )}
                    {settings.strokeAllocation === 'divided' && gameMode !== 'four-ball' && gameMode !== 'baseball' && <div className="setting-control-row"><div className="setting-info"><strong>Half Strokes</strong><p>Only if remainder &gt; .5</p></div><button className={`checkbox-btn ${settings.remainderLogic === 'standard' ? 'checked' : ''}`} onClick={() => setSettings(s => ({...s, remainderLogic: s.remainderLogic === 'standard' ? 'alwaysHalf' : 'standard'}))}>{settings.remainderLogic === 'standard' ? <Check size={16} /> : <X size={16} />}</button></div>}
                    {gameMode !== 'baseball' && <div className="setting-control-row"><div className="setting-info"><strong>Second Ball Tie-Breaker</strong><p>{gameMode === 'four-ball' ? 'Use 2nd ball on 9th and 18th holes if still tied' : 'Use 2nd ball on 6th hole if still tied'}</p></div><button className={`checkbox-btn ${settings.useSecondBallTieBreaker ? 'checked' : ''}`} onClick={() => setSettings(s => ({...s, useSecondBallTieBreaker: !s.useSecondBallTieBreaker}))}>{settings.useSecondBallTieBreaker ? <Check size={16} /> : <X size={16} />}</button></div>}
                    {gameMode !== 'baseball' && <div className="setting-control-row"><div className="setting-info"><strong>Auto-Press</strong><p>Enable automatic press bets</p></div><button className={`checkbox-btn ${settings.useAutoPress ? 'checked' : ''}`} onClick={() => setSettings(s => ({...s, useAutoPress: !s.useAutoPress}))}>{settings.useAutoPress ? <Check size={16} /> : <X size={16} />}</button></div>}
                    {gameMode !== 'baseball' && settings.useAutoPress && <div className="setting-control-row"><div className="setting-info"><strong>Auto-Press Trigger</strong><p>Start new press when main bet is {settings.autoPressTrigger === '2-down' ? '2-down' : 'closed out'}</p></div><div className="toggle-switch-container"><button className={settings.autoPressTrigger === '2-down' ? 'active' : ''} onClick={() => setSettings(s => ({...s, autoPressTrigger: '2-down'}))}>2-Down</button><button className={settings.autoPressTrigger === 'closed-out' ? 'active' : ''} onClick={() => setSettings(s => ({...s, autoPressTrigger: 'closed-out'}))}>Closed Out</button></div></div>}   
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