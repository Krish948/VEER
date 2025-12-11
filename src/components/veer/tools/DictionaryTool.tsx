import { useState } from 'react';
import { Search, Book, Volume2, Copy, Star, StarOff, Loader2, ExternalLink, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface Definition {
  definition: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
}

interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms: string[];
  antonyms: string[];
}

interface Phonetic {
  text?: string;
  audio?: string;
}

interface WordData {
  word: string;
  phonetic?: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  sourceUrls?: string[];
}

const FAVORITES_KEY = 'veer.dictionary.favorites';
const HISTORY_KEY = 'veer.dictionary.history';

export const DictionaryTool = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WordData | null>(null);
  const [error, setError] = useState('');
  
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Search word
  const searchWord = async (word: string = query) => {
    if (!word.trim()) {
      toast.error('Please enter a word');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError('Word not found. Please check the spelling.');
        } else {
          setError('Failed to fetch definition');
        }
        return;
      }

      const data = await response.json();
      if (data && data.length > 0) {
        setResult(data[0]);
        
        // Add to history
        const newHistory = [word.toLowerCase(), ...history.filter(w => w !== word.toLowerCase())].slice(0, 20);
        setHistory(newHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Play pronunciation
  const playAudio = (audioUrl: string) => {
    if (!audioUrl) {
      toast.error('No audio available');
      return;
    }
    const audio = new Audio(audioUrl);
    audio.play().catch(() => toast.error('Failed to play audio'));
  };

  // Copy to clipboard
  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Toggle favorite
  const toggleFavorite = (word: string) => {
    const lower = word.toLowerCase();
    let newFavorites: string[];
    
    if (favorites.includes(lower)) {
      newFavorites = favorites.filter(w => w !== lower);
      toast.success('Removed from favorites');
    } else {
      newFavorites = [lower, ...favorites];
      toast.success('Added to favorites');
    }
    
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  const isFavorite = (word: string) => favorites.includes(word.toLowerCase());

  // Part of speech colors
  const posColors: Record<string, string> = {
    noun: 'bg-blue-500',
    verb: 'bg-green-500',
    adjective: 'bg-purple-500',
    adverb: 'bg-orange-500',
    pronoun: 'bg-pink-500',
    preposition: 'bg-cyan-500',
    conjunction: 'bg-yellow-500',
    interjection: 'bg-red-500',
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchWord()}
            placeholder="Search for a word..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => searchWord()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Quick access */}
      {!result && !loading && (
        <div className="space-y-4">
          {/* Favorites */}
          {favorites.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Favorites
              </h4>
              <div className="flex flex-wrap gap-2">
                {favorites.slice(0, 10).map(word => (
                  <Button
                    key={word}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery(word);
                      searchWord(word);
                    }}
                  >
                    {word}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* History */}
          {history.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Book className="w-4 h-4" />
                Recent Searches
              </h4>
              <div className="flex flex-wrap gap-2">
                {history.slice(0, 10).map(word => (
                  <Button
                    key={word}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery(word);
                      searchWord(word);
                    }}
                  >
                    {word}
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Empty state */}
          {favorites.length === 0 && history.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Book className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Search for any English word</p>
              <p className="text-xs">Get definitions, synonyms, and pronunciation</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className="p-4 space-y-4">
          {/* Word header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold capitalize">{result.word}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleFavorite(result.word)}
                >
                  {isFavorite(result.word) ? (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  ) : (
                    <StarOff className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {result.phonetic && (
                <p className="text-muted-foreground font-mono">{result.phonetic}</p>
              )}
            </div>
            <div className="flex gap-2">
              {result.phonetics.find(p => p.audio) && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => playAudio(result.phonetics.find(p => p.audio)?.audio || '')}
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyText(result.word)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Meanings */}
          <ScrollArea className="h-64">
            <div className="space-y-4">
              {result.meanings.map((meaning, idx) => (
                <div key={idx} className="space-y-2">
                  <Badge className={`${posColors[meaning.partOfSpeech] || 'bg-gray-500'}`}>
                    {meaning.partOfSpeech}
                  </Badge>
                  
                  <ol className="list-decimal list-inside space-y-2">
                    {meaning.definitions.slice(0, 5).map((def, defIdx) => (
                      <li key={defIdx} className="text-sm">
                        <span>{def.definition}</span>
                        {def.example && (
                          <p className="text-muted-foreground italic ml-5 mt-1">
                            "{def.example}"
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>

                  {/* Synonyms */}
                  {meaning.synonyms.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Synonyms: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {meaning.synonyms.slice(0, 6).map(syn => (
                          <Button
                            key={syn}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setQuery(syn);
                              searchWord(syn);
                            }}
                          >
                            {syn}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Antonyms */}
                  {meaning.antonyms.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Antonyms: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {meaning.antonyms.slice(0, 6).map(ant => (
                          <Button
                            key={ant}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => {
                              setQuery(ant);
                              searchWord(ant);
                            }}
                          >
                            {ant}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Source */}
          {result.sourceUrls && result.sourceUrls.length > 0 && (
            <div className="pt-2 border-t">
              <Button
                variant="link"
                size="sm"
                className="text-xs text-muted-foreground p-0 h-auto"
                onClick={() => window.open(result.sourceUrls![0], '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View source
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Word of the day suggestion */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-2">Try These Words</h4>
        <div className="flex flex-wrap gap-2">
          {['serendipity', 'ephemeral', 'eloquent', 'ubiquitous', 'ethereal', 'mellifluous'].map(word => (
            <Button
              key={word}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setQuery(word);
                searchWord(word);
              }}
            >
              {word}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};
