import { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, Upload, X, FileCode, FileImage, File, Trash2, Eye, Copy, Download, Loader2, Sparkles, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AnalyzedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  analysis?: string;
  isAnalyzing?: boolean;
  preview?: string;
}

// Format bytes helper
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file icon based on type
const getFileIcon = (type: string, name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  
  if (type.startsWith('image/')) {
    return <FileImage className="w-5 h-5 text-pink-500" />;
  }
  if (type === 'application/json' || ext === 'json') {
    return <FileJson className="w-5 h-5 text-yellow-500" />;
  }
  if (type === 'text/csv' || ext === 'csv') {
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  }
  if (type.includes('javascript') || type.includes('typescript') || 
      ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'rb', 'php'].includes(ext || '')) {
    return <FileCode className="w-5 h-5 text-blue-500" />;
  }
  if (type === 'text/html' || type === 'text/css' || ['html', 'css', 'scss'].includes(ext || '')) {
    return <FileCode className="w-5 h-5 text-orange-500" />;
  }
  if (type === 'text/markdown' || ext === 'md') {
    return <FileText className="w-5 h-5 text-purple-500" />;
  }
  return <File className="w-5 h-5 text-muted-foreground" />;
};

// Get file type label
const getFileTypeLabel = (type: string, name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase();
  
  if (type.startsWith('image/')) return 'Image';
  if (type === 'application/pdf') return 'PDF';
  if (type === 'application/json' || ext === 'json') return 'JSON';
  if (type === 'text/csv' || ext === 'csv') return 'CSV';
  if (type === 'text/markdown' || ext === 'md') return 'Markdown';
  if (type === 'text/html' || ext === 'html') return 'HTML';
  if (type === 'text/css' || ext === 'css') return 'CSS';
  if (['js', 'jsx'].includes(ext || '')) return 'JavaScript';
  if (['ts', 'tsx'].includes(ext || '')) return 'TypeScript';
  if (ext === 'py') return 'Python';
  if (ext === 'java') return 'Java';
  if (['cpp', 'c', 'h'].includes(ext || '')) return 'C/C++';
  if (ext === 'go') return 'Go';
  if (ext === 'rs') return 'Rust';
  if (ext === 'rb') return 'Ruby';
  if (ext === 'php') return 'PHP';
  if (ext === 'sql') return 'SQL';
  if (['yaml', 'yml'].includes(ext || '')) return 'YAML';
  if (ext === 'xml') return 'XML';
  if (type === 'text/plain' || ext === 'txt') return 'Text';
  return ext?.toUpperCase() || 'File';
};

