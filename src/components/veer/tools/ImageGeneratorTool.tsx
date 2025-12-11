import { useState, useRef } from 'react';
import { Download, Copy, RefreshCw, Trash2, Settings2, Image as ImageIcon, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  style: string;
  timestamp: number;
}

export const ImageGeneratorTool = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('realistic');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [quality, setQuality] = useState('high');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styles = [
    { value: 'realistic', label: 'Realistic' },
    { value: 'digital-art', label: 'Digital Art' },
    { value: 'oil-painting', label: 'Oil Painting' },
    { value: 'watercolor', label: 'Watercolor' },
    { value: 'anime', label: 'Anime' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'vintage', label: 'Vintage' },
    { value: 'sketch', label: 'Sketch' },
    { value: 'photography', label: 'Photography' },
    { value: 'abstract', label: 'Abstract' },
  ];

  const aspects = [
    { value: '1:1', label: 'Square (1:1)' },
    { value: '16:9', label: 'Wide (16:9)' },
    { value: '9:16', label: 'Tall (9:16)' },
    { value: '3:2', label: 'Standard (3:2)' },
    { value: '2:3', label: 'Portrait (2:3)' },
  ];

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setLoading(true);
    try {
      // Mock implementation - In production, integrate with image generation API
      // Examples: Hugging Face, Stability AI, OpenAI DALL-E, Replicate
      
      // For demo purposes, create a placeholder canvas-based image
      const canvas = document.createElement('canvas');
      const [width, height] = aspectRatio === '1:1' ? [512, 512] 
        : aspectRatio === '16:9' ? [896, 504]
        : aspectRatio === '9:16' ? [504, 896]
        : aspectRatio === '3:2' ? [768, 512]
        : [512, 768];
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Generated Image', width / 2, height / 2 - 20);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillText(prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''), width / 2, height / 2 + 20);
      }
      
      const imageUrl = canvas.toDataURL('image/png');
      const newImage: GeneratedImage = {
        id: Math.random().toString(36).substr(2, 9),
        prompt,
        url: imageUrl,
        style,
        timestamp: Date.now(),
      };
      
      setGeneratedImages(prev => [newImage, ...prev]);
      toast.success('Image generated successfully!');
      setPrompt('');
    } catch (error) {
      toast.error('Failed to generate image');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `veer-generated-${image.id}.png`;
    link.click();
    toast.success('Image downloaded');
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Prompt copied to clipboard');
  };

  const deleteImage = (id: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== id));
    toast.success('Image deleted');
  };

  const clearAll = () => {
    if (generatedImages.length > 0) {
      setGeneratedImages([]);
      toast.success('All images cleared');
    }
  };

  return (
    <div className="p-6 flex flex-col h-full gap-4">
      {/* Generation Settings */}
      <Card className="glass border-glass-border/30 p-4 space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Prompt</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="glass border-glass-border/30 focus:border-primary/50 text-sm resize-none"
            rows={3}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground mt-1">Be descriptive for better results</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="style" className="text-sm font-medium mb-2 block">Style</Label>
            <Select value={style} onValueChange={setStyle} disabled={loading}>
              <SelectTrigger id="style" className="glass border-glass-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {styles.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="aspect" className="text-sm font-medium mb-2 block">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={loading}>
              <SelectTrigger id="aspect" className="glass border-glass-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aspects.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="quality" className="text-sm font-medium mb-2 block">Quality</Label>
            <Select value={quality} onValueChange={setQuality} disabled={loading}>
              <SelectTrigger id="quality" className="glass border-glass-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="ultra">Ultra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={generateImage}
              disabled={loading || !prompt.trim()}
              className="w-full bg-gradient-primary shadow-glow text-primary-foreground hover:shadow-glow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated Images */}
      {generatedImages.length > 0 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Generated ({generatedImages.length})</h3>
            {generatedImages.length > 0 && (
              <Button
                onClick={clearAll}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs hover:bg-destructive/20 hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {generatedImages.map((image) => (
              <Card key={image.id} className="glass border-glass-border/30 overflow-hidden hover:border-primary/50 transition-all">
                <div className="relative group">
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      onClick={() => downloadImage(image)}
                      size="sm"
                      className="bg-primary/90 hover:bg-primary text-primary-foreground"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => deleteImage(image.id)}
                      size="sm"
                      variant="destructive"
                      className="bg-destructive/90 hover:bg-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground line-clamp-2">{image.prompt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {image.style}
                      </span>
                    </div>
                    <Button
                      onClick={() => copyPrompt(image.prompt)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {generatedImages.length === 0 && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
          <ImageIcon className="w-12 h-12 opacity-50" />
          <div>
            <p className="text-sm font-medium">No images generated yet</p>
            <p className="text-xs">Start by entering a prompt and clicking Generate</p>
          </div>
        </div>
      )}
    </div>
  );
};
