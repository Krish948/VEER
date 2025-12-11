import { useState } from 'react';
import { Calculator, Trash2, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { evaluate } from 'mathjs';
import { toast } from 'sonner';

export const CalcTool = () => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const calculate = () => {
    try {
      const res = evaluate(expression);
      setResult(res.toString());
    } catch (error) {
      toast.error('Invalid expression');
    }
  };

  const clear = () => {
    setExpression('');
    setResult(null);
  };

  const backspace = () => {
    setExpression(prev => prev.slice(0, -1));
  };

  const buttonClass = "h-14 text-lg font-medium transition-all duration-150 hover:scale-105 active:scale-95";

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Display */}
      <div className="mb-6 space-y-3">
        <Input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && calculate()}
          placeholder="0"
          className="h-14 text-right text-2xl font-mono glass border-glass-border/30 focus:border-primary/50"
        />

        {result && (
          <Card className="glass border-primary/30 p-4">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Result</div>
            <div className="text-3xl font-bold neon-text font-mono text-right">{result}</div>
          </Card>
        )}
      </div>

      {/* Calculator Buttons */}
      <div className="grid grid-cols-4 gap-2 flex-1">
        {/* Row 1 */}
        <Button onClick={clear} variant="outline" className={`${buttonClass} glass-hover text-destructive col-span-2`}>
          <Trash2 className="w-5 h-5 mr-2" />
          Clear
        </Button>
        <Button onClick={backspace} variant="outline" className={`${buttonClass} glass-hover`}>
          <Delete className="w-5 h-5" />
        </Button>
        <Button onClick={() => setExpression(prev => prev + '/')} variant="outline" className={`${buttonClass} glass-hover text-primary`}>
          ÷
        </Button>

        {/* Row 2 */}
        <Button onClick={() => setExpression(prev => prev + '7')} variant="outline" className={`${buttonClass} glass-hover`}>7</Button>
        <Button onClick={() => setExpression(prev => prev + '8')} variant="outline" className={`${buttonClass} glass-hover`}>8</Button>
        <Button onClick={() => setExpression(prev => prev + '9')} variant="outline" className={`${buttonClass} glass-hover`}>9</Button>
        <Button onClick={() => setExpression(prev => prev + '*')} variant="outline" className={`${buttonClass} glass-hover text-primary`}>×</Button>

        {/* Row 3 */}
        <Button onClick={() => setExpression(prev => prev + '4')} variant="outline" className={`${buttonClass} glass-hover`}>4</Button>
        <Button onClick={() => setExpression(prev => prev + '5')} variant="outline" className={`${buttonClass} glass-hover`}>5</Button>
        <Button onClick={() => setExpression(prev => prev + '6')} variant="outline" className={`${buttonClass} glass-hover`}>6</Button>
        <Button onClick={() => setExpression(prev => prev + '-')} variant="outline" className={`${buttonClass} glass-hover text-primary`}>−</Button>

        {/* Row 4 */}
        <Button onClick={() => setExpression(prev => prev + '1')} variant="outline" className={`${buttonClass} glass-hover`}>1</Button>
        <Button onClick={() => setExpression(prev => prev + '2')} variant="outline" className={`${buttonClass} glass-hover`}>2</Button>
        <Button onClick={() => setExpression(prev => prev + '3')} variant="outline" className={`${buttonClass} glass-hover`}>3</Button>
        <Button onClick={() => setExpression(prev => prev + '+')} variant="outline" className={`${buttonClass} glass-hover text-primary`}>+</Button>

        {/* Row 5 */}
        <Button onClick={() => setExpression(prev => prev + '0')} variant="outline" className={`${buttonClass} glass-hover col-span-2`}>0</Button>
        <Button onClick={() => setExpression(prev => prev + '.')} variant="outline" className={`${buttonClass} glass-hover`}>.</Button>
        <Button onClick={calculate} className={`${buttonClass} bg-gradient-primary shadow-glow text-primary-foreground`}>=</Button>
      </div>
    </div>
  );
};
