import { useState } from 'react';
import { Code2, Copy, Loader, Play, BookOpen, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Explanation {
  line: string;
  lineNumber: number;
  explanation: string;
}

const LANGUAGE_COMMENTS: Record<string, { start: string; end?: string }> = {
  javascript: { start: '//', end: undefined },
  typescript: { start: '//', end: undefined },
  python: { start: '#', end: undefined },
  java: { start: '//', end: undefined },
  cpp: { start: '//', end: undefined },
  csharp: { start: '//', end: undefined },
  ruby: { start: '#', end: undefined },
  php: { start: '//', end: undefined },
  sql: { start: '--', end: undefined },
  html: { start: '<!--', end: '-->' },
  css: { start: '/*', end: '*/' },
};

export const CodeExplainerTool = () => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const explainCode = async () => {
    if (!code.trim()) {
      toast.error('Please enter code to explain');
      return;
    }

    setLoading(true);
    try {
      const lines = code.split('\n').filter(line => line.trim());
      const newExplanations: Explanation[] = lines.map((line, i) => {
        // Simulate AI explanations
        let explanation = '';

        if (line.includes('function') || line.includes('def') || line.includes('void')) {
          explanation = 'Declares a function/method that performs a specific task.';
        } else if (line.includes('for') || line.includes('while')) {
          explanation = 'Loop statement that repeats a block of code multiple times.';
        } else if (line.includes('if') || line.includes('else')) {
          explanation = 'Conditional statement that executes code based on a condition.';
        } else if (line.includes('return')) {
          explanation = 'Returns a value from the function to the caller.';
        } else if (line.includes('=')) {
          explanation = 'Variable assignment - stores a value in a variable.';
        } else if (line.includes('const') || line.includes('let') || line.includes('var')) {
          explanation = 'Variable declaration with different scoping rules.';
        } else if (line.includes('class') || line.includes('struct')) {
          explanation = 'Defines a class/structure that serves as a blueprint for objects.';
        } else {
          explanation = 'Executes a statement or expression.';
        }

        return {
          line,
          lineNumber: i + 1,
          explanation,
        };
      });

      setExplanations(newExplanations);
      setSelectedLine(0);
      toast.success(`Explained ${newExplanations.length} lines of code`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to explain code');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const downloadExplanation = () => {
    const content = explanations
      .map(e => `Line ${e.lineNumber}: ${e.line}\n➜ ${e.explanation}`)
      .join('\n\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', `code-explanation.txt`);
    element.click();
    toast.success('Explanation downloaded');
  };

  const selectedExplanation = selectedLine !== null ? explanations[selectedLine] : null;

  return (
    <div className="space-y-4">
      {/* Code Input */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Code Snippet</label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
              <SelectItem value="csharp">C#</SelectItem>
              <SelectItem value="php">PHP</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          className="font-mono text-xs min-h-32"
        />

        <div className="flex gap-2">
          <Button
            onClick={explainCode}
            disabled={loading || !code.trim()}
            className="flex-1 gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4" />
                Explain Code
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={copyCode}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Explanations */}
      {explanations.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* Line List */}
          <Card className="p-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              Lines
            </h4>
            <ScrollArea className="h-80">
              <div className="space-y-1">
                {explanations.map((exp, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedLine(i)}
                    className={`p-2 rounded cursor-pointer text-xs transition-colors ${
                      selectedLine === i
                        ? 'bg-primary/20 border-l-2 border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <p className="font-mono text-[10px] truncate">{exp.line}</p>
                    <p className="text-muted-foreground text-[10px]">Line {exp.lineNumber}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Explanation */}
          <Card className="p-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Explanation
            </h4>

            {selectedExplanation ? (
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-mono text-xs text-muted-foreground">
                    {selectedExplanation.line}
                  </p>
                </div>

                <div>
                  <p className="text-sm leading-relaxed">
                    {selectedExplanation.explanation}
                  </p>
                </div>

                <div className="pt-2 border-t">
                  <Badge variant="outline" className="text-xs">
                    Line {selectedExplanation.lineNumber}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Select a line to see explanation
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Download */}
      {explanations.length > 0 && (
        <Button
          onClick={downloadExplanation}
          variant="outline"
          className="w-full gap-2"
        >
          <Play className="w-4 h-4" />
          Download Explanation
        </Button>
      )}
    </div>
  );
};
