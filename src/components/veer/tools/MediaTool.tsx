import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Volume1,
  Music,
  Radio,
  Disc3,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Heart,
  Share2,
  Search,
  ExternalLink,
  Headphones,
  Podcast,
  Music2,
  Music4,
  Globe,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MediaState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  currentTrack: {
    title: string;
    artist: string;
    album?: string;
    duration: number;
    currentTime: number;
    albumArt?: string;
  } | null;
}

interface QuickStation {
  id: string;
  name: string;
  type: 'radio' | 'playlist' | 'podcast';
  icon: React.ReactNode;
}

interface MusicPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  webUrl: string;
  appUrl?: string;
  searchUrl: string;
}

const musicPlatforms: MusicPlatform[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: <Music className="w-5 h-5" />,
    color: 'bg-[#1DB954]',
    webUrl: 'https://open.spotify.com',
    appUrl: 'spotify:',
    searchUrl: 'https://open.spotify.com/search/',
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    icon: <Music2 className="w-5 h-5" />,
    color: 'bg-[#FF0000]',
    webUrl: 'https://music.youtube.com',
    searchUrl: 'https://music.youtube.com/search?q=',
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    icon: <Music4 className="w-5 h-5" />,
    color: 'bg-gradient-to-br from-[#FA2D48] to-[#A833B9]',
    webUrl: 'https://music.apple.com',
    appUrl: 'music://',
    searchUrl: 'https://music.apple.com/search?term=',
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    icon: <Headphones className="w-5 h-5" />,
    color: 'bg-[#FF5500]',
    webUrl: 'https://soundcloud.com',
    searchUrl: 'https://soundcloud.com/search?q=',
  },
  {
    id: 'amazon-music',
    name: 'Amazon Music',
    icon: <Music className="w-5 h-5" />,
    color: 'bg-[#00A8E1]',
    webUrl: 'https://music.amazon.com',
    searchUrl: 'https://music.amazon.com/search/',
  },
  {
    id: 'deezer',
    name: 'Deezer',
    icon: <Disc3 className="w-5 h-5" />,
    color: 'bg-[#A238FF]',
    webUrl: 'https://www.deezer.com',
    searchUrl: 'https://www.deezer.com/search/',
  },
  {
    id: 'tidal',
    name: 'Tidal',
    icon: <Headphones className="w-5 h-5" />,
    color: 'bg-black',
    webUrl: 'https://listen.tidal.com',
    searchUrl: 'https://listen.tidal.com/search?q=',
  },
  {
    id: 'pandora',
    name: 'Pandora',
    icon: <Radio className="w-5 h-5" />,
    color: 'bg-[#3668FF]',
    webUrl: 'https://www.pandora.com',
    searchUrl: 'https://www.pandora.com/search/',
  },
];

