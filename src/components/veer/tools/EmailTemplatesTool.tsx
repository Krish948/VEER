import { useState } from 'react';
import { Mail, Plus, Trash2, Copy, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Meeting Request',
    category: 'meetings',
    subject: 'Meeting Request - [Topic]',
    body: `Hi [Name],

I hope this email finds you well. I wanted to reach out to discuss [topic].

Would you be available for a meeting next week? I'm flexible with timing and happy to work around your schedule.

Looking forward to hearing from you.

Best regards,
[Your Name]`,
  },
  {
    id: '2',
    name: 'Follow-up',
    category: 'followup',
    subject: 'Following Up on [Topic]',
    body: `Hi [Name],

I wanted to follow up on our previous discussion regarding [topic].

Have you had a chance to review the materials? I'd love to hear your thoughts and discuss next steps.

Please let me know if you need any additional information.

Best regards,
[Your Name]`,
  },
  {
    id: '3',
    name: 'Thank You',
    category: 'thanks',
    subject: 'Thank You for [Action]',
    body: `Hi [Name],

Thank you so much for [action]. I truly appreciate your time and effort.

Your contribution has been invaluable, and I'm grateful to have the opportunity to work with you.

Best regards,
[Your Name]`,
  },
  {
    id: '4',
    name: 'Project Update',
    category: 'updates',
    subject: 'Project Update - [Project Name]',
    body: `Hi [Name],

I wanted to provide you with an update on the progress of [project name].

Key Highlights:
• [Point 1]
• [Point 2]
• [Point 3]

Next Steps:
We plan to [next action] by [date].

Please let me know if you have any questions or concerns.

Best regards,
[Your Name]`,
  },
];

const TEMPLATES_KEY = 'veer.email.templates';

export const EmailTemplatesTool = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      return saved ? JSON.parse(saved) : defaultTemplates;
    } catch { return defaultTemplates; }
  });

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formCategory, setFormCategory] = useState('general');

  const categories = ['general', 'meetings', 'followup', 'thanks', 'updates', 'support'];

  const addTemplate = () => {
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      toast.error('All fields are required');
      return;
    }

    const newTemplate: EmailTemplate = {
      id: crypto.randomUUID(),
      name: formName.trim(),
      subject: formSubject.trim(),
      body: formBody.trim(),
      category: formCategory,
    };

    setTemplates(prev => [...prev, newTemplate]);
    resetForm();
    setShowAddDialog(false);
    toast.success('Template created!');
  };

  const updateTemplate = () => {
    if (!editingTemplate) return;
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) {
      toast.error('All fields are required');
      return;
    }

    setTemplates(prev => prev.map(t => 
      t.id === editingTemplate.id 
        ? { ...t, name: formName.trim(), subject: formSubject.trim(), body: formBody.trim(), category: formCategory }
        : t
    ));

    setEditingTemplate(null);
    resetForm();
    toast.success('Template updated!');
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const resetForm = () => {
    setFormName('');
    setFormSubject('');
    setFormBody('');
    setFormCategory('general');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const groupedTemplates = categories.reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  return (
    <div className="space-y-4">
      {/* Add Template Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Weekly Report"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                value={formCategory}
                onChange={(e) => setFormCategory(e.currentTarget.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                placeholder="Email body (use [brackets] for variables)"
                className="min-h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={addTemplate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-4">
        {/* Templates List */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">Templates</h4>
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No templates</p>
              ) : (
                templates.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`p-2 rounded cursor-pointer transition-colors text-sm ${
                      selectedTemplate?.id === t.id ? 'bg-primary/20' : 'hover:bg-muted'
                    }`}
                  >
                    <p className="font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.category}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Template Preview */}
        <Card className="p-4 space-y-3">
          {selectedTemplate ? (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{selectedTemplate.name}</h4>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setFormName(selectedTemplate.name);
                      setFormSubject(selectedTemplate.subject);
                      setFormBody(selectedTemplate.body);
                      setFormCategory(selectedTemplate.category);
                      setEditingTemplate(selectedTemplate);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteTemplate(selectedTemplate.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-xs text-muted-foreground">Subject:</p>
                <p className="font-mono text-xs break-words">{selectedTemplate.subject}</p>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-xs text-muted-foreground">Body:</p>
                <div className="bg-muted/50 rounded p-2 max-h-32 overflow-y-auto text-xs font-mono whitespace-pre-wrap break-words">
                  {selectedTemplate.body}
                </div>
              </div>

              <Button
                onClick={() => copyToClipboard(selectedTemplate.body)}
                className="w-full gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Body
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              Select a template to preview
            </p>
          )}
        </Card>
      </div>

      {/* Edit Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <select 
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background" 
                  value={formCategory} 
                  onChange={(e) => setFormCategory(e.currentTarget.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  className="min-h-32"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
              <Button onClick={updateTemplate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
