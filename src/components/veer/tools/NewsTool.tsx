import { useState, useEffect } from 'react';
import { Newspaper, Quote, Lightbulb, Calendar, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { DailyData } from '@/types/veer';
import { toast } from 'sonner';

export const NewsTool = () => {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const fetchDailyData = async () => {
    try {
      const { data: dailyData, error } = await supabase
        .from('daily_data')
        .select('*')
        .order('fetched_at', { ascending: false });

      if (error) throw error;
      setData((dailyData as DailyData[]) || []);
    } catch (error) {
      console.error('Failed to fetch daily data:', error);
      toast.error('Failed to load daily data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      // Call the update-daily-data edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-daily-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ force: true }),
        }
      );

      if (!response.ok) throw new Error('Failed to refresh data');

      const result = await response.json();
      toast.success(result.message || 'Data refreshed!');
      
      // Reload the data
      await fetchDailyData();
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const initData = async () => {
      const { data: dailyData, error } = await supabase
        .from('daily_data')
        .select('*')
        .order('fetched_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch daily data:', error);
        toast.error('Failed to load daily data');
        setLoading(false);
        return;
      }

      const fetchedData = (dailyData as DailyData[]) || [];
      setData(fetchedData);
      setLoading(false);

      // Auto-refresh if no data exists on first load
      if (initialLoad && fetchedData.length === 0) {
        setInitialLoad(false);
        await refreshData();
      }
    };
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIcon = (dataType: string) => {
    switch (dataType) {
      case 'news':
      case 'tech_news':
        return <Newspaper className="w-4 h-4 text-blue-400" />;
      case 'quote':
        return <Quote className="w-4 h-4 text-purple-400" />;
      case 'fact':
        return <Lightbulb className="w-4 h-4 text-yellow-400" />;
      case 'date_info':
        return <Calendar className="w-4 h-4 text-green-400" />;
      default:
        return <Newspaper className="w-4 h-4 text-gray-400" />;
    }
  };

  const filterData = (type: string) => {
    if (type === 'all') return data;
    if (type === 'news') return data.filter(d => d.data_type === 'news' || d.data_type === 'tech_news');
    return data.filter(d => d.data_type === type);
  };

  const filteredData = filterData(activeTab);
  const lastUpdate = data.length > 0 ? new Date(data[0].fetched_at).toLocaleString() : 'Never';

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Newspaper className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Daily Updates</h2>
        </div>
        <Button
          onClick={refreshData}
          disabled={refreshing}
          size="sm"
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 px-1">
        <span>Last updated: {lastUpdate}</span>
        <span className="text-primary">{data.length} items</span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mb-4 h-11">
          <TabsTrigger value="all" className="gap-1.5 data-[state=active]:shadow-glow">
            <Newspaper className="w-3.5 h-3.5" /> All
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5 data-[state=active]:shadow-glow">News</TabsTrigger>
          <TabsTrigger value="quote" className="gap-1.5 data-[state=active]:shadow-glow">
            <Quote className="w-3.5 h-3.5" />
          </TabsTrigger>
          <TabsTrigger value="fact" className="gap-1.5 data-[state=active]:shadow-glow">
            <Lightbulb className="w-3.5 h-3.5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="flex-1 mt-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No data available</p>
                <Button onClick={refreshData} variant="link" className="mt-2">
                  Click to fetch latest data
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pr-2">
                {filteredData.map((item) => (
                  <Card
                    key={item.id}
                    className="glass glass-hover overflow-hidden transition-all"
                  >
                    <div className="flex">
                      {/* Type indicator strip */}
                      <div className={`w-1 shrink-0 ${
                        item.data_type === 'quote' ? 'bg-purple-500' :
                        item.data_type === 'fact' ? 'bg-yellow-500' :
                        item.data_type === 'tech_news' ? 'bg-cyan-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-glass-bg/80 flex items-center justify-center shrink-0">
                            {getIcon(item.data_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-sm line-clamp-2 leading-snug">
                                {item.title}
                              </h3>
                              {item.source_url && (
                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-colors shrink-0"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                              {item.content}
                            </p>
                            {item.source && (
                              <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                                <span>{item.source}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
