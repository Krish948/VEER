import { useState, useEffect } from 'react';
import { FileEdit, Plus, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Note } from '@/types/veer';
import { toast } from 'sonner';

export const NotesTool = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) setNotes(data);
  };

  const saveNote = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content required');
      return;
    }

    if (selectedNote) {
      await supabase
        .from('notes')
        .update({ title, content })
        .eq('id', selectedNote.id);
      toast.success('Note updated');
    } else {
      await supabase.from('notes').insert({ title, content });
      toast.success('Note created');
    }

    clearForm();
    fetchNotes();
  };

  const deleteNote = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id);
    toast.success('Note deleted');
    if (selectedNote?.id === id) {
      clearForm();
    }
    fetchNotes();
  };

  const loadNote = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(true);
  };

  const clearForm = () => {
    setTitle('');
    setContent('');
    setSelectedNote(null);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Note Editor */}
      <div className="p-6 space-y-4 border-b border-glass-border/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {selectedNote ? 'Edit Note' : 'New Note'}
          </h3>
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={clearForm}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="glass border-glass-border/30 h-11"
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          className="glass border-glass-border/30 min-h-[120px] resize-none"
        />
        <Button onClick={saveNote} className="w-full h-11 bg-gradient-primary shadow-glow">
          {selectedNote ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Update Note
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Save Note
            </>
          )}
        </Button>
      </div>

      {/* Notes List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 py-3 border-b border-glass-border/20">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Your Notes ({notes.length})
          </h3>
        </div>
        
        <ScrollArea className="flex-1 px-6 py-3">
          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No notes yet. Create your first note above!</p>
              </div>
            ) : (
              notes.map((note) => (
                <Card
                  key={note.id}
                  className={`glass glass-hover p-4 cursor-pointer transition-all duration-200 ${
                    selectedNote?.id === note.id ? 'border-primary/50 shadow-glow' : ''
                  }`}
                  onClick={() => loadNote(note)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate mb-1">{note.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{note.content}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0 hover:bg-destructive/20 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
