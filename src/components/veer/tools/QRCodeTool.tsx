import { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Copy, RefreshCw, Link, Mail, Phone, Wifi, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type QRType = 'text' | 'url' | 'email' | 'phone' | 'wifi' | 'vcard';

interface QRConfig {
  size: number;
  fgColor: string;
  bgColor: string;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
}

const defaultConfig: QRConfig = {
  size: 200,
  fgColor: '#000000',
  bgColor: '#FFFFFF',
  errorCorrection: 'M',
};

export const QRCodeTool = () => {
  const [type, setType] = useState<QRType>('text');
  const [content, setContent] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [config, setConfig] = useState<QRConfig>(defaultConfig);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form data for different types
  const [urlData, setUrlData] = useState('https://');
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });
  const [phoneData, setPhoneData] = useState('');
  const [wifiData, setWifiData] = useState({ ssid: '', password: '', encryption: 'WPA' });
  const [vcardData, setVcardData] = useState({ name: '', phone: '', email: '', org: '' });

  // Generate content based on type
  const generateContent = () => {
    switch (type) {
      case 'text':
        return content;
      case 'url':
        return urlData;
      case 'email':
        return `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
      case 'phone':
        return `tel:${phoneData}`;
      case 'wifi':
        return `WIFI:T:${wifiData.encryption};S:${wifiData.ssid};P:${wifiData.password};;`;
      case 'vcard':
        return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardData.name}\nTEL:${vcardData.phone}\nEMAIL:${vcardData.email}\nORG:${vcardData.org}\nEND:VCARD`;
      default:
        return content;
    }
  };

  // Simple QR code generation using canvas
  // This is a simplified version - in production you'd use a library like qrcode
  const generateQRCode = async () => {
    const data = generateContent();
    if (!data) {
      toast.error('Please enter content to generate QR code');
      return;
    }

    // Use a free QR API for generation
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${config.size}x${config.size}&data=${encodeURIComponent(data)}&color=${config.fgColor.slice(1)}&bgcolor=${config.bgColor.slice(1)}&ecc=${config.errorCorrection}`;
    
    setQrDataUrl(apiUrl);
    toast.success('QR Code generated!');
  };

  // Download QR code
  const downloadQR = async () => {
    if (!qrDataUrl) return;

    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('QR Code downloaded!');
    } catch (e) {
      toast.error('Failed to download');
    }
  };

  // Copy QR code URL
  const copyQRUrl = async () => {
    if (!qrDataUrl) return;
    
    try {
      await navigator.clipboard.writeText(qrDataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('URL copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const typeIcons: Record<QRType, React.ReactNode> = {
    text: <FileText className="w-4 h-4" />,
    url: <Link className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    phone: <Phone className="w-4 h-4" />,
    wifi: <Wifi className="w-4 h-4" />,
    vcard: <FileText className="w-4 h-4" />,
  };

  return (
    <div className="space-y-4">
      <Tabs value={type} onValueChange={(v) => setType(v as QRType)}>
        <TabsList className="grid grid-cols-6 w-full">
          {(Object.keys(typeIcons) as QRType[]).map(t => (
            <TabsTrigger key={t} value={t} className="gap-1 text-xs capitalize">
              {typeIcons[t]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="text" className="mt-4">
          <div className="space-y-2">
            <Label>Text Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter any text..."
              rows={3}
            />
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-4">
          <div className="space-y-2">
            <Label>Website URL</Label>
            <Input
              value={urlData}
              onChange={(e) => setUrlData(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </TabsContent>

        <TabsContent value="email" className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              value={emailData.to}
              onChange={(e) => setEmailData(d => ({ ...d, to: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={emailData.subject}
              onChange={(e) => setEmailData(d => ({ ...d, subject: e.target.value }))}
              placeholder="Email subject..."
            />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              value={emailData.body}
              onChange={(e) => setEmailData(d => ({ ...d, body: e.target.value }))}
              placeholder="Email body..."
              rows={2}
            />
          </div>
        </TabsContent>

        <TabsContent value="phone" className="mt-4">
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              value={phoneData}
              onChange={(e) => setPhoneData(e.target.value)}
              placeholder="+1234567890"
            />
          </div>
        </TabsContent>

        <TabsContent value="wifi" className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label>Network Name (SSID)</Label>
            <Input
              value={wifiData.ssid}
              onChange={(e) => setWifiData(d => ({ ...d, ssid: e.target.value }))}
              placeholder="WiFi network name"
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={wifiData.password}
              onChange={(e) => setWifiData(d => ({ ...d, password: e.target.value }))}
              placeholder="WiFi password"
            />
          </div>
          <div className="space-y-2">
            <Label>Encryption</Label>
            <Select
              value={wifiData.encryption}
              onValueChange={(v) => setWifiData(d => ({ ...d, encryption: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WPA">WPA/WPA2</SelectItem>
                <SelectItem value="WEP">WEP</SelectItem>
                <SelectItem value="nopass">No Password</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="vcard" className="mt-4 space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={vcardData.name}
              onChange={(e) => setVcardData(d => ({ ...d, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={vcardData.phone}
              onChange={(e) => setVcardData(d => ({ ...d, phone: e.target.value }))}
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={vcardData.email}
              onChange={(e) => setVcardData(d => ({ ...d, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Organization</Label>
            <Input
              value={vcardData.org}
              onChange={(e) => setVcardData(d => ({ ...d, org: e.target.value }))}
              placeholder="Company name"
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Generate button */}
      <Button onClick={generateQRCode} className="w-full gap-2">
        <QrCode className="w-4 h-4" />
        Generate QR Code
      </Button>

      {/* QR Code display */}
      {qrDataUrl && (
        <Card className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <div 
              className="p-4 bg-white rounded-lg shadow-lg"
              style={{ backgroundColor: config.bgColor }}
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                width={config.size}
                height={config.size}
                className="rounded"
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadQR} className="gap-1.5">
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={copyQRUrl} className="gap-1.5">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy URL
              </Button>
              <Button variant="outline" size="sm" onClick={generateQRCode} className="gap-1.5">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Settings */}
      <Card className="p-4 space-y-4">
        <h4 className="text-sm font-medium">Customize</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Size</Label>
            <Select
              value={config.size.toString()}
              onValueChange={(v) => setConfig(c => ({ ...c, size: parseInt(v) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="150">Small (150px)</SelectItem>
                <SelectItem value="200">Medium (200px)</SelectItem>
                <SelectItem value="300">Large (300px)</SelectItem>
                <SelectItem value="400">XL (400px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Error Correction</Label>
            <Select
              value={config.errorCorrection}
              onValueChange={(v) => setConfig(c => ({ ...c, errorCorrection: v as QRConfig['errorCorrection'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="L">Low (7%)</SelectItem>
                <SelectItem value="M">Medium (15%)</SelectItem>
                <SelectItem value="Q">Quartile (25%)</SelectItem>
                <SelectItem value="H">High (30%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Foreground</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.fgColor}
                onChange={(e) => setConfig(c => ({ ...c, fgColor: e.target.value }))}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={config.fgColor}
                onChange={(e) => setConfig(c => ({ ...c, fgColor: e.target.value }))}
                className="flex-1 font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Background</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.bgColor}
                onChange={(e) => setConfig(c => ({ ...c, bgColor: e.target.value }))}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={config.bgColor}
                onChange={(e) => setConfig(c => ({ ...c, bgColor: e.target.value }))}
                className="flex-1 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
