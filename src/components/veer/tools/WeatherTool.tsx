import { useState } from 'react';
import { Cloud, Loader2, Search, MapPin, Wind, Droplets, Eye, Gauge, Thermometer, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  feelsLike: number;
  minTemp: number;
  maxTemp: number;
  uvIndex: number;
  dewPoint: number;
  lastUpdated: Date;
}

export const WeatherTool = () => {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Try OpenWeatherMap via backend first, then fall back to Open-Meteo
  const fetchWeatherFromBackend = async (location: string): Promise<WeatherData | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/veer-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ service: 'weather', location }),
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (data.error || !data.reply) return null;

      const weatherData = data.reply;
      return {
        location: `${weatherData.name}, ${weatherData.sys?.country || ''}`,
        temperature: Math.round(weatherData.main?.temp || 0),
        condition: weatherData.weather?.[0]?.description || 'Unknown',
        humidity: weatherData.main?.humidity || 0,
        windSpeed: Math.round((weatherData.wind?.speed || 0) * 3.6), // m/s to km/h
        visibility: (weatherData.visibility || 10000) / 1000, // m to km
        pressure: weatherData.main?.pressure || 1013,
        feelsLike: Math.round(weatherData.main?.feels_like || 0),
        minTemp: Math.round(weatherData.main?.temp_min || 0),
        maxTemp: Math.round(weatherData.main?.temp_max || 0),
        uvIndex: 0, // OpenWeatherMap free tier doesn't include UV
        dewPoint: 0, // Not available in basic response
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.log('Backend weather failed, trying Open-Meteo:', error);
      return null;
    }
  };

  const fetchWeatherFromOpenMeteo = async (location: string): Promise<WeatherData | null> => {
    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
      );
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        return null;
      }

      const { latitude, longitude, name, country } = geoData.results[0];

      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility,surface_pressure,dew_point_2m,uv_index&daily=temperature_2m_max,temperature_2m_min&temperature_unit=celsius&wind_speed_unit=kmh&visibility_unit=km&timezone=auto`
      );
      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      const daily = weatherData.daily;

      const weatherDescription = getWeatherDescription(current.weather_code);

      return {
        location: `${name}, ${country}`,
        temperature: Math.round(current.temperature_2m),
        condition: weatherDescription,
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        visibility: current.visibility,
        pressure: current.surface_pressure,
        feelsLike: Math.round(current.apparent_temperature),
        minTemp: Math.round(daily.temperature_2m_min[0]),
        maxTemp: Math.round(daily.temperature_2m_max[0]),
        uvIndex: Math.round(current.uv_index * 10) / 10,
        dewPoint: Math.round(current.dew_point_2m),
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Open-Meteo weather failed:', error);
      return null;
    }
  };

  const fetchWeather = async () => {
    if (!city.trim()) {
      toast.error('Please enter a city name');
      return;
    }

    setLoading(true);
    try {
      // Try backend first (uses OpenWeatherMap API key if configured)
      let weatherData = await fetchWeatherFromBackend(city);
      
      // Fall back to Open-Meteo if backend fails
      if (!weatherData) {
        weatherData = await fetchWeatherFromOpenMeteo(city);
      }

      if (!weatherData) {
        toast.error('City not found');
        setLoading(false);
        return;
      }

      setWeather(weatherData);
      toast.success(`Weather for ${weatherData.location} loaded!`);
    } catch (error) {
      toast.error('Failed to fetch weather data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherDescription = (code: number): string => {
    const weatherCodes: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Foggy with rime',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Heavy drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Heavy rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with large hail',
    };
    return weatherCodes[code] || 'Unknown';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Section */}
      <div className="p-6 border-b border-glass-border/20">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchWeather()}
              placeholder="Search city..."
              className="glass border-glass-border/30 h-12 pl-11"
              disabled={loading}
            />
          </div>
          <Button
            onClick={fetchWeather}
            disabled={loading}
            className="h-12 px-5 bg-gradient-primary shadow-glow"
            title="Search weather"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </Button>
          {weather && (
            <Button
              onClick={fetchWeather}
              disabled={loading}
              variant="outline"
              className="h-12 w-12 p-0 glass-hover"
              title="Refresh weather data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {weather && (
          <Card className="glass border-primary/20 overflow-hidden">
            {/* Temperature Hero */}
            <div className="bg-gradient-to-br from-primary/20 via-transparent to-secondary/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold">{weather.location}</h3>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-6xl font-bold neon-text tracking-tight">
                    {weather.temperature}°
                  </div>
                  <p className="text-lg text-muted-foreground mt-1 capitalize">{weather.condition}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Feels like</div>
                  <div className="text-2xl font-semibold">{weather.feelsLike}°</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    H: {weather.maxTemp}° L: {weather.minTemp}°
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-4">
                <Clock className="w-3 h-3" />
                <span>Updated {weather.lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Weather Details Grid */}
            <div className="grid grid-cols-3 gap-2 p-4 border-t border-glass-border/20">
              <div className="text-center p-3 rounded-xl bg-blue-500/10">
                <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{weather.humidity}%</div>
                <div className="text-[10px] text-muted-foreground uppercase">Humidity</div>
              </div>

              <div className="text-center p-3 rounded-xl bg-cyan-500/10">
                <Wind className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{weather.windSpeed}</div>
                <div className="text-[10px] text-muted-foreground uppercase">km/h</div>
              </div>

              <div className="text-center p-3 rounded-xl bg-yellow-500/10">
                <Eye className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{weather.visibility.toFixed(1)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">km</div>
              </div>

              <div className="text-center p-3 rounded-xl bg-orange-500/10">
                <Gauge className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{Math.round(weather.pressure)}</div>
                <div className="text-[10px] text-muted-foreground uppercase">hPa</div>
              </div>

              <div className="text-center p-3 rounded-xl bg-red-500/10">
                <Thermometer className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{weather.dewPoint}°</div>
                <div className="text-[10px] text-muted-foreground uppercase">Dew</div>
              </div>

              <div className="text-center p-3 rounded-xl bg-purple-500/10">
                <AlertCircle className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <div className="text-lg font-bold">{weather.uvIndex}</div>
                <div className="text-[10px] text-muted-foreground uppercase">UV</div>
              </div>
            </div>
          </Card>
        )}

        {!weather && !loading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Check the Weather</h3>
            <p className="text-sm text-muted-foreground">Enter a city name above to get current conditions</p>
          </div>
        )}
      </div>
    </div>
  );
};