export const FileTool = () => {
  const [files, setFiles] = useState<AnalyzedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<AnalyzedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const selectedFileIdRef = useRef<string | null>(null);

  // Keep track of selected file ID
  useEffect(() => {
    selectedFileIdRef.current = selectedFile?.id || null;
  }, [selectedFile]);

  // Sync selectedFile with files array when files change
  useEffect(() => {
    const currentId = selectedFileIdRef.current;
    if (currentId) {
      const updatedFile = files.find(f => f.id === currentId);
      if (updatedFile && selectedFile && (
        updatedFile.analysis !== selectedFile.analysis ||
        updatedFile.isAnalyzing !== selectedFile.isAnalyzing
      )) {
        setSelectedFile(updatedFile);
      }
    }
  }, [files, selectedFile]);

  // Read file content with proper encoding handling
  const readFileContent = async (file: File): Promise<{ content: string; preview?: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      if (file.type.startsWith('image/')) {
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve({ content: `[Image file - ${file.name}]`, preview: base64 });
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          try {
            const content = reader.result as string;
            // Check if content is readable
            if (content && typeof content === 'string') {
              resolve({ content });
            } else {
              resolve({ content: '[Unable to read file content]' });
            }
          } catch (e) {
            resolve({ content: '[Error decoding file content]' });
          }
        };
        // Try UTF-8 first
        reader.readAsText(file, 'UTF-8');
      }
    });
  };

  // Generate local analysis without API
  const generateLocalAnalysis = (file: AnalyzedFile): string => {
    const typeLabel = getFileTypeLabel(file.type, file.name);
    const lines = file.content.split('\n');
    const lineCount = lines.length;
    const charCount = file.content.length;
    const wordCount = file.content.split(/\s+/).filter(w => w.length > 0).length;
    
    let analysis = `## File Analysis: ${file.name}\n\n`;
    analysis += `**Type:** ${typeLabel}\n`;
    analysis += `**Size:** ${formatBytes(file.size)}\n`;
    analysis += `**Lines:** ${lineCount}\n`;
    analysis += `**Words:** ${wordCount}\n`;
    analysis += `**Characters:** ${charCount}\n\n`;
    
    // Type-specific analysis
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(file.content);
        const keys = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? Object.keys(parsed) : [];
        analysis += `### JSON Structure\n`;
        if (parsed === null) {
          analysis += `- Root type: null\n`;
        } else if (Array.isArray(parsed)) {
          analysis += `- Root type: Array\n`;
          analysis += `- Array length: ${parsed.length}\n`;
          if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
            analysis += `- Item keys: ${Object.keys(parsed[0]).slice(0, 8).join(', ')}${Object.keys(parsed[0]).length > 8 ? '...' : ''}\n`;
          }
        } else if (typeof parsed === 'object') {
          analysis += `- Root type: Object\n`;
          analysis += `- Top-level keys (${keys.length}): ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}\n`;
        } else {
          analysis += `- Root type: ${typeof parsed}\n`;
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        analysis += `### Note\nJSON parsing failed: ${errMsg}\n`;
      }
    } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      try {
        const rows = lines.filter(l => l.trim());
        // Try to detect the delimiter (comma, semicolon, or tab)
        const firstRow = rows[0] || '';
        const commaCount = (firstRow.match(/,/g) || []).length;
        const semicolonCount = (firstRow.match(/;/g) || []).length;
        const tabCount = (firstRow.match(/\t/g) || []).length;
        const delimiter = tabCount > commaCount && tabCount > semicolonCount ? '\t' 
                        : semicolonCount > commaCount ? ';' : ',';
        
        const headers = firstRow.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
        analysis += `### CSV Structure\n`;
        analysis += `- Rows: ${rows.length} (including header)\n`;
        analysis += `- Columns: ${headers.length}\n`;
        analysis += `- Delimiter: ${delimiter === '\t' ? 'Tab' : delimiter === ';' ? 'Semicolon' : 'Comma'}\n`;
        if (headers.length > 0 && headers[0]) {
          analysis += `- Headers: ${headers.slice(0, 8).join(', ')}${headers.length > 8 ? '...' : ''}\n`;
        }
      } catch (e) {
        analysis += `### CSV Structure\n`;
        analysis += `- Unable to parse CSV structure\n`;
      }
    } else if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php'].includes(file.name.split('.').pop()?.toLowerCase() || '')) {
      // Use safer regex patterns to avoid catastrophic backtracking
      const functionPatterns = [
        /function\s+\w+/g,
        /const\s+\w+\s*=/g,
        /let\s+\w+\s*=/g,
        /def\s+\w+/g,
        /class\s+\w+/g,
        /async\s+function\s+\w+/g,
        /export\s+(default\s+)?function\s+\w+/g,
      ];
      const importPatterns = [
        /^import\s+.+$/gm,
        /require\s*\([^)]+\)/g,
        /^from\s+[\w./"']+\s+import/gm,
      ];
      
      let functions: string[] = [];
      let imports: string[] = [];
      
      try {
        for (const pattern of functionPatterns) {
          const matches = file.content.match(pattern) || [];
          functions = functions.concat(matches);
        }
        for (const pattern of importPatterns) {
          const matches = file.content.match(pattern) || [];
          imports = imports.concat(matches);
        }
      } catch (e) {
        // Regex failed, likely due to content issues
        console.warn('Regex analysis failed:', e);
      }
      
      analysis += `### Code Structure\n`;
      analysis += `- Imports/Requires: ${imports.length}\n`;
      analysis += `- Functions/Classes/Declarations: ${functions.length}\n`;
      if (functions.length > 0) {
        const uniqueFunctions = [...new Set(functions.map(f => f.trim().slice(0, 30)))];
        analysis += `- Detected: ${uniqueFunctions.slice(0, 5).join(', ')}${uniqueFunctions.length > 5 ? '...' : ''}\n`;
      }
    } else if (file.name.endsWith('.md') || file.type === 'text/markdown') {
      const headings = file.content.match(/^#{1,6}\s+.+$/gm) || [];
      const links = file.content.match(/\[.+?\]\(.+?\)/g) || [];
      const codeBlocks = file.content.match(/```[\s\S]*?```/g) || [];
      analysis += `### Markdown Structure\n`;
      analysis += `- Headings: ${headings.length}\n`;
      analysis += `- Links: ${links.length}\n`;
      analysis += `- Code blocks: ${codeBlocks.length}\n`;
    }
    
    // Preview
    analysis += `\n### Content Preview\n\`\`\`\n${file.content.slice(0, 500)}${file.content.length > 500 ? '\n...' : ''}\n\`\`\``;
    
    return analysis;
  };

  // Analyze file with AI or locally
  const analyzeFile = async (fileId: string, useAI: boolean = true) => {
    const file = files.find(f => f.id === fileId);
    if (!file) {
      toast.error('File not found');
      return;
    }

    // Check if content is readable
    if (!file.content || file.content.startsWith('[Image file') || file.content.startsWith('[Unable') || file.content.startsWith('[Error')) {
      toast.error('Cannot analyze this file type');
      return;
    }

    // Set analyzing state
    const updateFileState = (updates: Partial<AnalyzedFile>) => {
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, ...updates } : f
      ));
    };

    updateFileState({ isAnalyzing: true });

    try {
      let analysis: string;

      if (useAI) {
        try {
          const typeLabel = getFileTypeLabel(file.type, file.name);
          
          // Clean the content - remove any non-printable characters
          const cleanContent = file.content
            .slice(0, 6000)
            .split('')
            .filter(char => {
              const code = char.charCodeAt(0);
              // Keep printable ASCII, newlines, tabs, and common unicode
              return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
            })
            .join('')
            .trim();

          if (!cleanContent) {
            throw new Error('No readable content');
          }

          const prompt = `Analyze this ${typeLabel} file named "${file.name}".

Please provide:
1. **Summary**: What this file contains and its purpose
2. **Key Details**: Important information, data points, or structure
3. **Observations**: Any patterns, potential issues, or notable elements
4. **Suggestions**: Improvements or recommendations (if applicable)

---
FILE CONTENT:
---
${cleanContent}${file.content.length > 6000 ? '\n\n[...content truncated...]' : ''}`;

          console.log('Sending file for AI analysis...');
          
          const { data, error } = await supabase.functions.invoke('veer-chat', {
            body: {
              message: prompt,
              mode: 'helper',
              service: 'auto',
            },
          });

          console.log('AI response:', { data, error });

          if (error) {
            console.error('Supabase function error:', error);
            throw new Error(error.message || 'API error');
          }

          if (!data || !data.reply) {
            console.error('Empty AI response:', data);
            throw new Error('Empty response from AI');
          }

          analysis = data.reply;
          updateFileState({ analysis, isAnalyzing: false });
          toast.success('AI analysis complete');
          return;
        } catch (aiError) {
          console.error('AI analysis failed:', aiError);
          toast.warning('AI unavailable, using local analysis');
          // Fall through to local analysis
        }
      }
      
      // Local analysis (either requested or fallback)
      analysis = generateLocalAnalysis(file);
      updateFileState({ analysis, isAnalyzing: false });
      toast.success('Analysis complete');
      
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Final fallback to local analysis
      try {
        const localAnalysis = generateLocalAnalysis(file);
        updateFileState({ analysis: localAnalysis, isAnalyzing: false });
        toast.info('Using local file analysis');
      } catch (localError) {
        console.error('Local analysis also failed:', localError);
        updateFileState({ isAnalyzing: false, analysis: 'Analysis failed. Please try again.' });
        toast.error('Analysis failed');
      }
    }
  };

  // Handle file selection
  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    const supportedTypes = [
      'text/plain', 'text/markdown', 'text/csv', 'application/json',
      'text/html', 'text/css', 'text/javascript', 'application/javascript',
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
    ];
    
    const codeExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'scss', 'html', 'json', 'xml', 'yaml', 'yml', 'md', 'txt', 'csv', 'sql', 'sh', 'bash', 'ps1', 'go', 'rs', 'rb', 'php'];

    const validFiles = selectedFiles.filter(file => {
      if (supportedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
        return true;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext && codeExtensions.includes(ext);
    });

    if (validFiles.length === 0) {
      toast.error('Please select supported file types');
      return;
    }

    for (const file of validFiles) {
      try {
        const { content, preview } = await readFileContent(file);
        const newFile: AnalyzedFile = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          content,
          preview,
        };
        setFiles(prev => [...prev, newFile]);
      } catch (error) {
        toast.error(`Failed to read ${file.name}`);
      }
    }

    toast.success(`${validFiles.length} file${validFiles.length > 1 ? 's' : ''} added`);
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFilesSelected(droppedFiles);
    }
  }, [handleFilesSelected]);

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    if (selectedFile?.id === id) {
      setSelectedFile(null);
    }
    toast.success('File removed');
  };

  // Copy content to clipboard
  const copyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Download file
  const downloadFile = (file: AnalyzedFile) => {
    const blob = new Blob([file.content], { type: file.type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="flex flex-col h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 p-6 rounded-xl glass border-2 border-dashed border-primary">
            <Upload className="w-12 h-12 text-primary animate-bounce" />
            <p className="text-lg font-medium">Drop files here</p>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept=".txt,.md,.csv,.json,.html,.css,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.xml,.yaml,.yml,.sql,.sh,.go,.rs,.rb,.php,image/*"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Upload area when no files */}
      {files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <div 
            className="w-full max-w-sm p-8 rounded-2xl glass border-2 border-dashed border-glass-border/50 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary/20 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Upload Files</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag & drop or click to browse
                </p>
              </div>
              <div className="flex flex-wrap gap-1 justify-center">
                {['TXT', 'MD', 'JSON', 'CSV', 'JS', 'TS', 'PY'].map(ext => (
                  <Badge key={ext} variant="secondary" className="text-xs">
                    .{ext.toLowerCase()}
                  </Badge>
                ))}
                <Badge variant="secondary" className="text-xs">+more</Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Supports text, code, images, and data files
          </p>
        </div>
      ) : (
        <>
          {/* File list and viewer */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Action bar */}
            <div className="p-4 border-b border-glass-border/20 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {files.length} file{files.length !== 1 ? 's' : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                Add Files
              </Button>
            </div>

            {selectedFile ? (
              // File viewer
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Selected file header */}
                <div className="p-4 border-b border-glass-border/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(selectedFile.type, selectedFile.name)}
                      <div>
                        <h4 className="font-medium text-sm truncate max-w-[180px]" title={selectedFile.name}>
                          {selectedFile.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs">
                            {getFileTypeLabel(selectedFile.type, selectedFile.name)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(selectedFile.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Tabs for content/analysis */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 pt-2">
                    <TabsList className="grid grid-cols-2 h-9">
                      <TabsTrigger value="content" className="text-xs gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        Content
                      </TabsTrigger>
                      <TabsTrigger value="analysis" className="text-xs gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Analysis
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="content" className="flex-1 overflow-hidden m-0">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        {/* Action buttons */}
                        <div className="flex gap-2 mb-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => copyContent(selectedFile.content)}
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => downloadFile(selectedFile)}
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>

                        {/* Preview */}
                        {selectedFile.preview ? (
                          <div className="rounded-lg overflow-hidden border border-glass-border/30">
                            <img 
                              src={selectedFile.preview} 
                              alt={selectedFile.name}
                              className="w-full h-auto max-h-[300px] object-contain bg-muted/20"
                            />
                          </div>
                        ) : (
                          <pre className="p-3 rounded-lg bg-muted/30 text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto max-h-[400px]">
                            {selectedFile.content.slice(0, 5000)}
                            {selectedFile.content.length > 5000 && (
                              <span className="text-muted-foreground">
                                {'\n\n'}[...{formatBytes(selectedFile.content.length - 5000)} more]
                              </span>
                            )}
                          </pre>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="analysis" className="flex-1 overflow-hidden m-0">
                    <ScrollArea className="h-full">
                      <div className="p-4">
                        {selectedFile.isAnalyzing ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground">Analyzing file...</p>
                          </div>
                        ) : selectedFile.analysis ? (
                          <div className="space-y-4">
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => copyContent(selectedFile.analysis || '')}
                              >
                                <Copy className="w-3 h-3" />
                                Copy
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => analyzeFile(selectedFile.id, true)}
                              >
                                <Sparkles className="w-3 h-3" />
                                Re-analyze with AI
                              </Button>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/20 p-4 rounded-lg">
                                {selectedFile.analysis}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-primary/20 flex items-center justify-center">
                              <Sparkles className="w-8 h-8 text-primary" />
                            </div>
                            <div className="text-center">
                              <h4 className="font-medium">File Analysis</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Get insights about this file
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 w-full max-w-[200px]">
                              <Button
                                onClick={() => analyzeFile(selectedFile.id, true)}
                                className="gap-2 bg-gradient-primary shadow-glow w-full"
                              >
                                <Sparkles className="w-4 h-4" />
                                AI Analysis
                              </Button>
                              <Button
                                onClick={() => analyzeFile(selectedFile.id, false)}
                                variant="outline"
                                className="gap-2 w-full"
                              >
                                <Eye className="w-4 h-4" />
                                Quick Analysis
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              Quick analysis works offline
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              // File list
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                  {files.map(file => (
                    <Card
                      key={file.id}
                      className="p-3 glass glass-hover cursor-pointer group"
                      onClick={() => {
                        setSelectedFile(file);
                        setActiveTab('content');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type, file.name)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="text-xs">
                              {getFileTypeLabel(file.type, file.name)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatBytes(file.size)}
                            </span>
                            {file.analysis && (
                              <Badge variant="outline" className="text-xs text-primary border-primary/30">
                                Analyzed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(file);
                              setActiveTab('analysis');
                              if (!file.analysis && !file.isAnalyzing) {
                                analyzeFile(file.id, false); // Quick analysis first for speed
                              }
                            }}
                            title="Quick Analyze"
                          >
                            {file.isAnalyzing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(file.id);
                            }}
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </>
      )}
    </div>
  );
};