const radioStations = [
  { id: 'lofi', name: 'Lofi Hip Hop Radio', videoId: 'jfKfPfyJRdk', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', icon: <Music className="w-4 h-4" />, type: 'youtube' as const },
  { id: 'chillhop', name: 'Chillhop Radio', videoId: '5yx6BWlEVcY', url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY', icon: <Headphones className="w-4 h-4" />, type: 'youtube' as const },
  { id: 'jazz', name: 'Jazz Radio', videoId: 'Dx5qFachd3A', url: 'https://www.youtube.com/watch?v=Dx5qFachd3A', icon: <Music className="w-4 h-4" />, type: 'youtube' as const },
  { id: 'classical', name: 'Classical Radio', videoId: 'mIYzp5rcTvU', url: 'https://www.youtube.com/watch?v=mIYzp5rcTvU', icon: <Disc3 className="w-4 h-4" />, type: 'youtube' as const },
  { id: 'synthwave', name: 'Synthwave Radio', videoId: '4xDzrJKXOOY', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY', icon: <Radio className="w-4 h-4" />, type: 'youtube' as const },
  { id: 'ambient', name: 'Ambient Focus', videoId: 'lTRiuFIWV54', url: 'https://www.youtube.com/watch?v=lTRiuFIWV54', icon: <Podcast className="w-4 h-4" />, type: 'youtube' as const },
];

// Web radio streams (actual streaming URLs)
const webRadioStreams = [
  { id: 'soma-groovesalad', name: 'SomaFM Groove Salad', streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3', icon: <Radio className="w-4 h-4" />, genre: 'Ambient/Downtempo' },
  { id: 'soma-defcon', name: 'SomaFM DEF CON', streamUrl: 'https://ice1.somafm.com/defcon-128-mp3', icon: <Radio className="w-4 h-4" />, genre: 'Electronic' },
  { id: 'soma-dronezone', name: 'SomaFM Drone Zone', streamUrl: 'https://ice1.somafm.com/dronezone-128-mp3', icon: <Podcast className="w-4 h-4" />, genre: 'Ambient' },
  { id: 'soma-spacestation', name: 'SomaFM Space Station', streamUrl: 'https://ice1.somafm.com/spacestation-128-mp3', icon: <Music className="w-4 h-4" />, genre: 'Ambient Space' },
  { id: 'soma-indie', name: 'SomaFM Indie Pop', streamUrl: 'https://ice1.somafm.com/indiepop-128-mp3', icon: <Headphones className="w-4 h-4" />, genre: 'Indie Pop' },
  { id: 'soma-seventies', name: 'SomaFM Left Coast 70s', streamUrl: 'https://ice1.somafm.com/seventies-128-mp3', icon: <Disc3 className="w-4 h-4" />, genre: '70s Hits' },
];

const quickStations: QuickStation[] = [
  { id: 'lofi', name: 'Lofi Focus', type: 'playlist', icon: <Music className="w-4 h-4" /> },
  { id: 'classical', name: 'Classical', type: 'playlist', icon: <Disc3 className="w-4 h-4" /> },
  { id: 'news', name: 'News Radio', type: 'radio', icon: <Radio className="w-4 h-4" /> },
  { id: 'ambient', name: 'Ambient', type: 'playlist', icon: <Music className="w-4 h-4" /> },
];

export const MediaTool = () => {
  const [mediaState, setMediaState] = useState<MediaState>({
    isPlaying: false,
    volume: 75,
    isMuted: false,
    shuffle: false,
    repeat: 'off',
    currentTrack: null,
  });
  const [liked, setLiked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentStatus, setAgentStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  // Player state
  const [activePlayer, setActivePlayer] = useState<{
    type: 'youtube' | 'webradio' | null;
    id: string;
    name: string;
    videoId?: string;
    streamUrl?: string;
  } | null>(null);
  const [playerMinimized, setPlayerMinimized] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if Media Session API is supported
  const isMediaSessionSupported = 'mediaSession' in navigator;

  // Check system agent connection
  useEffect(() => {
    const checkAgent = async () => {
      try {
        const response = await fetch('http://localhost:4000/health', { method: 'GET' });
        if (response.ok) {
          setAgentStatus('connected');
        } else {
          setAgentStatus('disconnected');
        }
      } catch {
        setAgentStatus('disconnected');
      }
    };
    checkAgent();
    const interval = setInterval(checkAgent, 30000);
    return () => clearInterval(interval);
  }, []);

  // Launch music platform
  const launchPlatform = useCallback(async (platform: MusicPlatform, useApp: boolean = false) => {
    const url = useApp && platform.appUrl ? platform.appUrl : platform.webUrl;
    
    try {
      // Try system agent first for native app launch
      if (useApp && platform.appUrl && agentStatus === 'connected') {
        const response = await fetch('http://localhost:4000/launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'application', target: platform.appUrl }),
        });
        if (response.ok) {
          toast.success(`Opening ${platform.name}...`);
          return;
        }
      }
    } catch {
      // Fallback to browser
    }

    // Open in browser
    window.open(url, '_blank');
    toast.success(`Opening ${platform.name} in browser...`);
  }, [agentStatus]);

  // Search on platform
  const searchOnPlatform = useCallback((platform: MusicPlatform) => {
    if (!searchQuery.trim()) {
      toast.error('Enter a search term first');
      return;
    }
    const searchUrl = platform.searchUrl + encodeURIComponent(searchQuery.trim());
    window.open(searchUrl, '_blank');
    toast.success(`Searching "${searchQuery}" on ${platform.name}...`);
  }, [searchQuery]);

  // Play YouTube radio station (embedded)
  const playYouTubeStation = useCallback((station: typeof radioStations[0]) => {
    // Stop any existing web radio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    setActivePlayer({
      type: 'youtube',
      id: station.id,
      name: station.name,
      videoId: station.videoId,
    });
    setMediaState(prev => ({
      ...prev,
      isPlaying: true,
      currentTrack: {
        title: station.name,
        artist: 'YouTube Live',
        duration: 0,
        currentTime: 0,
      }
    }));
    setPlayerMinimized(false);
    toast.success(`Playing ${station.name}`);
  }, []);

  // Play web radio stream
  const playWebRadio = useCallback((station: typeof webRadioStreams[0]) => {
    // Stop YouTube if playing
    setActivePlayer(prev => {
      if (prev?.type === 'youtube') {
        return null;
      }
      return prev;
    });

    // Create or update audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    audioRef.current.src = station.streamUrl;
    audioRef.current.volume = mediaState.volume / 100;
    audioRef.current.play().then(() => {
      setActivePlayer({
        type: 'webradio',
        id: station.id,
        name: station.name,
        streamUrl: station.streamUrl,
      });
      setMediaState(prev => ({
        ...prev,
        isPlaying: true,
        currentTrack: {
          title: station.name,
          artist: station.genre,
          duration: 0,
          currentTime: 0,
        }
      }));
      setPlayerMinimized(false);
      toast.success(`Playing ${station.name}`);
      
      // Set Media Session metadata
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: station.name,
          artist: station.genre,
          album: 'Web Radio',
        });
      }
    }).catch(err => {
      console.error('Failed to play stream:', err);
      toast.error('Failed to play stream. Try again.');
    });
  }, [mediaState.volume]);

  // Stop all playback
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setActivePlayer(null);
    setMediaState(prev => ({
      ...prev,
      isPlaying: false,
      currentTrack: null,
    }));
    toast.info('Playback stopped');
  }, []);

  // Toggle play/pause for web radio
  const toggleWebRadioPlayback = useCallback(() => {
    if (!audioRef.current || !activePlayer?.streamUrl) return;
    
    if (mediaState.isPlaying) {
      audioRef.current.pause();
      setMediaState(prev => ({ ...prev, isPlaying: false }));
    } else {
      audioRef.current.play();
      setMediaState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [mediaState.isPlaying, activePlayer]);

  // Open radio station (legacy - opens in new tab)
  const openRadioStation = useCallback((station: typeof radioStations[0]) => {
    window.open(station.url, '_blank');
    toast.success(`Opening ${station.name}...`);
  }, []);

  // Listen for media session changes
  useEffect(() => {
    if (!isMediaSessionSupported) return;

    const updateFromMediaSession = () => {
      if (navigator.mediaSession.metadata) {
        const metadata = navigator.mediaSession.metadata;
        setMediaState(prev => ({
          ...prev,
          currentTrack: {
            title: metadata.title || 'Unknown Track',
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album,
            duration: 0,
            currentTime: 0,
            albumArt: metadata.artwork?.[0]?.src,
          }
        }));
      }
    };

    // Update on playback state change
    const handlePlaybackChange = () => {
      setMediaState(prev => ({
        ...prev,
        isPlaying: navigator.mediaSession.playbackState === 'playing'
      }));
    };

    // Poll for updates (Media Session doesn't have great event support)
    const interval = setInterval(() => {
      updateFromMediaSession();
      handlePlaybackChange();
    }, 1000);

    return () => clearInterval(interval);
  }, [isMediaSessionSupported]);

  const sendMediaCommand = useCallback(async (command: 'play' | 'pause' | 'next' | 'previous' | 'stop') => {
    try {
      // Try to communicate with the system agent for native media control
      const response = await fetch('http://localhost:7779/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: command }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local state
          if (command === 'play') {
            setMediaState(prev => ({ ...prev, isPlaying: true }));
          } else if (command === 'pause' || command === 'stop') {
            setMediaState(prev => ({ ...prev, isPlaying: false }));
          }
          return true;
        }
      }
    } catch (error) {
      // System agent not available, try browser-level media control
      console.log('System agent not available, using browser controls');
    }

    // Fallback: Try to control any media element on the page
    const mediaElements = document.querySelectorAll('video, audio');
    if (mediaElements.length > 0) {
      mediaElements.forEach((el) => {
        const media = el as HTMLMediaElement;
        switch (command) {
          case 'play':
            media.play();
            setMediaState(prev => ({ ...prev, isPlaying: true }));
            break;
          case 'pause':
          case 'stop':
            media.pause();
            setMediaState(prev => ({ ...prev, isPlaying: false }));
            break;
        }
      });
      return true;
    }

    toast.info('No active media found. Play something first!');
    return false;
  }, []);

  const handlePlayPause = () => {
    // If we have an active web radio, toggle it
    if (activePlayer?.type === 'webradio') {
      toggleWebRadioPlayback();
      return;
    }
    // Otherwise try system media control
    sendMediaCommand(mediaState.isPlaying ? 'pause' : 'play');
  };

  const handlePrevious = () => {
    sendMediaCommand('previous');
    toast.info('Previous track');
  };

  const handleNext = () => {
    sendMediaCommand('next');
    toast.info('Next track');
  };

  const handleVolumeChange = async (value: number[]) => {
    const newVolume = value[0];
    setMediaState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }));
    
    // Update local audio element
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    
    try {
      await fetch('http://localhost:4000/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'volume', value: newVolume }),
      });
    } catch {
      // Fallback to browser audio
      const mediaElements = document.querySelectorAll('video, audio');
      mediaElements.forEach((el) => {
        (el as HTMLMediaElement).volume = newVolume / 100;
      });
    }
  };

  const toggleMute = () => {
    const newMuted = !mediaState.isMuted;
    setMediaState(prev => ({ ...prev, isMuted: newMuted }));
    
    // Mute local audio
    if (audioRef.current) {
      audioRef.current.muted = newMuted;
    }
    
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((el) => {
      (el as HTMLMediaElement).muted = newMuted;
    });
  };

  const toggleShuffle = () => {
    setMediaState(prev => ({ ...prev, shuffle: !prev.shuffle }));
    toast.info(mediaState.shuffle ? 'Shuffle off' : 'Shuffle on');
  };

  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(mediaState.repeat);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setMediaState(prev => ({ ...prev, repeat: nextMode }));
    
    const messages = {
      off: 'Repeat off',
      all: 'Repeat all',
      one: 'Repeat one',
    };
    toast.info(messages[nextMode]);
  };

  const getVolumeIcon = () => {
    if (mediaState.isMuted || mediaState.volume === 0) {
      return <VolumeX className="w-4 h-4" />;
    } else if (mediaState.volume < 50) {
      return <Volume1 className="w-4 h-4" />;
    }
    return <Volume2 className="w-4 h-4" />;
  };

  const getRepeatIcon = () => {
    if (mediaState.repeat === 'one') {
      return <Repeat1 className="w-4 h-4" />;
    }
    return <Repeat className="w-4 h-4" />;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStationClick = (station: QuickStation) => {
    const radioStation = radioStations.find(r => r.id === station.id);
    if (radioStation) {
      playYouTubeStation(radioStation);
    } else {
      toast.info(`Playing ${station.name}...`);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Active Player - YouTube Embed or Web Radio */}
        {activePlayer && (
          <Card className="glass border-glass-border/30 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-glass-border/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium truncate">{activePlayer.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {activePlayer.type === 'youtube' ? 'YouTube' : 'Web Radio'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setPlayerMinimized(!playerMinimized)}
                      >
                        {playerMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{playerMinimized ? 'Expand' : 'Minimize'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                        onClick={stopPlayback}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stop</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              {!playerMinimized && activePlayer.type === 'youtube' && activePlayer.videoId && (
                <div className="aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${activePlayer.videoId}?autoplay=1&enablejsapi=1`}
                    title={activePlayer.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              
              {!playerMinimized && activePlayer.type === 'webradio' && (
                <div className="p-4">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="default"
                      size="icon"
                      className="h-12 w-12 rounded-full bg-gradient-primary shadow-glow"
                      onClick={toggleWebRadioPlayback}
                    >
                      {mediaState.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={toggleMute}
                    >
                      {getVolumeIcon()}
                    </Button>
                    <Slider
                      value={[mediaState.isMuted ? 0 : mediaState.volume]}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}

              {playerMinimized && (
                <div className="px-4 py-3 flex items-center gap-3">
                  <Button
                    variant="default"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-gradient-primary shadow-glow shrink-0"
                    onClick={activePlayer.type === 'webradio' ? toggleWebRadioPlayback : undefined}
                  >
                    {mediaState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activePlayer.name}</p>
                    <p className="text-xs text-muted-foreground">Now playing</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="controls" className="text-xs">
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="platforms" className="text-xs">
              <Music className="w-3.5 h-3.5 mr-1.5" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="radio" className="text-xs">
              <Radio className="w-3.5 h-3.5 mr-1.5" />
              Radio
            </TabsTrigger>
          </TabsList>

          {/* Controls Tab */}
          <TabsContent value="controls" className="mt-0 space-y-4">
            {/* Now Playing Card */}
            <Card className="glass border-glass-border/30 overflow-hidden">
              <CardContent className="p-0">
                {/* Album Art / Visualizer */}
                <div className="relative h-48 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center">
                  {mediaState.currentTrack?.albumArt ? (
                    <img 
                      src={mediaState.currentTrack.albumArt} 
                      alt="Album art"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative">
                      <div className={`w-24 h-24 rounded-full bg-gradient-primary/30 flex items-center justify-center ${mediaState.isPlaying ? 'animate-spin-slow' : ''}`}>
                        <Disc3 className="w-16 h-16 text-primary/60" />
                      </div>
                      {mediaState.isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex gap-1 items-end h-8">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="w-1 bg-primary rounded-full animate-pulse"
                                style={{
                                  height: `${Math.random() * 100}%`,
                                  animationDelay: `${i * 0.1}s`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                  
                  {/* Track info overlay */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-lg font-semibold truncate">
                      {mediaState.currentTrack?.title || 'No track playing'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {mediaState.currentTrack?.artist || 'Play something to see it here'}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                {mediaState.currentTrack && (
                  <div className="px-4 pt-4">
                    <Slider
                      value={[mediaState.currentTrack.currentTime]}
                      max={mediaState.currentTrack.duration || 100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>{formatTime(mediaState.currentTrack.currentTime)}</span>
                      <span>{formatTime(mediaState.currentTrack.duration)}</span>
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="p-4 space-y-4">
                  {/* Main controls */}
                  <div className="flex items-center justify-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-9 w-9 ${mediaState.shuffle ? 'text-primary' : 'text-muted-foreground'}`}
                          onClick={toggleShuffle}
                        >
                          <Shuffle className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Shuffle</TooltipContent>
                    </Tooltip>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11"
                      onClick={handlePrevious}
                    >
                      <SkipBack className="w-5 h-5" />
                    </Button>

                    <Button
                      variant="default"
                      size="icon"
                      className="h-14 w-14 rounded-full bg-gradient-primary shadow-glow hover:scale-105 transition-transform"
                      onClick={handlePlayPause}
                    >
                      {mediaState.isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-0.5" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11"
                      onClick={handleNext}
                    >
                      <SkipForward className="w-5 h-5" />
                    </Button>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-9 w-9 ${mediaState.repeat !== 'off' ? 'text-primary' : 'text-muted-foreground'}`}
                          onClick={toggleRepeat}
                        >
                          {getRepeatIcon()}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Repeat: {mediaState.repeat}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Secondary controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${liked ? 'text-red-500' : 'text-muted-foreground'}`}
                            onClick={() => {
                              setLiked(!liked);
                              toast.info(liked ? 'Removed from favorites' : 'Added to favorites');
                            }}
                          >
                            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Like</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                          >
                            <ListMusic className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Queue</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Share</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-2 w-32">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={toggleMute}
                      >
                        {getVolumeIcon()}
                      </Button>
                      <Slider
                        value={[mediaState.isMuted ? 0 : mediaState.volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Agent Status */}
            <Card className="glass border-glass-border/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agentStatus === 'connected' ? 'bg-green-500' : agentStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs text-muted-foreground">
                      {agentStatus === 'connected' ? 'System agent connected' : agentStatus === 'checking' ? 'Checking connection...' : 'Browser control only'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {agentStatus === 'connected' ? 'System' : 'Web'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platforms Tab */}
          <TabsContent value="platforms" className="mt-0 space-y-4">
            {/* Search Box */}
            <Card className="glass border-glass-border/30">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search for music..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-glass-bg/50 border-glass-border/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchQuery.trim()) {
                          // Search on first platform by default
                          searchOnPlatform(musicPlatforms[0]);
                        }
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Type a song, artist, or album and click a platform to search
                </p>
              </CardContent>
            </Card>

            {/* Music Platforms Grid */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Music Platforms
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {musicPlatforms.map((platform) => (
                  <Card 
                    key={platform.id} 
                    className="glass border-glass-border/30 hover:bg-glass-bg/50 transition-all cursor-pointer group"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center text-white shrink-0`}>
                          {platform.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{platform.name}</p>
                          <div className="flex gap-1 mt-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    launchPlatform(platform, false);
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open in browser</TooltipContent>
                            </Tooltip>
                            {searchQuery && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      searchOnPlatform(platform);
                                    }}
                                  >
                                    <Search className="w-3 h-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Search here</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <Card className="glass border-glass-border/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Click a platform to open it. If you have the app installed and the System Agent running, 
                  VEER can open the native app directly.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Radio Tab */}
          <TabsContent value="radio" className="mt-0 space-y-4">
            {/* YouTube Live Streams */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
                <Music2 className="w-4 h-4" />
                YouTube Live Streams
              </h4>
              <div className="space-y-2">
                {radioStations.map((station) => (
                  <Button
                    key={station.id}
                    variant="outline"
                    className={`w-full h-auto py-3 px-4 justify-start gap-3 glass border-glass-border/30 hover:bg-glass-bg/50 ${activePlayer?.id === station.id ? 'border-primary bg-primary/10' : ''}`}
                    onClick={() => playYouTubeStation(station)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center shrink-0">
                      {activePlayer?.id === station.id && mediaState.isPlaying ? (
                        <Pause className="w-5 h-5 text-primary" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium">{station.name}</p>
                      <p className="text-xs text-muted-foreground">YouTube Live</p>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <div className={`w-2 h-2 rounded-full ${activePlayer?.id === station.id ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                      <span className="text-xs">{activePlayer?.id === station.id ? 'PLAYING' : 'LIVE'}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Web Radio Streams */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Web Radio (SomaFM)
              </h4>
              <div className="space-y-2">
                {webRadioStreams.map((station) => (
                  <Button
                    key={station.id}
                    variant="outline"
                    className={`w-full h-auto py-3 px-4 justify-start gap-3 glass border-glass-border/30 hover:bg-glass-bg/50 ${activePlayer?.id === station.id ? 'border-primary bg-primary/10' : ''}`}
                    onClick={() => playWebRadio(station)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-accent/20 flex items-center justify-center shrink-0">
                      {activePlayer?.id === station.id && mediaState.isPlaying ? (
                        <Pause className="w-5 h-5 text-accent" />
                      ) : (
                        station.icon
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-sm font-medium">{station.name}</p>
                      <p className="text-xs text-muted-foreground">{station.genre}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {activePlayer?.id === station.id ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-green-500">PLAYING</span>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Stream</Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick Stations */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Quick Access</h4>
              <div className="grid grid-cols-2 gap-2">
                {quickStations.map((station) => (
                  <Button
                    key={station.id}
                    variant="outline"
                    className="h-auto py-3 px-4 justify-start gap-3 glass border-glass-border/30 hover:bg-glass-bg/50"
                    onClick={() => handleStationClick(station)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-primary/20 flex items-center justify-center shrink-0">
                      {station.icon}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium truncate">{station.name}</p>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                        {station.type}
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Info Card */}
            <Card className="glass border-glass-border/30">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">
                  🎵 Click any station to play directly in VEER. YouTube streams open an embedded player, 
                  while Web Radio streams play using your browser's audio system.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};
