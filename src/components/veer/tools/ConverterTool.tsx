import { useState, useEffect } from 'react';
import { ArrowLeftRight, Clock, DollarSign, Ruler, Scale, Thermometer, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

type ConversionCategory = 'length' | 'weight' | 'temperature' | 'currency' | 'time' | 'data';

interface ConversionUnit {
  id: string;
  name: string;
  symbol: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

const lengthUnits: ConversionUnit[] = [
  { id: 'mm', name: 'Millimeter', symbol: 'mm', toBase: v => v / 1000, fromBase: v => v * 1000 },
  { id: 'cm', name: 'Centimeter', symbol: 'cm', toBase: v => v / 100, fromBase: v => v * 100 },
  { id: 'm', name: 'Meter', symbol: 'm', toBase: v => v, fromBase: v => v },
  { id: 'km', name: 'Kilometer', symbol: 'km', toBase: v => v * 1000, fromBase: v => v / 1000 },
  { id: 'in', name: 'Inch', symbol: 'in', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
  { id: 'ft', name: 'Foot', symbol: 'ft', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
  { id: 'yd', name: 'Yard', symbol: 'yd', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
  { id: 'mi', name: 'Mile', symbol: 'mi', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
];

const weightUnits: ConversionUnit[] = [
  { id: 'mg', name: 'Milligram', symbol: 'mg', toBase: v => v / 1000000, fromBase: v => v * 1000000 },
  { id: 'g', name: 'Gram', symbol: 'g', toBase: v => v / 1000, fromBase: v => v * 1000 },
  { id: 'kg', name: 'Kilogram', symbol: 'kg', toBase: v => v, fromBase: v => v },
  { id: 't', name: 'Metric Ton', symbol: 't', toBase: v => v * 1000, fromBase: v => v / 1000 },
  { id: 'oz', name: 'Ounce', symbol: 'oz', toBase: v => v * 0.0283495, fromBase: v => v / 0.0283495 },
  { id: 'lb', name: 'Pound', symbol: 'lb', toBase: v => v * 0.453592, fromBase: v => v / 0.453592 },
  { id: 'st', name: 'Stone', symbol: 'st', toBase: v => v * 6.35029, fromBase: v => v / 6.35029 },
];

const temperatureUnits: ConversionUnit[] = [
  { id: 'c', name: 'Celsius', symbol: '°C', toBase: v => v, fromBase: v => v },
  { id: 'f', name: 'Fahrenheit', symbol: '°F', toBase: v => (v - 32) * 5/9, fromBase: v => v * 9/5 + 32 },
  { id: 'k', name: 'Kelvin', symbol: 'K', toBase: v => v - 273.15, fromBase: v => v + 273.15 },
];

const dataUnits: ConversionUnit[] = [
  { id: 'b', name: 'Byte', symbol: 'B', toBase: v => v, fromBase: v => v },
  { id: 'kb', name: 'Kilobyte', symbol: 'KB', toBase: v => v * 1024, fromBase: v => v / 1024 },
  { id: 'mb', name: 'Megabyte', symbol: 'MB', toBase: v => v * 1024 * 1024, fromBase: v => v / (1024 * 1024) },
  { id: 'gb', name: 'Gigabyte', symbol: 'GB', toBase: v => v * 1024 * 1024 * 1024, fromBase: v => v / (1024 * 1024 * 1024) },
  { id: 'tb', name: 'Terabyte', symbol: 'TB', toBase: v => v * 1024 * 1024 * 1024 * 1024, fromBase: v => v / (1024 * 1024 * 1024 * 1024) },
];

const timeUnits: ConversionUnit[] = [
  { id: 'ms', name: 'Millisecond', symbol: 'ms', toBase: v => v / 1000, fromBase: v => v * 1000 },
  { id: 's', name: 'Second', symbol: 's', toBase: v => v, fromBase: v => v },
  { id: 'min', name: 'Minute', symbol: 'min', toBase: v => v * 60, fromBase: v => v / 60 },
  { id: 'h', name: 'Hour', symbol: 'h', toBase: v => v * 3600, fromBase: v => v / 3600 },
  { id: 'd', name: 'Day', symbol: 'd', toBase: v => v * 86400, fromBase: v => v / 86400 },
  { id: 'w', name: 'Week', symbol: 'w', toBase: v => v * 604800, fromBase: v => v / 604800 },
  { id: 'mo', name: 'Month', symbol: 'mo', toBase: v => v * 2629746, fromBase: v => v / 2629746 },
  { id: 'y', name: 'Year', symbol: 'y', toBase: v => v * 31556952, fromBase: v => v / 31556952 },
];

// Currency rates (mock - in production would fetch from API)
const currencyRates: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.12,
  JPY: 149.50,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
  CNY: 7.24,
  KRW: 1320.50,
};

const currencies = Object.keys(currencyRates).map(code => ({
  id: code.toLowerCase(),
  name: code,
  symbol: code,
  toBase: (v: number) => v / currencyRates[code],
  fromBase: (v: number) => v * currencyRates[code],
}));

const unitsByCategory: Record<ConversionCategory, ConversionUnit[]> = {
  length: lengthUnits,
  weight: weightUnits,
  temperature: temperatureUnits,
  currency: currencies,
  time: timeUnits,
  data: dataUnits,
};

const categoryIcons: Record<ConversionCategory, React.ReactNode> = {
  length: <Ruler className="w-4 h-4" />,
  weight: <Scale className="w-4 h-4" />,
  temperature: <Thermometer className="w-4 h-4" />,
  currency: <DollarSign className="w-4 h-4" />,
  time: <Clock className="w-4 h-4" />,
  data: <Zap className="w-4 h-4" />,
};

export const ConverterTool = () => {
  const [category, setCategory] = useState<ConversionCategory>('length');
  const [fromUnit, setFromUnit] = useState('m');
  const [toUnit, setToUnit] = useState('ft');
  const [fromValue, setFromValue] = useState('1');
  const [toValue, setToValue] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const units = unitsByCategory[category];

  // Update units when category changes
  useEffect(() => {
    const defaultUnits: Record<ConversionCategory, [string, string]> = {
      length: ['m', 'ft'],
      weight: ['kg', 'lb'],
      temperature: ['c', 'f'],
      currency: ['usd', 'eur'],
      time: ['h', 'min'],
      data: ['mb', 'gb'],
    };
    const [from, to] = defaultUnits[category];
    setFromUnit(from);
    setToUnit(to);
    setFromValue('1');
  }, [category]);

  // Convert value
  useEffect(() => {
    const value = parseFloat(fromValue);
    if (isNaN(value)) {
      setToValue('');
      return;
    }

    const fromUnitObj = units.find(u => u.id === fromUnit);
    const toUnitObj = units.find(u => u.id === toUnit);

    if (fromUnitObj && toUnitObj) {
      const baseValue = fromUnitObj.toBase(value);
      const result = toUnitObj.fromBase(baseValue);
      
      // Format result
      if (Math.abs(result) < 0.0001 || Math.abs(result) > 1000000) {
        setToValue(result.toExponential(4));
      } else {
        setToValue(result.toLocaleString(undefined, { maximumFractionDigits: 6 }));
      }
    }
  }, [fromValue, fromUnit, toUnit, units]);

  // Swap units
  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setFromValue(toValue.replace(/,/g, ''));
  };

  // Copy result
  const copyResult = () => {
    navigator.clipboard.writeText(toValue);
    toast.success('Copied to clipboard!');
  };

  // Quick conversions
  const quickConversions = [
    { from: '1', fromUnit: 'km', toUnit: 'mi', category: 'length' as ConversionCategory },
    { from: '100', fromUnit: 'lb', toUnit: 'kg', category: 'weight' as ConversionCategory },
    { from: '98.6', fromUnit: 'f', toUnit: 'c', category: 'temperature' as ConversionCategory },
    { from: '100', fromUnit: 'usd', toUnit: 'eur', category: 'currency' as ConversionCategory },
  ];

  const applyQuickConversion = (q: typeof quickConversions[0]) => {
    setCategory(q.category);
    setTimeout(() => {
      setFromUnit(q.fromUnit);
      setToUnit(q.toUnit);
      setFromValue(q.from);
    }, 0);
  };

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as ConversionCategory)}>
        <TabsList className="grid grid-cols-6 w-full">
          {(Object.keys(categoryIcons) as ConversionCategory[]).map(cat => (
            <TabsTrigger key={cat} value={cat} className="gap-1 text-xs px-2">
              {categoryIcons[cat]}
              <span className="hidden sm:inline capitalize">{cat}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Converter */}
      <Card className="p-4 space-y-4">
        <div className="grid gap-4">
          {/* From */}
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={fromValue}
                onChange={(e) => setFromValue(e.target.value)}
                placeholder="Enter value..."
                className="flex-1"
              />
              <Select value={fromUnit} onValueChange={setFromUnit}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center">
            <Button variant="outline" size="icon" onClick={swapUnits} className="rounded-full">
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex gap-2">
              <Input
                value={toValue}
                readOnly
                placeholder="Result..."
                className="flex-1 bg-muted"
                onClick={copyResult}
              />
              <Select value={toUnit} onValueChange={setToUnit}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name} ({unit.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Result display */}
        {fromValue && toValue && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 text-center">
            <p className="text-lg font-medium">
              {fromValue} {units.find(u => u.id === fromUnit)?.symbol} = {toValue} {units.find(u => u.id === toUnit)?.symbol}
            </p>
            <Button variant="ghost" size="sm" onClick={copyResult} className="mt-2">
              Copy Result
            </Button>
          </div>
        )}
      </Card>

      {/* Quick conversions */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Quick Conversions</h4>
        <div className="grid grid-cols-2 gap-2">
          {quickConversions.map((q, i) => {
            const fromU = unitsByCategory[q.category].find(u => u.id === q.fromUnit);
            const toU = unitsByCategory[q.category].find(u => u.id === q.toUnit);
            return (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs justify-start"
                onClick={() => applyQuickConversion(q)}
              >
                {q.from} {fromU?.symbol} → {toU?.symbol}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Timezone converter */}
      <TimezoneConverter />
    </div>
  );
};

// Timezone converter component
const TimezoneConverter = () => {
  const [time, setTime] = useState('');
  const [fromTz, setFromTz] = useState('local');
  const [results, setResults] = useState<{ tz: string; time: string }[]>([]);

  const timezones = [
    { id: 'local', name: 'Local Time', offset: new Date().getTimezoneOffset() },
    { id: 'utc', name: 'UTC', offset: 0 },
    { id: 'est', name: 'EST (New York)', offset: 300 },
    { id: 'pst', name: 'PST (Los Angeles)', offset: 480 },
    { id: 'gmt', name: 'GMT (London)', offset: 0 },
    { id: 'cet', name: 'CET (Paris)', offset: -60 },
    { id: 'ist', name: 'IST (India)', offset: -330 },
    { id: 'jst', name: 'JST (Tokyo)', offset: -540 },
    { id: 'aest', name: 'AEST (Sydney)', offset: -600 },
  ];

  const convertTime = () => {
    if (!time) return;

    const [hours, minutes] = time.split(':').map(Number);
    const fromOffset = timezones.find(t => t.id === fromTz)?.offset ?? 0;
    
    const results = timezones
      .filter(tz => tz.id !== fromTz)
      .map(tz => {
        const diff = fromOffset - tz.offset;
        let newHours = hours + Math.floor(diff / 60);
        let newMinutes = minutes + (diff % 60);
        
        if (newMinutes >= 60) { newHours++; newMinutes -= 60; }
        if (newMinutes < 0) { newHours--; newMinutes += 60; }
        if (newHours >= 24) newHours -= 24;
        if (newHours < 0) newHours += 24;

        return {
          tz: tz.name,
          time: `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`,
        };
      });

    setResults(results);
  };

  useEffect(() => {
    if (time) convertTime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, fromTz]);

  return (
    <Card className="p-4">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Timezone Converter
      </h4>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="flex-1"
          />
          <Select value={fromTz} onValueChange={setFromTz}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map(tz => (
                <SelectItem key={tz.id} value={tz.id}>{tz.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {results.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {results.slice(0, 6).map(r => (
              <div key={r.tz} className="flex justify-between p-2 rounded bg-muted">
                <span className="text-muted-foreground text-xs">{r.tz}</span>
                <span className="font-mono font-medium">{r.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
